import { createContext } from "react";
import type { Session } from "@supabase/supabase-js";

// Allow any shape (Supabase User does not have index signature)
export type UserLike = unknown | null;

export interface AuthContextType {
  user: UserLike;
  session: Session | null;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export default AuthContext;
