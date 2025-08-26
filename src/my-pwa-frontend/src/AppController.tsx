import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "./context/useAuth";
import WhitelistCheckPage from "./pages/WhitelistCheckPage";
import LoginPage from "./pages/LoginPage";
import MainPage from "./pages/MainPage";
import PlanEditorPage from "./pages/PlanEditor";
import ResultsPage from "./pages/ResultsPage";
import ConsentPage from "./pages/ConsentPage";
import { type Plan, type Page } from "./types/types";
import { NoticeBoardModal } from "./components/NoticeBoardModal";
import type {
  SimulationRunResponse,
  ConsentRecordRequest,
} from "./types/types";
import { getJSON, setJSON } from "./utils/persist";
import { api } from "./services/api";

const AppController = () => {
  // Restore last UI state if available; default to whitelist
  const [page, setPage] = useState<Page>(() =>
    getJSON<Page>("ui.page", "whitelist")
  );

  // This key is used to force re-mount the WhitelistCheckPage component when going back from login
  const [editingPlan, setEditingPlan] = useState<Plan | null>(() =>
    getJSON<Plan | null>("ui.editingPlan", null)
  );
  const [noticeOpen, setNoticeOpen] = useState(() =>
    getJSON<boolean>("ui.noticeOpen", false)
  );

  const { user, session } = useAuth();

  const [simulationResult, setSimulationResult] =
    useState<SimulationRunResponse | null>(() =>
      getJSON<SimulationRunResponse | null>("ui.simulationResult", null)
    );

  // Track the current user's hash from whitelist check
  const [userHash, setUserHash] = useState<string | null>(() =>
    getJSON<string | null>("ui.userHash", null)
  );

  // Track if consent has been given
  const [consentGiven, setConsentGiven] = useState<boolean>(() =>
    getJSON<boolean>("ui.consentGiven", false)
  );

  // 공지사항 열기
  const handleOpenNotice = () => {
    setNoticeOpen(true);
  };

  // We need a key to force WhitelistCheckPage to remount when going back from login
  const [whitelistKey, setWhitelistKey] = useState(0);

  // No need for consent checking logic tied to login anymore
  // We'll handle consent based on whitelist status, not login status

  const whitelistOrLogin: Record<
    "whitelist" | "login" | "consent",
    React.ReactElement
  > = useMemo(
    () => ({
      whitelist: (
        <WhitelistCheckPage
          key={`whitelist-${whitelistKey}`}
          onVerified={(userHash, hasConsent) => {
            // Store the user hash for consent processing
            setUserHash(userHash);
            setConsentGiven(hasConsent);

            if (hasConsent) {
              // User already consented, go straight to login
              setPage("login");
            } else {
              // User needs to consent first
              setPage("consent");
            }
          }}
        />
      ),
      consent: (
        <ConsentPage
          userHash={userHash || ""}
          onAccept={() => {
            // Consent has been recorded in the backend, proceed to login
            setConsentGiven(true);
            setPage("login");
          }}
          onDecline={() => {
            // User declined consent, go back to whitelist check
            setUserHash(null);
            setConsentGiven(false);
            setPage("whitelist");
            setWhitelistKey((prevKey) => prevKey + 1);
          }}
        />
      ),
      login: (
        <LoginPage
          onBackToWhitelist={() => {
            // Reset state and go back to whitelist check
            setUserHash(null);
            setConsentGiven(false);
            setPage("whitelist");
            // Increment key to force remount of the WhitelistCheckPage component
            setWhitelistKey((prevKey) => prevKey + 1);
          }}
        />
      ),
    }),
    [setPage, whitelistKey, userHash]
  );

  const mainPages: Record<
    "main" | "plan-editor" | "results",
    React.ReactElement
  > = useMemo(
    () => ({
      main: (
        <MainPage
          setPage={setPage}
          setEditingPlan={setEditingPlan}
          openNotice={handleOpenNotice}
          setSimulationResult={setSimulationResult}
        />
      ),
      "plan-editor": (
        <PlanEditorPage setPage={setPage} editingPlan={editingPlan} />
      ),
      results: <ResultsPage setPage={setPage} result={simulationResult} />,
    }),
    [editingPlan, simulationResult, setPage]
  );

  const renderPage = useCallback(() => {
    if (!user) {
      // Force consent page if userHash exists but consent not given
      if (userHash && !consentGiven && page === "login") {
        return whitelistOrLogin.consent;
      }

      return page === "whitelist" || page === "login" || page === "consent"
        ? whitelistOrLogin[page]
        : whitelistOrLogin.whitelist;
    }

    if (page === "main" || page === "plan-editor" || page === "results") {
      return mainPages[page];
    }
    return mainPages.main;
  }, [user, page, whitelistOrLogin, mainPages, userHash, consentGiven]);

  // Persist UI state whenever it changes
  useEffect(() => {
    setJSON("ui.page", page);
  }, [page]);
  useEffect(() => {
    setJSON("ui.editingPlan", editingPlan);
  }, [editingPlan]);
  useEffect(() => {
    setJSON("ui.noticeOpen", noticeOpen);
  }, [noticeOpen]);
  useEffect(() => {
    setJSON("ui.consentGiven", consentGiven);
  }, [consentGiven]);
  useEffect(() => {
    setJSON("ui.userHash", userHash);
  }, [userHash]);
  useEffect(() => {
    setJSON("ui.simulationResult", simulationResult);
  }, [simulationResult]);

  // When auth status changes: handle user login/logout flow
  useEffect(() => {
    if (user) {
      // User has logged in
      // Allow staying on the current page if already on a protected page

      // If on login or consent page but already logged in, move to main
      if (page === "login" || page === "consent") {
        setPage("main");
      }
    } else {
      // User logged out
      // Reset consent state when logged out
      setUserHash(null);

      // If logged out while on a protected page, send to whitelist
      if (page === "main" || page === "plan-editor" || page === "results") {
        setPage("whitelist");
      }
    }
  }, [user, page]);

  // Restore state on app/tab visibility changes (helps iOS/Android/PC when app is backgrounded and returns)
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        const savedPage = getJSON<Page>("ui.page", page);
        const savedEditing = getJSON<Plan | null>(
          "ui.editingPlan",
          editingPlan
        );
        const savedNotice = getJSON<boolean>("ui.noticeOpen", noticeOpen);
        const savedResult = getJSON<SimulationRunResponse | null>(
          "ui.simulationResult",
          simulationResult
        );
        // Apply only if differs to avoid loops
        if (savedPage && savedPage !== page) setPage(savedPage);
        if (savedNotice !== noticeOpen) setNoticeOpen(savedNotice);
        // For objects, shallow compare by JSON string length to avoid heavy ops
        const toJSONLen = (v: unknown) => {
          try {
            return JSON.stringify(v)?.length ?? 0;
          } catch {
            return 0;
          }
        };
        if (toJSONLen(savedEditing) !== toJSONLen(editingPlan))
          setEditingPlan(savedEditing);
        if (toJSONLen(savedResult) !== toJSONLen(simulationResult))
          setSimulationResult(savedResult);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
    };
  }, [page, editingPlan, noticeOpen, simulationResult]);

  return (
    <div className="min-h-screen bg-gray-50">
      {renderPage()}
      <NoticeBoardModal
        isOpen={noticeOpen}
        onClose={() => setNoticeOpen(false)}
      />
    </div>
  );
};

export default AppController;
