import { Query, databases } from '@/lib/appwrite/client';
import { appConfig } from '@/lib/config';
import { ensureNotificationProfile } from '@/lib/appwrite/notifications';

const { databaseId, collections } = appConfig.appwrite;

export type AppUserDocument = {
  $id: string;
  userId: string;
  username: string;
  notificationEnabled: boolean;
  activeDeviceId?: string | null;
  activeDeviceTokenId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function getAppUserByAccountId(userId: string) {
  console.log('[USERS] getAppUserByAccountId called with userId:', userId);
  const result = await databases.listDocuments(databaseId, collections.users, [
    Query.equal('userId', userId),
    Query.limit(1),
  ]);
  console.log('[USERS] getAppUserByAccountId result:', result.documents.length, 'documents');
  return (result.documents[0] as unknown as AppUserDocument | undefined) ?? null;
}

export async function ensureAppUserDocument() {
  // The authenticated function derives both identity and name from Appwrite Auth.
  return ensureNotificationProfile();
}
