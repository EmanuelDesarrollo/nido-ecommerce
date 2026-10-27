import { GiftStatus, SocketEvent } from '@nido/shared';
import { Gift } from '../../domain/gift.entity';
import { PaymentRecord } from '../ports/gift.repository';
import { Notifier } from '../ports/notifier';

/** The sender hears about every payment change; the recipient only learns the gift is on its way. */
export function notifyPaymentUpdate(notifier: Notifier, gift: Gift, payment: PaymentRecord): void {
  notifier.notify(gift.senderId, SocketEvent.PAYMENT_UPDATED, {
    giftId: gift.id,
    giftStatus: gift.status,
    paymentId: payment.id,
    paymentStatus: payment.status,
    failureReason: payment.failureReason,
  });
  if (gift.status === GiftStatus.PAID) {
    notifier.notify(gift.recipientId, SocketEvent.ON_THE_WAY, { giftId: gift.id });
  }
}
