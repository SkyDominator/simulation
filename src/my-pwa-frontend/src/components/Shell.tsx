import React from "react";
import Box from "@mui/material/Box";

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
      <Box
        component="header"
        sx={{ p: 2, bgcolor: "primary.main", color: "primary.contrastText" }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <h1 style={{ margin: 0, fontSize: 20 }}>Partner Club</h1>
        </div>
      </Box>

      <Box
        component="main"
        sx={{
          flex: 1,
          width: "100%",
          maxWidth: 1200,
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
