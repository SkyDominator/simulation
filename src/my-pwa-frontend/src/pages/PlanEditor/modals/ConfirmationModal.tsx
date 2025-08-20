import React from 'react';
import { Button } from '../../../components/Button';
import { Modal } from '../../../components/Modal';
import type { Plan } from '../../../types/types';

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
  isLoading
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title="저장 확인"
    size="sm"
    variant="info"
    footer={(
      <>
        <Button onClick={onClose} className="bg-gray-500 hover:bg-gray-600">취소</Button>
        <Button
          onClick={onConfirm}
          className="bg-blue-600 hover:bg-blue-700"
          disabled={isLoading}
        >
          {isLoading ? '처리 중...' : '최종 저장'}
        </Button>
      </>
    )}
  >
    <div className="space-y-1 text-sm">
      <div className="font-medium text-gray-700">플랜 요약</div>
      <p>플랜 타입: <span className="font-semibold">{plan.plan_id}</span></p>
      <p>회사 회차: <span className="font-semibold">{plan.company_round}</span></p>
      <p>총 시뮬레이션 회차: <span className="font-semibold">{plan.simulation_rounds}</span></p>
    </div>
  </Modal>
);

export default ConfirmationModal;
