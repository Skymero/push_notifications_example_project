import { ID, account } from '@/lib/appwrite/client';
import { ensureAppUserDocument } from '@/lib/appwrite/users';

export type AuthUser = {
  $id: string;
  email: string;
  name: string;
};

export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,29}$/;

export const normalizeUsername = (username: string) => username.trim().toLowerCase();

export function validateUsername(username: string) {
  const normalized = normalizeUsername(username);
  if (!USERNAME_PATTERN.test(normalized)) {
    throw new Error('USERNAME_INVALID');
  }

  if (normalized !== username.trim()) {
    throw new Error('USERNAME_NORMALIZATION_REQUIRED');
  }

  return normalized;
}

const usernameToEmail = (username: string) => `${validateUsername(username)}@push.local`;

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    return (await account.get()) as AuthUser;
  } catch {
    return null;
  }
}

export async function registerWithUsername(username: string, password: string) {
  const email = usernameToEmail(username);
  await account.create(ID.unique(), email, password, username.trim());
  await signInWithUsername(username, password);
  const user = await getCurrentUser();
  if (user) {
    await ensureAppUserDocument(user.$id, validateUsername(username));
  }
  return user;
}

export async function signInWithUsername(username: string, password: string) {
  const email = usernameToEmail(username);
  await account.createEmailPasswordSession(email, password);
  const user = await getCurrentUser();
  if (user) {
    await ensureAppUserDocument(user.$id, validateUsername(username));
  }
  return user;
}

export async function signOut() {
  try {
    await account.deleteSession('current');
  } catch {
    return;
  }
}
