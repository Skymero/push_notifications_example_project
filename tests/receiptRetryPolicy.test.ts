import {
  classifyReceiptSubmitError,
  classifyReceiptSubmitResult,
} from '@/lib/push-notifications/receiptRetryPolicy';

describe('receipt retry policy', () => {
  it('treats duplicate receipts as success', () => {
    expect(classifyReceiptSubmitResult({ duplicate: true })).toBe('success');
    expect(classifyReceiptSubmitResult({ code: 'RECEIPT_DUPLICATE' })).toBe('success');
  });

  it('does not retry terminal validation failures', () => {
    expect(classifyReceiptSubmitResult({ ok: false, code: 'RECEIPT_UNAUTHORIZED' })).toBe(
      'terminal',
    );
    expect(classifyReceiptSubmitError({ code: 'RECEIPT_MALFORMED' })).toBe('terminal');
  });

  it('keeps network and unknown function failures retryable', () => {
    expect(classifyReceiptSubmitResult({ ok: false, code: 'FUNCTION_UNAVAILABLE' })).toBe(
      'retry',
    );
    expect(classifyReceiptSubmitError(new Error('offline'))).toBe('retry');
  });
});
