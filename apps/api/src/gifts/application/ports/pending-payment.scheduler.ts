export const PENDING_PAYMENT_SCHEDULER = Symbol('PendingPaymentScheduler');

/** Arranges for a pending payment to be settled later (in production: the processor's webhook). */
export interface PendingPaymentScheduler {
  schedule(paymentId: string): void;
}
