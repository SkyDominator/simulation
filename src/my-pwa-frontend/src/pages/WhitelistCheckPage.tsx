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
} from "@mui/material";

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
      // 1. Check if the user is in the whitelist - backend generates and returns the user_hash
      const digitsOnly = phone.replace(/\D/g, "");
      const result = await api.checkWhitelist(name, digitsOnly);

      if (result.is_whitelisted && result.user_hash) {
        // Just pass the user hash to parent component
        // Parent will handle consent checking via API
        onVerified(result.user_hash);
      } else {
        setError(
          result.detail || "문제가 발생했습니다. 관리자에게 문의해주세요."
        );
      }
    } catch (error) {
      console.error("Whitelist check error:", error);
      setError("서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
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
        bgcolor: (t) => t.palette.grey[100],
        p: 2,
      }}
    >
      <Paper elevation={4} sx={{ p: 4, width: "100%", maxWidth: 420 }}>
        <Typography variant="h5" fontWeight={700} textAlign="center" mb={3}>
          인증
        </Typography>
        <Box component="form" noValidate onSubmit={handleSubmit}>
          <Stack spacing={2.5}>
            <TextField
              label="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름"
              fullWidth
              size="small"
              autoComplete="name"
              autoFocus
            />
            <TextField
              label="전화번호"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="전화번호 (010-1234-5678)"
              fullWidth
              size="small"
              autoComplete="tel"
              inputProps={{ inputMode: "tel", maxLength: 13 }}
            />
            {error && (
              <Alert severity="error" sx={{ py: 0 }}>
                {error}
              </Alert>
            )}
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              fullWidth
            >
              {loading ? "확인 중..." : "인증하기"}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
};

export default WhitelistCheckPage;
