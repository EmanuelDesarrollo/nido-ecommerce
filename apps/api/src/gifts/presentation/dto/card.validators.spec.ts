import { TEST_CARDS } from '@nido/shared';
import { FutureExpiryConstraint, passesLuhn } from './card.validators';

describe('card validators', () => {
  it('all test cards pass Luhn and a typo does not', () => {
    Object.values(TEST_CARDS).forEach((card) => expect(passesLuhn(card)).toBe(true));
    expect(passesLuhn('4242424242424241')).toBe(false);
  });

  it('expiry must be MM/YY in the future', () => {
    const v = new FutureExpiryConstraint();
    expect(v.validate('12/99')).toBe(true);
    expect(v.validate('01/20')).toBe(false);
    expect(v.validate('13/30')).toBe(false);
  });
});
