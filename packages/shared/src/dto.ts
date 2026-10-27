import type { Category, Clues } from './clues';
import type { GiftStatus, PaymentStatus } from './status';

export interface UserDto {
  id: string;
  name: string;
  avatarUrl: string;
}

export interface MeDto extends UserDto {
  tasteProfile: Clues | null;
}

export interface VariantDto {
  id: number;
  size: string;
  stock: number;
}

export interface ProductDto {
  id: number;
  title: string;
  category: Category;
  tags: string[];
  priceCop: number;
  imageUrl: string;
  variants: VariantDto[];
}

export interface ScoredProductDto extends ProductDto {
  /** Corazonada %, 0..100 */
  score: number;
}

export interface CatalogResponse {
  giftId: string;
  budgetCop: number;
  clues: Clues | null;
  products: ScoredProductDto[];
}

export interface PaymentDto {
  id: string;
  status: PaymentStatus;
  amountCop: number;
  cardLast4: string;
  failureReason: string | null;
  createdAt: string;
}

export interface GiftProductDto {
  id: number;
  title: string;
  imageUrl: string;
  category: Category;
  priceCop: number;
  size: string;
}

/** What the sender sees: everything. */
export interface SenderGiftView {
  role: 'sender';
  id: string;
  status: GiftStatus;
  recipient: UserDto;
  budgetCop: number;
  clues: Clues | null;
  product: GiftProductDto | null;
  message: string | null;
  reaction: string | null;
  thankYouNote: string | null;
  lastPayment: PaymentDto | null;
  revealedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * What the recipient sees. Before the reveal there is no sender, product, message
 * or amounts, and payment states are masked so rejections never leak.
 */
export interface RecipientGiftView {
  role: 'recipient';
  id: string;
  status: GiftStatus;
  clues: Clues | null;
  sender: UserDto | null;
  product: GiftProductDto | null;
  message: string | null;
  reaction: string | null;
  thankYouNote: string | null;
  revealedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type GiftView = SenderGiftView | RecipientGiftView;

export interface GiftListResponse {
  sent: SenderGiftView[];
  received: RecipientGiftView[];
}

export interface CheckoutResultDto {
  giftId: string;
  giftStatus: GiftStatus;
  payment: PaymentDto;
}

export interface CreateGiftRequest {
  recipientId: string;
  budgetCop: number;
}

export interface CheckoutRequest {
  productId: number;
  variantId: number;
  message?: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
}

export interface ThanksRequest {
  reaction: string;
  thankYouNote?: string;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}
