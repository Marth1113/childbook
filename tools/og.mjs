#!/usr/bin/env node
// OGP画像（言語別 1200x630）と favicon.ico を生成：node tools/og.mjs
// 必要：Chrome（ヘッドレス）と tools/images.ps1 実行済みの assets/web
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(ROOT, 'assets/web');
const TMP = path.join(ROOT, 'tools/.og');
fs.mkdirSync(TMP, { recursive: true });
fs.mkdirSync(path.join(WEB, 'og'), { recursive: true });

const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p));
const only = process.argv[2];
const kv = 'file:///' + path.join(WEB, 'key-visual.jpg').replace(/\\/g, '/');
const icon = 'file:///' + path.join(WEB, 'icons/icon-512.png').replace(/\\/g, '/');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

for (const f of fs.readdirSync(path.join(ROOT, 'content/i18n'))) {
  const L = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/i18n', f), 'utf8'));
  if (only && L.path !== only) continue;
  const latin = ['en', 'es', 'fr', 'pt'].includes(L.path);
  const html = `<!doctype html><html lang="${L.hreflang}"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@700;900&family=Fredoka:wght@600;700&display=block">
<style>
html,body{margin:0;width:1200px;height:630px;overflow:hidden}
body{position:relative;font-family:${latin ? '"Fredoka",' : ''}"Zen Maru Gothic","Microsoft YaHei","Microsoft JhengHei","Malgun Gothic",sans-serif;background:#2a2350}
.bg{position:absolute;inset:0;background:url('${kv}') center/cover}
.shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(42,35,80,.86) 0%,rgba(42,35,80,.55) 36%,rgba(42,35,80,0) 58%)}
.box{position:absolute;left:54px;top:70px;width:560px;color:#fff}
.t1{font-size:${latin ? 46 : 52}px;font-weight:900;line-height:1.1;text-shadow:0 4px 0 #f2622e,0 8px 20px rgba(0,0,0,.5)}
.t2{font-size:${latin ? (L.titleLine2.length > 22 ? 50 : 58) : (L.titleLine2.length > 8 ? 66 : 80)}px;font-weight:900;line-height:1.1;margin-top:6px;text-shadow:0 5px 0 #f2622e,0 10px 24px rgba(0,0,0,.5);color:#fff4d6}
.tag{margin-top:26px;font-size:${latin ? 26 : 28}px;font-weight:700;line-height:1.45;text-shadow:0 2px 8px rgba(0,0,0,.7)}
.badge{display:inline-block;margin-top:26px;padding:10px 24px;border-radius:999px;background:linear-gradient(135deg,#ff8a3d,#ff6f91);font-size:26px;font-weight:900;box-shadow:0 6px 16px rgba(0,0,0,.3)}
.icon{position:absolute;right:28px;bottom:24px;width:110px;height:110px;border-radius:50%;box-shadow:0 6px 20px rgba(0,0,0,.35);border:4px solid #fff}
</style></head><body><div class="bg"></div><div class="shade"></div>
<div class="box"><div class="t1">${esc(L.titleLine1)}</div><div class="t2">${esc(L.titleLine2)}</div><div class="tag">${esc(L.tagline)}</div><div class="badge">${esc(L.ui.ogBadge || '12 episodes · Free')}</div></div>
<img class="icon" src="${icon}"></body></html>`;
  const htmlPath = path.join(TMP, `${L.path}.html`);
  const png = path.join(TMP, `${L.path}.png`);
  fs.writeFileSync(htmlPath, html);
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1200,630', '--virtual-time-budget=8000', '--allow-file-access-from-files', `--screenshot=${png}`, 'file:///' + htmlPath.replace(/\\/g, '/')], { stdio: 'ignore' });
  const out = path.join(WEB, 'og', `${L.path}.jpg`);
  execFileSync('powershell', ['-NoProfile', '-Command', `Add-Type -AssemblyName System.Drawing; $i=[System.Drawing.Image]::FromFile('${png}'); $c=[System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders()|?{$_.MimeType -eq 'image/jpeg'}; $p=New-Object System.Drawing.Imaging.EncoderParameters 1; $p.Param[0]=New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality),([long]86); $i.Save('${out}',$c,$p); $i.Dispose()`]);
  console.log('og', L.path, '→', path.relative(ROOT, out));
}

// favicon.ico（PNG埋め込み形式、32px + 48px）
const pngs = ['favicon-32.png', 'favicon-48.png'].map((n) => fs.readFileSync(path.join(WEB, 'icons', n)));
const sizes = [32, 48];
const header = Buffer.alloc(6); header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(pngs.length, 4);
let offset = 6 + 16 * pngs.length;
const dir = pngs.map((p, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(sizes[i], 0); e.writeUInt8(sizes[i], 1); e.writeUInt8(0, 2); e.writeUInt8(0, 3);
  e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(p.length, 8); e.writeUInt32LE(offset, 12);
  offset += p.length; return e;
});
fs.writeFileSync(path.join(WEB, 'icons/favicon.ico'), Buffer.concat([header, ...dir, ...pngs]));
console.log('favicon.ico done');
