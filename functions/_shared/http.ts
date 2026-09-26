export type AppwriteFunctionContext = {
  req: {
    body?: string | Record<string, unknown>;
    headers?: Record<string, string | undefined>;
  };
  res: {
    json: (body: unknown, statusCode?: number) => unknown;
  };
  log: (message: string) => void;
  error: (message: string) => void;
};

export function parseJsonBody<T>(body: AppwriteFunctionContext['req']['body']): T {
  let parsed: unknown = body ?? {};
  try {
    if (typeof body === 'string') parsed = JSON.parse(body || '{}');
  } catch {
    throw new RequestError(400, 'INVALID_JSON', 'Request body must be a JSON object.');
  }
  if (!isRecord(parsed)) {
    throw new RequestError(400, 'INVALID_JSON', 'Request body must be a JSON object.');
  }
  return parsed as T;
}

export class RequestError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function isBoundedString(value: unknown, max = 128): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max && value.trim() === value;
}

export function isDocumentId(value: unknown): value is string {
  return isBoundedString(value, 36) && /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value);
}

export function getAuthenticatedUserId(context: AppwriteFunctionContext) {
  const headers = context.req.headers ?? {};
  return (
    headers['x-appwrite-user-id'] ??
    headers['X-Appwrite-User-Id'] ??
    process.env.APPWRITE_FUNCTION_USER_ID ??
    ''
  );
}

export function ok(context: AppwriteFunctionContext, body: unknown, statusCode = 200) {
  return context.res.json(body, statusCode);
}

export function fail(
  context: AppwriteFunctionContext,
  statusCode: number,
  code: string,
  message: string,
) {
  return context.res.json({ ok: false, code, message }, statusCode);
}

export async function withHandler(
  context: AppwriteFunctionContext,
  handler: () => Promise<unknown>,
) {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof RequestError) return fail(context, error.status, error.code, error.message);
    // Third-party exception messages can contain payloads or credentials.
    context.error('Notification function operation failed.');
    return fail(context, 500, 'FUNCTION_UNAVAILABLE', 'Function execution failed.');
  }
}
