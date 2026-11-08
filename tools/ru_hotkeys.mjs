import fs from 'node:fs';
import path from 'node:path';

const pkg = path.join(process.env.USERPROFILE, '.dsh', 'profiles', 'desktop', 'node_modules', 'dsh-pet');
const files = ['lib/client.js', 'lib/chat-panel.js', 'runtime/electron-helper/shared-core.js'];

for (const f of files) {
  const abs = path.join(pkg, f);
  if (!fs.existsSync(abs)) continue;
  let t = fs.readFileSync(abs, 'utf8');
  const before = t;
  t = t.replace('String(index + 1) + " 键"', 'String(index + 1)');
  for (const k of ['M', 'L', 'S', 'Z', 'D']) {
    t = t.split(`"${k} 键"`).join(`"${k}"`);
  }
  if (t !== before) {
    fs.writeFileSync(abs, t, 'utf8');
    console.log('patched', f);
  } else {
    console.log('no change', f);
  }
}
