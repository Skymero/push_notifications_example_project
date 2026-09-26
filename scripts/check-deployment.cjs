// Presence/identity checks only: never print configuration values or Firebase JSON.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const config = require('../app.config.js');
let failures = 0;
const localEnv = {};
const envPath = path.join(root, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match) localEnv[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
const setting = name => (process.env[name] ?? localEnv[name] ?? '').trim();
function check(passed, message) {
  console.log(`${passed ? 'PASS' : 'BLOCKED'}: ${message}`);
  if (!passed) failures++;
}
for (const name of ['EXPO_PUBLIC_APPWRITE_ENDPOINT', 'EXPO_PUBLIC_APPWRITE_PROJECT_ID',
  'EXPO_PUBLIC_APPWRITE_DATABASE_ID']) {
  check(Boolean(setting(name)), `${name} is configured for this local build`);
}
const firebasePath = path.resolve(root, setting('GOOGLE_SERVICES_JSON') || config.android.googleServicesFile);
check(fs.existsSync(firebasePath), 'Firebase Android configuration file exists');
if (fs.existsSync(firebasePath)) {
  try {
    const firebase = JSON.parse(fs.readFileSync(firebasePath, 'utf8'));
    check(Array.isArray(firebase.client) && firebase.client.some(client =>
      client.client_info?.android_client_info?.package_name === config.android.package),
    'Firebase configuration matches the Expo Android package');
  } catch {
    check(false, 'Firebase configuration is valid JSON');
  }
}
const gradle = path.join(root, 'android', 'app', 'build.gradle');
if (fs.existsSync(gradle)) {
  const native = fs.readFileSync(gradle, 'utf8').match(/applicationId\s*[= ]\s*["']([^"']+)["']/);
  check(native?.[1] === config.android.package,
    'Existing Android application ID matches Expo config (use a fresh native build if it differs)');
}
console.log(`${config.extra?.eas?.projectId ? 'PASS' : 'PENDING'}: EAS project linkage (required only for cloud builds)`);
console.log('UNVERIFIED: Appwrite platform, schema, permissions, function deployments and environment variables');
console.log('UNVERIFIED: Native compilation and two-physical-device FCM acceptance');
process.exitCode = failures ? 1 : 0;
