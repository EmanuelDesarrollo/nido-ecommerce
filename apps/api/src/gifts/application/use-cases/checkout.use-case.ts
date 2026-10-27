import { randomUUID } from 'node:crypto';
import { PaymentStatus } from '@nido/shared';
import { Gift } from '../../domain/gift.entity';
import {
  ForbiddenGiftActionError,
  IdempotencyConflictError,
  OutOfStockError,
  OverBudgetError,
  ProductNotFoundError,
} from '../../domain/errors';
import { GiftRepository, PaymentRecord } from '../ports/gift.repository';
import { Notifier } from '../ports/notifier';
import { PaymentGateway } from '../ports/payment.gateway';
import { PendingPaymentScheduler } from '../ports/pending-payment.scheduler';
import { loadGiftFor } from './load-gift';
import { notifyPaymentUpdate } from './payment-notifications';

export interface CheckoutInput {
  productId: number;
  variantId: number;
  message: string | null;
  cardNumber: string;
  idempotencyKey: string;
}

export interface CheckoutResult {
  gift: Gift;
  payment: PaymentRecord;
}

export class CheckoutUseCase {
  constructor(
    private readonly gifts: GiftRepository,
    private readonly gateway: PaymentGateway,
    private readonly notifier: Notifier,
    private readonly scheduler: PendingPaymentScheduler,
  ) {}

  async execute(actorId: string, giftId: string, input: CheckoutInput): Promise<CheckoutResult> {
    const gift = await loadGiftFor(this.gifts, giftId, actorId);

    // A retried request with the same key returns the original result without charging again.
    const previous = await this.gifts.findPaymentByIdempotencyKey(input.idempotencyKey);
    if (previous) {
      if (previous.giftId !== giftId) throw new IdempotencyConflictError();
      if (gift.roleOf(actorId) !== 'sender') throw new ForbiddenGiftActionError('pay for');
      return { gift, payment: previous };
    }

    gift.assertCanCheckout(actorId);
    // The amount always comes from the database, never from the client.
    const product = await this.gifts.findCheckoutProduct(input.productId, input.variantId);
    if (!product) throw new ProductNotFoundError();
    if (product.priceCop > gift.budgetCop) throw new OverBudgetError();
    if (product.stock <= 0) throw new OutOfStockError();

    const charge = await this.gateway.charge({ amountCop: product.priceCop, cardNumber: input.cardNumber });
    const payment: PaymentRecord = {
      id: randomUUID(),
      giftId,
      productId: product.productId,
      variantId: product.variantId,
      amountCop: product.priceCop,
      status: charge.status,
      cardLast4: input.cardNumber.slice(-4),
      idempotencyKey: input.idempotencyKey,
      failureReason: charge.failureReason,
      createdAt: new Date(),
    };
    gift.applyCheckout(
      actorId,
      { productId: product.productId, variantId: product.variantId, message: input.message },
      charge.status,
    );
    await this.gifts.recordCheckout(gift, payment);

    notifyPaymentUpdate(this.notifier, gift, payment);
    if (payment.status === PaymentStatus.PENDING) this.scheduler.schedule(payment.id);
    return { gift, payment };
  }
}
