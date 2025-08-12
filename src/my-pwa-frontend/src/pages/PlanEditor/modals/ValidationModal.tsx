import React from 'react';
import { Button } from '../../../components/Button';
import { Modal } from '../../../components/Modal';
import type { ValidationData } from '../types/index';

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

export default ValidationModal;
