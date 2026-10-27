import { Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { GiftRepository } from '../application/ports/gift.repository';
import { PendingPaymentScheduler } from '../application/ports/pending-payment.scheduler';
import { ResolvePendingPaymentUseCase } from '../application/use-cases/resolve-pending-payment.use-case';

/**
 * In-memory stand-in for the processor webhook: settles pending payments after a delay.
 * In production this would be a real webhook plus a durable queue (e.g. BullMQ).
 */
export class TimeoutPendingPaymentScheduler
  implements PendingPaymentScheduler, OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(TimeoutPendingPaymentScheduler.name);
  private readonly timers = new Set<NodeJS.Timeout>();

  constructor(
    private readonly gifts: GiftRepository,
    private readonly resolve: ResolvePendingPaymentUseCase,
    private readonly delayMs: number,
  ) {}

  schedule(paymentId: string): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      this.resolve
        .execute(paymentId)
        .catch((error: unknown) => this.logger.error(`Could not settle payment ${paymentId}`, error));
    }, this.delayMs);
    this.timers.add(timer);
  }

  /** Timers die with the process, so pending payments left by a restart are rescheduled. */
  async onApplicationBootstrap(): Promise<void> {
    for (const id of await this.gifts.listPendingPaymentIds()) this.schedule(id);
  }

  onApplicationShutdown(): void {
    this.timers.forEach(clearTimeout);
  }
}
