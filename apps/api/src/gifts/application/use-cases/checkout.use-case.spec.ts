import { GiftStatus, PaymentStatus, SocketEvent, TEST_CARDS } from '@nido/shared';
import { Gift } from '../../domain/gift.entity';
import {
  ForbiddenGiftActionError,
  IdempotencyConflictError,
  InvalidTransitionError,
  OutOfStockError,
  OverBudgetError,
  ProductNotFoundError,
} from '../../domain/errors';
import { SimulatedPaymentGateway } from '../../infrastructure/simulated-payment.gateway';
import { InMemoryGiftRepository, RecordingNotifier, RecordingScheduler } from '../../testing/in-memory-gift.repository';
import { CheckoutInput, CheckoutUseCase } from './checkout.use-case';
import { ResolvePendingPaymentUseCase } from './resolve-pending-payment.use-case';

describe('CheckoutUseCase', () => {
  let repo: InMemoryGiftRepository;
  let notifier: RecordingNotifier;
  let scheduler: RecordingScheduler;
  let checkout: CheckoutUseCase;
  let gift: Gift;
  let keyCounter = 0;

  const input = (overrides: Partial<CheckoutInput> = {}): CheckoutInput => ({
    productId: 1,
    variantId: 10,
    message: 'Feliz día',
    cardNumber: TEST_CARDS.approved,
    idempotencyKey: `key-${++keyCounter}`,
    ...overrides,
  });

  beforeEach(async () => {
    repo = new InMemoryGiftRepository();
    notifier = new RecordingNotifier();
    scheduler = new RecordingScheduler();
    checkout = new CheckoutUseCase(repo, new SimulatedPaymentGateway(), notifier, scheduler);
    repo.addProduct({ productId: 1, variantId: 10, priceCop: 150_000, stock: 2 });
    repo.addProduct({ productId: 2, variantId: 20, priceCop: 250_000, stock: 5 });
    repo.addProduct({ productId: 3, variantId: 30, priceCop: 50_000, stock: 0 });
    gift = Gift.create({ senderId: 'andres', recipientId: 'laura', budgetCop: 200_000 });
    gift.skipClues('andres');
    await repo.create(gift);
  });

  it('an approved payment marks the gift paid, takes stock and notifies both people', async () => {
    const { gift: paid, payment } = await checkout.execute('andres', gift.id, input());
    expect(paid.status).toBe(GiftStatus.PAID);
    expect(payment).toMatchObject({ status: PaymentStatus.APPROVED, cardLast4: '4242' });
    expect(repo.products.get(10)!.stock).toBe(1);
    expect(notifier.sent.map((n) => [n.userId, n.event])).toEqual([
      ['andres', SocketEvent.PAYMENT_UPDATED],
      ['laura', SocketEvent.ON_THE_WAY],
    ]);
  });

  it('takes the amount from the catalog, not from the client', async () => {
    const { payment } = await checkout.execute('andres', gift.id, input());
    expect(payment.amountCop).toBe(150_000);
  });

  it('a rejected payment keeps the stock, only tells the sender and allows a retry', async () => {
    const { gift: rejected, payment } = await checkout.execute(
      'andres',
      gift.id,
      input({ cardNumber: TEST_CARDS.rejected }),
    );
    expect(rejected.status).toBe(GiftStatus.PAYMENT_REJECTED);
    expect(payment.failureReason).toBe('Fondos insuficientes');
    expect(repo.products.get(10)!.stock).toBe(2);
    expect(notifier.sent.map((n) => n.userId)).toEqual(['andres']);

    const retry = await checkout.execute('andres', gift.id, input());
    expect(retry.gift.status).toBe(GiftStatus.PAID);
    expect(repo.payments.size).toBe(2);
  });

  it('the same Idempotency-Key charges only once', async () => {
    const first = await checkout.execute('andres', gift.id, input({ idempotencyKey: 'same' }));
    const second = await checkout.execute('andres', gift.id, input({ idempotencyKey: 'same' }));
    expect(second.payment.id).toBe(first.payment.id);
    expect(repo.payments.size).toBe(1);
    expect(repo.products.get(10)!.stock).toBe(1);
  });

  it('rejects reusing an Idempotency-Key on another gift', async () => {
    await checkout.execute('andres', gift.id, input({ idempotencyKey: 'same' }));
    const other = Gift.create({ senderId: 'andres', recipientId: 'laura', budgetCop: 200_000 });
    other.skipClues('andres');
    await repo.create(other);
    await expect(checkout.execute('andres', other.id, input({ idempotencyKey: 'same' }))).rejects.toThrow(
      IdempotencyConflictError,
    );
  });

  it('rejects products over the budget, out of stock or unknown', async () => {
    await expect(checkout.execute('andres', gift.id, input({ productId: 2, variantId: 20 }))).rejects.toThrow(
      OverBudgetError,
    );
    await expect(checkout.execute('andres', gift.id, input({ productId: 3, variantId: 30 }))).rejects.toThrow(
      OutOfStockError,
    );
    await expect(checkout.execute('andres', gift.id, input({ productId: 1, variantId: 20 }))).rejects.toThrow(
      ProductNotFoundError,
    );
    expect(repo.payments.size).toBe(0);
  });

  it('only the sender can pay', async () => {
    await expect(checkout.execute('laura', gift.id, input())).rejects.toThrow(ForbiddenGiftActionError);
  });

  it('cannot pay twice', async () => {
    await checkout.execute('andres', gift.id, input());
    await expect(checkout.execute('andres', gift.id, input())).rejects.toThrow(InvalidTransitionError);
  });

  it('a pending payment is scheduled and later settled as paid', async () => {
    const { gift: pending, payment } = await checkout.execute(
      'andres',
      gift.id,
      input({ cardNumber: TEST_CARDS.pending }),
    );
    expect(pending.status).toBe(GiftStatus.PAYMENT_PENDING);
    expect(scheduler.scheduled).toEqual([payment.id]);
    expect(repo.products.get(10)!.stock).toBe(2);

    const resolve = new ResolvePendingPaymentUseCase(repo, notifier);
    await resolve.execute(payment.id);
    await resolve.execute(payment.id); // a repeated webhook is a no-op
    expect((await repo.findById(gift.id))!.status).toBe(GiftStatus.PAID);
    expect((await repo.findPaymentById(payment.id))!.status).toBe(PaymentStatus.APPROVED);
    expect(repo.products.get(10)!.stock).toBe(1);
    expect(notifier.sent.filter((n) => n.event === SocketEvent.ON_THE_WAY)).toHaveLength(1);
  });
});
