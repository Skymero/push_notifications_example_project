import { fail, getAuthenticatedUserId, ok, withHandler } from '../../_shared/http';
import type { AppwriteFunctionContext } from '../../_shared/http';

export default async function main(context: AppwriteFunctionContext) {
  return withHandler(context, async () => {
    const userId = getAuthenticatedUserId(context);
    if (!userId) {
      return fail(context, 401, 'AUTH_REQUIRED', 'Sign in before sending notifications.');
    }

    return ok(context, {
      color: 'green',
      code: 'SEND_READY',
      message: 'Authenticated Android user can reach the Appwrite send function.',
    });
  });
}
