import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface MemoModalProps {
  isOpen: boolean;
  initialMemo?: string | null;
  onClose: () => void;
  onSave: (text: string | null) => Promise<void> | void;
}

// UX: view mode by default, enable editing via button
export const MemoModal: React.FC<MemoModalProps> = ({ isOpen, initialMemo, onClose, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialMemo || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setValue(initialMemo || '');
      setEditing(!initialMemo); // auto-enter edit if empty
    }
  }, [isOpen, initialMemo]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(value.trim() === '' ? null : value);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="메모"
      size="md"
      footer={(
        <>
          {!editing && (
            <Button onClick={() => setEditing(true)} className="bg-blue-600 hover:bg-blue-700">편집</Button>
          )}
          {editing && (
            <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 disabled:opacity-60">
              {saving ? '저장 중...' : '저장'}
            </Button>
          )}
          <Button onClick={onClose} className="bg-gray-500 hover:bg-gray-600">닫기</Button>
        </>
      )}
    >
      <div className="space-y-3">
        <textarea
          className="w-full h-44 p-3 border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white shadow-inner"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          readOnly={!editing}
          placeholder="메모를 입력하세요..."
        />
        {!editing && value && (
          <p className="text-xs text-gray-500">편집하려면 '편집' 버튼을 누르세요.</p>
        )}
      </div>
    </Modal>
  );
};
