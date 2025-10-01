import React from "react";
import TextField from "@mui/material/TextField";

interface InputProps {
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  className?: string;
  "data-testid"?: string;
}

export const Input: React.FC<InputProps> = ({
  value,
  onChange,
  onBlur,
  placeholder,
  type = "text",
  className = "",
  "data-testid": dataTestId,
}) => {
  return (
    <TextField
      fullWidth
      variant="outlined"
      size="small"
      type={type}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      placeholder={placeholder}
      className={className}
      inputProps={{ "data-testid": dataTestId }}
    />
  );
};
