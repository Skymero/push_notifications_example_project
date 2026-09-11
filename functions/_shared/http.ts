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
  if (!body) {
    return {} as T;
  }

  if (typeof body === 'string') {
    return JSON.parse(body || '{}') as T;
  }

  return body as T;
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
    context.error(error instanceof Error ? error.message : 'Unknown function error');
    return fail(context, 500, 'FUNCTION_UNAVAILABLE', 'Function execution failed.');
  }
}
