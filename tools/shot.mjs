#!/usr/bin/env node
// スクリーンショット確認：node tools/shot.mjs <url> <out.png> [width] [height]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p));
const [url, out, w = 1280, h = 2000] = process.argv.slice(2);
execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${w},${h}`, '--virtual-time-budget=8000', `--screenshot=${out}`, url], { stdio: 'ignore' });
console.log('saved', out);
