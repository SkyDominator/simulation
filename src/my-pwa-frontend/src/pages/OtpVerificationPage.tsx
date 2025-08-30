import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  CircularProgress,
} from "@mui/material";

interface OtpVerificationPageProps {
  phone: string;
  name: string;
  userHash: string;
  onVerified: (userHash: string) => void;
  onBack: () => void;
}

const OtpVerificationPage: React.FC<OtpVerificationPageProps> = ({
  phone,
  name,
  userHash,
  onVerified,
  onBack,
}) => {
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendOtp = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await api.sendOtp(name, phone);

      if (result.success) {
        setCountdown(result.expires_in_seconds || 180); // Default 3 minutes
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(
        "서비스에 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!otpCode.trim()) {
      setError("인증번호를 입력해주세요.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await api.verifyOtp(phone, otpCode);

      if (result.success) {
        onVerified(userHash);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(
        "서비스에 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
      <Paper
        sx={{
          p: 4,
          width: "100%",
          maxWidth: 500,
          boxShadow: 3,
        }}
      >
        <Stack spacing={3}>
          <Box textAlign="center">
            <img
              src="/icons/icon-192.png"
              alt="Logo"
              style={{ width: 80, height: 80 }}
            />
            <Typography variant="h5" sx={{ mt: 2, fontWeight: "bold" }}>
              휴대폰 인증
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              {phone} 번호로 전송된 인증번호를 입력하세요
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ width: "100%" }}>
              {error}
            </Alert>
          )}

          <TextField
            label="인증번호"
            variant="outlined"
            fullWidth
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
            placeholder="6자리 숫자"
            disabled={loading}
            inputProps={{
              maxLength: 6,
              pattern: "[0-9]*",
              inputMode: "numeric",
              autoComplete: "one-time-code", // Enable auto-fill on supporting browsers
            }}
          />

          <Box sx={{ textAlign: "center" }}>
            {countdown > 0 && (
              <Typography color="text.secondary">
                {Math.floor(countdown / 60)}:
                {(countdown % 60).toString().padStart(2, "0")} 내에 입력하세요
              </Typography>
            )}
          </Box>

          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={handleVerify}
            disabled={loading || !otpCode.trim()}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "인증하기"
            )}
          </Button>

          <Stack direction="row" spacing={2} justifyContent="space-between">
            <Button
              variant="text"
              color="inherit"
              onClick={onBack}
              disabled={loading}
            >
              이전으로
            </Button>

            <Button
              variant="text"
              color="primary"
              onClick={handleSendOtp}
              disabled={loading || countdown > 0}
            >
              {countdown > 0
                ? `재전송 ${Math.floor(countdown / 60)}:${(countdown % 60)
                    .toString()
                    .padStart(2, "0")}`
                : "인증번호 재전송"}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
};

export default OtpVerificationPage;
