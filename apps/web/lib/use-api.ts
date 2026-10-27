"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

export interface ApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

interface Settled<T> {
  key: string;
  data: T | null;
  error: string | null;
}

/** GET a resource; pass null to skip. reload() refetches without clearing the current data. */
export function useApi<T>(path: string | null): ApiState<T> {
  const [version, setVersion] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const key = path ? `${path}#${version}` : null;

  useEffect(() => {
    if (!path || !key) return;
    let cancelled = false;
    api<T>(path)
      .then((data) => !cancelled && setSettled({ key, data, error: null }))
      .catch(
        (e: unknown) =>
          !cancelled &&
          setSettled((prev) => ({
            key,
            data: prev?.key.startsWith(`${path}#`) ? prev.data : null,
            error: e instanceof Error ? e.message : "Error inesperado",
          })),
      );
    return () => {
      cancelled = true;
    };
  }, [path, key]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const samePath = path !== null && settled?.key.startsWith(`${path}#`);
  return {
    data: samePath ? (settled?.data ?? null) : null,
    error: samePath ? (settled?.error ?? null) : null,
    loading: key !== null && settled?.key !== key,
    reload,
  };
}
