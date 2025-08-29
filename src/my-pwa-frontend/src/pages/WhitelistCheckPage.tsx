import React, { useState } from "react";
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
import OtpVerificationPage from "./OtpVerificationPage";

interface WhitelistCheckPageProps {
  onVerified: (userHash: string) => void;
}

const WhitelistCheckPage: React.FC<WhitelistCheckPageProps> = ({
  onVerified,
}) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // New state for OTP flow
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [userHash, setUserHash] = useState("");

  // Format phone as user types with auto hyphens, e.g., 010-1234-5678
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.startsWith("010")) {
      if (digits.length <= 3) return "010-"; // auto-add hyphen right after 010
      if (digits.length <= 7) return `010-${digits.slice(3)}`;
      return `010-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }
    // Other mobile prefixes (011/016/017/018/019) and generics
    if (digits.length <= 3) return digits;
    if (digits.length === 10) {
      // 3-3-4 pattern for 10-digit legacy numbers
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = formatPhone(e.target.value);
    setPhone(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError("이름과 전화번호를 모두 입력해주세요.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Send OTP after whitelist check is integrated in the backend
      const result = await api.sendOtp(name, phone);

      if (result.success && result.user_hash) {
        // Store hash for OTP verification
        setUserHash(result.user_hash);
        setShowOtpVerification(true);
      } else {
        setError(result.message || "가입 허용 명단에 없는 사용자입니다.");
      }
    } catch (error) {
      console.error("OTP send error:", error);
      setError(
        "서비스에 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
      );
    } finally {
      setLoading(false);
    }
  };

  // Go back to whitelist check form
  const handleBack = () => {
    setShowOtpVerification(false);
    setUserHash("");
    setError("");
  };

  // If showing OTP verification page
  if (showOtpVerification) {
    return (
      <OtpVerificationPage
        phone={phone}
        name={name}
        userHash={userHash}
        onVerified={onVerified}
        onBack={handleBack}
      />
    );
  }

  // Original whitelist check form with updated UI from both versions
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: (t) => t.palette.grey[100],
        p: 2,
      }}
    >
      <Paper
        elevation={4}
        sx={{ p: 4, width: "100%", maxWidth: 500, boxShadow: 3 }}
        component="form"
        onSubmit={handleSubmit}
      >
        <Stack spacing={3}>
          <Box textAlign="center">
            <img
              src="/icons/icon-192.png"
              alt="Logo"
              style={{ width: 80, height: 80 }}
            />
            <Typography variant="h5" sx={{ mt: 2, fontWeight: "bold" }}>
              생명빛 클럽 시뮬레이션
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              이름과 전화번호를 입력하고 인증번호 받기 버튼을 눌러주세요.
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ width: "100%" }}>
              {error}
            </Alert>
          )}

          <TextField
            label="이름"
            variant="outlined"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            autoFocus
          />

          <TextField
            label="휴대폰 번호"
            variant="outlined"
            fullWidth
            value={phone}
            onChange={handlePhoneChange}
            placeholder="010-1234-5678"
            disabled={loading}
            InputProps={{
              inputMode: "tel",
            }}
            inputProps={{ maxLength: 13 }}
          />

          <Button
            variant="contained"
            color="primary"
            fullWidth
            type="submit"
            disabled={loading}
            size="large"
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "인증번호 받기"
            )}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default WhitelistCheckPage;
