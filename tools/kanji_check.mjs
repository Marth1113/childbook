#!/usr/bin/env node
// 常用漢字チェッカー：node tools/kanji_check.mjs chapters/ja/ep01.md [...]
// 常用外の漢字と、本文の文字数（ルビ記法・予告を除く）を表示する。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const joyo = new Set([...fs.readFileSync(path.join(here, 'joyo.txt'), 'utf8').trim()]);
const files = process.argv.slice(2);
if (!files.length) {
  console.error('usage: node tools/kanji_check.mjs <file.md> [...]');
  process.exit(2);
}
let bad = 0;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const lines = src.split(/\r?\n/);
  const hits = [];
  lines.forEach((line, i) => {
    for (const ch of line) {
      if (/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/u.test(ch) && !joyo.has(ch)) {
        hits.push(`${i + 1}:${ch}  …${line.slice(Math.max(0, line.indexOf(ch) - 8), line.indexOf(ch) + 8)}…`);
      }
    }
  });
  // 本文文字数（見出し・予告・記号行を除き、ルビ記法は親文字のみ数える）
  const body = src.split(/\n---\s*\n/)[0]
    .split(/\r?\n/)
    .filter((l) => !/^#/.test(l) && l.trim() !== '◆')
    .join('')
    .replace(/\{([^|}]+)\|[^}]+\}/g, '$1')
    .replace(/\s/g, '');
  console.log(`== ${f}  本文 ${body.length}字  常用外 ${hits.length}件`);
  hits.forEach((h) => console.log('  ' + h));
  bad += hits.length;
}
process.exit(bad ? 1 : 0);
