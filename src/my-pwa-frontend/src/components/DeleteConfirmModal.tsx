import React from "react";
import { Button } from "./Button";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  targetLabel?: string | null;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
}

// Dedicated delete confirmation modal replacing previous generic Modal usage on MainPage
export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  title = "삭제 확인",
  message = "선택한 항목을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
  targetLabel,
  loading = false,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center px-3 py-6 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-confirm-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative bg-white w-full max-w-md rounded-xl shadow-xl ring-1 ring-black/10 overflow-hidden animate-[fadeScale_.18s_ease] flex flex-col">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-100">
          <h2
            id="delete-confirm-title"
            className="text-base font-semibold tracking-tight text-red-600"
          >
            {title}
          </h2>
          <button
            onClick={onCancel}
            aria-label="닫기"
            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            ✕
          </button>
        </div>
        <div className="px-5 pt-4 pb-6 text-sm space-y-3">
          <p>{message}</p>
          {targetLabel && (
            <p className="text-xs text-gray-500 break-all">
              대상: {targetLabel}
            </p>
          )}
        </div>
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex gap-2 justify-end">
          <Button
            onClick={onCancel}
            className="bg-gray-500 hover:bg-gray-600"
            disabled={loading}
          >
            취소
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? "삭제 중…" : "삭제"}
          </Button>
        </div>
      </div>
    </div>
  );
};
