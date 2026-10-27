import { GiftStatus } from '@nido/shared';

export { GiftStatus };

/** Allowed state machine edges. Who may trigger each one is enforced in Gift. */
export const GIFT_TRANSITIONS: Record<GiftStatus, readonly GiftStatus[]> = {
  [GiftStatus.CLUES_REQUESTED]: [GiftStatus.CLUES_ANSWERED],
  [GiftStatus.CLUES_ANSWERED]: [GiftStatus.PAYMENT_PENDING, GiftStatus.PAID, GiftStatus.PAYMENT_REJECTED],
  [GiftStatus.PAYMENT_REJECTED]: [GiftStatus.PAYMENT_PENDING, GiftStatus.PAID, GiftStatus.PAYMENT_REJECTED],
  [GiftStatus.PAYMENT_PENDING]: [GiftStatus.PAID, GiftStatus.PAYMENT_REJECTED],
  [GiftStatus.PAID]: [GiftStatus.REVEALED],
  [GiftStatus.REVEALED]: [GiftStatus.THANKED],
  [GiftStatus.THANKED]: [],
};

export function canTransition(from: GiftStatus, to: GiftStatus): boolean {
  return GIFT_TRANSITIONS[from].includes(to);
}
