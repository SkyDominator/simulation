import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Checkbox,
  FormControlLabel,
  Button,
  Link,
  Stack,
  Dialog,
  CircularProgress,
  Alert,
  Divider,
} from "@mui/material";
import { api } from "../services/api";
import ReactMarkdown from "react-markdown";

interface ConsentPageProps {
  userHash: string;
  onAccept: () => void;
  onDecline: () => void;
}

const ConsentPage: React.FC<ConsentPageProps> = ({
  userHash,
  onAccept,
  onDecline,
}) => {
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [privacyPolicyOpen, setPrivacyPolicyOpen] = useState(false);
  const [policyContent, setPolicyContent] = useState("");
  const [policyVersion, setPolicyVersion] = useState("1.0");
  const [loading, setLoading] = useState(false);
  const [policyLoading, setPolicyLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch privacy policy when component mounts
  useEffect(() => {
    const fetchPrivacyPolicy = async () => {
      try {
        const response = await api.getPrivacyPolicy();
        setPolicyContent(response.content);
        setPolicyVersion(response.version);
      } catch (err) {
        console.error("Failed to load privacy policy:", err);
        setPolicyContent(
          "# 개인정보처리방침\n\n개인정보 처리방침을 불러오는 중 오류가 발생했습니다."
        );
      } finally {
        setPolicyLoading(false);
      }
    };

    fetchPrivacyPolicy();
  }, []);

  const handleAccept = async () => {
    if (!checkboxChecked) {
      setError("개인정보 수집 및 이용에 동의해야 계속할 수 있습니다.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Record consent with the backend using user_hash
      await api.recordConsent(userHash, "privacy_policy", policyVersion);
      // If successful, proceed to login
      onAccept();
    } catch (err) {
      console.error("Error recording consent:", err);
      setError("동의 처리 중 오류가 발생했습니다. 다시 시도해 주세요.");
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: (theme) => theme.palette.grey[100],
        p: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{ p: 4, maxWidth: 600, width: "100%", mx: "auto" }}
      >
        <Typography
          variant="h5"
          fontWeight="bold"
          gutterBottom
          textAlign="center"
        >
          데이터 수집 동의
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Typography variant="body1" paragraph>
          인증 과정을 계속하기 위해, 본 앱은 다음 정보를 수집하고 저장합니다:
        </Typography>

        <Box component="ul" sx={{ pl: 4, mb: 3 }}>
          <Typography component="li" variant="body1">
            소셜 계정을 통한 이메일 주소
          </Typography>
          <Typography component="li" variant="body1">
            소셜 계정 이름 또는 닉네임
          </Typography>
          <Typography component="li" variant="body1">
            사용자 계정에 연결된 신원 확인 정보
          </Typography>
        </Box>

        <Typography variant="body2" paragraph>
          이 정보는 오직 인증 목적으로만 사용되며, 제3자와 공유되지 않습니다.
          자세한 내용은{" "}
          <Link
            component="button"
            variant="body2"
            onClick={() => setPrivacyPolicyOpen(true)}
          >
            개인정보처리방침
          </Link>
          을 참조하세요.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ my: 2 }}>
            {error}
          </Alert>
        )}

        <FormControlLabel
          control={
            <Checkbox
              checked={checkboxChecked}
              onChange={(e) => setCheckboxChecked(e.target.checked)}
            />
          }
          label="개인정보 수집 및 이용에 동의합니다."
          sx={{ mb: 3, display: "block" }}
        />

        <Stack direction="row" spacing={2}>
          <Button variant="outlined" onClick={onDecline} fullWidth>
            취소
          </Button>
          <Button
            variant="contained"
            disabled={!checkboxChecked || loading}
            onClick={handleAccept}
            fullWidth
          >
            {loading ? <CircularProgress size={24} /> : "계속하기"}
          </Button>
        </Stack>
      </Paper>

      {/* Privacy Policy Dialog */}
      <Dialog
        open={privacyPolicyOpen}
        onClose={() => setPrivacyPolicyOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <Box sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom>
            개인정보처리방침 (버전 {policyVersion})
          </Typography>
          <Box sx={{ my: 3, maxHeight: "60vh", overflow: "auto", p: 1 }}>
            {policyLoading ? (
              <CircularProgress />
            ) : (
              <ReactMarkdown>{policyContent}</ReactMarkdown>
            )}
          </Box>
          <Button
            variant="contained"
            onClick={() => setPrivacyPolicyOpen(false)}
          >
            닫기
          </Button>
        </Box>
      </Dialog>
    </Box>
  );
};

export default ConsentPage;
