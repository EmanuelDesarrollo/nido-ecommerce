import { GiftStatus } from '@nido/shared';

export type DomainErrorKind = 'not_found' | 'forbidden' | 'conflict' | 'unprocessable';

export abstract class DomainError extends Error {
  abstract readonly kind: DomainErrorKind;
}

export class InvalidTransitionError extends DomainError {
  readonly kind = 'conflict';
  constructor(from: GiftStatus, to: GiftStatus) {
    super(`Invalid gift transition: ${from} -> ${to}`);
  }
}

export class ForbiddenGiftActionError extends DomainError {
  readonly kind = 'forbidden';
  constructor(action: string) {
    super(`You are not allowed to ${action} this gift`);
  }
}

export class GiftNotFoundError extends DomainError {
  readonly kind = 'not_found';
  constructor(id: string) {
    super(`Gift ${id} not found`);
  }
}

export class ProductNotFoundError extends DomainError {
  readonly kind = 'not_found';
  constructor() {
    super('Product or variant not found');
  }
}

export class OutOfStockError extends DomainError {
  readonly kind = 'unprocessable';
  constructor() {
    super('The selected size is out of stock');
  }
}

export class OverBudgetError extends DomainError {
  readonly kind = 'unprocessable';
  constructor() {
    super('The product price exceeds the gift budget');
  }
}

export class InvalidGiftError extends DomainError {
  readonly kind = 'unprocessable';
}

export class IdempotencyConflictError extends DomainError {
  readonly kind = 'conflict';
  constructor() {
    super('Idempotency-Key was already used for another gift');
  }
}
