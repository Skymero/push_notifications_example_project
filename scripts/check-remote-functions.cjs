const manifest = require('../functions/deployment-manifest.json');

function normalizeCommand(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

async function readJson(fetchImpl, url, headers) {
  const response = await fetchImpl(url, { headers });
  if (!response.ok) throw new Error(`Appwrite metadata request failed with HTTP ${response.status}.`);
  return response.json();
}

async function inspectRemoteFunctions({ fetchImpl = fetch, endpoint, projectId, apiKey, expected = manifest }) {
  const base = endpoint.replace(/\/+$/, '');
  const headers = { 'X-Appwrite-Project': projectId, 'X-Appwrite-Key': apiKey };
  const failures = [];
  const summaries = [];
  for (const wanted of expected.functions) {
    const prefix = `${wanted.name} (${wanted.id})`;
    const live = await readJson(fetchImpl, `${base}/functions/${encodeURIComponent(wanted.id)}`, headers);
    if (live.$id !== wanted.id) failures.push(`${prefix}: function ID differs.`);
    if (live.runtime !== wanted.runtime) failures.push(`${prefix}: runtime is ${live.runtime || 'missing'}, expected ${wanted.runtime}.`);
    if (Number(live.timeout) !== wanted.timeout) failures.push(`${prefix}: timeout is ${live.timeout ?? 'missing'}, expected ${wanted.timeout}.`);
    if (live.entrypoint !== wanted.entrypoint) failures.push(`${prefix}: entrypoint is ${live.entrypoint || 'missing'}, expected ${wanted.entrypoint}.`);
    if (normalizeCommand(live.commands) !== normalizeCommand(wanted.commands)) {
      failures.push(`${prefix}: build command differs from the approved command.`);
    }
    if (!live.deployment) {
      failures.push(`${prefix}: no active deployment is configured.`);
    } else {
      const deployment = await readJson(fetchImpl,
        `${base}/functions/${encodeURIComponent(wanted.id)}/deployments/${encodeURIComponent(live.deployment)}`, headers);
      if (deployment.status !== 'ready') failures.push(`${prefix}: active deployment is ${deployment.status || 'unknown'}, not ready.`);
    }
    const variableResult = await readJson(fetchImpl,
      `${base}/functions/${encodeURIComponent(wanted.id)}/variables`, headers);
    const names = new Set((variableResult.variables ?? []).map((variable) => variable.key));
    const missing = wanted.requiredVariables.filter((name) => !names.has(name));
    if (missing.length) failures.push(`${prefix}: missing variables: ${missing.join(', ')}.`);
    summaries.push(`${prefix}: checked runtime, timeout, entrypoint, command, active deployment, and ${names.size} variable names.`);
  }
  return { passed: failures.length === 0, failures, summaries };
}

async function main() {
  const endpoint = process.env.APPWRITE_ENDPOINT || manifest.endpoint;
  const projectId = process.env.APPWRITE_PROJECT_ID || manifest.projectId;
  const apiKey = process.env.APPWRITE_API_KEY;
  if (!apiKey) throw new Error('APPWRITE_API_KEY is required for this opt-in read-only check.');
  if (endpoint !== manifest.endpoint || projectId !== manifest.projectId) {
    throw new Error('APPWRITE_ENDPOINT and APPWRITE_PROJECT_ID must match the deployment manifest.');
  }
  const result = await inspectRemoteFunctions({ endpoint, projectId, apiKey });
  for (const summary of result.summaries) console.log(`PASS: ${summary}`);
  for (const failure of result.failures) console.error(`BLOCKED: ${failure}`);
  process.exitCode = result.passed ? 0 : 1;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`BLOCKED: ${error instanceof Error ? error.message : 'Remote function check failed.'}`);
    process.exitCode = 1;
  });
}

module.exports = { inspectRemoteFunctions, normalizeCommand };
