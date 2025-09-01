import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";

// Overlay that blocks interaction when device is in portrait.
// Attempts to lock orientation to landscape where supported.
const LandscapeEnforcer: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isPortrait, setIsPortrait] = useState(
    () => window.matchMedia("(orientation: portrait)").matches
  );
  const [lockTried, setLockTried] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    const handler = () => setIsPortrait(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
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
          /* ignore */
        })
        .finally(() => setLockTried(true));
    }
  }, [lockTried]);

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
