"use client";

import { useEffect, useState } from "react";
import type { HealthResponse } from "@nido/shared";
import { API_URL } from "@/lib/api";

type State =
  | { kind: "loading" }
  | { kind: "ok"; health: HealthResponse }
  | { kind: "error"; message: string };

export function HealthStatus() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setState({ kind: "ok", health: (await res.json()) as HealthResponse });
      })
      .catch((error: unknown) =>
        setState({ kind: "error", message: error instanceof Error ? error.message : "Error desconocido" }),
      );
  }, []);

  if (state.kind === "loading") return <p className="text-stone-500">Conectando con la API…</p>;
  if (state.kind === "error")
    return <p className="font-medium text-red-600">Sin conexión con la API ({state.message})</p>;
  return (
    <p className="font-medium text-emerald-700">
      Conectado ✅ <span className="block text-xs text-stone-500">{state.health.service} · {state.health.timestamp}</span>
    </p>
  );
}
