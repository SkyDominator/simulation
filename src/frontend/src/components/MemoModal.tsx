import React, { useState, useEffect } from "react";
import { Button } from "./Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";

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

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>메모</DialogTitle>
      <DialogContent dividers>
        <TextField
          multiline
          minRows={8}
          fullWidth
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="메모를 입력하세요..."
          InputProps={{ readOnly: !editing }}
          size="small"
          data-testid="memo-input"
        />
        {!editing && value && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: "block" }}
          >
            편집하려면 '편집' 버튼을 누르세요.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
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
            data-testid="memo-save"
          >
            {saving ? "저장 중..." : "저장"}
          </Button>
        )}
        <Button onClick={onClose} className="bg-gray-500 hover:bg-gray-600">
          닫기
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default React.memo(MemoModal);
