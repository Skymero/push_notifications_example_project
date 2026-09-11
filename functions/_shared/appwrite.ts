import { Client, Databases, ID, Permission, Query, Role, Users } from 'node-appwrite';
import type { FunctionConfig } from './env';

export function createAdminClients(config: FunctionConfig) {
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

export function ownerReadUpdatePermissions(userId: string) {
  return [Permission.read(Role.user(userId)), Permission.update(Role.user(userId))];
}

export function requesterReadPermissions(userId: string) {
  return [Permission.read(Role.user(userId))];
}

export { ID, Permission, Query, Role };
