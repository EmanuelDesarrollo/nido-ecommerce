import { SocketEvent } from '@nido/shared';
import { Gift } from '../../domain/gift.entity';
import { GiftRepository } from '../ports/gift.repository';
import { Notifier } from '../ports/notifier';
import { loadGiftFor } from './load-gift';

export class RevealGiftUseCase {
  constructor(
    private readonly gifts: GiftRepository,
    private readonly notifier: Notifier,
  ) {}

  async execute(actorId: string, giftId: string): Promise<Gift> {
    const gift = await loadGiftFor(this.gifts, giftId, actorId);
    gift.reveal(actorId);
    await this.gifts.save(gift);
    const recipient = await this.gifts.findUser(actorId);
    this.notifier.notify(gift.senderId, SocketEvent.REVEALED, {
      giftId: gift.id,
      recipientName: recipient?.name ?? '',
    });
    return gift;
  }
}
