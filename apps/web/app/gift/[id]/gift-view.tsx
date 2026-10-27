"use client";

import { CATEGORY_LABELS, type CatalogResponse, type GiftView as GiftViewDto, type SenderGiftView } from "@nido/shared";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Avatar } from "@/components/avatar";
import { ProductImage } from "@/components/product-image";
import { StatusPill } from "@/components/status-pill";
import { BackLink, buttonClass, Card, EmptyState, ErrorState, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { describeClues, formatCop } from "@/lib/format";
import { useGiftEvents } from "@/lib/socket";
import { useApi } from "@/lib/use-api";
import { ProductSheet, type ScoredProduct } from "./product-sheet";

export function GiftView() {
  return (
    <AppShell>
      <SenderGift />
    </AppShell>
  );
}

function SenderGift() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: gift, error, loading, reload } = useApi<GiftViewDto>(`/gifts/${id}`);
  useGiftEvents(reload, id);

  useEffect(() => {
    if (gift?.role === "recipient")
      router.replace(gift.status === "CLUES_REQUESTED" ? `/clues/${id}` : `/reveal/${id}`);
  }, [gift, id, router]);

  if (loading && !gift) return <Spinner />;
  if (error && !gift) return <ErrorState message={error} onRetry={reload} />;
  if (!gift || gift.role !== "sender") return <Spinner />;

  return (
    <main className="flex flex-col gap-5">
      <BackLink href="/home" />
      <div className="grid gap-5 lg:grid-cols-[340px_1fr] lg:items-start lg:gap-8">
        <aside className="flex flex-col gap-5 lg:sticky lg:top-24">
          <div className="flex items-center gap-3">
            <Avatar user={gift.recipient} size={52} />
            <div className="flex-1">
              <h1 className="text-xl font-bold">Sorpresa para {gift.recipient.name}</h1>
              <p className="text-sm text-stone-500">Presupuesto {formatCop(gift.budgetCop)}</p>
            </div>
            <StatusPill status={gift.status} role="sender" />
          </div>

          <CluesCard gift={gift} onChange={reload} />
        </aside>
        <div className="min-w-0">
          <GiftStage gift={gift} />
        </div>
      </div>
    </main>
  );
}

