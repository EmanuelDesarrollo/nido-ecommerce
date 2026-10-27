export const GiftStatus = {
  CLUES_REQUESTED: 'CLUES_REQUESTED',
  CLUES_ANSWERED: 'CLUES_ANSWERED',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  PAYMENT_REJECTED: 'PAYMENT_REJECTED',
  PAID: 'PAID',
  REVEALED: 'REVEALED',
  THANKED: 'THANKED',
} as const;
export type GiftStatus = (typeof GiftStatus)[keyof typeof GiftStatus];

export const PaymentStatus = {
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PENDING: 'PENDING',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];
