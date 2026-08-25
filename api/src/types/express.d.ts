declare global {
  namespace Express {
    interface Locals {
      requestId?: string;
      idempotencyRecordId?: number;
      idempotencyResponseBody?: unknown;
      idempotencyResponseCaptured?: boolean;
    }
    interface Request {
      rawBody?: string;
      requestId?: string;
    }
  }
}

export {};
