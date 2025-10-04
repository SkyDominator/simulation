import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { type Session, type User } from "@supabase/supabase-js";
import { AuthContext, type UserLike } from "./AuthContextBase";
import { isE2EMode } from "../utils/testMode";

const buildSessionFromTestToken = (): Session | null => {
  if (!isE2EMode()) return null;
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem("supabase.auth.token");
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as {
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
      token_type?: string;
      user?: unknown;
    };

    const accessToken = parsed.access_token ?? "";
    if (!accessToken) return null;

    const expiresAtMs =
      typeof parsed.expires_at === "number"
        ? parsed.expires_at
        : Date.now() + 60 * 60 * 1000;
    const expiresAtSeconds = Math.floor(expiresAtMs / 1000);
    const nowSeconds = Math.floor(Date.now() / 1000);

    const session: Session = {
      access_token: accessToken,
      refresh_token: parsed.refresh_token ?? "",
      expires_in: Math.max(0, expiresAtSeconds - nowSeconds),
      expires_at: expiresAtSeconds,
      token_type: parsed.token_type ?? "bearer",
      user: (parsed.user ?? null) as User,
      provider_token: undefined,
      provider_refresh_token: undefined,
    };

    return session;
  } catch (error) {
    console.warn("Failed to build test session", error);
    return null;
  }
};

interface LocalAuthContextShape {
  user: UserLike;
  session: Session | null;
  signOut: () => Promise<void>;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserLike>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const setInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const effectiveSession = session ?? buildSessionFromTestToken();
      setSession(effectiveSession);
      setUser((effectiveSession?.user as unknown) ?? null);
      setLoading(false);
    };

    setInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const effectiveSession = session ?? buildSessionFromTestToken();
      setSession(effectiveSession);
      setUser((effectiveSession?.user as unknown) ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !isE2EMode()) {
      return;
    }

    const handleE2EOAuth = () => {
      const mockSession = buildSessionFromTestToken();
      if (mockSession) {
        setSession(mockSession);
        setUser((mockSession.user as unknown) ?? null);
      }
    };

    window.addEventListener("e2e:oauth-click", handleE2EOAuth);
    return () => {
      window.removeEventListener("e2e:oauth-click", handleE2EOAuth);
    };
  }, []);

  const signOut = async () => {
    if (import.meta.env.DEV) {
      console.log("AuthContext.signOut invoked", { e2e: isE2EMode() });
    }
    try {
      if (!isE2EMode()) {
        // Local sign out; then global as a safeguard
        await supabase.auth.signOut({ scope: "local" });
        await supabase.auth.signOut({ scope: "global" });
      }
    } catch (e) {
      console.warn("Supabase signOut error (will fallback clear):", e);
    }

    // Manual storage purge (covers iOS Safari quirks)
    try {
      if (isE2EMode()) {
        localStorage.clear();
        sessionStorage.clear();
      } else {
        Object.keys(localStorage).forEach((k) => {
          if (
            k.includes("auth-token") ||
            k === "supabase.auth.token" ||
            k === "sb-test-auth-token" ||
            k.startsWith("sb-") ||
            k.startsWith("ui.") ||
            k === "privacy_consent_temp"
          ) {
            try {
              localStorage.removeItem(k);
            } catch {
              void 0; // no-op
            }
          }
        });
        // Ensure Supabase tokens are cleared even if key iteration missed them
        localStorage.removeItem("supabase.auth.token");
        localStorage.removeItem("sb-test-auth-token");
        sessionStorage.clear();
      }
    } catch {
      void 0; // no-op
    }

    setSession(null);
    setUser(null);

    if (!isE2EMode()) {
      // Verify session truly gone; if still present, force hard reload (iOS standalone sometimes caches)
      try {
        const {
          data: { session: checkSession },
        } = await supabase.auth.getSession();
        if (checkSession) {
          console.warn(
            "Session still present after signOut; forcing hard reload"
          );
          setTimeout(() => {
            // Use location.replace to avoid back navigation returning to authed state
            window.location.replace("/");
          }, 30);
        }
      } catch {
        void 0; // no-op
      }
    }
  };

  const value: LocalAuthContextShape = {
    user,
    session,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// useAuth moved to separate file to satisfy fast refresh rules.
