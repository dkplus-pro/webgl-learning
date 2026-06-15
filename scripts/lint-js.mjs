import { readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const checkOnly = process.argv.includes('--check-only');
const ignored = new Set(['.git', '.omx', 'node_modules']);

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    if (ignored.has(entry.name)) return [];
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return extname(entry.name) === '.js' || extname(entry.name) === '.mjs' ? [full] : [];
  });
}

const files = walk(root).filter((file) => statSync(file).isFile());
const failures = [];

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    failures.push(`${file}\n${result.stderr || result.stdout}`);
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

const mode = checkOnly ? 'typecheck' : 'lint';
console.log(`${mode}: checked ${files.length} JavaScript files with node --check`);
