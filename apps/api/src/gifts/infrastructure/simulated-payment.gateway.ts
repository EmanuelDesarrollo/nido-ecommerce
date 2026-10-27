import { PaymentStatus, TEST_CARDS } from '@nido/shared';
import { ChargeRequest, ChargeResult, PaymentGateway } from '../application/ports/payment.gateway';

/** Decides the outcome by card number, like a processor sandbox. Any other valid card is approved. */
export class SimulatedPaymentGateway implements PaymentGateway {
  async charge({ cardNumber }: ChargeRequest): Promise<ChargeResult> {
    switch (cardNumber) {
      case TEST_CARDS.rejected:
        return { status: PaymentStatus.REJECTED, failureReason: 'Fondos insuficientes' };
      case TEST_CARDS.pending:
        return { status: PaymentStatus.PENDING, failureReason: null };
      default:
        return { status: PaymentStatus.APPROVED, failureReason: null };
    }
  }
}
