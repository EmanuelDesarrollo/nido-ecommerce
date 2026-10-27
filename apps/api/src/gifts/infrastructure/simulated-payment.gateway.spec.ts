import { PaymentStatus, TEST_CARDS } from '@nido/shared';
import { SimulatedPaymentGateway } from './simulated-payment.gateway';

describe('SimulatedPaymentGateway', () => {
  const gateway = new SimulatedPaymentGateway();
  const charge = (cardNumber: string) => gateway.charge({ amountCop: 100_000, cardNumber });

  it('approves 4242 4242 4242 4242', async () => {
    expect(await charge(TEST_CARDS.approved)).toEqual({ status: PaymentStatus.APPROVED, failureReason: null });
  });

  it('rejects 4000 0000 0000 0002 for insufficient funds', async () => {
    expect(await charge(TEST_CARDS.rejected)).toEqual({
      status: PaymentStatus.REJECTED,
      failureReason: 'Fondos insuficientes',
    });
  });

  it('leaves 4000 0000 0000 3220 pending', async () => {
    expect(await charge(TEST_CARDS.pending)).toEqual({ status: PaymentStatus.PENDING, failureReason: null });
  });

  it('approves any other card', async () => {
    expect((await charge('5555555555554444')).status).toBe(PaymentStatus.APPROVED);
  });
});
