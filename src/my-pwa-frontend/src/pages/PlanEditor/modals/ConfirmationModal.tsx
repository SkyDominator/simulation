import React from "react";
import { Button } from "../../../components/Button";
import type { Plan } from "../../../types/types";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  plan: Plan;
  isLoading: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  plan,
  isLoading,
}) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center px-3 py-6 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative bg-white w-full max-w-sm rounded-xl shadow-xl ring-1 ring-black/10 overflow-hidden animate-[fadeScale_.18s_ease]">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-100">
          <h2
            id="confirm-title"
            className="text-base font-semibold tracking-tight"
          >
            저장 확인
          </h2>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <div className="px-5 pt-4 pb-6 text-sm space-y-1">
          <div className="font-medium text-gray-700">플랜 요약</div>
          <p>
            플랜 타입: <span className="font-semibold">{plan.plan_id}</span>
          </p>
          <p>
            회사 회차:{" "}
            <span className="font-semibold">{plan.company_round}</span>
          </p>
          <p>
            총 시뮬레이션 회차:{" "}
            <span className="font-semibold">{plan.simulation_rounds}</span>
          </p>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex gap-2 justify-end">
          <Button onClick={onClose} className="bg-gray-500 hover:bg-gray-600">
            취소
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={isLoading}
          >
            {isLoading ? "처리 중..." : "최종 저장"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
