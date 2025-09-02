import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Bottom navigation removed per request.

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      <Box component="header" sx={{ p: 2 }}>
        <Box
          sx={{
            maxWidth: 600,
            mx: "auto",
            bgcolor: "primary.main",
            color: "primary.contrastText",
            borderRadius: 1,
            px: 2,
            py: 1,
          }}
        >
          <Typography
            component="h1"
            sx={{ m: 0, fontSize: 20, fontWeight: 600 }}
          >
            생명빛 클럽 시뮬레이션
          </Typography>
        </Box>
      </Box>

      <Box
        component="main"
        sx={{
          flex: 1,
          width: "100%",
          maxWidth: 1400,
          margin: "0 auto",
          p: { xs: 2, md: 4 },
        }}
      >
        {children}
      </Box>

      {/* Bottom navigation removed */}
    </Box>
  );
};

export default Shell;
