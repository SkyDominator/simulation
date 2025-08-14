import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
  maxWidthClass?: string; // allow override of width (e.g. 'max-w-lg')
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title, maxWidthClass = 'max-w-lg' }) => {
  const [mounted, setMounted] = React.useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Body scroll lock & focus management
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      previouslyFocused.current = document.activeElement as HTMLElement;
      // Focus first focusable after mount
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

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter(el => !el.hasAttribute('disabled'));
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
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const content = (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onMouseDown={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={dialogRef}
        className={`relative w-full ${maxWidthClass} mx-auto bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col animate-fade-in max-h-[90vh]`}
      >
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b sticky top-0 bg-white rounded-t-lg">
          <h3 id="modal-title" className="text-lg md:text-xl font-semibold leading-snug pr-6">{title}</h3>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >✕</button>
        </div>
        <div className="px-6 pb-6 pt-2 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

// Tailwind utility notes (ensure added globally if using these class names):
// .animate-fade-in { animation: fadeInModal .18s ease forwards; }
