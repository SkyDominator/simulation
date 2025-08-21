import React from "react";
import Box from "@mui/material/Box";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Paper from "@mui/material/Paper";
import HomeIcon from "@mui/icons-material/Home";
import SettingsIcon from "@mui/icons-material/Settings";

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [value, setValue] = React.useState(0);

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

      <Paper sx={{ position: "sticky", bottom: 0 }} elevation={6}>
        <BottomNavigation
          showLabels
          value={value}
          onChange={(_, newVal) => setValue(newVal)}
        >
          <BottomNavigationAction label="Home" icon={<HomeIcon />} />
          <BottomNavigationAction label="Plans" icon={<SettingsIcon />} />
        </BottomNavigation>
      </Paper>
    </Box>
  );
};

export default Shell;
