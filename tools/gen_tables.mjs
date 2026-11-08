#!/usr/bin/env node
/**
 * Пересборка таблиц замен из двух каталогов плагина:
 *   --clean   чистая распаковка dsh-pet нужной версии (из npm-тарбола)
 *   --patched ваша русская сборка (после ручных правок)
 *
 * Для каждого файла из FILES считается построчный дифф и пишется
 * data/<имя>.json — массив пар [до, после].
 *
 *   node tools/gen_tables.mjs --clean C:\tmp\dsh-pet-0.4.2 --patched C:\tmp\ru
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const val = (n) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

const clean = val('clean');
const patched = val('patched');
const outDir = val('out') ?? 'data';
if (!clean || !patched) {
  console.error('usage: node tools/gen_tables.mjs --clean <dir> --patched <dir> [--out data]');
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const FILES = [
  'lib/app.js',
  'lib/chat-panel.js',
  'lib/client.js',
  'lib/index.js',
  'runtime/electron-helper/index.html',
  'runtime/electron-helper/renderer.js',
  'runtime/electron-helper/shared-core.js',
  'runtime/electron-helper/sprite.js',
  'runtime/electron-helper/sprite/bubble.js',
  'runtime/electron-helper/sprite/menu.js',
];

let total = 0;
for (const rel of FILES) {
  const a = join(clean, rel);
  const b = join(patched, rel);
  let oldText;
  try {
    oldText = readFileSync(a, 'utf8');
  } catch {
    console.log(`skip (нет в clean): ${rel}`);
    continue;
  }
  let diff = '';
  try {
    diff = execFileSync('git', ['diff', '--no-index', '-U3', '--', a, b], {
      encoding: 'utf8',
      maxBuffer: 128 * 1024 * 1024,
    });
  } catch (e) {
    diff = e.stdout?.toString() ?? '';
  }
  const lines = diff.split('\n');
  const pairs = [];
  let i = 0;
  while (i < lines.length) {
    if (!lines[i].startsWith('@@')) {
      i++;
      continue;
    }
    i++;
    const oldB = [];
    const newB = [];
    while (i < lines.length && !lines[i].startsWith('@@')) {
      const l = lines[i];
      if (l.startsWith('\\ No newline')) {
        i++;
        continue;
      }
      if (l.startsWith(' ')) {
        oldB.push(l.slice(1));
        newB.push(l.slice(1));
      } else if (l.startsWith('-')) oldB.push(l.slice(1));
      else if (l.startsWith('+')) newB.push(l.slice(1));
      i++;
    }
    if (!oldB.length && !newB.length) continue;
    const oldStr = oldB.join('\n');
    const count = oldStr === '' ? 1 : oldText.split(oldStr).length - 1;
    if (count !== 1) {
      console.warn(`  ! не уникальный блок в ${rel}: вхождений ${count}`);
    }
    pairs.push([oldStr, newB.join('\n')]);
  }
  const name = rel.replace(/[\\/]/g, '_') + '.json';
  writeFileSync(join(outDir, name), JSON.stringify(pairs), 'utf8');
  total += pairs.length;
  console.log(`${name}: ${pairs.length} блок(ов)`);
}
console.log(`\nвсего блоков: ${total}`);
