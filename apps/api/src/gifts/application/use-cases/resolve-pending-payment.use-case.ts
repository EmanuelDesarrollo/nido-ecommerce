import { PaymentStatus } from '@nido/shared';
import { GiftRepository } from '../ports/gift.repository';
import { Notifier } from '../ports/notifier';
import { notifyPaymentUpdate } from './payment-notifications';

export type SettledStatus = Exclude<PaymentStatus, 'PENDING'>;

/** Settles a pending payment, like a processor webhook would. Safe to call more than once. */
export class ResolvePendingPaymentUseCase {
  constructor(
    private readonly gifts: GiftRepository,
    private readonly notifier: Notifier,
  ) {}

  async execute(paymentId: string, outcome: SettledStatus = PaymentStatus.APPROVED): Promise<void> {
    const payment = await this.gifts.findPaymentById(paymentId);
    if (!payment || payment.status !== PaymentStatus.PENDING) return;
    const gift = await this.gifts.findById(payment.giftId);
    if (!gift) return;

    let status = outcome;
    let failureReason: string | null = null;
    if (status === PaymentStatus.APPROVED) {
      const product = await this.gifts.findCheckoutProduct(payment.productId, payment.variantId);
      if (!product || product.stock <= 0) {
        status = PaymentStatus.REJECTED;
        failureReason = 'Sin stock';
      }
    } else {
      failureReason = 'Pago rechazado por el banco';
    }

    const settled = { ...payment, status, failureReason };
    gift.settlePendingPayment(status);
    await this.gifts.recordSettlement(gift, settled);
    notifyPaymentUpdate(this.notifier, gift, settled);
  }
}
