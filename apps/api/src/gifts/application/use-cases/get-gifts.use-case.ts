import { GiftRole } from '../../domain/gift.entity';
import { GiftNotFoundError } from '../../domain/errors';
import { GiftDetails, GiftRepository } from '../ports/gift.repository';

export class GetGiftsUseCase {
  constructor(private readonly gifts: GiftRepository) {}

  async one(actorId: string, giftId: string): Promise<{ details: GiftDetails; role: GiftRole }> {
    const details = await this.gifts.findDetails(giftId);
    const role = details?.gift.roleOf(actorId) ?? null;
    if (!details || !role) throw new GiftNotFoundError(giftId);
    return { details, role };
  }

  async forUser(actorId: string): Promise<{ sent: GiftDetails[]; received: GiftDetails[] }> {
    const all = await this.gifts.listDetailsForUser(actorId);
    return {
      sent: all.filter((d) => d.gift.senderId === actorId),
      received: all.filter((d) => d.gift.recipientId === actorId),
    };
  }
}
