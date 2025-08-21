import React from "react";
import { Button } from "../../../components/Button";
import type { ValidationData } from "../types/index";

interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  validationData: ValidationData | null;
}

const ValidationModal: React.FC<ValidationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  validationData,
}) => {
  if (!isOpen) return null;
  const message =
    validationData && validationData.value < validationData.min
      ? `값이 최소 ${validationData?.min}보다 작습니다. ${validationData?.min}으로 설정하시겠습니까?`
      : `값이 최대 ${validationData?.max}보다 큽니다. ${validationData?.max}로 설정하시겠습니까?`;
  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center px-3 py-6 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="validation-title"
    >
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative bg-white w-full max-w-sm rounded-xl shadow-xl ring-1 ring-black/10 overflow-hidden animate-[fadeScale_.18s_ease]">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-100">
          <h2
            id="validation-title"
            className="text-base font-semibold tracking-tight"
          >
            입력값 경고
          </h2>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <div className="px-5 pt-4 pb-6 text-sm">
          <p>{message}</p>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex gap-2 justify-end">
          <Button onClick={onClose} className="bg-gray-500 hover:bg-gray-600">
            취소
          </Button>
          <Button onClick={onConfirm} className="bg-blue-600 hover:bg-blue-700">
            확인
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ValidationModal;
