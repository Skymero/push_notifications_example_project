import { ID, account } from '@/lib/appwrite/client';
import { setReceiptUser } from '@/lib/push-notifications/retryQueue';

export type AuthUser = {
  $id: string;
  email: string;
  name: string;
};

export type AuthStage =
  | 'creating-account'
  | 'signing-in'
  | 'checking-session'
  | 'signing-out';

export const AUTH_OPERATION_TIMEOUT_MS = 15_000;
export const AUTH_RECONCILIATION_TIMEOUT_MS = 5_000;
export const MIN_REGISTRATION_PASSWORD_LENGTH = 8;
export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,29}$/;

type AppwriteErrorLike = {
  code?: number | string;
  type?: string;
  message?: string;
};

export class AuthFlowError extends Error {
  constructor(
    public readonly code: string,
    public readonly stage: AuthStage,
    public readonly accountCreated: boolean,
    public readonly originalError?: unknown,
  ) {
    super(code);
    this.name = 'AuthFlowError';
  }
}

const errorCode = (error: unknown, fallback: string) => {
  const candidate = error as AppwriteErrorLike | undefined;
  return String(candidate?.type || candidate?.code || fallback);
};

const isNoSessionError = (error: unknown) => {
  const candidate = error as AppwriteErrorLike | undefined;
  return Number(candidate?.code) === 401 || candidate?.type === 'user_unauthorized';
};

function asAuthFlowError(error: unknown, stage: AuthStage, fallback: string) {
  if (error instanceof AuthFlowError) return error;
  return new AuthFlowError(errorCode(error, fallback), stage, false, error);
}

export function withAuthDeadline<T>(
  operation: Promise<T>,
  stage: AuthStage,
  timeoutMs = AUTH_OPERATION_TIMEOUT_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new AuthFlowError('AUTH_RESULT_UNKNOWN', stage, false));
    }, timeoutMs);

    operation.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export const normalizeUsername = (username: string) => username.trim().toLowerCase();

export function validateUsername(username: string) {
  const normalized = normalizeUsername(username);
  if (!USERNAME_PATTERN.test(normalized)) {
    throw new AuthFlowError('USERNAME_INVALID', 'creating-account', false);
  }

  if (normalized !== username.trim()) {
    throw new AuthFlowError('USERNAME_NORMALIZATION_REQUIRED', 'creating-account', false);
  }
  return normalized;
}

export function validateRegistrationPassword(password: string) {
  if (password.length < MIN_REGISTRATION_PASSWORD_LENGTH) {
    throw new AuthFlowError('PASSWORD_TOO_SHORT', 'creating-account', false);
  }
  return password;
}

const usernameToEmail = (username: string) => `${validateUsername(username)}@push.local`;

async function loadAuthenticatedUser(
  timeoutMs = AUTH_OPERATION_TIMEOUT_MS,
): Promise<AuthUser> {
  const user = await withAuthDeadline(
    account.get() as Promise<AuthUser>,
    'checking-session',
    timeoutMs,
  );
  // Match myapp's separation of remote authentication from local cache work:
  // local receipt storage must not invalidate a valid Appwrite session.
  await setReceiptUser(user.$id).catch(() => undefined);
  return user;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    return await loadAuthenticatedUser();
  } catch (error) {
    if (!isNoSessionError(error)) throw error;
    await setReceiptUser(null).catch(() => undefined);
    return null;
  }
}

export async function registerWithUsername(
  username: string,
  password: string,
  onStage?: (stage: AuthStage) => void,
) {
  const email = usernameToEmail(username);
  validateRegistrationPassword(password);
  onStage?.('creating-account');

  try {
    await withAuthDeadline(
      account.create(ID.unique(), email, password, username.trim()),
      'creating-account',
    );
  } catch (error) {
    throw asAuthFlowError(error, 'creating-account', 'REGISTRATION_FAILED');
  }

  try {
    return await signInWithUsername(username, password, onStage);
  } catch (error) {
    throw new AuthFlowError('REGISTRATION_PARTIAL', 'signing-in', true, error);
  }
}

export async function signInWithUsername(
  username: string,
  password: string,
  onStage?: (stage: AuthStage) => void,
) {
  const email = usernameToEmail(username);
  onStage?.('signing-in');

  try {
    await withAuthDeadline(
      account.createEmailPasswordSession(email, password),
      'signing-in',
    );
  } catch (error) {
    const authError = asAuthFlowError(error, 'signing-in', 'SIGN_IN_FAILED');
    if (authError.code !== 'AUTH_RESULT_UNKNOWN') throw authError;

    // A timed-out mutating request may still have created a session. Reconcile
    // with a read instead of repeating createEmailPasswordSession().
    onStage?.('checking-session');
    try {
      return await loadAuthenticatedUser(AUTH_RECONCILIATION_TIMEOUT_MS);
    } catch (reconciliationError) {
      throw new AuthFlowError(
        'AUTH_RESULT_UNKNOWN',
        'checking-session',
        false,
        reconciliationError,
      );
    }
  }

  onStage?.('checking-session');
  try {
    return await loadAuthenticatedUser();
  } catch (error) {
    throw asAuthFlowError(error, 'checking-session', 'AUTH_SESSION_UNAVAILABLE');
  }
}

export async function signOut() {
  await withAuthDeadline(account.deleteSession('current'), 'signing-out');
  await setReceiptUser(null);
}
