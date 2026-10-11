import {
  Account,
  Client,
  Databases,
  Functions,
  ID,
  Permission,
  Query,
  Role,
} from 'react-native-appwrite';
import { appConfig } from '@/lib/config';
import Constants from 'expo-constants';

export const client = new Client();

if (!appConfig.appwrite.endpoint || !appConfig.appwrite.projectId) {
  console.warn('[appwriteConfig] Missing Appwrite endpoint or project ID. Set EXPO_PUBLIC_APPWRITE_ENDPOINT and EXPO_PUBLIC_APPWRITE_PROJECT_ID.');
} else {
  const androidPackage = Constants.expoConfig?.android?.package;
  const platform = androidPackage || 'com.pushnotificationexample.app';
  console.log('[appwriteConfig] Initializing client', {
    platform,
    endpointConfigured: Boolean(appConfig.appwrite.endpoint),
    projectConfigured: Boolean(appConfig.appwrite.projectId),
    databaseConfigured: Boolean(appConfig.appwrite.databaseId),
  });
  client
    .setEndpoint(appConfig.appwrite.endpoint)
    .setProject(appConfig.appwrite.projectId)
    .setPlatform(platform);
}

export const account = new Account(client);
export const databases = new Databases(client);
export const functions = new Functions(client);

export { ID, Permission, Query, Role };
