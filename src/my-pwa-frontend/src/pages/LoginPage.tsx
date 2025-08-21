import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { Box, Paper, Typography, Stack, Button, Alert } from "@mui/material";

type OAuthProvider = "google" | "kakao";

const LoginPage: React.FC = () => {
  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const handleSocialLogin = async (provider: OAuthProvider) => {
    if (loadingProvider) return; // prevent double clicks
    setError(null);
    setLoadingProvider(provider);
    try {
      await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      });
    } catch (err) {
      console.error(`${provider} login error:`, err);
      setError("로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
      setLoadingProvider(null);
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
          로그인
        </Typography>
        <Stack spacing={2.5}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          <Button
            variant="contained"
            color="error"
            fullWidth
            size="large"
            onClick={() => handleSocialLogin("google")}
            disabled={!!loadingProvider}
          >
            {loadingProvider === "google"
              ? "Google 로그인 중..."
              : "Google로 로그인"}
          </Button>
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={() => handleSocialLogin("kakao")}
            disabled={!!loadingProvider}
            sx={{
              bgcolor: "#FEE500",
              color: "rgba(0,0,0,0.85)",
              "&:hover": { bgcolor: "#FDD400" },
            }}
          >
            {loadingProvider === "kakao"
              ? "Kakao 로그인 중..."
              : "Kakao로 로그인"}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default LoginPage;
