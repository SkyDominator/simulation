import { useEffect } from "react";
import { api } from "../services/api";
import type { Page } from "../types/types";

/**
 * Keeps the pre-auth flow (whitelist -> consent -> login) in sync with backend consent state.
 * Drives page transitions based on consent presence for the given userHash.
 */
export function useConsentFlow(
  user: unknown,
  userHash: string | null,
  page: Page,
  setPage: (p: Page) => void
): void {
  useEffect(() => {
    if (user || !userHash) return;

    let cancelled = false;
    const check = async () => {
      try {
        const response = await api.getUserConsents(userHash);
        const hasConsent = response.consents.some(
          (c: { consent_type: string }) => c.consent_type === "privacy_policy"
        );
        if (cancelled) return;
        if (hasConsent && page !== "login") {
          setPage("login");
        } else if (!hasConsent && page !== "consent") {
          setPage("consent");
        }
      } catch {
        if (cancelled) return;
        // On error, be conservative and request consent
        if (page !== "consent") setPage("consent");
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [user, userHash, page, setPage]);
}
