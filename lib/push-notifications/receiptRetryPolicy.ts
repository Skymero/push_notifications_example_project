export type ReceiptSubmitResult = {
  ok?: boolean;
  duplicate?: boolean;
  code?: string;
};

export type ReceiptRetryDecision = 'success' | 'retry' | 'terminal';

const terminalCodes = new Set([
  'RECEIPT_MALFORMED',
  'RECEIPT_UNAUTHORIZED',
  'RECEIPT_EXPIRED',
  'UNKNOWN_NOTIFICATION_SCHEMA',
]);

export function classifyReceiptSubmitResult(result: ReceiptSubmitResult): ReceiptRetryDecision {
  if (result.ok || result.duplicate || result.code === 'RECEIPT_DUPLICATE') {
    return 'success';
  }

  if (result.code && terminalCodes.has(result.code)) {
    return 'terminal';
  }

  return 'retry';
}

export function classifyReceiptSubmitError(error: unknown): ReceiptRetryDecision {
  if (error && typeof error === 'object' && 'code' in error) {
    return classifyReceiptSubmitResult({ code: String(error.code) });
  }

  return 'retry';
}
