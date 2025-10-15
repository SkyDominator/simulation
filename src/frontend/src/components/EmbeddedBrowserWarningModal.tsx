import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  List,
  ListItem,
  ListItemText,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import OpenInBrowserIcon from "@mui/icons-material/OpenInBrowser";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  openInExternalBrowser,
  getBrowserName,
} from "../utils/browserDetection";

interface EmbeddedBrowserWarningModalProps {
  open: boolean;
  onClose: () => void;
  browserName?: string;
}

/**
 * Modal that warns users about OAuth limitations in embedded browsers
 * and guides them to open the app in a standard browser.
 */
export const EmbeddedBrowserWarningModal: React.FC<
  EmbeddedBrowserWarningModalProps
> = ({ open, onClose, browserName }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const detectedBrowser = browserName || getBrowserName();

  const handleClose = () => {
    console.info("[EmbeddedBrowserWarning] Modal closed:", {
      action: "cancel",
      browserName: detectedBrowser,
      timestamp: new Date().toISOString(),
    });
    onClose();
  };

  const handleOpenInBrowser = async () => {
    console.info("[EmbeddedBrowserWarning] Opening external browser:", {
      action: "open_browser",
      browserName: detectedBrowser,
      timestamp: new Date().toISOString(),
    });

    const success = await openInExternalBrowser();

    console.info("[EmbeddedBrowserWarning] External browser result:", {
      success,
      browserName: detectedBrowser,
    });

    if (success) {
      // Close modal as user is being redirected
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      aria-labelledby="embedded-browser-warning-title"
      aria-describedby="embedded-browser-warning-description"
    >
      <DialogTitle id="embedded-browser-warning-title">
        <Box display="flex" alignItems="center" gap={1}>
          <InfoOutlinedIcon color="warning" />
          <Typography variant="h6" component="span">
            브라우저에서 열어주세요
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Alert severity="warning" sx={{ mb: 2 }}>
          현재 {detectedBrowser} 앱 내부 브라우저에서 실행 중입니다. Google
          로그인은 보안 정책상 표준 브라우저에서만 지원됩니다.
        </Alert>

        <Typography variant="body1" gutterBottom sx={{ mb: 2 }}>
          아래 버튼을 눌러 <strong>Chrome</strong> 또는 <strong>Safari</strong>
          와 같은 일반 브라우저에서 열어주세요.
        </Typography>

        <Box
          sx={{
            bgcolor: "background.paper",
            p: 2,
            borderRadius: 1,
            border: 1,
            borderColor: "divider",
          }}
        >
          <Typography variant="subtitle2" gutterBottom color="primary">
            💡 수동으로 여는 방법
          </Typography>
          <List dense>
            <ListItem sx={{ pl: 0 }}>
              <ListItemText
                primary="1. 화면 오른쪽 상단의 메뉴(⋮) 버튼을 누르세요"
                primaryTypographyProps={{ variant: "body2" }}
              />
            </ListItem>
            <ListItem sx={{ pl: 0 }}>
              <ListItemText
                primary="2. '다른 브라우저로 열기' 또는 '외부 브라우저에서 열기'를 선택하세요"
                primaryTypographyProps={{ variant: "body2" }}
              />
            </ListItem>
            <ListItem sx={{ pl: 0 }}>
              <ListItemText
                primary="3. Chrome 또는 Safari를 선택하세요"
                primaryTypographyProps={{ variant: "body2" }}
              />
            </ListItem>
          </List>
        </Box>

        <Typography
          variant="caption"
          display="block"
          sx={{ mt: 2 }}
          color="text.secondary"
        >
          이는 Google의 보안 정책에 따른 제한이며, 사용자의 계정 보안을 위한
          조치입니다.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleClose} color="inherit">
          취소
        </Button>
        <Button
          onClick={handleOpenInBrowser}
          variant="contained"
          startIcon={<OpenInBrowserIcon />}
          color="primary"
        >
          브라우저에서 열기
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmbeddedBrowserWarningModal;
