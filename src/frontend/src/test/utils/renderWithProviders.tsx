import React from "react";
import { render, RenderOptions } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { createTheme } from "@mui/material/styles";
import { MockAuthProvider } from "../mocks/AuthContext";

const theme = createTheme();

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  withAuth?: boolean;
  withTheme?: boolean;
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    withAuth = true,
    withTheme = true,
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    let wrappedChildren = children;

    if (withAuth) {
      wrappedChildren = <MockAuthProvider>{wrappedChildren}</MockAuthProvider>;
    }

    if (withTheme) {
      wrappedChildren = (
        <ThemeProvider theme={theme}>{wrappedChildren}</ThemeProvider>
      );
    }

    return <>{wrappedChildren}</>;
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Re-export testing library utilities
export * from "@testing-library/react";
