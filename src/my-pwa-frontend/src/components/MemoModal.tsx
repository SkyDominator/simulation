import React, { useState, useEffect } from "react";
import { Button } from "./Button";

interface MemoModalProps {
  isOpen: boolean;
  initialMemo?: string | null;
  onClose: () => void;
  onSave: (text: string | null) => Promise<void> | void;
}

// UX: view mode by default, enable editing via button
export const MemoModal: React.FC<MemoModalProps> = ({
  isOpen,
  initialMemo,
  onClose,
  onSave,
}) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialMemo || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setValue(initialMemo || "");
      setEditing(!initialMemo); // auto-enter edit if empty
    }
  }, [isOpen, initialMemo]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(value.trim() === "" ? null : value);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center px-3 py-6 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="memo-title"
    >
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative bg-white w-full max-w-md rounded-xl shadow-xl ring-1 ring-black/10 overflow-hidden animate-[fadeScale_.18s_ease]">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-100">
          <h2
            id="memo-title"
            className="text-base font-semibold tracking-tight"
          >
            메모
          </h2>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <div className="px-5 pt-4 pb-6 text-sm space-y-3">
          <textarea
            className="w-full h-44 p-3 border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white shadow-inner"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            readOnly={!editing}
            placeholder="메모를 입력하세요..."
          />
          {!editing && value && (
            <p className="text-xs text-gray-500">
              편집하려면 '편집' 버튼을 누르세요.
            </p>
          )}
        </div>
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex gap-2 justify-end">
          {!editing && (
            <Button
              onClick={() => setEditing(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              편집
            </Button>
          )}
          {editing && (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-60"
            >
              {saving ? "저장 중..." : "저장"}
            </Button>
          )}
          <Button onClick={onClose} className="bg-gray-500 hover:bg-gray-600">
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
};
