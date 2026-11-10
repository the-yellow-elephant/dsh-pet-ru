#!/usr/bin/env node
/**
 * dsh-pet-ru — русская локализация плагина dsh-pet (DeepSeek Harness).
 *
 * Ставит русский интерфейс, русские мемы, шрифт Nunito и русский конфиг
 * поверх чистой установки dsh-pet 0.4.7. Одна команда:
 *
 *   node apply.mjs
 *   node apply.mjs --dry-run
 *   node apply.mjs --profile desktop --install-config
 *
 * После установки: перезапустить DSH (хост-часть читается на старте).
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const value = (n, f) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : f;
};

const dryRun = flag('dry-run');
const wantConfig = flag('install-config');
const verbose = flag('verbose');
const profileArg = value('profile', undefined);
const pkgArg = value('pkg', undefined);

const TESTED_VERSION = '0.4.7';
const dataDir = join(here, 'data');
const fontsDir = join(here, 'assets', 'fonts');
const memesDir = join(here, 'assets', 'memes-ru');
const sampleConfig = join(here, 'config', 'main-config.ru.jsonc');
const userConfigPath = join(homedir(), '.dsh', 'dsh-pet', 'main-config.jsonc');

const TABLES = [
  ['lib_app.js.json', 'lib/app.js'],
  ['lib_standalone.js.json', 'lib/standalone.js'],
  ['lib_chat-panel.js.json', 'lib/chat-panel.js'],
  ['lib_client.js.json', 'lib/client.js'],
  ['lib_index.js.json', 'lib/index.js'],
  ['runtime_electron-helper_index.html.json', 'runtime/electron-helper/index.html'],
  ['runtime_electron-helper_renderer.js.json', 'runtime/electron-helper/renderer.js'],
  ['runtime_electron-helper_shared-core.js.json', 'runtime/electron-helper/shared-core.js'],
  ['runtime_electron-helper_sprite.js.json', 'runtime/electron-helper/sprite.js'],
  ['runtime_electron-helper_sprite_bubble.js.json', 'runtime/electron-helper/sprite/bubble.js'],
  ['runtime_electron-helper_sprite_menu.js.json', 'runtime/electron-helper/sprite/menu.js'],
];

function readJson(p) {
  return JSON.parse(readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
}

function resolveTargets() {
  if (pkgArg) return [{ label: pkgArg, dir: resolve(pkgArg) }];
  const root = join(homedir(), '.dsh', 'profiles');
  const names = profileArg
    ? [profileArg]
    : existsSync(root)
      ? readdirSync(root).filter((n) => existsSync(join(root, n, 'node_modules', 'dsh-pet')))
      : [];
  if (!names.length) {
    console.error('dsh-pet не найден. Укажите --profile <name> или --pkg <dir>.');
    process.exit(1);
  }
  return names.map((n) => ({ label: `profile "${n}"`, dir: join(root, n, 'node_modules', 'dsh-pet') }));
}

const report = [];
const missing = [];
const touched = [];

for (const target of resolveTargets()) {
  const pkg = target.dir;
  report.push(`\n=== ${target.label}: ${pkg}`);
  let version = '?';
  try {
    version = JSON.parse(readFileSync(join(pkg, 'package.json'), 'utf8')).version ?? '?';
  } catch {}
  report.push(`dsh-pet ${version}${version === TESTED_VERSION ? '' : ` (таблицы собраны под ${TESTED_VERSION}; несовпадения будут ниже)`}`);

  // 1) шрифт
  const fontSrc = join(fontsDir, 'Nunito.ttf');
  const fontDst = join(pkg, 'assets', 'fonts', 'Nunito.ttf');
  if (existsSync(fontSrc)) {
    if (!dryRun) {
      mkdirSync(dirname(fontDst), { recursive: true });
      copyFileSync(fontSrc, fontDst);
    }
    report.push('  шрифт: Nunito.ttf установлен');
  } else {
    missing.push('assets/fonts/Nunito.ttf отсутствует в репозитории');
  }

  // 2) таблицы замен
  for (const [table, rel] of TABLES) {
    const abs = join(pkg, rel);
    if (!existsSync(abs)) {
      missing.push(`${rel}: файл не найден`);
      continue;
    }
    const pairs = readJson(join(dataDir, table));
    let text = readFileSync(abs, 'utf8');
    const before = text;
    let applied = 0;
    for (const [from, to] of pairs) {
      if (to && to !== from && text.includes(to)) continue;
      if (!text.includes(from)) {
        missing.push(`${rel}: ${from.slice(0, 50).replace(/\n/g, '\\n')}`);
        continue;
      }
      text = text.split(from).join(to);
      applied += 1;
    }
    if (text !== before) {
      if (!dryRun) writeFileSync(abs, text, 'utf8');
      touched.push(abs);
      report.push(`  ${rel}: ${applied} блок(ов)`);
    } else {
      report.push(`  ${rel}: без изменений`);
    }
  }

  // 3) мемы
  const map = readJson(join(dataDir, 'memes-ru.json'));
  const dstMemes = join(pkg, 'assets', 'memes');
  const bakMemes = join(pkg, 'assets', 'memes.zh-backup');
  let memes = 0;
  for (const [canonical, file] of Object.entries(map)) {
    const src = join(memesDir, file);
    if (!existsSync(src)) {
      missing.push(`мем ${file} отсутствует`);
      continue;
    }
    if (!dryRun) {
      mkdirSync(bakMemes, { recursive: true });
      const dst = join(dstMemes, canonical);
      const bak = join(bakMemes, canonical);
      if (existsSync(dst) && !existsSync(bak)) copyFileSync(dst, bak);
      copyFileSync(src, dst);
    }
    memes += 1;
  }
  report.push(`  мемы: ${memes} файл(ов)`);
}

// 4) конфиг
if (wantConfig) {
  if (existsSync(userConfigPath)) {
    report.push(`\nконфиг: ${userConfigPath} уже существует — не трогаю`);
  } else if (!dryRun) {
    mkdirSync(dirname(userConfigPath), { recursive: true });
    copyFileSync(sampleConfig, userConfigPath);
    report.push(`\nконфиг: скопирован в ${userConfigPath}`);
  }
}

// 5) проверка синтаксиса
if (!dryRun) {
  for (const abs of touched) {
    if (!abs.endsWith('.js')) continue;
    const tmp = join(process.env.TEMP ?? '/tmp', 'ru-check-' + basename(abs));
    copyFileSync(abs, tmp);
    try {
      execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });
      report.push(`  проверка: OK ${basename(abs)}`);
    } catch (e) {
      report.push(`  проверка: ОШИБКА ${abs}\n${e.stderr?.toString() ?? e.message}`);
      process.exitCode = 1;
    }
  }
}

console.log(report.join('\n'));
if (missing.length) {
  console.log(`\n--- не совпало: ${missing.length} (обычно значит «в этой версии такой строки нет») ---`);
  for (const m of (verbose ? missing : missing.slice(0, 10))) console.log('    -', m);
  if (!verbose && missing.length > 10) console.log(`    ... ещё ${missing.length - 10} (--verbose)`);
}
console.log(dryRun ? `\n[dry-run] изменено было бы ${touched.length} файл(ов)` : `\nГотово: ${touched.length} файл(ов)\nПерезапустите DSH.`);
