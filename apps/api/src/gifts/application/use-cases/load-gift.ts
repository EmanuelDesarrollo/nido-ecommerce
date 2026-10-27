import { Gift } from '../../domain/gift.entity';
import { GiftNotFoundError } from '../../domain/errors';
import { GiftRepository } from '../ports/gift.repository';

/** Loads a gift the actor takes part in; strangers get "not found" so ids do not leak. */
export async function loadGiftFor(gifts: GiftRepository, giftId: string, actorId: string): Promise<Gift> {
  const gift = await gifts.findById(giftId);
  if (!gift || gift.roleOf(actorId) === null) throw new GiftNotFoundError(giftId);
  return gift;
}
