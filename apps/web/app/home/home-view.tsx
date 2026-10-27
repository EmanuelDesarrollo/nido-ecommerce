"use client";

import type { GiftListResponse, RecipientGiftView, SenderGiftView } from "@nido/shared";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Avatar } from "@/components/avatar";
import { StatusPill } from "@/components/status-pill";
import { buttonClass, EmptyState, ErrorState, Spinner } from "@/components/ui";
import { formatCop } from "@/lib/format";
import { useGiftEvents } from "@/lib/socket";
import { useApi } from "@/lib/use-api";

export function HomeView() {
  return (
    <AppShell>
      <Inbox />
    </AppShell>
  );
}

function Inbox() {
  const { data, error, loading, reload } = useApi<GiftListResponse>("/gifts");
  useGiftEvents(reload);

  return (
    <main className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <h1 className="hidden text-3xl font-bold md:block">Tus sorpresas</h1>
        <Link href="/gift/new" className={`${buttonClass.primary} md:w-auto`}>
          🎁 Nueva Corazonada
        </Link>
      </div>

      {loading && !data && <Spinner label="Cargando tus sorpresas…" />}
      {error && !data && <ErrorState message={error} onRetry={reload} />}

      {data && (
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          <section className="flex flex-col gap-3">
            <h2 className="font-semibold">Sorpresas para ti</h2>
            {data.received.length === 0 ? (
              <EmptyState emoji="📭" title="Nada por ahora">
                Cuando alguien te prepare una sorpresa, te avisaremos aquí mismo.
              </EmptyState>
            ) : (
              data.received.map((gift) => <ReceivedRow key={gift.id} gift={gift} />)
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold">Sorpresas que preparas</h2>
            {data.sent.length === 0 ? (
              <EmptyState emoji="✨" title="Aún no has enviado ninguna">
                Pide pistas y acierta con el regalo.
              </EmptyState>
            ) : (
              data.sent.map((gift) => <SentRow key={gift.id} gift={gift} />)
            )}
          </section>
        </div>
      )}
    </main>
  );
}

const rowClass =
  "animate-pop-in flex items-center gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-sand transition hover:ring-coral-200";

function ReceivedRow({ gift }: { gift: RecipientGiftView }) {
  const href = gift.status === "CLUES_REQUESTED" ? `/clues/${gift.id}` : `/reveal/${gift.id}`;
  const highlight = gift.status === "CLUES_REQUESTED" || gift.status === "PAID";
  return (
    <Link href={href} className={`${rowClass} ${highlight ? "ring-2 ring-coral-400" : ""}`}>
      {gift.sender ? (
        <Avatar user={gift.sender} />
      ) : (
        <span className="grid size-10 place-items-center text-2xl">🎁</span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{gift.sender ? `De ${gift.sender.name}` : "De alguien especial"}</p>
        <p className="text-xs text-stone-500">{new Date(gift.createdAt).toLocaleDateString("es-CO")}</p>
      </div>
      <StatusPill status={gift.status} role="recipient" />
    </Link>
  );
}

function SentRow({ gift }: { gift: SenderGiftView }) {
  return (
    <Link href={`/gift/${gift.id}`} className={rowClass}>
      <Avatar user={gift.recipient} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">Para {gift.recipient.name}</p>
        <p className="text-xs text-stone-500">
          {gift.product ? gift.product.title : `Presupuesto ${formatCop(gift.budgetCop)}`}
        </p>
      </div>
      <StatusPill status={gift.status} role="sender" />
    </Link>
  );
}
