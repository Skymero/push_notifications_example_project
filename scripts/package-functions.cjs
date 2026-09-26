// Build only the two deployed functions into self-contained Appwrite uploads.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist', 'functions');
const names = ['notification-fanout', 'notification-support'];
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run this script through npm run functions:package.');

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${path.basename(command)} failed (${result.status}).`);
}

// Resolve the installed workspace version, including packages that hide package.json exports.
function installedVersion(localRequire, name) {
  let directory = path.dirname(localRequire.resolve(name));
  while (directory !== path.dirname(directory)) {
    const manifest = path.join(directory, 'package.json');
    if (fs.existsSync(manifest)) {
      const value = JSON.parse(fs.readFileSync(manifest, 'utf8'));
      if (value.name === name) return value.version;
    }
    directory = path.dirname(directory);
  }
  throw new Error(`Cannot resolve installed version for ${name}. Run npm ci first.`);
}

fs.mkdirSync(output, { recursive: true });
for (const name of names) {
  const source = path.join(root, 'functions', name);
  const manifestPath = path.join(source, 'package.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const localRequire = createRequire(manifestPath);
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), `${name}-build-`));
  // A new output tree prevents deleted or retired source from surviving as stale JS.
  run(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', source,
    '--outDir', path.join(staging, 'dist')], root);
  const dependencies = Object.fromEntries(Object.keys(manifest.dependencies).map(name =>
    [name, installedVersion(localRequire, name)]));
  fs.writeFileSync(path.join(staging, 'package.json'), JSON.stringify({
    name, version: manifest.version, private: true, type: manifest.type,
    main: manifest.main, engines: { node: '>=22' }, dependencies,
  }, null, 2) + '\n');
  run(process.execPath, [npmCli, 'install', '--package-lock-only', '--omit=dev',
    '--ignore-scripts', '--no-audit', '--no-fund', '--workspaces=false',
    ...(process.env.FUNCTIONS_OFFLINE === '1' ? ['--offline'] : [])], staging);
  if (!fs.existsSync(path.join(staging, manifest.main))) throw new Error(`Missing main for ${name}.`);
  const archive = path.join(output, `${name}.tar.gz`);
  run('tar', ['-czf', archive, '-C', staging, 'package.json', 'package-lock.json', 'dist'], root);
  console.log(`Ready: ${archive}`);
}
