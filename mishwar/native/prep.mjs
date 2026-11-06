// يجمع ملفات مشوار في native/www ليُغلَّف كتطبيق أندرويد وويندوز وماك ولينكس.
import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
const W = 'www';
rmSync(W, { recursive: true, force: true });
mkdirSync(W + '/assets', { recursive: true });
cpSync('../../assets/config.js', W + '/assets/config.js');
for (const f of ['index.html', 'app.js', 'engine.js', 'config.js', 'feed.json', 'manifest.webmanifest'])
  cpSync('../' + f, W + '/mishwar/' + f);
for (const d of ['assets', 'data', 'vendor']) cpSync('../' + d, W + '/mishwar/' + d, { recursive: true });
rmSync(W + '/mishwar/assets/og.png', { force: true });
writeFileSync(W + '/index.html', '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>مشوار</title><style>html,body{margin:0;height:100%;background:#0f2a3d}</style><script>location.replace("mishwar/index.html")</script>');
console.log('www ready', existsSync(W + '/mishwar/data/graph.bin'));
