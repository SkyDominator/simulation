import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { isE2EMode } from "../utils/testMode";

// Overlay that blocks interaction when device is in portrait.
// Attempts to lock orientation to landscape where supported.
const LandscapeEnforcer: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const e2eMode = isE2EMode();

  if (import.meta.env.DEV || e2eMode) {
    console.log("[LandscapeEnforcer] Initialized:", {
      e2eMode,
      viewport:
        typeof window !== "undefined"
          ? { width: window.innerWidth, height: window.innerHeight }
          : null,
      orientation:
        typeof window !== "undefined"
          ? window.matchMedia("(orientation: portrait)").matches
            ? "portrait"
            : "landscape"
          : null,
    });
  }

  const [isPortrait, setIsPortrait] = useState(() => {
    if (e2eMode || typeof window === "undefined") {
      return false;
    }
    const matches = window.matchMedia("(orientation: portrait)").matches;
    if (import.meta.env.DEV) {
      console.log("[LandscapeEnforcer] Initial portrait detection:", matches);
    }
    return matches;
  });
  const [lockTried, setLockTried] = useState(false);

  useEffect(() => {
    if (e2eMode || typeof window === "undefined") {
      return;
    }
    const mq = window.matchMedia("(orientation: portrait)");
    const handler = () => setIsPortrait(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [e2eMode]);

  useEffect(() => {
    if (e2eMode || typeof window === "undefined") {
      return;
    }
    interface MaybeScreenOrientation {
      lock?: (o: string) => Promise<void>;
    }
    const orientation: MaybeScreenOrientation | undefined = (
      window.screen as unknown as { orientation?: MaybeScreenOrientation }
    ).orientation;
    if (!lockTried && orientation?.lock) {
      orientation
        .lock("landscape")
        .catch(() => {
          void 0; // no-op
        })
        .finally(() => setLockTried(true));
    }
  }, [e2eMode, lockTried]);

  if (e2eMode) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      {isPortrait && (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            bgcolor: "background.default",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            p: 3,
            textAlign: "center",
          }}
        >
          <Typography variant="h5" gutterBottom fontWeight={700}>
            가로 모드로 전환해주세요
          </Typography>
          <Typography variant="body1" color="text.secondary">
            이 앱은 가로(landscape) 모드에서만 사용할 수 있습니다. 기기를
            회전해주세요.
          </Typography>
        </Box>
      )}
    </>
  );
};

export default LandscapeEnforcer;
