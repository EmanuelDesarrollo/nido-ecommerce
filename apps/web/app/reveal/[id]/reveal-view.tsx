"use client";

import { MAX_MESSAGE_LENGTH, REACTIONS, type GiftView, type RecipientGiftView } from "@nido/shared";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Avatar } from "@/components/avatar";
import { ProductImage } from "@/components/product-image";
import { BackLink, buttonClass, Card, chipClass, ErrorState, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { useGiftEvents } from "@/lib/socket";
import { useApi } from "@/lib/use-api";

export function RevealView() {
  return (
    <AppShell>
      <Reveal />
    </AppShell>
  );
}

const OPENING_MS = 1100;

function Reveal() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, error, loading, reload } = useApi<GiftView>(`/gifts/${id}`);
  const [revealed, setRevealed] = useState<RecipientGiftView | null>(null);
  useGiftEvents(reload, id);

  useEffect(() => {
    if (data?.role === "sender") router.replace(`/gift/${id}`);
  }, [data, id, router]);

  if (loading && !data) return <Spinner />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data || data.role !== "recipient") return <Spinner />;
  const gift = revealed ?? data;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <BackLink href="/home" />
      {gift.status === "CLUES_REQUESTED" && (
        <Card className="text-center">
          <p className="text-5xl">🕵️</p>
          <p className="mt-3 font-semibold">Primero necesitamos tus pistas</p>
          <Link href={`/clues/${id}`} className={`${buttonClass.primary} mt-4`}>
            Dar pistas
          </Link>
        </Card>
      )}
      {gift.status === "CLUES_ANSWERED" && (
        <Card className="text-center">
          <p className="animate-pulse text-6xl">✨</p>
          <h1 className="mt-3 text-xl font-bold">Tu sorpresa se está preparando</h1>
          <p className="mt-2 text-stone-600">Te avisaremos apenas vaya en camino.</p>
        </Card>
      )}
      {gift.status === "PAID" && <GiftBox giftId={id} onOpened={setRevealed} />}
      {(gift.status === "REVEALED" || gift.status === "THANKED") && (
        <Unwrapped gift={gift} onThanked={(next) => setRevealed(next)} />
      )}
    </main>
  );
}

function GiftBox({ giftId, onOpened }: { giftId: string; onOpened: (gift: RecipientGiftView) => void }) {
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);

  async function open() {
    if (opening) return;
    setOpening(true);
    setOpenError(null);
    try {
      const [gift] = await Promise.all([
        api<RecipientGiftView>(`/gifts/${giftId}/reveal`, { method: "POST" }),
        new Promise((resolve) => setTimeout(resolve, OPENING_MS)),
      ]);
      onOpened(gift);
    } catch (e) {
      setOpenError(e instanceof Error ? e.message : "No pudimos abrir tu sorpresa");
      setOpening(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 pt-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">Tu sorpresa va en camino 🎁</h1>
        <p className="mt-1 text-stone-600">Ya está lista. ¿Quieres destaparla?</p>
      </div>
      <button
        onClick={open}
        aria-label="Destapar la sorpresa"
        className={`gift-box relative h-52 w-52 ${opening ? "opening" : ""}`}
      >
        <span className="gift-lid absolute top-6 left-1/2 z-10 h-14 w-56 -translate-x-1/2 rounded-xl bg-coral-600 shadow-md">
          <span className="absolute inset-y-0 left-1/2 w-6 -translate-x-1/2 bg-amber-300" />
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-5xl">🎀</span>
        </span>
        <span className="absolute bottom-0 left-1/2 h-36 w-48 -translate-x-1/2 rounded-b-2xl bg-coral-500 shadow-lg">
          <span className="absolute inset-y-0 left-1/2 w-6 -translate-x-1/2 bg-amber-300" />
        </span>
        {opening && <Confetti />}
      </button>
      {openError ? (
        <p className="text-sm font-medium text-red-600">{openError}</p>
      ) : (
        <p className="text-sm font-medium text-coral-700">{opening ? "Abriendo…" : "Toca la caja"}</p>
      )}
    </div>
  );
}

const CONFETTI = ["🎉", "✨", "💖", "🎊", "⭐", "💝", "🌟", "🎈"];

function Confetti() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      {CONFETTI.map((emoji, i) => {
        const angle = (i / CONFETTI.length) * Math.PI * 2;
        const style = {
          "--dx": `${Math.cos(angle) * 140}px`,
          "--dy": `${Math.sin(angle) * 140}px`,
          animationDelay: `${300 + i * 30}ms`,
        } as React.CSSProperties;
        return (
          <span key={i} className="confetti-piece absolute top-1/2 left-1/2 text-2xl opacity-0" style={style}>
            {emoji}
          </span>
        );
      })}
    </span>
  );
}

