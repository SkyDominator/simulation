import React, { useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
  maxWidthClass?: string; // explicit override
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'auto'; // standardized sizing
  draggable?: boolean;
  fullScreenOnMobile?: boolean; // full screen on < sm breakpoint
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  maxWidthClass,
  size = 'md',
  draggable = false,
  fullScreenOnMobile = true,
}) => {
  const [mounted, setMounted] = React.useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const [position, setPosition] = React.useState<{x:number; y:number} | null>(null); // top-left coords
  const dragState = useRef<{dragging:boolean; startX:number; startY:number; originX:number; originY:number; width:number; height:number}>({
    dragging:false, startX:0, startY:0, originX:0, originY:0, width:0, height:0
  });
  const [isMobile, setIsMobile] = React.useState<boolean>(() => (typeof window !== 'undefined' ? window.innerWidth < 640 : false));

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Center after open (measure size first)
  useLayoutEffect(() => {
    if (isOpen && draggable && !isMobile && dialogRef.current) {
      const rect = dialogRef.current.getBoundingClientRect();
      const x = (window.innerWidth - rect.width) / 2;
      const y = (window.innerHeight - rect.height) / 2;
      setPosition({ x: Math.max(x, 16), y: Math.max(y, 16) });
    } else if (isOpen && (!draggable || isMobile)) {
      setPosition(null); // use flex centering / full-screen
    }
  }, [isOpen, draggable, isMobile]);

  const effectiveDraggable = draggable && !isMobile; // disable drag on mobile

  const startDrag = (clientX: number, clientY: number) => {
    if (!effectiveDraggable || !dialogRef.current) return;
    const rect = dialogRef.current.getBoundingClientRect();
    dragState.current.dragging = true;
    dragState.current.startX = clientX;
    dragState.current.startY = clientY;
    dragState.current.originX = rect.left;
    dragState.current.originY = rect.top;
    dragState.current.width = rect.width;
    dragState.current.height = rect.height;
  };
  const duringDrag = (clientX: number, clientY: number) => {
    if (!dragState.current.dragging) return;
    const dx = clientX - dragState.current.startX;
    const dy = clientY - dragState.current.startY;
    const newX = dragState.current.originX + dx;
    const newY = dragState.current.originY + dy;
    const maxX = window.innerWidth - dragState.current.width - 8;
    const maxY = window.innerHeight - dragState.current.height - 8;
    const clampedX = Math.min(Math.max(newX, 8), Math.max(maxX, 8));
    const clampedY = Math.min(Math.max(newY, 8), Math.max(maxY, 8));
    setPosition({ x: clampedX, y: clampedY });
  };
  const endDrag = () => { dragState.current.dragging = false; };

  useEffect(() => {
    if (!effectiveDraggable) return;
    const handleMouseMove = (e: MouseEvent) => duringDrag(e.clientX, e.clientY);
    const handleMouseUp = () => endDrag();
    const handleTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      duringDrag(t.clientX, t.clientY);
    };
    const handleTouchEnd = () => endDrag();
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [effectiveDraggable]);

  if (!isOpen || !mounted) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const sizeMap: Record<string,string> = {
    sm: 'sm:max-w-sm', // ~24rem
    md: 'sm:max-w-md', // ~28rem
    lg: 'sm:max-w-lg', // ~32rem
    xl: 'sm:max-w-xl', // ~36rem
    auto: 'sm:max-w-[42rem]' // cap wider auto layouts
  };
  const resolvedMaxWidth = maxWidthClass || sizeMap[size] || sizeMap.md;
  const mobileFS = fullScreenOnMobile
    ? `h-full max-h-full w-full rounded-none sm:rounded-lg sm:max-h-[90vh] sm:border sm:shadow-xl sm:mx-auto`
    : `w-full sm:w-auto ${resolvedMaxWidth}`;
  const widthClasses = `${mobileFS}`;
  const dialogStyle: React.CSSProperties | undefined = effectiveDraggable && position ? {
    top: position.y,
    left: position.x,
    position: 'fixed'
  } : undefined;

  const content = (
    <div
      className={`fixed inset-0 z-[2000] bg-black/50 backdrop-blur-sm p-4 ${effectiveDraggable ? '' : 'flex items-center justify-center'}`}
      onMouseDown={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={dialogRef}
        style={dialogStyle}
  className={`relative ${effectiveDraggable ? 'cursor-default' : ''} ${widthClasses} bg-white flex flex-col animate-fade-in max-h-[90vh] border border-gray-200 shadow-xl`}
      >
        <div
          className={`flex items-start justify-between px-6 pt-5 pb-4 border-b sticky top-0 bg-white ${effectiveDraggable ? 'cursor-move select-none' : ''}`}
          onMouseDown={e => effectiveDraggable && startDrag(e.clientX, e.clientY)}
          onTouchStart={e => {
            if (!effectiveDraggable) return;
            const t = e.touches[0];
            startDrag(t.clientX, t.clientY);
          }}
        >
          <h3 id="modal-title" className="text-lg md:text-xl font-semibold leading-snug pr-6">{title}</h3>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >✕</button>
        </div>
        <div className="px-6 pb-6 pt-2 overflow-y-auto custom-scrollbar flex-1">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

// Tailwind utility notes (ensure added globally if using these class names):
// .animate-fade-in { animation: fadeInModal .18s ease forwards; }
