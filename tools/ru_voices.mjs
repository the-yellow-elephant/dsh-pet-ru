import fs from 'node:fs';
import path from 'node:path';

const pkg = path.join(process.env.USERPROFILE, '.dsh', 'profiles', 'desktop', 'node_modules', 'dsh-pet');
const files = ['lib/index.js', 'lib/app.js', 'lib/standalone.js'];

const map = [
  ['晓晓', 'Сяосяо'],
  ['晓伊', 'Сяои'],
  ['云希', 'Юньси'],
  ['云健', 'Юньцзянь'],
  ['女 · 通用', 'жен. · универсальный'],
  ['女 · 活泼', 'жен. · живой'],
  ['男 · 年轻', 'муж. · молодой'],
  ['男 · 沉稳', 'муж. · сдержанный'],
];

for (const f of files) {
  const abs = path.join(pkg, f);
  if (!fs.existsSync(abs)) continue;
  let t = fs.readFileSync(abs, 'utf8');
  let n = 0;
  for (const [zh, ru] of map) {
    for (const q of ['"', "'"]) {
      const from = q + zh + q;
      const c = t.split(from).length - 1;
      if (c) {
        t = t.split(from).join(q + ru + q);
        n += c;
      }
    }
  }
  if (n) {
    fs.writeFileSync(abs, t, 'utf8');
    console.log(f, n);
  }
}
