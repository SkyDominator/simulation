import React from "react";
import MuiButton from "@mui/material/Button";
import type { ButtonProps as MuiButtonProps } from "@mui/material/Button";

// Extend MUI Button props while keeping backward compatibility
export interface ButtonProps extends MuiButtonProps {
  className?: string; // allow legacy tailwind classes if still present
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "contained",
      color = "primary",
      className = "",
      sx,
      ...rest
    },
    ref
  ) => {
    return (
      <MuiButton
        ref={ref}
        variant={variant}
        color={color as MuiButtonProps["color"]}
        className={className}
        sx={{ borderRadius: 2, ...sx }}
        {...rest}
      >
        {children}
      </MuiButton>
    );
  }
);
Button.displayName = "Button";
