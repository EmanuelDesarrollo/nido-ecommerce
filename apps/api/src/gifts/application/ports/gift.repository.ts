import { Clues, GiftProductDto, PaymentStatus, UserDto } from '@nido/shared';
import { Gift } from '../../domain/gift.entity';

export const GIFT_REPOSITORY = Symbol('GiftRepository');

export interface PaymentRecord {
  id: string;
  giftId: string;
  productId: number;
  variantId: number;
  amountCop: number;
  status: PaymentStatus;
  cardLast4: string;
  idempotencyKey: string;
  failureReason: string | null;
  createdAt: Date;
}

export interface CheckoutProduct {
  productId: number;
  variantId: number;
  priceCop: number;
  stock: number;
}

/** A gift plus the read data needed to present it. */
export interface GiftDetails {
  gift: Gift;
  sender: UserDto;
  recipient: UserDto;
  product: GiftProductDto | null;
  lastPayment: PaymentRecord | null;
}

export interface GiftRepository {
  create(gift: Gift): Promise<void>;
  save(gift: Gift): Promise<void>;
  findById(id: string): Promise<Gift | null>;
  findDetails(id: string): Promise<GiftDetails | null>;
  listDetailsForUser(userId: string): Promise<GiftDetails[]>;

  findUser(id: string): Promise<UserDto | null>;
  saveTasteProfile(userId: string, clues: Clues): Promise<void>;

  /** Product + variant, only if the variant belongs to the product. */
  findCheckoutProduct(productId: number, variantId: number): Promise<CheckoutProduct | null>;
  findPaymentById(id: string): Promise<PaymentRecord | null>;
  findPaymentByIdempotencyKey(key: string): Promise<PaymentRecord | null>;
  listPendingPaymentIds(): Promise<string[]>;

  /** Atomically stores the new payment and the gift; an approved payment takes one unit of stock. */
  recordCheckout(gift: Gift, payment: PaymentRecord): Promise<void>;
  /** Atomically updates a settled payment and the gift; an approved payment takes one unit of stock. */
  recordSettlement(gift: Gift, payment: PaymentRecord): Promise<void>;
}
