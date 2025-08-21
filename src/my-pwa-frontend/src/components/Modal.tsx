import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
  size?: "sm" | "md" | "lg" | "xl" | "auto";
  footer?: React.ReactNode;
  variant?: "default" | "danger" | "info";
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  size = "md",
  footer,
  variant = "default",
}) => {
  // Render portal as soon as isOpen is true. Remove mount gating to avoid cases
  // where the portal isn't rendered due to lifecycle/timing in dev mode.
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  // Ensure we have a stable portal root. Some environments may not have
  // document.body ready at the same time; create a #modal-root if missing.
  const [portalRoot, setPortalRoot] = React.useState<Element | null>(() =>
    typeof document !== "undefined"
      ? document.getElementById("modal-root")
      : null
  );

  React.useEffect(() => {
    if (portalRoot) return;
    const existing = document.getElementById("modal-root");
    if (existing) {
      setPortalRoot(existing);
      return;
    }
    const el = document.createElement("div");
    el.id = "modal-root";
    document.body.appendChild(el);
    setPortalRoot(el);
    return () => {
      // keep root if other code might rely on it; only remove if empty
      try {
        if (el.parentElement && el.childElementCount === 0)
          el.parentElement.removeChild(el);
      } catch {
        /* ignore */
      }
    };
  }, [portalRoot]);

  // (Removed responsive state; current layout is fluid across breakpoints)
  useEffect(() => {
    // debug helper
    // console.debug will show when modal component mounts and isOpen changes
    // Keep this lightweight; remove in production if noisy.
    console.debug("[Modal] mounted, isOpen=", isOpen);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      previouslyFocused.current = document.activeElement as HTMLElement;
      setTimeout(() => {
        if (dialogRef.current) {
          const focusable = dialogRef.current.querySelector<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          focusable?.focus();
        }
      }, 0);
      return () => {
        document.body.style.overflow = originalOverflow;
        previouslyFocused.current?.focus();
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.hasAttribute("disabled"));
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const sizeMap: Record<string, string> = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-md",
    lg: "sm:max-w-lg",
    xl: "sm:max-w-xl",
    auto: "sm:max-w-[42rem]",
  };
  const resolvedMaxWidth = sizeMap[size] || sizeMap.md;
  const widthClasses = `h-full max-h-full w-full sm:h-auto sm:max-h-[90vh] sm:rounded-xl sm:mx-auto ${resolvedMaxWidth}`;

  const variantBar: Record<string, string> = {
    default: "bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500",
    danger: "bg-gradient-to-r from-red-500 to-rose-500",
    info: "bg-gradient-to-r from-sky-500 to-cyan-500",
  };

  const content = (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center px-3 py-6 sm:p-6"
      onMouseDown={handleBackdropClick}
      aria-modal="true"
      role="dialog"
      aria-labelledby="modal-title"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      <div
        ref={dialogRef}
        className={`relative ${widthClasses} bg-white flex flex-col shadow-2xl ring-1 ring-black/10 overflow-hidden animate-[fadeScale_.18s_ease]`}
      >
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`h-5 w-1.5 rounded-full ${variantBar[variant]}`} />
            <h2
              id="modal-title"
              className="text-base sm:text-lg font-semibold tracking-tight truncate"
            >
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition"
          >
            <span className="sr-only">Close</span>✕
          </button>
        </div>
        <div className="px-5 pt-4 pb-6 overflow-y-auto custom-scrollbar flex-1 text-sm leading-relaxed">
          {children}
        </div>
        {footer && (
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex flex-wrap gap-2 justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  // If portal root is available, use it; fallback to document.body
  return createPortal(content, portalRoot || document.body);
};

// Tailwind utility notes:
// @keyframes fadeScale { from { opacity:0; transform:scale(.96); } to { opacity:1; transform:scale(1);} }
// .animate-[fadeScale_.18s_ease] provided via arbitrary value (Tailwind >=3)
