import React from "react";
import { Button } from "./Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Typography from "@mui/material/Typography";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  targetLabel?: string | null;
  loading?: boolean;
  ordinal?: number | null; // simple sequential id shown on main page
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  title = "삭제 확인",
  message = "선택한 항목을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
  targetLabel,
  loading = false,
  ordinal: ordinal = null,
  onCancel,
  onConfirm,
}) => {
  return (
    <Dialog open={isOpen} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ color: "error.main", fontWeight: 600 }}>
        {title}
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: targetLabel ? 1.5 : 0 }}>
          {message}
        </Typography>
        {ordinal !== null && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ wordBreak: "break-all" }}
          >
            삭제할 시뮬레이션 번호: {ordinal}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onCancel}
          disabled={loading}
          className="bg-gray-500 hover:bg-gray-600"
        >
          취소
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-60"
        >
          {loading ? "삭제 중…" : "삭제"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
