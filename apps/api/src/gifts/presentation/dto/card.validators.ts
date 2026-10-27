import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

export function passesLuhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

@ValidatorConstraint({ name: 'luhn' })
export class LuhnConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && /^\d{16}$/.test(value) && passesLuhn(value);
  }
  defaultMessage(): string {
    return 'cardNumber must be a valid 16-digit card number';
  }
}

/** Expiry as MM/YY, valid through the last day of that month. */
@ValidatorConstraint({ name: 'futureExpiry' })
export class FutureExpiryConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(value);
    if (!match) return false;
    const endOfMonth = new Date(2000 + Number(match[2]), Number(match[1]), 1);
    return endOfMonth.getTime() > Date.now();
  }
  defaultMessage(): string {
    return 'expiry must be a future date in MM/YY format';
  }
}
