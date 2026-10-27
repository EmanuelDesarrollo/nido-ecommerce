import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { GIFT_REPOSITORY, GiftRepository } from './application/ports/gift.repository';
import { NOTIFIER, Notifier } from './application/ports/notifier';
import { PAYMENT_GATEWAY, PaymentGateway } from './application/ports/payment.gateway';
import { PENDING_PAYMENT_SCHEDULER, PendingPaymentScheduler } from './application/ports/pending-payment.scheduler';
import { AnswerCluesUseCase } from './application/use-cases/answer-clues.use-case';
import { CheckoutUseCase } from './application/use-cases/checkout.use-case';
import { CreateGiftUseCase } from './application/use-cases/create-gift.use-case';
import { GetGiftsUseCase } from './application/use-cases/get-gifts.use-case';
import { ResolvePendingPaymentUseCase } from './application/use-cases/resolve-pending-payment.use-case';
import { RevealGiftUseCase } from './application/use-cases/reveal-gift.use-case';
import { SkipCluesUseCase } from './application/use-cases/skip-clues.use-case';
import { ThankGiftUseCase } from './application/use-cases/thank-gift.use-case';
import { PrismaGiftRepository } from './infrastructure/prisma-gift.repository';
import { SimulatedPaymentGateway } from './infrastructure/simulated-payment.gateway';
import { SocketNotifier } from './infrastructure/socket.notifier';
import { TimeoutPendingPaymentScheduler } from './infrastructure/timeout-pending-payment.scheduler';
import { EventsGateway } from './presentation/events.gateway';
import { GiftsController } from './presentation/gifts.controller';

const DEFAULT_PENDING_DELAY_MS = 6000;

/** Use cases are framework-free classes; they are wired to their adapters here. */
@Module({
  imports: [UsersModule],
  controllers: [GiftsController],
  providers: [
    EventsGateway,
    { provide: GIFT_REPOSITORY, useClass: PrismaGiftRepository },
    { provide: PAYMENT_GATEWAY, useClass: SimulatedPaymentGateway },
    { provide: NOTIFIER, useClass: SocketNotifier },
    {
      provide: PENDING_PAYMENT_SCHEDULER,
      useFactory: (gifts: GiftRepository, resolve: ResolvePendingPaymentUseCase) =>
        new TimeoutPendingPaymentScheduler(
          gifts,
          resolve,
          Number(process.env.PENDING_PAYMENT_DELAY_MS ?? DEFAULT_PENDING_DELAY_MS),
        ),
      inject: [GIFT_REPOSITORY, ResolvePendingPaymentUseCase],
    },
    {
      provide: CreateGiftUseCase,
      useFactory: (g: GiftRepository, n: Notifier) => new CreateGiftUseCase(g, n),
      inject: [GIFT_REPOSITORY, NOTIFIER],
    },
    {
      provide: AnswerCluesUseCase,
      useFactory: (g: GiftRepository, n: Notifier) => new AnswerCluesUseCase(g, n),
      inject: [GIFT_REPOSITORY, NOTIFIER],
    },
    {
      provide: SkipCluesUseCase,
      useFactory: (g: GiftRepository, n: Notifier) => new SkipCluesUseCase(g, n),
      inject: [GIFT_REPOSITORY, NOTIFIER],
    },
    {
      provide: CheckoutUseCase,
      useFactory: (g: GiftRepository, p: PaymentGateway, n: Notifier, s: PendingPaymentScheduler) =>
        new CheckoutUseCase(g, p, n, s),
      inject: [GIFT_REPOSITORY, PAYMENT_GATEWAY, NOTIFIER, PENDING_PAYMENT_SCHEDULER],
    },
    {
      provide: ResolvePendingPaymentUseCase,
      useFactory: (g: GiftRepository, n: Notifier) => new ResolvePendingPaymentUseCase(g, n),
      inject: [GIFT_REPOSITORY, NOTIFIER],
    },
    {
      provide: RevealGiftUseCase,
      useFactory: (g: GiftRepository, n: Notifier) => new RevealGiftUseCase(g, n),
      inject: [GIFT_REPOSITORY, NOTIFIER],
    },
    {
      provide: ThankGiftUseCase,
      useFactory: (g: GiftRepository, n: Notifier) => new ThankGiftUseCase(g, n),
      inject: [GIFT_REPOSITORY, NOTIFIER],
    },
    {
      provide: GetGiftsUseCase,
      useFactory: (g: GiftRepository) => new GetGiftsUseCase(g),
      inject: [GIFT_REPOSITORY],
    },
  ],
})
export class GiftsModule {}