function Unwrapped({ gift, onThanked }: { gift: RecipientGiftView; onThanked: (gift: RecipientGiftView) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <Card className="animate-pop-in flex flex-col items-center gap-3 text-center">
        <p className="text-sm font-semibold tracking-wide text-coral-600 uppercase">¡Sorpresa!</p>
        {gift.product && (
          <>
            <ProductImage src={gift.product.imageUrl} alt={gift.product.title} className="w-56" />
            <h1 className="text-xl font-bold">{gift.product.title}</h1>
            {gift.product.size !== "UNICA" && <p className="text-sm text-stone-500">Talla {gift.product.size}</p>}
          </>
        )}
        {gift.sender && (
          <div className="mt-2 flex items-center gap-2 rounded-full bg-cream py-1.5 pr-4 pl-1.5">
            <Avatar user={gift.sender} size={32} />
            <span className="text-sm">
              De parte de <strong>{gift.sender.name}</strong>
            </span>
          </div>
        )}
        {gift.message && <blockquote className="mt-1 text-lg italic text-stone-700">“{gift.message}”</blockquote>}
      </Card>

      {gift.status === "REVEALED" ? <ThanksForm gift={gift} onThanked={onThanked} /> : <Thanked gift={gift} />}
    </div>
  );
}

function ThanksForm({ gift, onThanked }: { gift: RecipientGiftView; onThanked: (gift: RecipientGiftView) => void }) {
  const [reaction, setReaction] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  async function send() {
    if (!reaction) return;
    setSending(true);
    setSendError(null);
    try {
      onThanked(
        await api<RecipientGiftView>(`/gifts/${gift.id}/thanks`, {
          method: "POST",
          body: { reaction, thankYouNote: note.trim() || undefined },
        }),
      );
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "No pudimos enviar tu reacción");
      setSending(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <p className="font-semibold">¿Cómo te hizo sentir?</p>
      <div className="flex justify-between">
        {REACTIONS.map((r) => (
          <button key={r} onClick={() => setReaction(r)} className={`${chipClass(reaction === r)} px-3 text-2xl`} aria-label={r}>
            {r}
          </button>
        ))}
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={MAX_MESSAGE_LENGTH}
        rows={2}
        placeholder={`Escríbele algo a ${gift.sender?.name ?? "quien te lo regaló"} (opcional)`}
        className="w-full resize-none rounded-2xl border border-sand p-3 text-sm outline-none focus:border-coral-400"
      />
      {sendError && <p className="text-sm font-medium text-red-600">{sendError}</p>}
      <button onClick={send} disabled={!reaction || sending} className={buttonClass.primary}>
        {sending ? "Enviando…" : "Enviar agradecimiento"}
      </button>
    </Card>
  );
}

function Thanked({ gift }: { gift: RecipientGiftView }) {
  return (
    <Card className="animate-pop-in flex flex-col items-center gap-3 text-center">
      <p className="text-4xl">{gift.reaction}</p>
      <p className="font-semibold">Le enviaste tu reacción a {gift.sender?.name}</p>
      {gift.thankYouNote && <p className="text-sm italic text-stone-600">“{gift.thankYouNote}”</p>}
      {gift.sender && (
        <Link href={`/gift/new?to=${gift.sender.id}`} className={`${buttonClass.primary} mt-2`}>
          💝 Devuélvele el gesto a {gift.sender.name}
        </Link>
      )}
      <p className="text-xs text-stone-500">Tus pistas quedaron guardadas como tu perfil de gustos.</p>
    </Card>
  );
}
