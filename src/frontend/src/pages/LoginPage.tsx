import React, { useState, useEffect } from "react";
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
import { isEmbeddedBrowser } from "../utils/browserDetection";
import EmbeddedBrowserWarningModal from "../components/EmbeddedBrowserWarningModal";

type OAuthProvider = "google" | "kakao";

interface LoginPageProps {
  onBackToWhitelist?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onBackToWhitelist }) => {
  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [showEmbeddedBrowserWarning, setShowEmbeddedBrowserWarning] =
    useState(false);
  const [showEmbeddedBanner, setShowEmbeddedBanner] = useState(false);
  const [isEmbedded, setIsEmbedded] = useState(false);
  const e2eMode = isE2EMode();

  // Detect embedded browser on mount and show persistent warning banner
  useEffect(() => {
    const embedded = isEmbeddedBrowser();
    setIsEmbedded(embedded);
    if (embedded) {
      setShowEmbeddedBanner(true);
    }
  }, []);

  const handleSocialLogin = async (provider: OAuthProvider) => {
    if (loadingProvider) return; // prevent double clicks

    // Check if running in embedded browser before attempting OAuth
    if (isEmbeddedBrowser()) {
      console.warn(
        `OAuth blocked: Running in embedded browser. Provider: ${provider}`
      );
      setShowEmbeddedBrowserWarning(true);
      return;
    }

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
    } catch (err: unknown) {
      console.error("[OAuth] Login error:", {
        provider,
        error: err,
        message: err instanceof Error ? err.message : "",
        isEmbeddedBrowser: isEmbeddedBrowser(),
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });

      // Check for network errors
      const errorMessage = err instanceof Error ? err.message : "";
      const isNetworkError =
        errorMessage.includes("fetch") ||
        errorMessage.includes("network") ||
        errorMessage.includes("timeout");

      // Check for OAuth policy errors
      const isOAuthPolicyError =
        errorMessage.includes("403") ||
        errorMessage.includes("disallowed_useragent") ||
        errorMessage.includes("secure browser");

      if (isOAuthPolicyError && isEmbeddedBrowser()) {
        // OAuth blocked by Google in embedded browser
        setShowEmbeddedBrowserWarning(true);
        setError(null);
      } else if (isNetworkError) {
        setError("네트워크 연결을 확인해주세요.");
      } else {
        // Generic error
        setError("로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
      }

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
              data-testid="login-back-button"
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
          {showEmbeddedBanner && (
            <Alert
              severity="warning"
              onClose={() => setShowEmbeddedBanner(false)}
              sx={{ mb: 2 }}
              data-testid="embedded-browser-banner"
            >
              <Typography variant="body2">
                앱 내부 브라우저에서는 Google 로그인이 제한됩니다. 일반
                브라우저(Chrome, Safari)에서 열어주세요.
              </Typography>
            </Alert>
          )}
          {error && (
            <Alert
              severity="error"
              onClose={() => setError(null)}
              data-testid="login-error"
            >
              {error}
            </Alert>
          )}
          <Button
            variant="contained"
            color="error"
            fullWidth
            size="large"
            onClick={() => handleSocialLogin("google")}
            disabled={!!loadingProvider || isEmbedded}
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
            disabled={!!loadingProvider || isEmbedded}
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

      {/* Embedded Browser Warning Modal */}
      <EmbeddedBrowserWarningModal
        open={showEmbeddedBrowserWarning}
        onClose={() => setShowEmbeddedBrowserWarning(false)}
      />
    </Box>
  );
};

export default LoginPage;
