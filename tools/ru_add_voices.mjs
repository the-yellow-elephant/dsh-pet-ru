import fs from 'node:fs';
import path from 'node:path';

const pkg = path.join(process.env.USERPROFILE, '.dsh', 'profiles', 'desktop', 'node_modules', 'dsh-pet');
const files = ['lib/index.js', 'lib/app.js', 'lib/standalone.js'];

const ARRAY = `const VOICES = [
	{
		id: "zh-CN-XiaoxiaoNeural",
		name: "Сяосяо",
		tag: "жен. · китайский",
		default: false
	},
	{
		id: "zh-CN-XiaoyiNeural",
		name: "Сяои",
		tag: "жен. · китайский",
		default: false
	},
	{
		id: "zh-CN-YunxiNeural",
		name: "Юньси",
		tag: "муж. · китайский",
		default: false
	},
	{
		id: "zh-CN-YunjianNeural",
		name: "Юньцзянь",
		tag: "муж. · китайский",
		default: false
	},
	{
		id: "ru-RU-SvetlanaNeural",
		name: "Светлана",
		tag: "жен. · русский",
		default: true
	},
	{
		id: "ru-RU-DmitryNeural",
		name: "Дмитрий",
		tag: "муж. · русский",
		default: false
	}
];`;

for (const f of files) {
  const abs = path.join(pkg, f);
  if (!fs.existsSync(abs)) continue;
  let t = fs.readFileSync(abs, 'utf8');
  const start = t.indexOf('const VOICES = [');
  if (start < 0) {
    console.log('no VOICES', f);
    continue;
  }
  const end = t.indexOf('\n];', start);
  if (end < 0) {
    console.log('no end', f);
    continue;
  }
  t = t.slice(0, start) + ARRAY + t.slice(end + 2);
  t = t.replace(/const DEFAULT_VOICE = "[^"]*";/, 'const DEFAULT_VOICE = "ru-RU-SvetlanaNeural";');
  fs.writeFileSync(abs, t, 'utf8');
  console.log('patched', f);
}
