import React from "react";
import { Button } from "../../../components/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Typography from "@mui/material/Typography";
import type { ValidationData } from "../types/index";

interface SimulationRoundValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  validationData: ValidationData | null;
}

const SimulationRoundValidationModal: React.FC<
  SimulationRoundValidationModalProps
> = ({ isOpen, onClose, onConfirm, validationData }) => {
  let message = "";

  if (!validationData) {
    message = "유효하지 않은 값입니다.";
  } else if (
    validationData.field === "simulation_rounds" &&
    validationData.value < validationData.min
  ) {
    message = `총 회차 수는 최소 ${validationData.min}보다 작을 수 없습니다. ${validationData.min}으로 설정하시겠습니까?`;
  } else if (
    validationData.field === "simulation_rounds" &&
    validationData.value > validationData.max
  ) {
    message = `총 회차 수는 최대 ${validationData.max}보다 클 수 없습니다. ${validationData.max}로 설정하시겠습니까?`;
  } else if (validationData.value < validationData.min) {
    message = `값이 최소 ${validationData.min}보다 작습니다. ${validationData.min}으로 설정하시겠습니까?`;
  } else {
    message = `값이 최대 ${validationData.max}보다 큽니다. ${validationData.max}로 설정하시겠습니까?`;
  }
  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>입력값 경고</DialogTitle>
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

export default SimulationRoundValidationModal;
