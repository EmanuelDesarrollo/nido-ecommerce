"use client";

import {
  CATEGORIES,
  CATEGORY_LABELS,
  CLUE_QUESTIONS,
  SIZES,
  STYLE_LABELS,
  STYLES,
  type Category,
  type Clues,
  type GiftView,
  type MeDto,
  type Size,
  type Style,
} from "@nido/shared";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { buttonClass, Card, chipClass, ErrorState, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { useGiftEvents } from "@/lib/socket";
import { useApi } from "@/lib/use-api";

const CATEGORY_EMOJI: Record<Category, string> = { moda: "👗", belleza: "💄", tecnologia: "🎧", hogar: "🪴" };
const STYLE_EMOJI: Record<Style, string> = { clasico: "🎩", atrevido: "🔥", minimal: "◻️", comodo: "🧸" };

export function CluesView() {
  return (
    <AppShell>
      <CluesGame />
    </AppShell>
  );
}

interface Draft {
  favoriteCategories: Category[];
  style: Style | null;
  size: Size | null;
  avoidCategory: Category | null | undefined;
}

const EMPTY: Draft = { favoriteCategories: [], style: null, size: null, avoidCategory: undefined };
const STEPS = 4;

function CluesGame() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: gift, error, loading, reload } = useApi<GiftView>(`/gifts/${id}`);
  const { data: me } = useApi<MeDto>("/users/me");
  useGiftEvents(reload, id);

  // Until the user edits, the draft is their taste profile from earlier clues (if any).
  const [edited, setEdited] = useState<Draft | null>(null);
  const draft: Draft = edited ?? me?.tasteProfile ?? EMPTY;
  const prefilled = edited === null && Boolean(me?.tasteProfile);
  const setDraft = (next: Draft) => setEdited(next);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (gift?.role === "sender") router.replace(`/gift/${id}`);
  }, [gift, id, router]);

  if (loading && !gift) return <Spinner />;
  if (error && !gift) return <ErrorState message={error} onRetry={reload} />;
  if (!gift || gift.role !== "recipient") return <Spinner />;

  if (gift.status !== "CLUES_REQUESTED") {
    return (
      <Card className="animate-pop-in mx-auto w-full max-w-xl text-center">
        <p className="text-5xl">💌</p>
        <h1 className="mt-3 text-xl font-bold">¡Gracias por las pistas!</h1>
        <p className="mt-2 text-stone-600">Alguien está preparando algo con ellas. Te avisaremos cuando vaya en camino.</p>
        <Link href={gift.status === "PAID" ? `/reveal/${id}` : "/home"} className={`${buttonClass.primary} mt-5`}>
          {gift.status === "PAID" ? "¡Ya llegó! Destápala 🎁" : "Volver al inicio"}
        </Link>
      </Card>
    );
  }

  const canContinue = [
    draft.favoriteCategories.length > 0,
    draft.style !== null,
    draft.size !== null,
    draft.avoidCategory !== undefined,
  ][step];

  async function submit() {
    if (!draft.style || !draft.size || draft.avoidCategory === undefined) return;
    const clues: Clues = { ...draft, style: draft.style, size: draft.size, avoidCategory: draft.avoidCategory };
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api(`/gifts/${id}/clues`, { method: "POST", body: clues });
      reload();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "No pudimos enviar tus pistas");
    } finally {
      setSubmitting(false);
    }
  }

  function toggleFavorite(category: Category) {
    const selected = draft.favoriteCategories.includes(category);
    if (selected) {
      setDraft({ ...draft, favoriteCategories: draft.favoriteCategories.filter((c) => c !== category) });
      return;
    }
    if (draft.favoriteCategories.length >= CLUE_QUESTIONS.favoriteCategories.max) return;
    const avoidCategory = draft.avoidCategory === category ? undefined : draft.avoidCategory;
    setDraft({ ...draft, favoriteCategories: [...draft.favoriteCategories, category], avoidCategory });
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <div className="text-center">
        <p className="text-4xl">🎁</p>
        <h1 className="mt-2 text-xl font-bold">Alguien te prepara una sorpresa</h1>
        <p className="text-sm text-stone-600">Danos unas pistas. No sabrás qué es ni de quién… todavía.</p>
        {prefilled && <p className="mt-1 text-xs text-coral-600">Usamos tus gustos de la última vez. Cámbialos si quieres.</p>}
      </div>

      <div className="flex gap-1.5" aria-label={`Pregunta ${step + 1} de ${STEPS}`}>
        {Array.from({ length: STEPS }, (_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full transition ${i <= step ? "bg-coral-500" : "bg-sand"}`} />
        ))}
      </div>

      <Card key={step} className="animate-pop-in flex min-h-72 flex-col gap-4">
        <p className="text-xs font-semibold tracking-wide text-stone-400 uppercase">
          Pista {step + 1} de {STEPS}
        </p>

        {step === 0 && (
          <>
            <h2 className="text-lg font-bold">{CLUE_QUESTIONS.favoriteCategories.title}</h2>
            <p className="-mt-3 text-sm text-stone-500">{CLUE_QUESTIONS.favoriteCategories.hint}</p>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((c) => {
                const index = draft.favoriteCategories.indexOf(c);
                return (
                  <button key={c} onClick={() => toggleFavorite(c)} className={`${chipClass(index >= 0)} py-4`}>
                    <span className="block text-2xl">{CATEGORY_EMOJI[c]}</span>
                    {CATEGORY_LABELS[c]}
                    {index >= 0 && <span className="ml-1 text-xs opacity-80">#{index + 1}</span>}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="text-lg font-bold">{CLUE_QUESTIONS.style.title}</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STYLES.map((s) => (
                <button key={s} onClick={() => setDraft({ ...draft, style: s })} className={`${chipClass(draft.style === s)} py-4`}>
                  <span className="block text-2xl">{STYLE_EMOJI[s]}</span>
                  {STYLE_LABELS[s]}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-lg font-bold">{CLUE_QUESTIONS.size.title}</h2>
            <div className="flex flex-wrap gap-2">
              {SIZES.map((s) => (
                <button key={s} onClick={() => setDraft({ ...draft, size: s })} className={`${chipClass(draft.size === s)} min-w-14`}>
                  {s}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-lg font-bold">{CLUE_QUESTIONS.avoidCategory.title}</h2>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((c) => {
                const isFavorite = draft.favoriteCategories.includes(c);
                return (
                  <button
                    key={c}
                    disabled={isFavorite}
                    onClick={() => setDraft({ ...draft, avoidCategory: c })}
                    className={chipClass(draft.avoidCategory === c, isFavorite)}
                  >
                    {CATEGORY_EMOJI[c]} {CATEGORY_LABELS[c]}
                  </button>
                );
              })}
              <button
                onClick={() => setDraft({ ...draft, avoidCategory: null })}
                className={`${chipClass(draft.avoidCategory === null)} col-span-2`}
              >
                🎲 {CLUE_QUESTIONS.avoidCategory.noneLabel}
              </button>
            </div>
          </>
        )}
      </Card>

      {submitError && <p className="text-sm font-medium text-red-600">{submitError}</p>}

      <div className="flex gap-3">
        {step > 0 && (
          <button onClick={() => setStep(step - 1)} className={`${buttonClass.secondary} w-auto`}>
            Atrás
          </button>
        )}
        {step < STEPS - 1 ? (
          <button onClick={() => setStep(step + 1)} disabled={!canContinue} className={buttonClass.primary}>
            Siguiente
          </button>
        ) : (
          <button onClick={submit} disabled={!canContinue || submitting} className={buttonClass.primary}>
            {submitting ? "Enviando…" : "Enviar pistas 💌"}
          </button>
        )}
      </div>
    </main>
  );
}
