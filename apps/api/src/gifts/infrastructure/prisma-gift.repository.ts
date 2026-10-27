import { Injectable } from '@nestjs/common';
import { Clues, GiftProductDto, isCategory, isClues, UserDto } from '@nido/shared';
import {
  Gift as GiftRow,
  Payment as PaymentRow,
  Prisma,
  Product as ProductRow,
  ProductVariant as VariantRow,
  User as UserRow,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Gift } from '../domain/gift.entity';
import { OutOfStockError } from '../domain/errors';
import { CheckoutProduct, GiftDetails, GiftRepository, PaymentRecord } from '../application/ports/gift.repository';

const DETAILS_INCLUDE = {
  sender: true,
  recipient: true,
  product: true,
  variant: true,
  payments: { orderBy: { createdAt: 'desc' }, take: 1 },
} satisfies Prisma.GiftInclude;

type GiftDetailsRow = Prisma.GiftGetPayload<{ include: typeof DETAILS_INCLUDE }>;

@Injectable()
export class PrismaGiftRepository implements GiftRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(gift: Gift): Promise<void> {
    await this.prisma.gift.create({ data: toGiftData(gift) });
  }

  async save(gift: Gift): Promise<void> {
    await this.prisma.gift.update({ where: { id: gift.id }, data: toGiftData(gift) });
  }

  async findById(id: string): Promise<Gift | null> {
    const row = await this.prisma.gift.findUnique({ where: { id } });
    return row ? toGift(row) : null;
  }

  async findDetails(id: string): Promise<GiftDetails | null> {
    const row = await this.prisma.gift.findUnique({ where: { id }, include: DETAILS_INCLUDE });
    return row ? toDetails(row) : null;
  }

  async listDetailsForUser(userId: string): Promise<GiftDetails[]> {
    const rows = await this.prisma.gift.findMany({
      where: { OR: [{ senderId: userId }, { recipientId: userId }] },
      include: DETAILS_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toDetails);
  }

  async findUser(id: string): Promise<UserDto | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? toUser(row) : null;
  }

  async saveTasteProfile(userId: string, clues: Clues): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { tasteProfile: clues } });
  }

  async findCheckoutProduct(productId: number, variantId: number): Promise<CheckoutProduct | null> {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
      include: { product: true },
    });
    if (!variant) return null;
    return { productId, variantId, priceCop: variant.product.priceCop, stock: variant.stock };
  }

  async findPaymentById(id: string): Promise<PaymentRecord | null> {
    const row = await this.prisma.payment.findUnique({ where: { id } });
    return row ? toPayment(row) : null;
  }

  async findPaymentByIdempotencyKey(key: string): Promise<PaymentRecord | null> {
    const row = await this.prisma.payment.findUnique({ where: { idempotencyKey: key } });
    return row ? toPayment(row) : null;
  }

  async listPendingPaymentIds(): Promise<string[]> {
    const rows = await this.prisma.payment.findMany({ where: { status: 'PENDING' }, select: { id: true } });
    return rows.map((r) => r.id);
  }

  async recordCheckout(gift: Gift, payment: PaymentRecord): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      if (payment.status === 'APPROVED') await takeOneUnit(tx, payment.variantId);
      await tx.payment.create({ data: payment });
      await tx.gift.update({ where: { id: gift.id }, data: toGiftData(gift) });
    });
  }

  async recordSettlement(gift: Gift, payment: PaymentRecord): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      if (payment.status === 'APPROVED') await takeOneUnit(tx, payment.variantId);
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: payment.status, failureReason: payment.failureReason },
      });
      await tx.gift.update({ where: { id: gift.id }, data: toGiftData(gift) });
    });
  }
}

async function takeOneUnit(tx: Prisma.TransactionClient, variantId: number): Promise<void> {
  const { count } = await tx.productVariant.updateMany({
    where: { id: variantId, stock: { gt: 0 } },
    data: { stock: { decrement: 1 } },
  });
  if (count === 0) throw new OutOfStockError();
}

function toGiftData(gift: Gift): Prisma.GiftUncheckedCreateInput {
  const p = gift.toProps();
  return { ...p, clues: p.clues ?? Prisma.DbNull };
}

function toGift(row: GiftRow): Gift {
  return Gift.restore({ ...row, clues: isClues(row.clues) ? row.clues : null });
}

function toUser(row: UserRow): UserDto {
  return { id: row.id, name: row.name, avatarUrl: row.avatarUrl };
}

function toPayment(row: PaymentRow): PaymentRecord {
  return {
    id: row.id,
    giftId: row.giftId,
    productId: row.productId,
    variantId: row.variantId,
    amountCop: row.amountCop,
    status: row.status,
    cardLast4: row.cardLast4,
    idempotencyKey: row.idempotencyKey,
    failureReason: row.failureReason,
    createdAt: row.createdAt,
  };
}

function toProduct(product: ProductRow | null, variant: VariantRow | null): GiftProductDto | null {
  if (!product || !variant || !isCategory(product.category)) return null;
  return {
    id: product.id,
    title: product.title,
    imageUrl: product.imageUrl,
    category: product.category,
    priceCop: product.priceCop,
    size: variant.size,
  };
}

function toDetails(row: GiftDetailsRow): GiftDetails {
  return {
    gift: toGift(row),
    sender: toUser(row.sender),
    recipient: toUser(row.recipient),
    product: toProduct(row.product, row.variant),
    lastPayment: row.payments[0] ? toPayment(row.payments[0]) : null,
  };
}
