import React from "react";
import { Button } from "../../../components/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Typography from "@mui/material/Typography";
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
  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>저장 확인</DialogTitle>
      <DialogContent dividers>
        <Typography variant="subtitle2" sx={{ mb: 1 }} color="text.secondary">
          플랜 요약
        </Typography>
        <Typography variant="body2">
          플랜 타입: <strong>{plan.plan_id}</strong>
        </Typography>
        <Typography variant="body2">
          시작 회차: <strong>{plan.starting_company_round}</strong>
        </Typography>
        <Typography variant="body2">
          총 시뮬레이션 회차: <strong>{plan.simulation_rounds}</strong>
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} className="bg-gray-500 hover:bg-gray-600">
          취소
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? "처리 중..." : "최종 저장"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationModal;
