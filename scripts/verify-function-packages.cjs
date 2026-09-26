// Verify the actual uploaded bytes without allowing Node to find repository dependencies.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run this script through npm run functions:smoke.');

function run(command, args, cwd, capture = false) {
  const result = spawnSync(command, args, {
    cwd, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit', windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || `${command} failed (${result.status}).`);
  return result.stdout;
}

for (const name of ['notification-fanout', 'notification-support']) {
  const archive = path.join(root, 'dist', 'functions', `${name}.tar.gz`);
  const entries = run('tar', ['-tzf', archive], root, true).trim().split(/\r?\n/);
  for (const entry of entries) {
    if (!(entry === 'package.json' || entry === 'package-lock.json' || entry.startsWith('dist/')) ||
        /(^|\/)(\.\.|node_modules|\.env[^/]*|notification-receipt|notification-send-validation|notification-receive-validation)(\/|$)/.test(entry)) {
      throw new Error(`Unexpected archive entry: ${entry}`);
    }
  }
  const isolated = fs.mkdtempSync(path.join(os.tmpdir(), `${name}-smoke-`));
  run('tar', ['-xzf', archive, '-C', isolated], root);
  run(process.execPath, [npmCli, 'ci', '--omit=dev', '--ignore-scripts',
    '--no-audit', '--no-fund', '--workspaces=false',
    ...(process.env.FUNCTIONS_OFFLINE === '1' ? ['--offline'] : [])], isolated);
  const smoke = `
    const assert = require('node:assert/strict');
    const path = require('node:path');
    const manifest = require('./package.json');
    const entry = require(path.resolve(manifest.main));
    assert.equal(typeof entry.default, 'function');
    entry.default({req:{body:'{}',headers:{}},res:{json:(body,status)=>({body,status})},
      log:()=>{},error:()=>{}}).then(result=>{
        assert.equal(result.status,401);
        assert.equal(result.body.code,'AUTH_REQUIRED');
        console.log(manifest.name + ': isolated runtime import and authentication smoke passed');
      }).catch(error=>{console.error(error);process.exitCode=1});
  `;
  run(process.execPath, ['-e', smoke], isolated);
  console.log(`Verified archive: ${name}; isolated installation: ${isolated}`);
}
