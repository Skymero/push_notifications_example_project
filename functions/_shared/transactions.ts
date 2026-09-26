import type { Databases } from 'node-appwrite';

export function hasStatus(error: unknown, code: number) {
  return typeof error === 'object' && error !== null && 'code' in error && Number(error.code) === code;
}

/** Conflict retries repeat reads and writes; FCM calls must never run in this callback. */
export async function inTransaction<T>(databases: Databases, operation: (transactionId: string) => Promise<T>) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const transaction = await databases.createTransaction({ ttl: 60 });
    try {
      const result = await operation(transaction.$id);
      await databases.updateTransaction({ transactionId: transaction.$id, commit: true });
      return result;
    } catch (error) {
      await databases.updateTransaction({ transactionId: transaction.$id, rollback: true }).catch(() => undefined);
      if (!hasStatus(error, 409) || attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 10 * (attempt + 1)));
    }
  }
  throw new Error('Transaction retry budget exhausted.');
}
