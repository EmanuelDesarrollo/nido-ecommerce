import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CheckoutResultDto,
  GiftListResponse,
  GiftView,
  IDEMPOTENCY_HEADER,
  RecipientGiftView,
  SenderGiftView,
  UserDto,
} from '@nido/shared';
import { CurrentUser } from '../../common/current-user.decorator';
import { UserGuard } from '../../common/user.guard';
import { AnswerCluesUseCase } from '../application/use-cases/answer-clues.use-case';
import { CheckoutUseCase } from '../application/use-cases/checkout.use-case';
import { CreateGiftUseCase } from '../application/use-cases/create-gift.use-case';
import { GetGiftsUseCase } from '../application/use-cases/get-gifts.use-case';
import { RevealGiftUseCase } from '../application/use-cases/reveal-gift.use-case';
import { SkipCluesUseCase } from '../application/use-cases/skip-clues.use-case';
import { ThankGiftUseCase } from '../application/use-cases/thank-gift.use-case';
import { AnswerCluesDto, CheckoutDto, CreateGiftDto, ThanksDto } from './dto/gift.dto';
import { toGiftView, toPaymentDto, toRecipientView, toSenderView } from './gift.presenter';

const IDEMPOTENCY_KEY = /^[A-Za-z0-9-]{8,100}$/;

@Controller('gifts')
@UseGuards(UserGuard)
export class GiftsController {
  constructor(
    private readonly createGift: CreateGiftUseCase,
    private readonly answerClues: AnswerCluesUseCase,
    private readonly skipClues: SkipCluesUseCase,
    private readonly checkout: CheckoutUseCase,
    private readonly revealGift: RevealGiftUseCase,
    private readonly thankGift: ThankGiftUseCase,
    private readonly getGifts: GetGiftsUseCase,
  ) {}

  @Post()
  async create(@CurrentUser() user: UserDto, @Body() body: CreateGiftDto): Promise<SenderGiftView> {
    const gift = await this.createGift.execute(user.id, body);
    return toSenderView((await this.getGifts.one(user.id, gift.id)).details);
  }

  @Get()
  async list(@CurrentUser() user: UserDto): Promise<GiftListResponse> {
    const { sent, received } = await this.getGifts.forUser(user.id);
    return { sent: sent.map(toSenderView), received: received.map(toRecipientView) };
  }

  @Get(':id')
  async findOne(@CurrentUser() user: UserDto, @Param('id') id: string): Promise<GiftView> {
    const { details, role } = await this.getGifts.one(user.id, id);
    return toGiftView(details, role);
  }

  @Post(':id/clues')
  @HttpCode(200)
  async clues(@CurrentUser() user: UserDto, @Param('id') id: string, @Body() body: AnswerCluesDto): Promise<GiftView> {
    await this.answerClues.execute(user.id, id, { ...body, avoidCategory: body.avoidCategory ?? null });
    return this.findOne(user, id);
  }

  @Post(':id/skip-clues')
  @HttpCode(200)
  async skip(@CurrentUser() user: UserDto, @Param('id') id: string): Promise<GiftView> {
    await this.skipClues.execute(user.id, id);
    return this.findOne(user, id);
  }

  @Post(':id/checkout')
  @HttpCode(200)
  async pay(
    @CurrentUser() user: UserDto,
    @Param('id') id: string,
    @Headers(IDEMPOTENCY_HEADER) idempotencyKey: string | undefined,
    @Body() body: CheckoutDto,
  ): Promise<CheckoutResultDto> {
    if (!idempotencyKey || !IDEMPOTENCY_KEY.test(idempotencyKey)) {
      throw new BadRequestException('A valid Idempotency-Key header is required');
    }
    const { gift, payment } = await this.checkout.execute(user.id, id, {
      productId: body.productId,
      variantId: body.variantId,
      message: body.message || null,
      cardNumber: body.cardNumber,
      idempotencyKey,
    });
    return { giftId: gift.id, giftStatus: gift.status, payment: toPaymentDto(payment) };
  }

  @Post(':id/reveal')
  @HttpCode(200)
  async reveal(@CurrentUser() user: UserDto, @Param('id') id: string): Promise<GiftView> {
    await this.revealGift.execute(user.id, id);
    return this.findOne(user, id);
  }

  @Post(':id/thanks')
  @HttpCode(200)
  async thanks(@CurrentUser() user: UserDto, @Param('id') id: string, @Body() body: ThanksDto): Promise<GiftView> {
    await this.thankGift.execute(user.id, id, body.reaction, body.thankYouNote || null);
    return this.findOne(user, id);
  }
}
