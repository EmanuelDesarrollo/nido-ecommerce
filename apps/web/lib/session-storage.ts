import type { UserDto } from "@nido/shared";

// sessionStorage (not localStorage) so two tabs of the same browser can be Andrés and Laura.
const KEY = "nido:user";
const listeners = new Set<() => void>();

export function readStoredUserRaw(): string | null {
  try {
    return window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function parseUser(raw: string | null): UserDto | null {
  try {
    return raw ? (JSON.parse(raw) as UserDto) : null;
  } catch {
    return null;
  }
}

export function readStoredUserId(): string | null {
  return typeof window === "undefined" ? null : (parseUser(readStoredUserRaw())?.id ?? null);
}

export function storeUser(user: UserDto | null): void {
  try {
    if (user) window.sessionStorage.setItem(KEY, JSON.stringify(user));
    else window.sessionStorage.removeItem(KEY);
  } catch {
    // Storage blocked: the session just will not survive a reload.
  }
  listeners.forEach((notify) => notify());
}

export function subscribeToUser(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
