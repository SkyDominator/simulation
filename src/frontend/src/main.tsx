import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { registerSW } from "virtual:pwa-register";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Register PWA Service Worker (autoUpdate). Show a prompt when a new version is available.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    const ok = confirm("새 버전이 준비되었습니다. 지금 새로고침할까요?");
    if (ok) updateSW(true);
  },
  onOfflineReady() {
    // Optional: toast can be shown here
    // console.info('App ready to work offline')
  },
});
