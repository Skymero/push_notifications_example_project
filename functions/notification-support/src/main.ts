import {
  fail,
  getAuthenticatedUserId,
  parseJsonBody,
  withHandler,
} from '../../_shared/http';
import { handleReceipt } from './handlers/receipt';
import { handleReceiveValidation } from './handlers/receiveValidation';
import { handleSendValidation } from './handlers/sendValidation';
import type { AppwriteFunctionContext } from '../../_shared/http';
import type { SupportEnvelope } from './types';

export default async function main(context: AppwriteFunctionContext) {
  return withHandler(context, async () => {
    const userId = getAuthenticatedUserId(context);
    if (!userId) {
      return fail(context, 401, 'AUTH_REQUIRED', 'Sign in before using notification support.');
    }

    const request = parseJsonBody<SupportEnvelope>(context.req.body);
    switch (request.action) {
      case 'sendValidation':
        return handleSendValidation(context, userId);
      case 'receiveValidation':
        return handleReceiveValidation(context, userId, request.payload);
      case 'receipt':
        return handleReceipt(context, userId, request.payload);
      default:
        return fail(context, 400, 'INVALID_SUPPORT_ACTION', 'Unsupported notification support action.');
    }
  });
}
