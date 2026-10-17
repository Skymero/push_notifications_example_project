// Deploy one packaged function archive to Appwrite, activate it after the build
// reports ready, then probe the unauthenticated authentication boundary.
// Usage: node scripts/deploy-function.cjs notification-support|notification-fanout
const fs = require('node:fs');
const path = require('node:path');
const { Client, Functions, InputFile } = require('node-appwrite');
const manifest = require('../functions/deployment-manifest.json');

const root = path.resolve(__dirname, '..');
const BUILD_TIMEOUT_MS = 8 * 60 * 1000;
const POLL_INTERVAL_MS = 5 * 1000;

const name = process.argv[2];
const wanted = manifest.functions.find((entry) => entry.entrypoint.includes(`/${name}/`));
if (!wanted) {
  console.error(`Unknown function "${name}". Expected one of: ` +
    manifest.functions.map((entry) => entry.entrypoint.split('/')[1]).join(', '));
  process.exit(1);
}

// Load the server API key from the function's local env file without printing it.
function loadEnv(file) {
  const values = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (match) values[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
  }
  return values;
}

const env = loadEnv(path.join(root, 'appwrite-function-env', name, '.env'));
const endpoint = (env.APPWRITE_ENDPOINT || '').replace(/\/+$/, '');
const projectId = env.APPWRITE_PROJECT_ID;
const apiKey = env.APPWRITE_API_KEY;
if (!apiKey) throw new Error(`APPWRITE_API_KEY missing from appwrite-function-env/${name}/.env`);
if (endpoint !== manifest.endpoint || projectId !== manifest.projectId) {
  throw new Error('Env endpoint/project do not match the deployment manifest.');
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const functions = new Functions(client);

  // Record the live state so the change is auditable against the rollback baseline.
  const live = await functions.get(wanted.id);
  console.log(`Function: ${wanted.name} (${wanted.id})`);
  console.log(`Live entrypoint: ${live.entrypoint} | build command: ${live.commands}`);
  console.log(`Prior active deployment: ${live.deployment} (rollback target)`);

  // Update entrypoint/build command while echoing every other live field back
  // unchanged, so PUT cannot silently reset execute permissions or timeouts.
  await functions.update(
    wanted.id, live.name, live.runtime, live.execute, live.events,
    live.schedule, live.timeout, live.enabled, live.logging,
    wanted.entrypoint, wanted.commands,
  );
  console.log(`Updated entrypoint -> ${wanted.entrypoint}`);
  console.log(`Updated build command -> ${wanted.commands}`);

  // Upload the verified archive as a new deployment; activate stays false so the
  // build is inspected before live traffic is switched to it.
  const archive = path.join(root, 'dist', 'functions', `${name}.tar.gz`);
  if (!fs.existsSync(archive)) throw new Error(`Missing archive ${archive}. Run functions:package first.`);
  const deployment = await functions.createDeployment(
    wanted.id, InputFile.fromPath(archive, `${name}.tar.gz`), false,
    wanted.entrypoint, wanted.commands,
  );
  console.log(`Uploaded deployment: ${deployment.$id}`);

  // Poll until Appwrite finishes building; only a ready build may be activated.
  const deadline = Date.now() + BUILD_TIMEOUT_MS;
  let status = deployment.status;
  while (status !== 'ready' && status !== 'failed' && status !== 'cancelled') {
    if (Date.now() > deadline) throw new Error(`Build did not finish within ${BUILD_TIMEOUT_MS / 60000} minutes.`);
    await sleep(POLL_INTERVAL_MS);
    status = (await functions.getDeployment(wanted.id, deployment.$id)).status;
    process.stdout.write(`Build status: ${status}\n`);
  }
  if (status !== 'ready') {
    throw new Error(`Deployment ${deployment.$id} finished with status ${status}. Inspect the build log in the Appwrite Console; the prior deployment ${live.deployment} is still active.`);
  }

  // Switch the function's active deployment pointer to the verified build.
  await functions.updateFunctionDeployment(wanted.id, deployment.$id);
  console.log(`Activated deployment: ${deployment.$id}`);

  // Probe WITHOUT the API key: execute permission is "any", so a guest request
  // must reach the handler and receive the controlled 401/AUTH_REQUIRED reply.
  const response = await fetch(`${endpoint}/functions/${wanted.id}/executions`, {
    method: 'POST',
    headers: { 'X-Appwrite-Project': projectId, 'Content-Type': 'application/json' },
    body: JSON.stringify({ body: '{}', async: false, method: 'POST', path: '/' }),
  });
  if (!response.ok) throw new Error(`Execution request failed with HTTP ${response.status}.`);
  const execution = await response.json();
  console.log(`Probe execution: ${execution.$id} | status: ${execution.status} | response code: ${execution.responseStatusCode}`);

  const body = String(execution.responseBody ?? '');
  const isAuthBoundary = execution.responseStatusCode === 401 && body.includes('AUTH_REQUIRED');
  if (!isAuthBoundary) {
    console.error(`Probe did not return the expected 401/AUTH_REQUIRED. Body (sanitized, first 200 chars): ${body.slice(0, 200)}`);
    console.error(`Roll back by activating prior deployment ${live.deployment} if this is a regression.`);
    process.exitCode = 1;
    return;
  }
  const errors = String(execution.errors ?? '');
  if (errors.includes('Failed to load entrypoint')) {
    console.error('Execution log still reports a missing entrypoint.');
    process.exitCode = 1;
    return;
  }
  console.log('PASS: unauthenticated probe reached the handler with 401/AUTH_REQUIRED.');
  console.log(`New active deployment: ${deployment.$id} | rollback target: ${live.deployment}`);
}

main().catch((error) => {
  console.error(`DEPLOY FAILED: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
