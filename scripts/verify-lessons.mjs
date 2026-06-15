import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const lessonsDir = join(process.cwd(), 'lessons');
const lessonDirs = readdirSync(lessonsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^\d{2}-/.test(entry.name))
  .map((entry) => entry.name)
  .sort();

const failures = [];

function verifyLessonIndex() {
  const seenNumbers = new Set();
  for (const lesson of lessonDirs) {
    const number = lesson.slice(0, 2);
    if (seenNumbers.has(number)) failures.push(`duplicate lesson number: ${number}`);
    seenNumbers.add(number);
  }

  const indexPath = join(lessonsDir, 'README.md');
  if (!existsSync(indexPath)) {
    failures.push('lessons/README.md is missing');
    return;
  }

  const index = readFileSync(indexPath, 'utf8');
  for (const lesson of lessonDirs) {
    const expectedLink = `(${lesson}/README.md)`;
    if (!index.includes(expectedLink)) {
      failures.push(`lessons/README.md does not link ${lesson}/README.md`);
    }
  }

  const lessonLinkPattern = /\((\d{2}-[^)]+\/README\.md)\)/g;
  for (const match of index.matchAll(lessonLinkPattern)) {
    if (!existsSync(join(lessonsDir, match[1]))) {
      failures.push(`lessons/README.md links missing target: ${match[1]}`);
    }
  }
}

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
verifyLessonIndex();

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`verify-lessons: ${lessonDirs.length} lessons are independently runnable with README, HTML, JS entrypoints, unique numbers, and valid index links`);
