import React from 'react';
import { Button } from '../../../components/Button';
import { Modal } from '../../../components/Modal';

interface InvestmentValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  invalidInvestments: Array<{
    round: number;
    oldAmount: number | string;
    newAmount: number;
  }>;
}

const InvestmentValidationModal: React.FC<InvestmentValidationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
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
          onClick={onConfirm}
          className="bg-blue-600 hover:bg-blue-700"
        >확인하고 계속하기</Button>
      </div>
    </div>
  </Modal>
);

export default InvestmentValidationModal;
