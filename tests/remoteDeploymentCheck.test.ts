const { inspectRemoteFunctions } = require('../scripts/check-remote-functions.cjs');
const manifest = require('../functions/deployment-manifest.json');

function response(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function remoteFetch(overrides: Record<string, any> = {}) {
  return jest.fn(async (url: string) => {
    const expected = manifest.functions.find((item: any) => url.includes(item.id));
    if (url.endsWith('/variables')) {
      return response({ variables: expected.requiredVariables.map((key: string) => ({ key, value: 'must-not-leak' })) });
    }
    if (url.includes('/deployments/')) return response({ status: overrides.deploymentStatus ?? 'ready' });
    return response({ $id: expected.id, runtime: expected.runtime, timeout: expected.timeout,
      entrypoint: overrides.entrypoint ?? expected.entrypoint,
      commands: overrides.commands ?? `  ${expected.commands}  `,
      deployment: overrides.missingDeployment ? '' : 'deployment-ready' });
  });
}

const options = (fetchImpl: jest.Mock, expected = manifest) => ({ fetchImpl,
  endpoint: manifest.endpoint, projectId: manifest.projectId, apiKey: 'must-not-leak', expected });

test('matching live metadata passes without exposing variable values', async () => {
  const result = await inspectRemoteFunctions(options(remoteFetch()));
  expect(result.passed).toBe(true);
  expect(JSON.stringify(result)).not.toContain('must-not-leak');
});

test('a stale src/main.js entrypoint fails', async () => {
  const result = await inspectRemoteFunctions(options(remoteFetch({ entrypoint: 'src/main.js' })));
  expect(result.passed).toBe(false);
  expect(result.failures.join('\n')).toContain('entrypoint');
});

test('a missing active deployment fails', async () => {
  const result = await inspectRemoteFunctions(options(remoteFetch({ missingDeployment: true })));
  expect(result.passed).toBe(false);
  expect(result.failures.join('\n')).toContain('no active deployment');
});

test('missing variables are reported by name only', async () => {
  const reduced = structuredClone(manifest);
  reduced.functions[0].requiredVariables.push('MISSING_NAME');
  const result = await inspectRemoteFunctions(options(remoteFetch(), reduced));
  expect(result.passed).toBe(false);
  expect(result.failures.join('\n')).toContain('MISSING_NAME');
  expect(JSON.stringify(result)).not.toContain('must-not-leak');
});

test('HTTP failures discard provider response bodies', async () => {
  const fetchImpl = jest.fn(async () => response({ secret: 'must-not-leak' }, 500));
  await expect(inspectRemoteFunctions(options(fetchImpl))).rejects.toThrow('HTTP 500');
  try { await inspectRemoteFunctions(options(fetchImpl)); } catch (error) {
    expect(String(error)).not.toContain('must-not-leak');
  }
});
