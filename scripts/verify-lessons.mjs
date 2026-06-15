import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const lessonsDir = join(process.cwd(), 'lessons');
const lessonDirs = readdirSync(lessonsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^\d{2}-/.test(entry.name))
  .map((entry) => entry.name)
  .sort();

const failures = [];

for (const lesson of lessonDirs) {
  const dir = join(lessonsDir, lesson);
  const required = ['README.md', 'index.html', 'src/main.js'];
  for (const file of required) {
    const full = join(dir, file);
    if (!existsSync(full)) failures.push(`${lesson}: missing ${file}`);
  }

  const htmlPath = join(dir, 'index.html');
  const jsPath = join(dir, 'src/main.js');
  if (existsSync(htmlPath)) {
    const html = readFileSync(htmlPath, 'utf8');
    if (!html.includes('canvas')) failures.push(`${lesson}: index.html must include a canvas`);
    if (!html.includes('src/main.js')) failures.push(`${lesson}: index.html must load src/main.js`);
  }
  if (existsSync(jsPath)) {
    const js = readFileSync(jsPath, 'utf8');
    if (!js.includes('getContext')) failures.push(`${lesson}: main.js must request a WebGL context`);
    if (!js.includes('use strict')) failures.push(`${lesson}: main.js should use strict mode`);
  }
}

if (lessonDirs.length === 0) failures.push('no lesson directories found');
if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`verify-lessons: ${lessonDirs.length} lessons are independently runnable with README, HTML, and JS entrypoints`);
