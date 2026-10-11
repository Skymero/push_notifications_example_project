export type AuthSubmissionLock = { current: boolean };

export function tryBeginAuthSubmission(lock: AuthSubmissionLock) {
  if (lock.current) return false;
  lock.current = true;
  return true;
}

export function finishAuthSubmission(lock: AuthSubmissionLock) {
  lock.current = false;
}
