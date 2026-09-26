export type SupportAction = 'sendValidation' | 'receiveValidation' | 'receipt' | 'registerDevice' | 'deactivateDevice' | 'ensureProfile';

export type SupportEnvelope = {
  action?: SupportAction | string;
  payload?: unknown;
};

export type ReceiveValidationPayload = {
  deviceId?: string;
  idempotencyKey?: string;
};

export type ReceiptPayload = {
  jobId?: string;
  recipientRecordId?: string;
  deviceId?: string;
  eventType?: 'received' | 'displayed' | 'opened';
  clientTimestamp?: string;
  idempotencyKey?: string;
  receiptNonce?: string;
};
