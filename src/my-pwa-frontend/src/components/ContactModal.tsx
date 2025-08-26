import React from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  Box,
  Typography,
  Link,
} from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({
  isOpen,
  onClose,
}) => {
  // Developer's contact information
  const developerEmail = "iloveulord86@gmail.com";
  const developerPhone = "010-3127-4918";

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" fontWeight={600}>
          문의하기
        </Typography>
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2, color: "text.primary" }}>
          문의사항이 있으시면 아래 연락처로 연락해 주세요.
        </DialogContentText>

        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              mb: 2,
              p: 2,
              borderRadius: 1,
              bgcolor: "background.paper",
              boxShadow: 1,
            }}
          >
            <EmailIcon sx={{ mr: 2, color: "primary.main" }} />
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                이메일
              </Typography>
              <Link
                href={`mailto:${developerEmail}`}
                underline="hover"
                color="primary.main"
                sx={{ fontWeight: 500 }}
              >
                {developerEmail}
              </Link>
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              p: 2,
              borderRadius: 1,
              bgcolor: "background.paper",
              boxShadow: 1,
            }}
          >
            <PhoneIcon sx={{ mr: 2, color: "primary.main" }} />
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                전화번호
              </Typography>
              <Link
                href={`tel:${developerPhone.replace(/-/g, "")}`}
                underline="hover"
                color="primary.main"
                sx={{ fontWeight: 500 }}
              >
                {developerPhone}
              </Link>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={onClose}
          variant="contained"
          fullWidth
          size="large"
          sx={{ fontWeight: 600 }}
        >
          확인
        </Button>
      </DialogActions>
    </Dialog>
  );
};
