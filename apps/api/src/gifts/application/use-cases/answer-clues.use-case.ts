import { Clues, SocketEvent } from '@nido/shared';
import { Gift } from '../../domain/gift.entity';
import { GiftRepository } from '../ports/gift.repository';
import { Notifier } from '../ports/notifier';
import { loadGiftFor } from './load-gift';

export class AnswerCluesUseCase {
  constructor(
    private readonly gifts: GiftRepository,
    private readonly notifier: Notifier,
  ) {}

  async execute(actorId: string, giftId: string, clues: Clues): Promise<Gift> {
    const gift = await loadGiftFor(this.gifts, giftId, actorId);
    gift.answerClues(actorId, clues);
    await this.gifts.save(gift);
    await this.gifts.saveTasteProfile(actorId, clues);
    this.notifier.notify(gift.senderId, SocketEvent.CLUES_ANSWERED, { giftId: gift.id, clues });
    return gift;
  }
}
