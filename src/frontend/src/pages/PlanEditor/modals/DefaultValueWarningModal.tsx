import React from "react";
import { Button } from "../../../components/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Typography from "@mui/material/Typography";

interface DefaultValueWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  belowMinInvestments: Array<{
    round: number;
    amount: number;
    minAmount: number;
  }>;
}

const DefaultValueWarningModal: React.FC<DefaultValueWarningModalProps> = ({
  isOpen,
  onClose,
  onContinue,
  belowMinInvestments,
}) => {
  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>최소값 미달 경고</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body1" sx={{ mb: 2 }}>
          다음 회차의 매출액이 최소값보다 낮습니다:
        </Typography>

        {belowMinInvestments.map((item) => (
          <Typography key={item.round} variant="body2" sx={{ mb: 1 }}>
            • 개인 회차 <strong>{item.round}</strong>:{" "}
            {item.amount.toLocaleString()}원 (최소:{" "}
            {item.minAmount.toLocaleString()}원)
          </Typography>
        ))}

        <Typography variant="body2" sx={{ mt: 2 }} color="text.secondary">
          최소값보다 낮은 매출액으로도 시뮬레이션을 계속 진행하시겠습니까?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} className="bg-gray-500 hover:bg-gray-600">
          취소
        </Button>
        <Button
          onClick={onContinue}
          className="bg-orange-600 hover:bg-orange-700"
        >
          계속
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DefaultValueWarningModal;
