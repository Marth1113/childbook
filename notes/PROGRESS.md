# PROGRESS（作業進捗・再開用メモ）

> トークン切れで中断しても、このファイルを読めば再開できるようにする。

## 決定事項
- 作品名：『ポッケと わすれもの探偵団』 / 英題 *Pocke & the Lost-and-Found Detectives*
- プロジェクト名（フォルダ・リポジトリ名）：`pocke-lost-and-found`
- カスタムドメイン：`pocke.ecolifechallenge.com`（DNS: CNAME `pocke` → `marth1113.github.io`）
- 全12話（1クール）、各話5,000〜6,500字
- 公開：GitHub Pages（main ブランチ / `docs` フォルダ、設定済み）。`node tools/build.mjs` で docs/ を生成
- 言語：ja（原作）, en, zh-hans, zh-hant, ko, es, fr, pt（ブラウザ言語で自動選択）
- GA4：G-23P7G6C6E9 / OFUSE：https://ofuse.me/2973d74a

## チェックリスト
- [x] 市場調査・キャラクター・世界観・プロット・執筆ガイド・用語集（notes/）
- [x] キャラクター画像 assets/characters/*.jpg（8枚）
- [x] キービジュアル・アイコン原画 assets/originals/
- [x] Web用画像・OGP（言語別）・favicon（assets/web/）
- [x] 本文 第1〜12話 chapters/ja/epXX.md（常用外漢字0件）
- [ ] 本文の通し推敲（継続性エディタ）
- [x] サイト生成 tools/build.mjs → docs/
- [ ] 翻訳 chapters/<lang>/epXX.md と content/i18n/<lang>.json（en は i18n のみ済）
- [x] README
- [x] GitHub Pages 設定・CNAME（HTTPS強制はDNS設定後）
- [ ] フォルダ名変更（最後に実施）

## ログ
- 2026-11-01 01:28 設定資料一式を作成
- 2026-11-01 10:30 画像・本文12話・サイト生成スクリプト
- 2026-11-08 02:05 OGP/favicon、Pages有効化、README、継続性エディタ起動
