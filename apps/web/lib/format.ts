import { CATEGORY_LABELS, STYLE_LABELS, type Clues, type GiftStatus } from "@nido/shared";

const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
export const formatCop = (value: number): string => cop.format(value);

export const SENDER_STATUS: Record<GiftStatus, string> = {
  CLUES_REQUESTED: "Esperando pistas",
  CLUES_ANSWERED: "Elige el regalo",
  PAYMENT_PENDING: "Confirmando pago",
  PAYMENT_REJECTED: "Pago rechazado",
  PAID: "Va en camino",
  REVEALED: "Destapado",
  THANKED: "Te agradeció",
};

export const RECIPIENT_STATUS: Record<GiftStatus, string> = {
  CLUES_REQUESTED: "Danos pistas",
  CLUES_ANSWERED: "Se está preparando",
  PAYMENT_PENDING: "Se está preparando",
  PAYMENT_REJECTED: "Se está preparando",
  PAID: "¡Lista para destapar!",
  REVEALED: "Destapada",
  THANKED: "Agradecida",
};

export function describeClues(clues: Clues): { label: string; value: string }[] {
  return [
    { label: "Le emociona", value: clues.favoriteCategories.map((c) => CATEGORY_LABELS[c]).join(" y ") },
    { label: "Estilo", value: STYLE_LABELS[clues.style] },
    { label: "Talla", value: clues.size },
    { label: "No quiere", value: clues.avoidCategory ? CATEGORY_LABELS[clues.avoidCategory] : "Nada, sorpréndeme" },
  ];
}

export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}
