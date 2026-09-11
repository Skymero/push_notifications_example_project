import { createAdminClients } from '../../../_shared/appwrite';
import { loadConfig } from '../../../_shared/env';
import { getFirebaseMessaging } from '../../../_shared/firebase';
import { fail, ok } from '../../../_shared/http';
import type { AppwriteFunctionContext } from '../../../_shared/http';

export async function handleSendValidation(context: AppwriteFunctionContext, _userId: string) {
  try {
    const config = loadConfig();
    createAdminClients(config);
    getFirebaseMessaging(config);

    return ok(context, {
      color: 'green',
      code: 'SEND_READY',
      message: 'Authenticated Android user can reach the Appwrite notification support function.',
    });
  } catch (error) {
    context.error(error instanceof Error ? error.message : 'Notification support configuration failed.');
    return fail(context, 500, 'SERVER_MISCONFIGURED', 'Notification backend configuration is incomplete.');
  }
}
