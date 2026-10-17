const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run this script through npm run functions:reproducibility.');

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `${command} failed (${result.status}).`);
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function inventory(archive) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'function-repro-'));
  run('tar', ['-xzf', archive, '-C', directory], root);
  const result = {};
  function visit(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else result[path.relative(directory, absolute).replaceAll('\\', '/')] = sha256(absolute);
    }
  }
  visit(directory);
  return result;
}

const snapshots = [];
for (let pass = 0; pass < 2; pass += 1) {
  run(process.execPath, [npmCli, 'run', 'functions:package'], root);
  snapshots.push(Object.fromEntries(['notification-fanout', 'notification-support'].map((name) => {
    const archive = path.join(root, 'dist', 'functions', `${name}.tar.gz`);
    return [name, { archiveHash: sha256(archive), files: inventory(archive) }];
  })));
}
for (const name of ['notification-fanout', 'notification-support']) {
  if (JSON.stringify(snapshots[0][name].files) !== JSON.stringify(snapshots[1][name].files)) {
    throw new Error(`${name}: repeated package contents differ.`);
  }
  const byteIdentical = snapshots[0][name].archiveHash === snapshots[1][name].archiveHash;
  console.log(`PASS: ${name} has identical inventories and extracted hashes; archive bytes ${byteIdentical ? 'match' : 'differ only in container metadata'}.`);
}
