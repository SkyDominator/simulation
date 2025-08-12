import React from 'react';
import { Button } from '../../../components/Button';
import { Modal } from '../../../components/Modal';
import type { ValidationData } from '../types/index';
import type { Plan } from '../../../types/types';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  plan: Plan;
  isLoading: boolean;
}

interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  validationData: ValidationData | null;
}

interface InvestmentValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  invalidInvestments: Array<{
    round: number;
    oldAmount: number | string;
    newAmount: number;
  }>;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  plan,
  isLoading
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title="저장 확인">
    <div>
      <h3 className="font-bold">플랜 요약</h3>
      <p>플랜 타입: {plan.plan_type}</p>
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

export const ValidationModal: React.FC<ValidationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  validationData
}) => (
  <Modal 
    isOpen={isOpen} 
    onClose={onClose} 
    title="입력값 경고"
  >
    <div>
      <p>
        {validationData && validationData.value < validationData.min 
          ? `값이 최소 ${validationData?.min}보다 작습니다. ${validationData?.min}으로 설정하시겠습니까?`
          : `값이 최대 ${validationData?.max}보다 큽니다. ${validationData?.max}로 설정하시겠습니까?`
        }
      </p>
      <div className="flex justify-end gap-4 mt-4">
        <Button onClick={onClose} className="bg-gray-500 hover:bg-gray-600">취소</Button>
        <Button onClick={onConfirm} className="bg-blue-600 hover:bg-blue-700">확인</Button>
      </div>
    </div>
  </Modal>
);

export const InvestmentValidationModal: React.FC<InvestmentValidationModalProps> = ({
  isOpen,
  onClose,
  invalidInvestments
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title="투자액 자동 수정 알림"
  >
    <div>
      <p className="mb-4">
        일부 회차의 투자액이 최소 필수 금액보다 작거나 유효하지 않아 자동으로 수정되었습니다:
      </p>
      <div className="max-h-60 overflow-y-auto mb-4 border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2">회차</th>
              <th className="px-4 py-2">기존 입력값</th>
              <th className="px-4 py-2">수정된 값</th>
            </tr>
          </thead>
          <tbody>
            {invalidInvestments.map((item) => (
              <tr key={item.round} className="border-t">
                <td className="px-4 py-2 text-center">{item.round}</td>
                <td className="px-4 py-2 text-center">
                  {item.oldAmount === '' || isNaN(Number(item.oldAmount)) 
                    ? '입력 없음' 
                    : Number(item.oldAmount).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-center font-medium text-blue-600">
                  {item.newAmount.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end">
        <Button 
          onClick={onClose}
          className="bg-blue-600 hover:bg-blue-700"
        >
          확인하고 계속하기
        </Button>
      </div>
    </div>
  </Modal>
);
