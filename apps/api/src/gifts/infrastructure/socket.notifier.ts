import { Injectable } from '@nestjs/common';
import { SocketEvent, SocketEventPayloads } from '@nido/shared';
import { Notifier } from '../application/ports/notifier';
import { EventsGateway } from '../presentation/events.gateway';

@Injectable()
export class SocketNotifier implements Notifier {
  constructor(private readonly events: EventsGateway) {}

  notify<E extends SocketEvent>(userId: string, event: E, payload: SocketEventPayloads[E]): void {
    this.events.emitToUser(userId, event, payload);
  }
}
