import { Clues, GiftStatus, PaymentStatus } from '@nido/shared';
import { ForbiddenGiftActionError, InvalidGiftError, InvalidTransitionError } from './errors';
import { Gift } from './gift.entity';

const clues: Clues = { favoriteCategories: ['moda', 'belleza'], style: 'minimal', size: 'M', avoidCategory: 'hogar' };
const selection = { productId: 1, variantId: 1, message: 'Para ti' };

function giftIn(status: GiftStatus): Gift {
  return Gift.restore({ ...Gift.create({ senderId: 'andres', recipientId: 'laura', budgetCop: 200_000 }).toProps(), status });
}

describe('Gift', () => {
  it('starts waiting for clues', () => {
    expect(Gift.create({ senderId: 'andres', recipientId: 'laura', budgetCop: 100_000 }).status).toBe(
      GiftStatus.CLUES_REQUESTED,
    );
  });

  it('rejects gifts to yourself and invalid budgets', () => {
    expect(() => Gift.create({ senderId: 'andres', recipientId: 'andres', budgetCop: 100_000 })).toThrow(InvalidGiftError);
    expect(() => Gift.create({ senderId: 'andres', recipientId: 'laura', budgetCop: 0 })).toThrow(InvalidGiftError);
  });

  describe('clues', () => {
    it('only the recipient answers them', () => {
      const gift = giftIn(GiftStatus.CLUES_REQUESTED);
      expect(() => gift.answerClues('andres', clues)).toThrow(ForbiddenGiftActionError);
      gift.answerClues('laura', clues);
      expect(gift.status).toBe(GiftStatus.CLUES_ANSWERED);
      expect(gift.clues).toEqual(clues);
    });

    it('only the sender can skip them, leaving clues empty', () => {
      const gift = giftIn(GiftStatus.CLUES_REQUESTED);
      expect(() => gift.skipClues('laura')).toThrow(ForbiddenGiftActionError);
      gift.skipClues('andres');
      expect(gift.status).toBe(GiftStatus.CLUES_ANSWERED);
      expect(gift.clues).toBeNull();
    });

    it('cannot be answered twice', () => {
      const gift = giftIn(GiftStatus.CLUES_ANSWERED);
      expect(() => gift.answerClues('laura', clues)).toThrow(InvalidTransitionError);
    });

    it('rejects a favorite that is also avoided', () => {
      const gift = giftIn(GiftStatus.CLUES_REQUESTED);
      expect(() => gift.answerClues('laura', { ...clues, avoidCategory: 'moda' })).toThrow(InvalidGiftError);
    });
  });

  describe('checkout', () => {
    it.each([
      [PaymentStatus.APPROVED, GiftStatus.PAID],
      [PaymentStatus.PENDING, GiftStatus.PAYMENT_PENDING],
      [PaymentStatus.REJECTED, GiftStatus.PAYMENT_REJECTED],
    ])('a %s payment moves the gift to %s', (payment, expected) => {
      const gift = giftIn(GiftStatus.CLUES_ANSWERED);
      gift.applyCheckout('andres', selection, payment);
      expect(gift.status).toBe(expected);
    });

    it('allows retrying after a rejection', () => {
      const gift = giftIn(GiftStatus.PAYMENT_REJECTED);
      gift.applyCheckout('andres', selection, PaymentStatus.APPROVED);
      expect(gift.status).toBe(GiftStatus.PAID);
    });

    it('only the sender pays', () => {
      expect(() => giftIn(GiftStatus.CLUES_ANSWERED).assertCanCheckout('laura')).toThrow(ForbiddenGiftActionError);
    });

    it.each([GiftStatus.CLUES_REQUESTED, GiftStatus.PAYMENT_PENDING, GiftStatus.PAID, GiftStatus.REVEALED])(
      'cannot pay while %s',
      (status) => {
        expect(() => giftIn(status).assertCanCheckout('andres')).toThrow(InvalidTransitionError);
      },
    );

    it('settles a pending payment only once', () => {
      const gift = giftIn(GiftStatus.PAYMENT_PENDING);
      gift.settlePendingPayment(PaymentStatus.APPROVED);
      expect(gift.status).toBe(GiftStatus.PAID);
      expect(() => gift.settlePendingPayment(PaymentStatus.APPROVED)).toThrow(InvalidTransitionError);
    });
  });

  describe('reveal and thanks', () => {
    it('only the recipient reveals a paid gift', () => {
      const gift = giftIn(GiftStatus.PAID);
      expect(() => gift.reveal('andres')).toThrow(ForbiddenGiftActionError);
      gift.reveal('laura');
      expect(gift.status).toBe(GiftStatus.REVEALED);
      expect(gift.toProps().revealedAt).toBeInstanceOf(Date);
    });

    it('cannot reveal before it is paid', () => {
      expect(() => giftIn(GiftStatus.PAYMENT_PENDING).reveal('laura')).toThrow(InvalidTransitionError);
    });

    it('only the recipient thanks, after revealing', () => {
      expect(() => giftIn(GiftStatus.PAID).thank('laura', '❤️', null)).toThrow(InvalidTransitionError);
      const gift = giftIn(GiftStatus.REVEALED);
      expect(() => gift.thank('andres', '❤️', null)).toThrow(ForbiddenGiftActionError);
      gift.thank('laura', '❤️', 'Gracias!');
      expect(gift.status).toBe(GiftStatus.THANKED);
      expect(gift.toProps()).toMatchObject({ reaction: '❤️', thankYouNote: 'Gracias!' });
    });
  });

  it('strangers have no role', () => {
    expect(giftIn(GiftStatus.CLUES_REQUESTED).roleOf('mallory')).toBeNull();
  });
});
