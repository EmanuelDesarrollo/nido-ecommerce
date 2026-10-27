import { SocketEvent, SocketEventPayloads } from '@nido/shared';

export const NOTIFIER = Symbol('Notifier');

export interface Notifier {
  notify<E extends SocketEvent>(userId: string, event: E, payload: SocketEventPayloads[E]): void;
}
