import type { Clues } from './clues';
import type { GiftStatus, PaymentStatus } from './status';

export const SocketEvent = {
  CLUES_REQUESTED: 'gift:clues_requested',
  CLUES_ANSWERED: 'gift:clues_answered',
  PAYMENT_UPDATED: 'gift:payment_updated',
  ON_THE_WAY: 'gift:on_the_way',
  REVEALED: 'gift:revealed',
  THANKED: 'gift:thanked',
} as const;
export type SocketEvent = (typeof SocketEvent)[keyof typeof SocketEvent];

export interface SocketEventPayloads {
  /** To the recipient. Never includes who is sending. */
  [SocketEvent.CLUES_REQUESTED]: { giftId: string };
  /** To the sender. clues is null when the sender skipped them. */
  [SocketEvent.CLUES_ANSWERED]: { giftId: string; clues: Clues | null };
  /** To the sender. */
  [SocketEvent.PAYMENT_UPDATED]: {
    giftId: string;
    giftStatus: GiftStatus;
    paymentId: string;
    paymentStatus: PaymentStatus;
    failureReason: string | null;
  };
  /** To the recipient. */
  [SocketEvent.ON_THE_WAY]: { giftId: string };
  /** To the sender. */
  [SocketEvent.REVEALED]: { giftId: string; recipientName: string };
  /** To the sender. */
  [SocketEvent.THANKED]: { giftId: string; recipientName: string; reaction: string; thankYouNote: string | null };
}

export const userRoom = (userId: string): string => `user:${userId}`;
