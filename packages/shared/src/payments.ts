export const TEST_CARDS = {
  approved: '4242424242424242',
  rejected: '4000000000000002',
  pending: '4000000000003220',
} as const;

export const BUDGET_OPTIONS_COP = [100_000, 200_000, 300_000] as const;

export const REACTIONS = ['❤️', '😍', '🥹', '🤩', '🙌'] as const;
export type Reaction = (typeof REACTIONS)[number];

export const MAX_MESSAGE_LENGTH = 280;

export const IDEMPOTENCY_HEADER = 'idempotency-key';
export const USER_HEADER = 'x-user-id';
