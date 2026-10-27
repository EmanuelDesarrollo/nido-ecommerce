import type { GiftStatus } from "@nido/shared";
import { RECIPIENT_STATUS, SENDER_STATUS } from "@/lib/format";

const TONE: Record<GiftStatus, string> = {
  CLUES_REQUESTED: "bg-amber-100 text-amber-800",
  CLUES_ANSWERED: "bg-sky-100 text-sky-800",
  PAYMENT_PENDING: "bg-amber-100 text-amber-800",
  PAYMENT_REJECTED: "bg-red-100 text-red-700",
  PAID: "bg-emerald-100 text-emerald-800",
  REVEALED: "bg-coral-100 text-coral-700",
  THANKED: "bg-coral-100 text-coral-700",
};

export function StatusPill({ status, role }: { status: GiftStatus; role: "sender" | "recipient" }) {
  const label = role === "sender" ? SENDER_STATUS[status] : RECIPIENT_STATUS[status];
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TONE[status]}`}>{label}</span>;
}
