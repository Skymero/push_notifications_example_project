import { AuthFlowError } from '@/lib/appwrite/auth';

type ErrorLike = {
  code?: number | string;
  type?: string;
  message?: string;
};

export type AuthOperation = 'sign-in' | 'register' | 'session-restore';

export function getAuthErrorCode(error: unknown) {
  if (error instanceof AuthFlowError) return error.code;
  const candidate = error as ErrorLike | undefined;
  return String(candidate?.type || candidate?.code || 'AUTH_UNKNOWN');
}

export function getAuthErrorMessage(error: unknown, operation: AuthOperation) {
  const code = getAuthErrorCode(error);
  const candidate = (error instanceof AuthFlowError && error.originalError
    ? error.originalError
    : error) as ErrorLike | undefined;
  const message = String(candidate?.message || '').toLowerCase();

  if (
    operation === 'session-restore' &&
    (code === 'AUTH_RESULT_UNKNOWN' ||
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('failed to fetch') ||
      message.includes('offline'))
  ) {
    return 'The saved Appwrite session could not be checked. Check this device\'s connection, then sign in again.';
  }

  if (code === 'REGISTRATION_PARTIAL') {
    return 'Your account was created, but automatic sign-in did not finish. Try signing in.';
  }
  if (code === 'PASSWORD_TOO_SHORT') {
    return 'Password must be at least 8 characters.';
  }
  if (code === 'USERNAME_INVALID' || code === 'USERNAME_NORMALIZATION_REQUIRED') {
    return 'Use 3–30 lowercase letters, numbers, periods, underscores, or hyphens.';
  }
  if (code === 'user_already_exists' || Number(candidate?.code) === 409) {
    return 'That username is already registered. Try signing in.';
  }
  if (
    code === 'user_invalid_credentials' ||
    code === 'general_unauthorized_scope' ||
    Number(candidate?.code) === 401
  ) {
    return 'The username or password is incorrect.';
  }
  if (Number(candidate?.code) === 429 || code.includes('rate_limit')) {
    return 'Too many attempts. Wait a moment before trying again.';
  }
  if (code === 'AUTH_RESULT_UNKNOWN' || message.includes('timeout')) {
    return 'Appwrite did not confirm the result in time. Do not submit again yet; check your connection and then try signing in.';
  }
  if (
    message.includes('network') ||
    message.includes('failed to fetch') ||
    message.includes('offline')
  ) {
    return 'Appwrite could not be reached. Check this device’s connection and try again.';
  }
  if (
    code.includes('project') ||
    code.includes('platform') ||
    code.includes('origin') ||
    Number(candidate?.code) === 404
  ) {
    return 'Appwrite is not configured for this build. Check the project and Android platform settings.';
  }
  if (operation === 'session-restore') {
    return 'The saved Appwrite session could not be checked. Check the connection and retry.';
  }
  return operation === 'register'
    ? 'Registration could not be completed. Check the details and try again.'
    : 'Sign-in could not be completed. Check the details and try again.';
}

export function logAuthError(error: unknown, operation: AuthOperation) {
  const flow = error instanceof AuthFlowError ? error : undefined;
  const candidate = (flow?.originalError || error) as ErrorLike | undefined;
  const code = getAuthErrorCode(error);
  const message = String(candidate?.message || '').toLowerCase();
  const isRecoverableSessionRestore =
    operation === 'session-restore' &&
    (code === 'AUTH_RESULT_UNKNOWN' ||
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('failed to fetch') ||
      message.includes('offline'));
  const log = isRecoverableSessionRestore ? console.warn : console.error;

  log('[AUTH] Request failed', {
    operation,
    stage: flow?.stage ?? 'unknown',
    code,
    status: typeof candidate?.code === 'number' ? candidate.code : undefined,
    type: candidate?.type,
    accountCreated: flow?.accountCreated ?? false,
  });
}

export function getNotificationProfileErrorMessage(error: unknown) {
  const candidate = error as ErrorLike | undefined;
  const code = String(candidate?.type || candidate?.code || 'FUNCTION_UNAVAILABLE');
  if (code === 'FUNCTION_TIMEOUT') {
    return 'Notification setup did not finish in time. You are still signed in.';
  }
  if (
    Number(candidate?.code) === 404 ||
    code.includes('function_not_found') ||
    code.includes('deployment_not_found')
  ) {
    return 'Notification setup service is not deployed for this build. You are still signed in.';
  }
  return 'Notification setup failed. You are still signed in and can retry.';
}
