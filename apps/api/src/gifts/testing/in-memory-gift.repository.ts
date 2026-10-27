import { Clues, SocketEvent, SocketEventPayloads, UserDto } from '@nido/shared';
import { CheckoutProduct, GiftDetails, GiftRepository, PaymentRecord } from '../application/ports/gift.repository';
import { Notifier } from '../application/ports/notifier';
import { PendingPaymentScheduler } from '../application/ports/pending-payment.scheduler';
import { Gift } from '../domain/gift.entity';
import { OutOfStockError } from '../domain/errors';

export const ANDRES: UserDto = { id: 'andres', name: 'Andrés', avatarUrl: '' };
export const LAURA: UserDto = { id: 'laura', name: 'Laura', avatarUrl: '' };

export class InMemoryGiftRepository implements GiftRepository {
  readonly gifts = new Map<string, Gift>();
  readonly payments = new Map<string, PaymentRecord>();
  readonly products = new Map<number, CheckoutProduct>();
  readonly users = new Map<string, UserDto>([
    [ANDRES.id, ANDRES],
    [LAURA.id, LAURA],
  ]);
  readonly tasteProfiles = new Map<string, Clues>();

  addProduct(product: CheckoutProduct): void {
    this.products.set(product.variantId, { ...product });
  }

  async create(gift: Gift): Promise<void> {
    this.gifts.set(gift.id, Gift.restore(gift.toProps()));
  }
  async save(gift: Gift): Promise<void> {
    this.gifts.set(gift.id, Gift.restore(gift.toProps()));
  }
  async findById(id: string): Promise<Gift | null> {
    const gift = this.gifts.get(id);
    return gift ? Gift.restore(gift.toProps()) : null;
  }
  async findDetails(id: string): Promise<GiftDetails | null> {
    const gift = await this.findById(id);
    if (!gift) return null;
    const lastPayment = [...this.payments.values()].filter((p) => p.giftId === id).at(-1) ?? null;
    return { gift, sender: this.users.get(gift.senderId)!, recipient: this.users.get(gift.recipientId)!, product: null, lastPayment };
  }
  async listDetailsForUser(userId: string): Promise<GiftDetails[]> {
    const ids = [...this.gifts.values()].filter((g) => g.roleOf(userId)).map((g) => g.id);
    return (await Promise.all(ids.map((id) => this.findDetails(id)))).filter((d): d is GiftDetails => d !== null);
  }
  async findUser(id: string): Promise<UserDto | null> {
    return this.users.get(id) ?? null;
  }
  async saveTasteProfile(userId: string, clues: Clues): Promise<void> {
    this.tasteProfiles.set(userId, clues);
  }
  async findCheckoutProduct(productId: number, variantId: number): Promise<CheckoutProduct | null> {
    const product = this.products.get(variantId);
    return product && product.productId === productId ? { ...product } : null;
  }
  async findPaymentById(id: string): Promise<PaymentRecord | null> {
    return this.payments.get(id) ?? null;
  }
  async findPaymentByIdempotencyKey(key: string): Promise<PaymentRecord | null> {
    return [...this.payments.values()].find((p) => p.idempotencyKey === key) ?? null;
  }
  async listPendingPaymentIds(): Promise<string[]> {
    return [...this.payments.values()].filter((p) => p.status === 'PENDING').map((p) => p.id);
  }
  async recordCheckout(gift: Gift, payment: PaymentRecord): Promise<void> {
    if (payment.status === 'APPROVED') this.takeOneUnit(payment.variantId);
    this.payments.set(payment.id, { ...payment });
    await this.save(gift);
  }
  async recordSettlement(gift: Gift, payment: PaymentRecord): Promise<void> {
    if (payment.status === 'APPROVED') this.takeOneUnit(payment.variantId);
    this.payments.set(payment.id, { ...payment });
    await this.save(gift);
  }

  private takeOneUnit(variantId: number): void {
    const product = this.products.get(variantId);
    if (!product || product.stock <= 0) throw new OutOfStockError();
    product.stock -= 1;
  }
}

export class RecordingNotifier implements Notifier {
  readonly sent: { userId: string; event: SocketEvent; payload: unknown }[] = [];
  notify<E extends SocketEvent>(userId: string, event: E, payload: SocketEventPayloads[E]): void {
    this.sent.push({ userId, event, payload });
  }
}

export class RecordingScheduler implements PendingPaymentScheduler {
  readonly scheduled: string[] = [];
  schedule(paymentId: string): void {
    this.scheduled.push(paymentId);
  }
}
