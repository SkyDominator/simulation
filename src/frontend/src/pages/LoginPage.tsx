import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  Alert,
  IconButton,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { isE2EMode } from "../utils/testMode";

type OAuthProvider = "google" | "kakao";

interface LoginPageProps {
  onBackToWhitelist?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onBackToWhitelist }) => {
  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const e2eMode = isE2EMode();

  const handleSocialLogin = async (provider: OAuthProvider) => {
    if (loadingProvider) return; // prevent double clicks
    setError(null);
    setLoadingProvider(provider);
    try {
      if (e2eMode) {
        // In E2E mode Supabase OAuth redirects would break the flow. The
        // AuthProvider reads the injected token and will treat the user as
        // authenticated after the click.
        setLoadingProvider(null);
        window.dispatchEvent(
          new CustomEvent("e2e:oauth-click", { detail: { provider } })
        );
        return;
      }
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
      <Paper
        elevation={4}
        sx={{ p: 4, width: "100%", maxWidth: 420, position: "relative" }}
        data-testid="login-form"
      >
        {onBackToWhitelist && (
          <Box sx={{ position: "absolute", top: 16, left: 16 }}>
            <IconButton
              onClick={onBackToWhitelist}
              color="primary"
              size="small"
              aria-label="이전 단계로"
            >
              <ArrowBackIcon />
            </IconButton>
          </Box>
        )}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            pt: onBackToWhitelist ? 3 : 0,
          }}
        >
          <Typography variant="h5" fontWeight={700} textAlign="center" mb={3}>
            로그인
          </Typography>
        </Box>
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
            data-testid="google-login"
          >
            {loadingProvider === "google"
              ? "Google 로그인 중..."
              : "Google로 로그인"}
          </Button>
          <Button
            variant="contained"
            data-testid="kakao-login"
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
