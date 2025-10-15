import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import EmbeddedBrowserWarningModal from "../../components/EmbeddedBrowserWarningModal";
import * as browserDetection from "../../utils/browserDetection";

// Mock the browser detection module
vi.mock("../../utils/browserDetection", () => ({
  getBrowserName: vi.fn(() => "KakaoTalk"),
  openInExternalBrowser: vi.fn(() => Promise.resolve(true)),
}));

describe("EmbeddedBrowserWarningModal", () => {
  it("renders when open prop is true", () => {
    render(<EmbeddedBrowserWarningModal open={true} onClose={() => {}} />);

    expect(screen.getByText("브라우저에서 열어주세요")).toBeInTheDocument();
    expect(screen.getByText(/KakaoTalk 앱 내부 브라우저/)).toBeInTheDocument();
  });

  it("does not render when open prop is false", () => {
    render(<EmbeddedBrowserWarningModal open={false} onClose={() => {}} />);

    expect(
      screen.queryByText("브라우저에서 열어주세요")
    ).not.toBeInTheDocument();
  });

  it("calls onClose when cancel button is clicked", () => {
    const onCloseMock = vi.fn();
    render(<EmbeddedBrowserWarningModal open={true} onClose={onCloseMock} />);

    const cancelButton = screen.getByText("취소");
    fireEvent.click(cancelButton);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it("calls openInExternalBrowser when primary button is clicked", async () => {
    const openInExternalBrowserMock = vi.spyOn(
      browserDetection,
      "openInExternalBrowser"
    );

    render(<EmbeddedBrowserWarningModal open={true} onClose={() => {}} />);

    const openButton = screen.getByText("브라우저에서 열기");
    fireEvent.click(openButton);

    await waitFor(() => {
      expect(openInExternalBrowserMock).toHaveBeenCalledTimes(1);
    });
  });

  it("displays custom browser name when provided", () => {
    render(
      <EmbeddedBrowserWarningModal
        open={true}
        onClose={() => {}}
        browserName="Facebook"
      />
    );

    expect(screen.getByText(/Facebook 앱 내부 브라우저/)).toBeInTheDocument();
  });

  it("displays manual instructions", () => {
    render(<EmbeddedBrowserWarningModal open={true} onClose={() => {}} />);

    expect(screen.getByText(/수동으로 여는 방법/)).toBeInTheDocument();
    expect(screen.getByText(/메뉴\(⋮\) 버튼을 누르세요/)).toBeInTheDocument();
    expect(screen.getByText(/다른 브라우저로 열기/)).toBeInTheDocument();
  });
});
