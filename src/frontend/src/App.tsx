import { AuthProvider } from "./context/AuthContext";
import AppController from "./AppController";
import "./App.css";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "./theme";
import Shell from "./components/Shell";
import LandscapeEnforcer from "./components/LandscapeEnforcer";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <LandscapeEnforcer>
          <Shell>
            <AppController />
          </Shell>
        </LandscapeEnforcer>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
