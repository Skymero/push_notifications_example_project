import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import type { FunctionConfig } from './env';

export function getFirebaseMessaging(config: FunctionConfig) {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: config.firebaseProjectId,
        clientEmail: config.firebaseClientEmail,
        privateKey: config.firebasePrivateKey,
      }),
    });
  }

  return getMessaging();
}

export async function verifyFirebaseCredentials(config: FunctionConfig) {
  await cert({ projectId: config.firebaseProjectId, clientEmail: config.firebaseClientEmail,
    privateKey: config.firebasePrivateKey }).getAccessToken();
}

export function classifyFirebaseError(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
    ? error.code : 'messaging/unknown-error';
  const permanent = code === 'messaging/registration-token-not-registered' ||
    code === 'messaging/invalid-registration-token';
  return { code: permanent ? 'FCM_TOKEN_INVALID' : 'FCM_SEND_FAILED', permanent,
    message: permanent ? 'The registered token is no longer valid.' : 'The push provider could not complete this send.' };
}
