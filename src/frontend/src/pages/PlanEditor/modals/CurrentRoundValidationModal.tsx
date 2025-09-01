import React from "react";
import { Button } from "../../../components/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Typography from "@mui/material/Typography";

interface CurrentRoundValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  value: number;
  startingCompanyRound: number;
  max: number;
}

const CurrentRoundValidationModal: React.FC<
  CurrentRoundValidationModalProps
> = ({ isOpen, onClose, onConfirm, value, startingCompanyRound, max }) => {
  let message = "";

  if (value < startingCompanyRound) {
    message = `현재 회차는 가입한 회차(${startingCompanyRound})보다 작을 수 없습니다. ${startingCompanyRound}로 설정하시겠습니까?`;
  } else if (value > max) {
    message = `현재 회차는 최대 ${max}보다 클 수 없습니다. ${max}로 설정하시겠습니까?`;
  } else if (value === 0) {
    message = `현재 회차는 0일 수 없습니다. ${startingCompanyRound}로 설정하시겠습니까?`;
  }

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>현재 회차 값 오류</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2">{message}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} className="bg-gray-500 hover:bg-gray-600">
          취소
        </Button>
        <Button onClick={onConfirm} className="bg-blue-600 hover:bg-blue-700">
          확인
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CurrentRoundValidationModal;
