import { SocketEvent } from '@nido/shared';
import { Gift } from '../../domain/gift.entity';
import { InvalidGiftError } from '../../domain/errors';
import { GiftRepository } from '../ports/gift.repository';
import { Notifier } from '../ports/notifier';

export class CreateGiftUseCase {
  constructor(
    private readonly gifts: GiftRepository,
    private readonly notifier: Notifier,
  ) {}

  async execute(senderId: string, input: { recipientId: string; budgetCop: number }): Promise<Gift> {
    if (!(await this.gifts.findUser(input.recipientId))) throw new InvalidGiftError('Recipient not found');
    const gift = Gift.create({ senderId, ...input });
    await this.gifts.create(gift);
    this.notifier.notify(gift.recipientId, SocketEvent.CLUES_REQUESTED, { giftId: gift.id });
    return gift;
  }
}
