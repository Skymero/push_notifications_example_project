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

export const client = new Client();

if (appConfig.appwrite.endpoint && appConfig.appwrite.projectId) {
  client.setEndpoint(appConfig.appwrite.endpoint).setProject(appConfig.appwrite.projectId);
}

export const account = new Account(client);
export const databases = new Databases(client);
export const functions = new Functions(client);

export { ID, Permission, Query, Role };
