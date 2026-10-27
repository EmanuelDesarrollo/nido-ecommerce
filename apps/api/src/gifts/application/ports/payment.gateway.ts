import { PaymentStatus } from '@nido/shared';

export const PAYMENT_GATEWAY = Symbol('PaymentGateway');

export interface ChargeRequest {
  amountCop: number;
  cardNumber: string;
}

export interface ChargeResult {
  status: PaymentStatus;
  failureReason: string | null;
}

export interface PaymentGateway {
  charge(request: ChargeRequest): Promise<ChargeResult>;
}
