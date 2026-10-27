import { SocketEvent } from '@nido/shared';
import { Gift } from '../../domain/gift.entity';
import { GiftRepository } from '../ports/gift.repository';
import { Notifier } from '../ports/notifier';
import { loadGiftFor } from './load-gift';

export class SkipCluesUseCase {
  constructor(
    private readonly gifts: GiftRepository,
    private readonly notifier: Notifier,
  ) {}

  async execute(actorId: string, giftId: string): Promise<Gift> {
    const gift = await loadGiftFor(this.gifts, giftId, actorId);
    gift.skipClues(actorId);
    await this.gifts.save(gift);
    this.notifier.notify(gift.senderId, SocketEvent.CLUES_ANSWERED, { giftId: gift.id, clues: null });
    return gift;
  }
}
