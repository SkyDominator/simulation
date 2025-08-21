// Deprecated Modal stub. Replaced by MUI Dialog based components.
import React from "react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, children }) => {
  if (process.env.NODE_ENV !== "production") {
    console.warn("[Modal deprecated] Replace with MUI Dialog components.");
  }
  return <>{isOpen ? children : null}</>;
};
