import { AuthProvider } from "./context/AuthContext";
import AppController from "./AppController";
import "./App.css";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "./theme";
import Shell from "./components/Shell";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Shell>
          <AppController />
        </Shell>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
