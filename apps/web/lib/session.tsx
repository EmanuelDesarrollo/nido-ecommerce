"use client";

import type { UserDto } from "@nido/shared";
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { parseUser, readStoredUserRaw, storeUser, subscribeToUser } from "./session-storage";

interface SessionValue {
  user: UserDto | null;
  /** false until the stored user has been read on the client. */
  ready: boolean;
  signIn: (user: UserDto) => void;
  signOut: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);
const NOT_READ = undefined;

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const raw = useSyncExternalStore(subscribeToUser, readStoredUserRaw, () => NOT_READ);
  const user = useMemo(() => (raw === NOT_READ ? null : parseUser(raw)), [raw]);

  const signIn = useCallback((next: UserDto) => storeUser(next), []);
  const signOut = useCallback(() => storeUser(null), []);

  const value = useMemo(() => ({ user, ready: raw !== NOT_READ, signIn, signOut }), [user, raw, signIn, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}
