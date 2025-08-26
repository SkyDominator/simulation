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
import type { SimulationRunResponse } from "./types/types";
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

  const { user } = useAuth();

  const [simulationResult, setSimulationResult] =
    useState<SimulationRunResponse | null>(() =>
      getJSON<SimulationRunResponse | null>("ui.simulationResult", null)
    );

  // Track the current user's hash from whitelist check - NOT stored in localStorage
  const [userHash, setUserHash] = useState<string | null>(null);

  // Don't track consent locally - always check with backend

  // 공지사항 열기
  const handleOpenNotice = () => {
    setNoticeOpen(true);
  };

  // We need a key to force WhitelistCheckPage to remount when going back from login
  const [whitelistKey, setWhitelistKey] = useState(0);

  const whitelistOrLogin: Record<
    "whitelist" | "login" | "consent",
    React.ReactElement
  > = useMemo(
    () => ({
      whitelist: (
        <WhitelistCheckPage
          key={`whitelist-${whitelistKey}`}
          onVerified={(userHash) => {
            // Store the user hash for consent processing, but don't cache in localStorage
            setUserHash(userHash);
            // The consent check will be triggered by the useEffect when userHash changes
          }}
        />
      ),
      consent: (
        <ConsentPage
          userHash={userHash || ""}
          onAccept={() => {
            // Consent has been recorded in the backend by ConsentPage, proceed to login
            setPage("login");
          }}
          onDecline={() => {
            // User declined consent, go back to whitelist check
            setUserHash(null);
            setPage("whitelist");
            setWhitelistKey((prevKey) => prevKey + 1);
          }}
        />
      ),
      login: (
        <LoginPage
          onBackToWhitelist={() => {
            // Reset user hash and go back to whitelist check
            setUserHash(null);
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

  // Helper function to check consent status - separate from render
  const checkConsentStatus = useCallback(async () => {
    if (!userHash) return;

    try {
      const response = await api.getUserConsents(userHash);
      const hasConsent = response.consents.some(
        (consent: { consent_type: string }) =>
          consent.consent_type === "privacy_policy"
      );

      if (hasConsent && page !== "login") {
        // User already consented, go to login
        setPage("login");
      } else if (!hasConsent && page !== "consent") {
        // No consent record found, go to consent page
        setPage("consent");
      }
    } catch (error) {
      console.error("Failed to verify consent:", error);
      // On error, safer to direct to consent page
      if (page !== "consent") setPage("consent");
    }
  }, [userHash, page]);

  // Effect to check consent status when userHash changes
  useEffect(() => {
    if (!user && userHash) {
      checkConsentStatus();
    }
  }, [user, userHash, checkConsentStatus]);

  // Synchronous render function for React
  const renderPage = useCallback(() => {
    if (!user) {
      // If no userHash, always show whitelist page
      if (!userHash && page !== "whitelist") {
        return whitelistOrLogin.whitelist;
      }

      // Return the appropriate page based on current page state
      // (consent status check and page updates happen in the effect above)
      return page === "whitelist" || page === "login" || page === "consent"
        ? whitelistOrLogin[page]
        : whitelistOrLogin.whitelist;
    }

    // User is authenticated, show appropriate main page
    if (page === "main" || page === "plan-editor" || page === "results") {
      return mainPages[page];
    }
    return mainPages.main;
  }, [user, page, whitelistOrLogin, mainPages, userHash]);

  // Persist UI state whenever it changes - but NOT userHash or consent status
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
      // If logged out while on a protected page, send to whitelist
      // Don't reset userHash here - it's independent of auth status
      if (page === "main" || page === "plan-editor" || page === "results") {
        setPage("whitelist");
      }
    }
  }, [user, page]);

  // Restore state on app/tab visibility changes (helps iOS/Android/PC when app is backgrounded and returns)
  // No longer restoring userHash or consentGiven from localStorage
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
