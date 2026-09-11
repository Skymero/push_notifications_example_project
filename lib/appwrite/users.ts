import { ID, Permission, Query, Role, databases } from '@/lib/appwrite/client';
import { appConfig } from '@/lib/config';

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

function ownerPermissions(userId: string) {
  return [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
  ];
}

export async function getAppUserByAccountId(userId: string) {
  const result = await databases.listDocuments(databaseId, collections.users, [
    Query.equal('userId', userId),
    Query.limit(1),
  ]);

  return (result.documents[0] as unknown as AppUserDocument | undefined) ?? null;
}

export async function ensureAppUserDocument(userId: string, username: string) {
  const existing = await getAppUserByAccountId(userId);
  const now = new Date().toISOString();

  if (existing) {
    return (await databases.updateDocument(databaseId, collections.users, existing.$id, {
      username,
      updatedAt: now,
    })) as unknown as AppUserDocument;
  }

  return (await databases.createDocument(
    databaseId,
    collections.users,
    ID.unique(),
    {
      userId,
      username,
      notificationEnabled: false,
      activeDeviceId: null,
      activeDeviceTokenId: null,
      createdAt: now,
      updatedAt: now,
    },
    ownerPermissions(userId),
  )) as unknown as AppUserDocument;
}

export async function updateActiveDeviceReference(
  userId: string,
  deviceId: string,
  deviceTokenId: string,
) {
  const userDocument = await getAppUserByAccountId(userId);
  if (!userDocument) {
    return null;
  }

  return (await databases.updateDocument(databaseId, collections.users, userDocument.$id, {
    notificationEnabled: true,
    activeDeviceId: deviceId,
    activeDeviceTokenId: deviceTokenId,
    updatedAt: new Date().toISOString(),
  })) as unknown as AppUserDocument;
}
