import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { type Session } from "@supabase/supabase-js";
import { AuthContext, type UserLike } from "./AuthContextBase";

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
      setSession(session);
      setUser((session?.user as unknown) ?? null);
      setLoading(false);
    };

    setInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser((session?.user as unknown) ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      // Step 1: local sign out (clears this device)
      await supabase.auth.signOut({ scope: "local" });
      // Step 2: redundant global sign out (revokes refresh token if still present)
      await supabase.auth.signOut({ scope: "global" });
    } catch (e) {
      // swallow; we'll still attempt manual clear
      console.warn("Supabase signOut error (will fallback clear):", e);
    }

    // Manual storage purge (covers iOS Safari quirks)
    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.includes("auth-token") || k.startsWith("sb-")) {
          try {
            localStorage.removeItem(k);
          } catch {
            /* noop */
          }
        }
      });
      sessionStorage.clear();
    } catch {
      /* ignore storage errors */
    }

    setSession(null);
    setUser(null);

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
      /* ignore */
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
