import { randomUUID } from 'node:crypto';
import { Clues, GiftStatus, PaymentStatus } from '@nido/shared';
import { ForbiddenGiftActionError, InvalidGiftError, InvalidTransitionError } from './errors';
import { canTransition } from './gift-status';

/** States from which the sender may start (or retry) a checkout. */
const CHECKOUT_STATES: GiftStatus[] = [GiftStatus.CLUES_ANSWERED, GiftStatus.PAYMENT_REJECTED];

export interface GiftProps {
  id: string;
  senderId: string;
  recipientId: string;
  budgetCop: number;
  status: GiftStatus;
  clues: Clues | null;
  productId: number | null;
  variantId: number | null;
  message: string | null;
  reaction: string | null;
  thankYouNote: string | null;
  revealedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type GiftRole = 'sender' | 'recipient';

export interface GiftSelection {
  productId: number;
  variantId: number;
  message: string | null;
}

export class Gift {
  private constructor(private props: GiftProps) {}

  static create(input: { senderId: string; recipientId: string; budgetCop: number }, now = new Date()): Gift {
    if (input.senderId === input.recipientId) throw new InvalidGiftError('You cannot send a gift to yourself');
    if (!Number.isInteger(input.budgetCop) || input.budgetCop <= 0) throw new InvalidGiftError('Invalid budget');
    return new Gift({
      id: randomUUID(),
      ...input,
      status: GiftStatus.CLUES_REQUESTED,
      clues: null,
      productId: null,
      variantId: null,
      message: null,
      reaction: null,
      thankYouNote: null,
      revealedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: GiftProps): Gift {
    return new Gift({ ...props });
  }

  toProps(): GiftProps {
    return { ...this.props };
  }

  get id(): string {
    return this.props.id;
  }
  get senderId(): string {
    return this.props.senderId;
  }
  get recipientId(): string {
    return this.props.recipientId;
  }
  get budgetCop(): number {
    return this.props.budgetCop;
  }
  get status(): GiftStatus {
    return this.props.status;
  }
  get clues(): Clues | null {
    return this.props.clues;
  }

  roleOf(userId: string): GiftRole | null {
    if (userId === this.props.senderId) return 'sender';
    if (userId === this.props.recipientId) return 'recipient';
    return null;
  }

  answerClues(actorId: string, clues: Clues): void {
    this.assertRole(actorId, 'recipient', 'answer clues for');
    const favorites = clues.favoriteCategories;
    if (favorites.length < 1 || favorites.length > 2 || new Set(favorites).size !== favorites.length) {
      throw new InvalidGiftError('Choose one or two different favorite categories');
    }
    if (clues.avoidCategory !== null && favorites.includes(clues.avoidCategory)) {
      throw new InvalidGiftError('A favorite category cannot also be avoided');
    }
    this.transition(GiftStatus.CLUES_ANSWERED);
    this.props.clues = clues;
  }

  skipClues(actorId: string): void {
    this.assertRole(actorId, 'sender', 'skip clues for');
    this.transition(GiftStatus.CLUES_ANSWERED);
    this.props.clues = null;
  }

  /** Checks a new checkout attempt is allowed, before charging anything. */
  assertCanCheckout(actorId: string): void {
    this.assertRole(actorId, 'sender', 'pay for');
    // PAYMENT_PENDING -> PAID is only for the async settlement, never for a new checkout.
    if (!CHECKOUT_STATES.includes(this.props.status)) {
      throw new InvalidTransitionError(this.props.status, GiftStatus.PAID);
    }
  }

  applyCheckout(actorId: string, selection: GiftSelection, paymentStatus: PaymentStatus): void {
    this.assertCanCheckout(actorId);
    this.transition(giftStatusFor(paymentStatus));
    this.props.productId = selection.productId;
    this.props.variantId = selection.variantId;
    this.props.message = selection.message;
  }

  /** Async settlement of a pending payment (simulated processor webhook). */
  settlePendingPayment(paymentStatus: Exclude<PaymentStatus, 'PENDING'>): void {
    if (this.props.status !== GiftStatus.PAYMENT_PENDING) {
      throw new InvalidTransitionError(this.props.status, giftStatusFor(paymentStatus));
    }
    this.transition(giftStatusFor(paymentStatus));
  }

  reveal(actorId: string, now = new Date()): void {
    this.assertRole(actorId, 'recipient', 'reveal');
    this.transition(GiftStatus.REVEALED);
    this.props.revealedAt = now;
  }

  thank(actorId: string, reaction: string, thankYouNote: string | null): void {
    this.assertRole(actorId, 'recipient', 'thank for');
    this.transition(GiftStatus.THANKED);
    this.props.reaction = reaction;
    this.props.thankYouNote = thankYouNote;
  }

  private assertRole(actorId: string, role: GiftRole, action: string): void {
    if (this.roleOf(actorId) !== role) throw new ForbiddenGiftActionError(action);
  }

  private transition(to: GiftStatus): void {
    if (!canTransition(this.props.status, to)) throw new InvalidTransitionError(this.props.status, to);
    this.props.status = to;
    this.props.updatedAt = new Date();
  }
}

function giftStatusFor(paymentStatus: PaymentStatus): GiftStatus {
  switch (paymentStatus) {
    case PaymentStatus.APPROVED:
      return GiftStatus.PAID;
    case PaymentStatus.PENDING:
      return GiftStatus.PAYMENT_PENDING;
    case PaymentStatus.REJECTED:
      return GiftStatus.PAYMENT_REJECTED;
  }
}