function CluesCard({ gift, onChange }: { gift: SenderGiftView; onChange: () => void }) {
  const [skipping, setSkipping] = useState(false);
  const [skipError, setSkipError] = useState<string | null>(null);

  if (gift.status === "CLUES_REQUESTED") {
    async function skip() {
      setSkipping(true);
      setSkipError(null);
      try {
        await api(`/gifts/${gift.id}/skip-clues`, { method: "POST" });
        onChange();
      } catch (e) {
        setSkipError(e instanceof Error ? e.message : "No pudimos continuar");
        setSkipping(false);
      }
    }
    return (
      <Card className="text-center">
        <div className="flex justify-center gap-1.5 py-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-2.5 animate-bounce rounded-full bg-coral-400"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
        <p className="font-semibold">Esperando las pistas de {gift.recipient.name}…</p>
        <p className="mt-1 text-sm text-stone-500">
          Le avisamos que alguien le prepara una sorpresa. Verás sus respuestas aparecer aquí en vivo.
        </p>
        {skipError && <p className="mt-3 text-sm text-red-600">{skipError}</p>}
        <button onClick={skip} disabled={skipping} className={`${buttonClass.ghost} mt-4`}>
          {skipping ? "Continuando…" : "Seguir sin pistas"}
        </button>
      </Card>
    );
  }

  if (!gift.clues) {
    return (
      <Card className="text-sm text-stone-600">
        Seguiste sin pistas: ordenamos el catálogo por lo más cercano a tu presupuesto.
      </Card>
    );
  }

  return (
    <Card className="animate-pop-in">
      <p className="font-semibold">🕵️ Las pistas de {gift.recipient.name}</p>
      <dl className="mt-3 grid grid-cols-2 gap-3">
        {describeClues(gift.clues).map(({ label, value }, i) => (
          <div
            key={label}
            className="animate-pop-in rounded-2xl bg-coral-50 p-3"
            style={{ animationDelay: `${i * 120}ms` }}
          >
            <dt className="text-xs text-stone-500">{label}</dt>
            <dd className="font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function GiftStage({ gift }: { gift: SenderGiftView }) {
  switch (gift.status) {
    case "CLUES_REQUESTED":
      return (
        <div className="hidden lg:block">
          <EmptyState emoji="🕵️" title="El catálogo aparecerá cuando lleguen las pistas">
            Lo ordenaremos con el puntaje Corazonada según sus respuestas.
          </EmptyState>
        </div>
      );
    case "CLUES_ANSWERED":
    case "PAYMENT_REJECTED":
      return <Catalog gift={gift} />;
    case "PAYMENT_PENDING":
      return (
        <Card>
          <Spinner label="Confirmando con el banco…" />
        </Card>
      );
    case "PAID":
      return (
        <ChosenProduct gift={gift}>
          <p className="text-lg font-bold">¡Listo! Va en camino 🚚</p>
          <p className="text-sm text-stone-600">
            {gift.recipient.name} solo sabe que tiene una sorpresa. Te avisaremos cuando la destape.
          </p>
        </ChosenProduct>
      );
    case "REVEALED":
      return (
        <ChosenProduct gift={gift}>
          <p className="text-lg font-bold">{gift.recipient.name} está viendo tu regalo 👀</p>
        </ChosenProduct>
      );
    case "THANKED":
      return (
        <ChosenProduct gift={gift}>
          <p className="text-5xl">{gift.reaction}</p>
          <p className="font-bold">{gift.recipient.name} reaccionó a tu regalo</p>
          {gift.thankYouNote && <blockquote className="mt-1 italic text-stone-700">“{gift.thankYouNote}”</blockquote>}
        </ChosenProduct>
      );
  }
}

function ChosenProduct({ gift, children }: { gift: SenderGiftView; children: React.ReactNode }) {
  return (
    <Card className="animate-pop-in mx-auto flex w-full max-w-xl flex-col gap-4 text-center">
      <div className="flex flex-col items-center gap-1">{children}</div>
      {gift.product && (
        <div className="flex items-center gap-3 rounded-2xl bg-cream p-3 text-left">
          <ProductImage src={gift.product.imageUrl} alt={gift.product.title} className="w-20 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">{gift.product.title}</p>
            <p className="text-stone-500">
              Talla {gift.product.size} · {formatCop(gift.product.priceCop)}
            </p>
            {gift.message && <p className="mt-1 italic">“{gift.message}”</p>}
          </div>
        </div>
      )}
      <Link href="/home" className={buttonClass.secondary}>
        Volver al inicio
      </Link>
    </Card>
  );
}

function Catalog({ gift }: { gift: SenderGiftView }) {
  const { data, error, loading, reload } = useApi<CatalogResponse>(`/products?giftId=${gift.id}`);
  const [selected, setSelected] = useState<ScoredProduct | null>(null);

  return (
    <section className="flex flex-col gap-3">
      {gift.status === "PAYMENT_REJECTED" && gift.lastPayment && (
        <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-100">
          El último pago fue rechazado: <strong>{gift.lastPayment.failureReason ?? "intenta con otra tarjeta"}</strong>.
          Elige el regalo y vuelve a intentarlo.
        </div>
      )}
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Elige el regalo</h2>
        {data && <span className="text-xs text-stone-500">{data.products.length} opciones</span>}
      </div>
      {loading && !data && <Spinner label="Buscando corazonadas…" />}
      {error && !data && <ErrorState message={error} onRetry={reload} />}
      {data?.products.length === 0 && (
        <EmptyState emoji="🔍" title="Nada encaja con las pistas y el presupuesto">
          Prueba con una nueva Corazonada con más presupuesto.
        </EmptyState>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {data?.products.map((product) => (
          <button
            key={product.id}
            onClick={() => setSelected(product)}
            className="animate-pop-in flex flex-col gap-2 rounded-3xl bg-white p-2.5 text-left shadow-sm ring-1 ring-sand transition hover:ring-coral-200 active:scale-[0.98]"
          >
            <div className="relative">
              <ProductImage src={product.imageUrl} alt={product.title} />
              <span className="absolute top-2 left-2 rounded-full bg-coral-500 px-2 py-0.5 text-xs font-bold text-white shadow">
                ❤️ {product.score}%
              </span>
            </div>
            <div className="px-1">
              <p className="line-clamp-2 text-sm leading-tight font-medium">{product.title}</p>
              <p className="mt-1 text-xs text-stone-500">{CATEGORY_LABELS[product.category]}</p>
              <p className="font-semibold text-coral-700">{formatCop(product.priceCop)}</p>
            </div>
          </button>
        ))}
      </div>
      {selected && <ProductSheet product={selected} gift={gift} onClose={() => setSelected(null)} />}
    </section>
  );
}
