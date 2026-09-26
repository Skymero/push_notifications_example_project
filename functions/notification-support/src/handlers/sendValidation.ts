import { createAdminClients, Query } from '../../../_shared/appwrite';
import { loadConfig } from '../../../_shared/env';
import { getFirebaseMessaging, verifyFirebaseCredentials } from '../../../_shared/firebase';
import { assertJobSchema } from '../../../_shared/jobs';
import { fail, ok } from '../../../_shared/http';
import type { AppwriteFunctionContext } from '../../../_shared/http';

export async function handleSendValidation(context: AppwriteFunctionContext, _userId: string) {
  try {
    const config = loadConfig();
    const { databases, users } = createAdminClients(config);
    getFirebaseMessaging(config);
    await assertJobSchema(databases, config);
    for (const collectionId of [config.usersCollectionId, config.deviceTokensCollectionId,
      config.notificationRecipientsCollectionId, config.notificationReceiptsCollectionId]) {
      await databases.listDocuments(config.databaseId, collectionId, [Query.limit(1)]);
    }
    await users.get(_userId);
    const transaction = await databases.createTransaction({ ttl: 60 });
    await databases.updateTransaction({ transactionId: transaction.$id, rollback: true });
    await verifyFirebaseCredentials(config);

    return ok(context, {
      color: 'green',
      code: 'SEND_READY',
      message: 'Notification backend collections, transactions and Firebase credentials passed preflight.',
    });
  } catch (error) {
    context.error('Notification support preflight failed.');
    return fail(context, 500, 'SERVER_MISCONFIGURED', 'Notification backend configuration is incomplete.');
  }
}
