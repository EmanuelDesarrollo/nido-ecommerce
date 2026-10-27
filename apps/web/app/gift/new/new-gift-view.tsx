"use client";

import { BUDGET_OPTIONS_COP, type SenderGiftView, type UserDto } from "@nido/shared";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Avatar } from "@/components/avatar";
import { BackLink, buttonClass, chipClass, EmptyState, ErrorState, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { formatCop } from "@/lib/format";
import { useSession } from "@/lib/session";
import { useApi } from "@/lib/use-api";

export function NewGiftView() {
  return (
    <AppShell>
      <NewGiftForm />
    </AppShell>
  );
}

function NewGiftForm() {
  const { user } = useSession();
  const router = useRouter();
  const preselected = useSearchParams().get("to");
  const { data: users, error, loading, reload } = useApi<UserDto[]>("/users");
  const others = users?.filter((u) => u.id !== user?.id) ?? [];

  const [chosen, setChosen] = useState<string | null>(null);
  const [budget, setBudget] = useState<number>(BUDGET_OPTIONS_COP[1]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const recipientId = chosen ?? (others.some((u) => u.id === preselected) ? preselected : others[0]?.id) ?? null;

  async function submit() {
    if (!recipientId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const gift = await api<SenderGiftView>("/gifts", { method: "POST", body: { recipientId, budgetCop: budget } });
      router.push(`/gift/${gift.id}`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "No pudimos crear la sorpresa");
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <BackLink href="/home" />
      <div>
        <h1 className="text-2xl font-bold">Nueva Corazonada</h1>
        <p className="mt-1 text-stone-600">
          Le pediremos pistas sin decirle quién eres ni qué le vas a regalar.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">¿Para quién?</h2>
        {loading && !users && <Spinner />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {users && others.length === 0 && <EmptyState emoji="🫥" title="No hay a quién regalarle todavía" />}
        <div className="flex flex-col gap-2">
          {others.map((u) => (
            <button
              key={u.id}
              onClick={() => setChosen(u.id)}
              className={`flex items-center gap-3 rounded-3xl bg-white p-3 text-left ring-1 transition ${
                recipientId === u.id ? "ring-2 ring-coral-500" : "ring-sand"
              }`}
            >
              <Avatar user={u} size={44} />
              <span className="flex-1 font-medium">{u.name}</span>
              {recipientId === u.id && <span className="text-coral-500">✓</span>}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Presupuesto</h2>
        <div className="flex flex-wrap gap-2">
          {BUDGET_OPTIONS_COP.map((value) => (
            <button key={value} onClick={() => setBudget(value)} className={chipClass(budget === value)}>
              {formatCop(value)}
            </button>
          ))}
        </div>
      </section>

      {submitError && <p className="text-sm font-medium text-red-600">{submitError}</p>}
      <button onClick={submit} disabled={!recipientId || submitting} className={buttonClass.primary}>
        {submitting ? "Enviando…" : "Pedir pistas 🕵️"}
      </button>
    </main>
  );
}
