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
  <Modal isOpen={isOpen} onClose={onClose} title="저장 확인">
    <div>
      <h3 className="font-bold">플랜 요약</h3>
      <p>플랜 타입: {plan.plan_id}</p>
      <p>회사 회차: {plan.company_round}</p>
      <p>총 시뮬레이션 회차: {plan.simulation_rounds}</p>
      <div className="flex justify-end gap-4 mt-4">
        <Button onClick={onClose} className="bg-gray-500 hover:bg-gray-600">취소</Button>
        <Button 
          onClick={onConfirm} 
          className="bg-blue-600 hover:bg-blue-700"
          disabled={isLoading}
        >
          {isLoading ? '처리 중...' : '최종 저장'}
        </Button>
      </div>
    </div>
  </Modal>
);

export default ConfirmationModal;
