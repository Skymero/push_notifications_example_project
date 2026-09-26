import { ID, account } from '@/lib/appwrite/client';
import { ensureAppUserDocument } from '@/lib/appwrite/users';
import { setReceiptUser } from '@/lib/push-notifications/retryQueue';

export type AuthUser = {
  $id: string;
  email: string;
  name: string;
};

export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,29}$/;

export const normalizeUsername = (username: string) => {
  const normalized = username.trim().toLowerCase();
  console.log('[AUTH] normalizeUsername:', username, '->', normalized);
  return normalized;
};

export function validateUsername(username: string) {
  console.log('[AUTH] validateUsername called with:', username);
  const normalized = normalizeUsername(username);
  if (!USERNAME_PATTERN.test(normalized)) {
    console.log('[AUTH] validateUsername failed: pattern mismatch');
    throw new Error('USERNAME_INVALID');
  }

  if (normalized !== username.trim()) {
    console.log('[AUTH] validateUsername failed: normalization required');
    throw new Error('USERNAME_NORMALIZATION_REQUIRED');
  }
  console.log('[AUTH] validateUsername passed:', normalized);
  return normalized;
}

const usernameToEmail = (username: string) => `${validateUsername(username)}@push.local`;

export async function getCurrentUser(): Promise<AuthUser | null> {
  console.log('[AUTH] getCurrentUser called');
  let user: AuthUser;
  try {
    user = (await account.get()) as AuthUser;
    console.log('[AUTH] getCurrentUser success:', user);
  } catch (error) {
    console.log('[AUTH] getCurrentUser failed:', error);
    await setReceiptUser(null).catch(() => undefined);
    return null;
  }
  // Local receipt storage trouble should not make a valid Appwrite session
  // disappear from the UI. The next foreground retry can restore this key.
  await setReceiptUser(user.$id).catch(() => undefined);
  return user;
}

export async function registerWithUsername(username: string, password: string) {
  console.log('[AUTH] registerWithUsername called with username:', username);
  const email = usernameToEmail(username);
  console.log('[AUTH] registerWithUsername email derived:', email);
  await account.create(ID.unique(), email, password, username.trim());
  console.log('[AUTH] Account created, signing in...');
  const result = await signInWithUsername(username, password);
  console.log('[AUTH] registerWithUsername completed');
  return result;
}

export async function signInWithUsername(username: string, password: string) {
  console.log('[AUTH] signInWithUsername called with username:', username);
  const email = usernameToEmail(username);
  console.log('[AUTH] signInWithUsername email derived:', email);
  await account.createEmailPasswordSession(email, password);
  console.log('[AUTH] signInWithUsername session created');
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.log('[AUTH] signInWithUsername failed: user is null');
      throw new Error('AUTH_SESSION_UNAVAILABLE');
    }
    console.log('[AUTH] signInWithUsername ensuring app user document');
    await ensureAppUserDocument(user.$id, validateUsername(username));
    console.log('[AUTH] signInWithUsername completed successfully');
    return user;
  } catch (error) {
    console.log('[AUTH] signInWithUsername error:', error);
    // A support/schema failure after session creation must not leave a hidden
    // authenticated session behind while the UI reports a failed sign-in.
    await account.deleteSession('current').catch(() => undefined);
    await setReceiptUser(null).catch(() => undefined);
    throw error;
  }
}

export async function signOut() {
  console.log('[AUTH] signOut called');
  await account.deleteSession('current');
  await setReceiptUser(null);
  console.log('[AUTH] signOut completed');
}
