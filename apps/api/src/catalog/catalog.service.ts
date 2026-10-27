import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CatalogResponse, isCategory, isClues, ProductDto } from '@nido/shared';
import { PrismaService } from '../prisma/prisma.service';
import { rankProducts } from '../gifts/domain/match-score';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /** Catalog for a gift, scored with Corazonada % from the recipient's clues. Only the sender may see it. */
  async forGift(giftId: string, userId: string): Promise<CatalogResponse> {
    const gift = await this.prisma.gift.findUnique({ where: { id: giftId } });
    if (!gift || (gift.senderId !== userId && gift.recipientId !== userId)) throw new NotFoundException();
    if (gift.senderId !== userId) throw new ForbiddenException('Only the sender can browse products for this gift');

    const clues = isClues(gift.clues) ? gift.clues : null;
    const rows = await this.prisma.product.findMany({
      where: { priceCop: { lte: gift.budgetCop } },
      include: { variants: { orderBy: { id: 'asc' } } },
    });
    const products = rows.flatMap((row): ProductDto[] =>
      isCategory(row.category)
        ? [
            {
              id: row.id,
              title: row.title,
              category: row.category,
              tags: row.tags,
              priceCop: row.priceCop,
              imageUrl: row.imageUrl,
              variants: row.variants.map(({ id, size, stock }) => ({ id, size, stock })),
            },
          ]
        : [],
    );
    return { giftId, budgetCop: gift.budgetCop, clues, products: rankProducts(products, clues, gift.budgetCop) };
  }
}
