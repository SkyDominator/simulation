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
  onVerified: () => void;
}

const WhitelistCheckPage: React.FC<WhitelistCheckPageProps> = ({
  onVerified,
}) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError("이름과 전화번호를 모두 입력해주세요.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await api.checkWhitelist(name, phone);

      if (result.is_whitelisted) {
        onVerified();
      } else {
        setError(
          result.detail || "명단에 없는 사용자입니다. 관리자에게 문의해주세요."
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
              onChange={(e) => setPhone(e.target.value)}
              placeholder="전화번호 (010-1234-5678)"
              fullWidth
              size="small"
              autoComplete="tel"
              inputProps={{ inputMode: "tel" }}
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
