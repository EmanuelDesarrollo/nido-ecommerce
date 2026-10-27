"use client";

import {
  SocketEvent,
  TEST_CARDS,
  type CatalogResponse,
  type CheckoutResultDto,
  type GiftView,
  type PaymentStatus,
} from "@nido/shared";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ProductImage } from "@/components/product-image";
import { BackLink, buttonClass, Card, ErrorState, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { formatCop, newIdempotencyKey } from "@/lib/format";
import { useSocketEvent } from "@/lib/socket";
import { useApi } from "@/lib/use-api";

export function CheckoutView() {
  return (
    <AppShell>
      <Checkout />
    </AppShell>
  );
}

const DEMO_CARDS = [
  { label: "Aprobada", number: TEST_CARDS.approved, tone: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  { label: "Rechazada", number: TEST_CARDS.rejected, tone: "bg-red-50 text-red-700 ring-red-200" },
  { label: "Pendiente", number: TEST_CARDS.pending, tone: "bg-amber-50 text-amber-800 ring-amber-200" },
];

const formatCardNumber = (value: string) =>
  value
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ");

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

interface Outcome {
  status: PaymentStatus;
  failureReason: string | null;
}

function Checkout() {
  const { id } = useParams<{ id: string }>();
  const query = useSearchParams();
  const productId = Number(query.get("productId"));
  const variantId = Number(query.get("variantId"));
  const message = query.get("message") ?? "";

  const gift = useApi<GiftView>(`/gifts/${id}`);
  const canPay = gift.data?.status === "CLUES_ANSWERED" || gift.data?.status === "PAYMENT_REJECTED";
  const catalog = useApi<CatalogResponse>(canPay ? `/products?giftId=${id}` : null);

  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  // One key per payment attempt: a double submit or network retry never charges twice.
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  useSocketEvent(SocketEvent.PAYMENT_UPDATED, (event) => {
    if (event.giftId !== id) return;
    setOutcome({ status: event.paymentStatus, failureReason: event.failureReason });
    gift.reload();
  });

  if (gift.loading && !gift.data) return <Spinner />;
  if (gift.error && !gift.data) return <ErrorState message={gift.error} onRetry={gift.reload} />;
  if (!gift.data) return <Spinner />;
  if (gift.data.role !== "sender") return <ErrorState message="Solo quien regala puede pagar esta sorpresa." />;

  const recipientName = gift.data.recipient.name;
  const current: Outcome | null =
    outcome ??
    (gift.data.status === "PAYMENT_PENDING"
      ? { status: "PENDING", failureReason: null }
      : ["PAID", "REVEALED", "THANKED"].includes(gift.data.status)
        ? { status: "APPROVED", failureReason: null }
        : null);

  if (current?.status === "APPROVED") {
    return (
      <Card className="animate-pop-in mx-auto mt-6 w-full max-w-xl text-center">
        <p className="text-6xl">🎉</p>
        <h1 className="mt-3 text-2xl font-bold">¡Listo! Va en camino</h1>
        <p className="mt-2 text-stone-600">
          Le avisamos a {recipientName} que su sorpresa va en camino. No sabrá qué es ni de quién hasta que la destape.
        </p>
        <Link href={`/gift/${id}`} className={`${buttonClass.primary} mt-6`}>
          Ver el estado en vivo
        </Link>
        <Link href="/home" className={`${buttonClass.ghost} mt-4 inline-block`}>
          Ir al inicio
        </Link>
      </Card>
    );
  }

  if (current?.status === "PENDING") {
    return (
      <Card className="mx-auto mt-6 w-full max-w-xl text-center">
        <Spinner label="Confirmando con el banco…" />
        <p className="text-sm text-stone-500">Esto se actualiza solo, no cierres la página.</p>
      </Card>
    );
  }

  if (!canPay) {
    return <ErrorState message="Esta sorpresa todavía no está lista para pagar." />;
  }
  if (catalog.loading && !catalog.data) return <Spinner label="Preparando el resumen…" />;
  if (catalog.error && !catalog.data) return <ErrorState message={catalog.error} onRetry={catalog.reload} />;

  const product = catalog.data?.products.find((p) => p.id === productId);
  const variant = product?.variants.find((v) => v.id === variantId);
  if (!product || !variant || variant.stock === 0) {
    return (
      <div className="flex flex-col gap-4">
        <ErrorState message="Ese producto o talla ya no está disponible." />
        <Link href={`/gift/${id}`} className={buttonClass.secondary}>
          Elegir otro regalo
        </Link>
      </div>
    );
  }

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    if (!product || !variant) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await api<CheckoutResultDto>(`/gifts/${id}/checkout`, {
        method: "POST",
        idempotencyKey,
        body: {
          productId: product.id,
          variantId: variant.id,
          message: message || undefined,
          cardNumber: cardNumber.replace(/\s/g, ""),
          expiry,
          cvc,
        },
      });
      setOutcome({ status: result.payment.status, failureReason: result.payment.failureReason });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "No pudimos procesar el pago");
    } finally {
      setSubmitting(false);
    }
  }

  function retry() {
    setOutcome(null);
    setIdempotencyKey(newIdempotencyKey());
    setCardNumber("");
  }

  const rejected = current?.status === "REJECTED";
  const formComplete = cardNumber.replace(/\s/g, "").length === 16 && expiry.length === 5 && cvc.length === 3;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <BackLink href={`/gift/${id}`} label="Cambiar regalo" />
      <h1 className="text-2xl font-bold md:text-3xl">Pagar la sorpresa</h1>

      <div className="grid gap-5 md:grid-cols-[1fr_1.2fr] md:items-start md:gap-8">
        <Card className="flex items-center gap-3 p-3 md:sticky md:top-24 md:flex-col md:items-stretch md:p-5">
          <ProductImage src={product.imageUrl} alt={product.title} className="w-20 shrink-0 md:w-full" />
          <div className="min-w-0 flex-1 text-sm md:text-base">
            <p className="font-semibold">{product.title}</p>
            <p className="text-stone-500">
              Para {recipientName} · Talla {variant.size}
            </p>
            {message && <p className="truncate italic md:whitespace-normal">“{message}”</p>}
          </div>
          <p className="font-bold text-coral-700 md:text-xl">{formatCop(product.priceCop)}</p>
        </Card>

        <div className="flex flex-col gap-5">
          {rejected && (
            <div className="animate-pop-in rounded-2xl bg-red-50 p-4 text-red-700 ring-1 ring-red-100">
              <p className="font-semibold">Pago rechazado</p>
              <p className="text-sm">{current.failureReason ?? "El banco no aprobó el pago."}</p>
              <button onClick={retry} className={`${buttonClass.secondary} mt-3`}>
                Reintentar con otra tarjeta
              </button>
            </div>
          )}

          {!rejected && (
            <form onSubmit={pay} className="flex flex-col gap-4">
              <div>
                <p className="mb-2 text-xs font-semibold tracking-wide text-stone-500 uppercase">Tarjetas de prueba</p>
                <div className="grid grid-cols-3 gap-2">
                  {DEMO_CARDS.map((card) => (
                    <button
                      key={card.label}
                      type="button"
                      onClick={() => {
                        setCardNumber(formatCardNumber(card.number));
                        setExpiry("12/30");
                        setCvc("123");
                      }}
                      className={`rounded-2xl px-2 py-2.5 text-xs font-semibold ring-1 transition active:scale-95 ${card.tone}`}
                    >
                      Usar {card.label.toLowerCase()}
                      <span className="block font-mono text-[10px] opacity-70">•••• {card.number.slice(-4)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Card className="flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Número de tarjeta
                  <input
                    inputMode="numeric"
                    autoComplete="cc-number"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="4242 4242 4242 4242"
                    className="rounded-xl border border-sand px-3 py-2.5 font-mono outline-none focus:border-coral-400"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Vence
                    <input
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      value={expiry}
                      onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      placeholder="MM/AA"
                      className="rounded-xl border border-sand px-3 py-2.5 font-mono outline-none focus:border-coral-400"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    CVC
                    <input
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 3))}
                      placeholder="123"
                      className="rounded-xl border border-sand px-3 py-2.5 font-mono outline-none focus:border-coral-400"
                    />
                  </label>
                </div>
              </Card>

              {submitError && <p className="text-sm font-medium text-red-600">{submitError}</p>}
              <button type="submit" disabled={!formComplete || submitting} className={buttonClass.primary}>
                {submitting ? "Procesando…" : `Pagar ${formatCop(product.priceCop)}`}
              </button>
              <p className="text-center text-xs text-stone-400">Pago simulado: no se hace ningún cobro real.</p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
