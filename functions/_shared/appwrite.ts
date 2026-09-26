import { Client, Databases, ID, Permission, Query, Role, Users } from 'node-appwrite';
import type { AppwriteConfig } from './env';

export function createAdminClients(config: AppwriteConfig) {
  const client = new Client()
    .setEndpoint(config.endpoint)
    .setProject(config.projectId)
    .setKey(config.apiKey);

  return {
    client,
    databases: new Databases(client),
    users: new Users(client),
  };
}

export { ID, Permission, Query, Role };
