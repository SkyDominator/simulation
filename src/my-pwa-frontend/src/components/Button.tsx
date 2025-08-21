import React from "react";
import MuiButton from "@mui/material/Button";

interface ButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}

// Preserve original API but use MUI Button for improved look & feel
export const Button: React.FC<ButtonProps> = ({
  onClick,
  children,
  className = "",
  type = "button",
  disabled = false,
}) => {
  return (
    <MuiButton
      variant="contained"
      color="primary"
      onClick={onClick}
      className={className}
      type={type}
      disabled={disabled}
      sx={{ borderRadius: 2 }}
    >
      {children}
    </MuiButton>
  );
};
