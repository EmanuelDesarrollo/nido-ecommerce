import { GiftStatus, PaymentDto, RecipientGiftView, SenderGiftView, GiftView } from '@nido/shared';
import { GiftDetails, PaymentRecord } from '../application/ports/gift.repository';
import { GiftRole } from '../domain/gift.entity';

const REVEALED_STATES: GiftStatus[] = [GiftStatus.REVEALED, GiftStatus.THANKED];
/** Payment states the recipient never sees, so a rejection cannot spoil the surprise. */
const HIDDEN_FROM_RECIPIENT: GiftStatus[] = [GiftStatus.PAYMENT_PENDING, GiftStatus.PAYMENT_REJECTED];

export function toPaymentDto(p: PaymentRecord): PaymentDto {
  return {
    id: p.id,
    status: p.status,
    amountCop: p.amountCop,
    cardLast4: p.cardLast4,
    failureReason: p.failureReason,
    createdAt: p.createdAt.toISOString(),
  };
}

export function toSenderView({ gift, recipient, product, lastPayment }: GiftDetails): SenderGiftView {
  const p = gift.toProps();
  return {
    role: 'sender',
    id: p.id,
    status: p.status,
    recipient,
    budgetCop: p.budgetCop,
    clues: p.clues,
    product,
    message: p.message,
    reaction: p.reaction,
    thankYouNote: p.thankYouNote,
    lastPayment: lastPayment ? toPaymentDto(lastPayment) : null,
    revealedAt: p.revealedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function toRecipientView({ gift, sender, product }: GiftDetails): RecipientGiftView {
  const p = gift.toProps();
  const revealed = REVEALED_STATES.includes(p.status);
  return {
    role: 'recipient',
    id: p.id,
    status: HIDDEN_FROM_RECIPIENT.includes(p.status) ? GiftStatus.CLUES_ANSWERED : p.status,
    clues: p.clues,
    sender: revealed ? sender : null,
    product: revealed ? product : null,
    message: revealed ? p.message : null,
    reaction: p.reaction,
    thankYouNote: p.thankYouNote,
    revealedAt: p.revealedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function toGiftView(details: GiftDetails, role: GiftRole): GiftView {
  return role === 'sender' ? toSenderView(details) : toRecipientView(details);
}
