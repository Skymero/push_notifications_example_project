// Build only the two deployed functions into self-contained Appwrite uploads.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist', 'functions');
const names = ['notification-fanout', 'notification-support'];
const rootLock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
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

// Walk the root lockfile from each manifest dependency, following npm's
// node_modules resolution upward, so the packaged lockfile contains only the
// function's own tree instead of every monorepo package.
function reachablePackages(manifest) {
  const keys = new Set();
  const queue = [['', Object.keys(manifest.dependencies)]];
  while (queue.length) {
    const [scope, names] = queue.shift();
    for (const name of names) {
      let base = scope;
      let key;
      while (key === undefined) {
        const candidate = base ? `${base}/node_modules/${name}` : `node_modules/${name}`;
        if (rootLock.packages[candidate]) key = candidate;
        else if (!base) break;
        else base = base.includes('/node_modules/')
          ? base.slice(0, base.lastIndexOf('/node_modules/'))
          : '';
      }
      if (!key) throw new Error(`Cannot resolve ${name} from ${scope || 'root'} in package-lock.json.`);
      if (keys.has(key)) continue;
      keys.add(key);
      const entry = rootLock.packages[key];
      const deps = Object.keys({
        ...entry.dependencies, ...entry.optionalDependencies, ...entry.peerDependencies,
      }).filter(dep => !entry.peerDependenciesMeta?.[dep]?.optional);
      if (deps.length) queue.push([key, deps]);
    }
  }
  return keys;
}

function productionLock(manifest) {
  const packages = { '': manifest };
  for (const key of reachablePackages(manifest)) packages[key] = rootLock.packages[key];
  return { name: manifest.name, version: manifest.version,
    lockfileVersion: rootLock.lockfileVersion, requires: true, packages };
}

function archiveFiles(directory) {
  const files = [];
  function visit(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else files.push(path.relative(directory, absolute).replaceAll('\\', '/'));
    }
  }
  visit(directory);
  return files.sort();
}

function normalizeTimes(directory) {
  const epoch = new Date('2000-01-01T00:00:00.000Z');
  const paths = [directory];
  function visit(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      paths.push(absolute);
      if (entry.isDirectory()) visit(absolute);
    }
  }
  visit(directory);
  for (const value of paths.reverse()) fs.utimesSync(value, epoch, epoch);
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
  const packagedManifest = {
    name, version: manifest.version, private: true, type: manifest.type,
    main: manifest.main, engines: { node: '>=22' }, dependencies,
  };
  fs.writeFileSync(path.join(staging, 'package.json'), JSON.stringify(packagedManifest, null, 2) + '\n');
  // Ship a pruned production lockfile so the documented `npm ci --omit=dev`
  // build command has a lockfile to install from.
  fs.writeFileSync(path.join(staging, 'package-lock.json'),
    JSON.stringify(productionLock(packagedManifest), null, 2) + '\n');
  if (!fs.existsSync(path.join(staging, manifest.main))) throw new Error(`Missing main for ${name}.`);
  normalizeTimes(staging);
  const archive = path.join(output, `${name}.tar.gz`);
  const fileList = archiveFiles(staging);
  const fileListPath = path.join(staging, 'filelist.txt');
  fs.writeFileSync(fileListPath, fileList.join('\n'));
  // Run inside staging so member paths stay relative; -C is avoided because
  // GNU tar rejects drive-letter paths there even though -f works.
  run('tar', ['-czf', archive, '--force-local', '-T', 'filelist.txt'], staging);
  console.log(`Ready: ${archive}`);
}
