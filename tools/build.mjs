#!/usr/bin/env node
// 静的サイト生成：node tools/build.mjs
// content/i18n/*.json と chapters/<lang>/epXX.md から docs/ を生成する。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs');
const SITE = 'https://pocke.ecolifechallenge.com';
const DOMAIN = 'pocke.ecolifechallenge.com';
const GA_ID = 'G-1DPFMLLD67';
const GTM_ID = 'GTM-WVBRLDFH';
const OFUSE = 'https://ofuse.me/2973d74a';
const TOTAL = 12;
const LANG_ORDER = ['ja', 'en', 'zh-hans', 'zh-hant', 'ko', 'es', 'fr', 'pt'];
const CJK = new Set(['ja', 'zh-hans', 'zh-hant', 'ko']);
const BUILD_DATE = new Date().toISOString().slice(0, 10);
const PUBLISHED = '2026-11-01';

// ---------- load ----------
const langs = LANG_ORDER.filter((l) => fs.existsSync(path.join(ROOT, 'content/i18n', `${l}.json`)))
  .map((l) => JSON.parse(fs.readFileSync(path.join(ROOT, 'content/i18n', `${l}.json`), 'utf8')));
const byLang = Object.fromEntries(langs.map((d) => [d.path, d]));
const ja = byLang.ja;

function chapterFile(lang, n) {
  return path.join(ROOT, 'chapters', lang, `ep${String(n).padStart(2, '0')}.md`);
}
function hasChapter(lang, n) {
  return fs.existsSync(chapterFile(lang, n));
}

// ---------- helpers ----------
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
const pad = (n) => String(n).padStart(2, '0');
const stripRuby = (s) => String(s ?? '').replace(/\{([^|}]+)\|[^}]+\}/g, '$1');

function cleanLd(obj) {
  if (typeof obj === 'string') return stripRuby(obj);
  if (Array.isArray(obj)) return obj.map(cleanLd);
  if (obj && typeof obj === 'object') {
    const res = {};
    for (const [k, v] of Object.entries(obj)) res[k] = cleanLd(v);
    return res;
  }
  return obj;
}

function inline(s) {
  let h = esc(s);
  h = h.replace(/\{([^|}]+)\|([^}]+)\}/g, (_, a, b) => (a === b ? a : `<ruby>${a}<rp>(</rp><rt>${b}</rt><rp>)</rp></ruby>`));
  h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>');
  return h;
}

function parseChapter(lang, n) {
  const src = fs.readFileSync(chapterFile(lang, n), 'utf8').replace(/\r\n/g, '\n').replace(/^\uFEFF/, '');
  const lines = src.split('\n');
  let heading = '';
  if (/^#\s+/.test(lines[0])) heading = lines.shift().replace(/^#\s+/, '').trim();
  const sepIdx = lines.findIndex((l) => /^---\s*$/.test(l));
  const bodyLines = sepIdx >= 0 ? lines.slice(0, sepIdx) : lines;
  const tailLines = sepIdx >= 0 ? lines.slice(sepIdx + 1) : [];
  const body = [];
  for (const raw of bodyLines) {
    const l = raw.replace(/^[\u3000\s]+/, '').trim();
    if (!l) continue;
    if (/^[◆◇＊*]{1,3}$/.test(l) || l === '***') body.push('<hr class="scene" aria-hidden="true">');
    else if (/^#{2,}\s/.test(l)) body.push(`<h2 class="scene-title">${inline(l.replace(/^#+\s*/, ''))}</h2>`);
    else body.push(/^[「『（(―‘“"]/.test(l) ? `<p class="d">${inline(l)}</p>` : `<p>${inline(l)}</p>`);
  }
  const tail = [];
  let isFinal = false;
  for (const raw of tailLines) {
    const l = raw.trim();
    if (!l) continue;
    const m = l.match(/^\*\*(.+)\*\*$/);
    if (m && tail.length === 0) {
      if (/おしまい|The End|完|끝|Fin|FIM/i.test(m[1])) { isFinal = true; tail.push(`<p class="the-end">${inline(m[1])}</p>`); }
      else tail.push(`<h2 class="preview-title">${inline(m[1])}</h2>`);
    } else tail.push(`<p>${inline(l)}</p>`);
  }
  const text = stripRuby(bodyLines.join('\n'));
  const len = CJK.has(lang) ? text.replace(/\s/g, '').length : text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(5, Math.round(CJK.has(lang) ? len / 400 : len / 180));
  const firstPara = stripRuby(bodyLines.find((l) => l.trim() && !/^[◆◇＊*]+$/.test(l.trim())) || '').trim();
  return { heading, html: body.join('\n'), tailHtml: tail.join('\n'), isFinal, minutes, firstPara };
}

function epTitle(L, n) {
  const e = L.episodes?.find((x) => x.n === n);
  if (e?.title) return e.title;
  if (hasChapter(L.path, n)) return parseChapter(L.path, n).heading;
  return ja.episodes.find((x) => x.n === n).title;
}

function write(rel, content) {
  const p = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}

function copyDir(src, dst) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}

const ogImage = (L) => (fs.existsSync(path.join(ROOT, 'assets/web/og', `${L.path}.jpg`)) ? `${SITE}/assets/og/${L.path}.jpg` : `${SITE}/assets/og/ja.jpg`);

// ---------- layout ----------
function head({ L, title, desc, canonicalPath, altPath, altLangs = langs, ogType = 'website', jsonld = [], noindex = false, pageType }) {
  const alternates = altPath && !noindex
    ? altLangs.map((x) => `<link rel="alternate" hreflang="${x.hreflang}" href="${SITE}/${x.path}/${altPath(x)}">`).join('\n')
      + `\n<link rel="alternate" hreflang="x-default" href="${altPath(ja) === '' ? `${SITE}/` : `${SITE}/${altLangs.includes(byLang.en) ? 'en' : 'ja'}/${altPath(ja)}`}">`
    : '';
  const url = `${SITE}${canonicalPath}`;
  const og = ogImage(L);
  const cleanTitle = stripRuby(title);
  const cleanDesc = stripRuby(desc);
  const cleanSiteName = stripRuby(L.title);
  return `<!doctype html>
<html lang="${L.hreflang}" data-lang="${L.path}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(cleanTitle)}</title>
<meta name="description" content="${esc(cleanDesc)}">
<meta name="keywords" content="${esc(stripRuby(L.keywords))}">
${noindex ? '<meta name="robots" content="noindex,follow">' : '<meta name="robots" content="index,follow,max-image-preview:large">'}
<link rel="canonical" href="${url}">
${alternates}
<meta property="og:site_name" content="${esc(cleanSiteName)}">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${esc(cleanTitle)}">
<meta property="og:description" content="${esc(cleanDesc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(cleanSiteName)}">
<meta property="og:locale" content="${L.ogLocale}">
${langs.filter((x) => x !== L).map((x) => `<meta property="og:locale:alternate" content="${x.ogLocale}">`).join('\n')}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(cleanTitle)}">
<meta name="twitter:description" content="${esc(cleanDesc)}">
<meta name="twitter:image" content="${og}">
<meta name="theme-color" content="#ff8a3d">
<meta name="format-detection" content="telephone=no">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/icons/favicon-32.png">
<link rel="icon" type="image/png" sizes="192x192" href="/assets/icons/icon-192.png">
<link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700;900&family=Fredoka:wght@500;600;700&display=swap">
<link rel="stylesheet" href="/assets/site.css?v=${BUILD_DATE}">
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script async src="https://www.googletagmanager.com/gtm.js?id=${GTM_ID}"></script>
<script>
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());
gtag('set','user_properties',{site_language:'${L.path}'});
gtag('config','${GA_ID}',{allow_google_signals:false,allow_ad_personalization_signals:false,content_group:'${pageType}',page_language:'${L.path}'});
</script>
${jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(cleanLd(j))}</script>`).join('\n')}
</head>`;
}

function header(L, altPath) {
  const opts = langs.map((x) => `<option value="${x.path}" data-href="/${x.path}/${altPath(x)}"${x === L ? ' selected' : ''}>${esc(x.label)}</option>`).join('');
  return `<a class="skip" href="#main">${esc(L.ui.skipToContent)}</a>
<header class="site-header">
  <a class="brand" href="/${L.path}/" aria-label="${esc(L.title)}">
    <img src="/assets/icons/icon-192.png" alt="" width="40" height="40">
    <span>${esc(L.titleShort)}</span>
  </a>
  <nav class="site-nav" aria-label="main">
    <a href="/${L.path}/#story">${esc(L.ui.story)}</a>
    <a href="/${L.path}/#characters">${esc(L.ui.characters)}</a>
    <a href="/${L.path}/#episodes">${esc(L.ui.episodes)}</a>
    <a href="/${L.path}/#support" class="nav-support">${esc(L.ui.support)}</a>
  </nav>
  <label class="lang-switch"><span class="sr-only">${esc(L.ui.language)}</span><span aria-hidden="true">🌐</span>
    <select id="lang-select" aria-label="${esc(L.ui.language)}">${opts}</select>
  </label>
</header>`;
}

function footer(L) {
  return `<footer class="site-footer">
  <p class="footer-title">${esc(L.title)}</p>
  <p>${esc(L.footerAbout || L.ui.footerAbout)}</p>
  <p class="langs">${langs.map((x) => `<a href="/${x.path}/" hreflang="${x.hreflang}" lang="${x.hreflang}">${esc(x.label)}</a>`).join(' ・ ')}</p>
  <p class="privacy">${esc(L.ui.privacy)}</p>
  <p class="copy">© 2026 ${esc(L.title)}</p>
</footer>
<script src="/assets/site.js?v=${BUILD_DATE}" defer></script>
</body>
</html>`;
}

function ofuseBox(L, placement, final = false) {
  return `<section class="ofuse${final ? ' ofuse-final' : ''}" id="${placement === 'home' ? 'support' : 'ofuse'}">
  <img class="ofuse-pocke" src="/assets/characters/pocke-300.jpg" alt="" width="120" height="120" loading="lazy">
  <h2>${esc(final ? L.ui.ofuseFinalTitle : L.ui.ofuseTitle)}</h2>
  <p>${esc(final ? L.ui.ofuseFinalText : L.ui.ofuseText)}</p>
  <a class="btn btn-ofuse" href="${OFUSE}" target="_blank" rel="noopener" data-track="ofuse_click" data-placement="${placement}">💌 ${esc(L.ui.ofuseButton)}</a>
  <p class="note">${esc(L.ui.ofuseNote)}</p>
</section>`;
}

function shareBox(L, url, title) {
  const text = `${L.ui.shareText}`;
  const u = encodeURIComponent(url), t = encodeURIComponent(text);
  const cleanTitle = stripRuby(title);
  return `<section class="share" aria-label="${esc(L.ui.share)}">
  <h2>${esc(L.ui.share)}</h2>
  <div class="share-buttons">
    <button type="button" class="btn-share native" data-share-url="${esc(url)}" data-share-title="${esc(cleanTitle)}" data-share-text="${esc(text)}" hidden>📤</button>
    <a class="btn-share x" href="https://twitter.com/intent/tweet?url=${u}&text=${t}&hashtags=${encodeURIComponent('わすれもの探偵団')}" target="_blank" rel="noopener" data-track="share" data-method="x">X</a>
    <a class="btn-share line" href="https://social-plugins.line.me/lineit/share?url=${u}" target="_blank" rel="noopener" data-track="share" data-method="line">LINE</a>
    <a class="btn-share fb" href="https://www.facebook.com/sharer/sharer.php?u=${u}" target="_blank" rel="noopener" data-track="share" data-method="facebook">Facebook</a>
    <button type="button" class="btn-share copy" data-copy="${esc(url)}" data-copied="${esc(L.ui.copied)}">🔗 ${esc(L.ui.copyLink)}</button>
  </div>
</section>`;
}

// ---------- structured data ----------
function seriesLd(L) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWorkSeries',
    '@id': `${SITE}/${L.path}/#series`,
    name: L.title,
    alternateName: langs.filter((x) => x !== L).map((x) => x.title),
    description: L.description,
    url: `${SITE}/${L.path}/`,
    image: `${SITE}/assets/key-visual.jpg`,
    inLanguage: L.hreflang,
    genre: ['Fantasy', 'Mystery', 'Children', 'Anime'],
    audience: { '@type': 'PeopleAudience', suggestedMinAge: 8 },
    isAccessibleForFree: true,
    datePublished: PUBLISHED,
    author: { '@type': 'Organization', name: 'Pocke Project' },
    hasPart: Array.from({ length: TOTAL }, (_, i) => ({ '@type': 'Chapter', position: i + 1, name: epTitle(L, i + 1), url: `${SITE}/${L.path}/ep${pad(i + 1)}/` })),
    character: L.characters.map((c) => ({ '@type': 'Person', name: c.name, description: c.desc }))
  };
}

// ---------- pages ----------
function landing(L) {
  const altPath = () => '';
  const ld = [
    { '@context': 'https://schema.org', '@type': 'WebSite', name: L.title, url: `${SITE}/${L.path}/`, inLanguage: L.hreflang },
    seriesLd(L),
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: L.ui.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }
  ];
  const chars = L.characters.map((c) => `<details class="char" style="--c:${c.color}" data-char="${c.id}">
    <summary>
      <img src="/assets/characters/${c.id}-600.jpg" alt="${esc(stripRuby(c.name))}" width="600" height="771" loading="lazy">
      <span class="char-role">${inline(c.role)}</span>
      <span class="char-name">${inline(c.name)}${c.ruby && c.ruby !== c.name ? `<small>${esc(c.ruby)}</small>` : ''}</span>
      <span class="char-catch">${CJK.has(L.path) ? `「${inline(c.catch)}」` : `“${inline(c.catch)}”`}</span>
    </summary>
    <p>${inline(c.desc)}</p>
  </details>`).join('\n');
  const eps = Array.from({ length: TOTAL }, (_, i) => {
    const n = i + 1;
    const e = L.episodes.find((x) => x.n === n) || ja.episodes.find((x) => x.n === n);
    const avail = hasChapter(L.path, n);
    const mins = avail ? parseChapter(L.path, n).minutes : null;
    return `<li class="ep${avail ? '' : ' ep-soon'}" data-ep="${n}">
      <a href="/${L.path}/ep${pad(n)}/" data-track="episode_list_click" data-episode="${n}">
        <span class="ep-no">${esc(fmt(L.ui.episode, { n }))}</span>
        <span class="ep-title">${inline(epTitle(L, n))}</span>
        <span class="ep-teaser">${inline(e.teaser || '')}</span>
        <span class="ep-meta">${avail ? esc(fmt(L.ui.minutes, { m: mins })) : esc(L.ui.comingSoon)}<span class="ep-read" hidden>✔ ${esc(L.ui.read)}</span></span>
      </a></li>`;
  }).join('\n');
  const firstAvail = hasChapter(L.path, 1) ? `/${L.path}/ep01/` : `/ja/ep01/`;
  const html = `${head({ L, title: `${L.title}｜${L.tagline}`, desc: L.description, canonicalPath: `/${L.path}/`, altPath, jsonld: ld, pageType: 'home' })}
<body class="page-home">
${header(L, altPath)}
<main id="main">
<section class="hero">
  <picture>
    <source media="(max-width: 720px)" srcset="/assets/key-visual-960.jpg">
    <img class="hero-img" src="/assets/key-visual.jpg" alt="${esc(L.ui.keyVisualAlt)}" width="1344" height="768" fetchpriority="high">
  </picture>
  <div class="hero-copy">
    <h1 class="logo"><span class="logo-1">${esc(L.titleLine1)}</span><span class="logo-2">${esc(L.titleLine2)}</span></h1>
    <p class="tagline">${esc(L.tagline)}</p>
    <div class="hero-cta">
      <a class="btn btn-primary" id="cta-read" href="${firstAvail}" data-track="cta_read_click" data-placement="hero" data-continue="${esc(L.ui.continue)}">📖 ${esc(L.ui.readFirst)}</a>
      <a class="btn btn-ghost" href="#characters">${esc(L.ui.characters)}</a>
    </div>
  </div>
</section>

<section class="section story" id="story">
  <h2 class="section-title">${esc(L.ui.storyTitle)}</h2>
  <div class="story-body">${L.ui.storyBody.map((p) => `<p>${inline(p)}</p>`).join('')}</div>
  <ul class="features">${L.ui.features.map((f) => `<li><span class="f-icon" aria-hidden="true">${f.icon}</span><h3>${inline(f.title)}</h3><p>${inline(f.text)}</p></li>`).join('')}</ul>
</section>

<section class="section characters" id="characters">
  <h2 class="section-title">${esc(L.ui.charactersTitle)}</h2>
  <p class="section-lead">${esc(L.ui.charactersLead)}</p>
  <div class="char-grid">${chars}</div>
</section>

<section class="section episodes" id="episodes">
  <h2 class="section-title">${esc(L.ui.episodesTitle)}</h2>
  <p class="section-lead">${esc(L.ui.episodesLead)}</p>
  <ol class="ep-list">${eps}</ol>
</section>

<section class="section faq">
  <h2 class="section-title">${esc(L.ui.faqTitle)}</h2>
  ${L.ui.faq.map((f) => `<details class="faq-item"><summary>${inline(f.q)}</summary><p>${inline(f.a)}</p></details>`).join('\n')}
</section>

${ofuseBox(L, 'home')}
${shareBox(L, `${SITE}/${L.path}/`, L.title)}
</main>
${footer(L)}`;
  write(`${L.path}/index.html`, html);
}

function secretPortalBox(L) {
  const isJa = L.path === 'ja';
  const badge = isJa ? '全12話 読了（どくりょう）記念特典' : 'Completion Bonus';
  const title = isJa ? 'わすれもの<ruby>探偵団<rp>(</rp><rt>たんていだん</rt><rp>)</rp></ruby>「ひみつの部屋」へようこそ！' : 'Welcome to the Secret Room!';
  const text = isJa
    ? '最後まで読んでくれたあなたへ、探偵団からの特別な贈り物です。<br>あなただけの「デジタル団員証」の発行や、全問正解で「限定<ruby>壁紙<rp>(</rp><rt>かべがみ</rt><rp>)</rp></ruby>」がもらえる10問クイズに挑戦しよう！'
    : 'A special gift for finishing the whole story!<br>Get your official Detective Member Card and take the 10-question master quiz to unlock exclusive wallpapers!';
  const btn = isJa ? '🚪 ひみつの部屋へ行く！' : '🚪 Enter the Secret Room!';
  return `<aside class="ep-secret-portal" aria-label="${esc(stripRuby(badge))}">
  <div class="portal-card">
    <div class="portal-sparkle">✨ 🗝️ ✨</div>
    <span class="portal-badge">${badge}</span>
    <h2 class="portal-title">${title}</h2>
    <p class="portal-text">${text}</p>
    <a class="btn btn-portal" href="/${L.path}/bonus/" data-track="bonus_portal_click">${btn}</a>
  </div>
</aside>`;
}

function bonusPage(L) {
  const altPath = () => 'bonus/';
  const isJa = L.path === 'ja';
  const title = isJa ? `わすれもの探偵団 ひみつの部屋（全12話読了記念特典）｜${stripRuby(L.title)}` : `Secret Room (Completion Bonus) | ${L.title}`;
  const desc = isJa
    ? '『ポッケと わすれもの探偵団』全12話の読了特典ページ。デジタル団員証・任命状の発行、全10問の探偵団マスタークイズ、正解者限定の特製壁紙プレゼント！'
    : 'Exclusive completion bonuses for Pocke & the Lost-and-Found Detectives: Official Member Certificate, Master Quiz, and exclusive wallpapers.';
  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      description: desc,
      url: `${SITE}/${L.path}/bonus/`,
      inLanguage: L.hreflang,
      isPartOf: { '@type': 'CreativeWorkSeries', '@id': `${SITE}/${L.path}/#series`, name: L.title, url: `${SITE}/${L.path}/` }
    }
  ];

  const html = `${head({ L, title, desc, canonicalPath: `/${L.path}/bonus/`, altPath, jsonld: ld, pageType: 'bonus' })}
<body class="page-bonus">
${header(L, altPath)}
<main id="main" class="bonus-main">
<nav class="crumbs" aria-label="breadcrumb"><a href="/${L.path}/">${esc(L.ui.home)}</a> › <a href="/${L.path}/#episodes">${esc(L.ui.episodes)}</a> › <span>${isJa ? '読了特典' : 'Bonus'}</span></nav>

<section class="bonus-hero">
  <div class="portal-sparkle">✨ 🗝️ ✨</div>
  <span class="bonus-hero-badge">${isJa ? '読了（どくりょう）記念 特典ルーム' : 'Completion Bonus'}</span>
  <h1 class="bonus-hero-title">${isJa ? 'わすれもの探偵団「ひみつの部屋」' : 'The Detectives’ Secret Room'}</h1>
  <p class="bonus-hero-lead">${isJa ? '『ポッケと わすれもの探偵団』全12話を最後まで読んでくれたあなたへ。<br>探偵団の仲間入りを祝して、特別特典をお届けします！' : 'Thank you for reading all 12 episodes! Welcome to the detectives’ secret room with official member card, master quiz, and exclusive wallpapers.'}</p>
</section>

<!-- Section 1: 団員証発行 -->
<section class="bonus-section card-sec">
  <h2 class="bonus-sec-title">🪪 ${isJa ? 'デジタル団員証・任命状（にんめいじょう）' : 'Digital Member Certificate'}</h2>
  <p class="bonus-sec-lead">${isJa ? 'あなたのお名前（またはニックネーム）を入力すると、わすれもの探偵団の公式団員証が発行されます。<br>画像として保存できるので、おうちの人やお友だちに見せてみてね！' : 'Enter your name to generate your official Detective Member Card! You can download and save it as an image.'}</p>
  <div class="card-generator">
    <div class="card-input-box">
      <input type="text" id="member-name-input" maxlength="12" placeholder="${isJa ? 'あなたのお名前を入力（例: こはる）' : 'Enter your name'}" value="${isJa ? '見習い探偵' : 'Apprentice'}">
    </div>
    <div class="card-canvas-wrap">
      <canvas id="card-canvas" width="800" height="500"></canvas>
    </div>
    <button type="button" class="btn btn-card-download" id="btn-download-card">💾 ${isJa ? '団員証を画像として保存する' : 'Download Member Card'}</button>
  </div>
</section>

<!-- Section 2: 探偵団マスタークイズ -->
<section class="bonus-section quiz-sec">
  <h2 class="bonus-sec-title">🔍 ${isJa ? '探偵団マスタークイズ（全10問）' : 'Detective Master Quiz (10 Questions)'}</h2>
  <p class="bonus-sec-lead">${isJa ? '第1話から第12話までのエピソードから10問出題！<br>全問正解すると、下に<strong>「限定<ruby>壁紙<rp>(</rp><rt>かべがみ</rt><rp>)</rp></ruby>」</strong>のプレゼントが出現します！' : 'Test your memory from Episode 1 to 12! Answer all 10 questions correctly to unlock the exclusive wallpaper gift below!'}</p>
  <div class="quiz-score-bar">
    <span>${isJa ? '正解スコア' : 'Score'}</span>
    <span class="quiz-score-val" id="quiz-score">0 / 10</span>
  </div>
  <div class="quiz-list" id="quiz-list"></div>
</section>

<!-- Section 3: 限定壁紙プレゼント（初期状態は locked） -->
<section class="bonus-section wallpaper-unlock-box locked" id="wallpaper-unlock-box">
  <div class="wallpaper-success-badge">
    ${isJa ? '🎉 全問正解おめでとう！ あなたは真の「わすれもの探偵団マスター」です！' : '🎉 Congratulations! You answered all 10 correctly and unlocked the exclusive wallpapers!'}
  </div>
  <h2 class="bonus-sec-title">🎁 ${isJa ? '全12話読了記念 限定<ruby>壁紙<rp>(</rp><rt>かべがみ</rt><rp>)</rp></ruby>プレゼント' : 'Exclusive Completion Wallpapers'}</h2>
  <p class="bonus-sec-lead">${isJa ? '探偵団の仲間たちが夕暮れの相談所ポーチに集まった、特製描き下ろし（かきおろし）ビジュアルです。<br>パソコンやスマートフォンに設定して楽しんでね！' : 'A special illustration featuring Koharu, Kanata, Ayame, Taiga, Pocke, Shiori, and Meeko gathering on the porch at twilight.'}</p>
  <div class="wallpaper-grid">
    <div class="wallpaper-card pc">
      <img src="/assets/wallpapers/pocke_wallpaper_pc.jpg" alt="${isJa ? 'PC・タブレット用壁紙プレビュー' : 'PC Wallpaper Preview'}" loading="lazy">
      <h3 class="wallpaper-title">${isJa ? 'PC・タブレット用（横画面 16:9）' : 'PC & Tablet (16:9 Landscape)'}</h3>
      <p class="wallpaper-sub">${isJa ? '高画質 1920 × 1080' : 'High-Res 1920 × 1080'}</p>
      <a class="btn-dl-wp" href="/assets/wallpapers/pocke_wallpaper_pc.jpg" download="${isJa ? 'ポッケとわすれもの探偵団_壁紙_PC.jpg' : 'pocke_wallpaper_pc.jpg'}" data-track="download_wallpaper" data-method="pc">📥 ${isJa ? '壁紙（かべがみ）をダウンロード' : 'Download Wallpaper'}</a>
    </div>
    <div class="wallpaper-card mobile">
      <img src="/assets/wallpapers/pocke_wallpaper_mobile.jpg" alt="${isJa ? 'スマホ用壁紙プレビュー' : 'Mobile Wallpaper Preview'}" loading="lazy">
      <h3 class="wallpaper-title">${isJa ? 'スマートフォン用（縦画面 9:16）' : 'Smartphone (9:16 Portrait)'}</h3>
      <p class="wallpaper-sub">${isJa ? '高画質 1080 × 1920' : 'High-Res 1080 × 1920'}</p>
      <a class="btn-dl-wp" href="/assets/wallpapers/pocke_wallpaper_mobile.jpg" download="${isJa ? 'ポッケとわすれもの探偵団_壁紙_スマホ.jpg' : 'pocke_wallpaper_mobile.jpg'}" data-track="download_wallpaper" data-method="mobile">📥 ${isJa ? '壁紙（かべがみ）をダウンロード' : 'Download Wallpaper'}</a>
    </div>
  </div>
</section>

${ofuseBox(L, 'bonus', true)}
${shareBox(L, `${SITE}/${L.path}/bonus/`, title)}
</main>
<script src="/assets/bonus.js?v=${BUILD_DATE}" defer></script>
${footer(L)}`;
  write(`${L.path}/bonus/index.html`, html);
}

function episodePage(L, n) {
  const altPath = () => `ep${pad(n)}/`;
  const url = `${SITE}/${L.path}/ep${pad(n)}/`;
  const title = epTitle(L, n);
  const label = fmt(L.ui.episode, { n });
  const avail = hasChapter(L.path, n);
  const meta = L.episodes.find((x) => x.n === n) || ja.episodes.find((x) => x.n === n);
  const fullTitle = CJK.has(L.path) ? `${label}「${title}」｜${L.title}` : `${label}: ${title} | ${L.title}`;
  const prev = n > 1 ? `/${L.path}/ep${pad(n - 1)}/` : null;
  const next = n < TOTAL ? `/${L.path}/ep${pad(n + 1)}/` : null;
  const ld = [
    {
      '@context': 'https://schema.org', '@type': 'Chapter', name: `${label} ${title}`, position: n, url, inLanguage: L.hreflang,
      image: `${SITE}/assets/key-visual.jpg`, isAccessibleForFree: true, datePublished: PUBLISHED, dateModified: BUILD_DATE,
      isPartOf: { '@type': 'CreativeWorkSeries', '@id': `${SITE}/${L.path}/#series`, name: L.title, url: `${SITE}/${L.path}/` },
      author: { '@type': 'Organization', name: 'Pocke Project' }
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: L.title, item: `${SITE}/${L.path}/` },
        { '@type': 'ListItem', position: 2, name: label, item: url }
      ]
    }
  ];
  let article;
  let desc = meta.teaser || L.description;
  if (avail) {
    const c = parseChapter(L.path, n);
    article = `<div class="chapter-meta">⏱ ${esc(fmt(L.ui.minutes, { m: c.minutes }))}</div>
<div class="chapter-body" id="chapter-body">
${c.html}
</div>
<div id="end-sentinel" class="end-mark">${esc(n === TOTAL ? L.ui.theEnd : fmt(L.ui.endOfEpisode, { n }))}</div>
${c.tailHtml ? `<aside class="preview">${c.tailHtml}</aside>` : ''}`;
  } else {
    article = `<div class="not-translated"><p>${esc(L.ui.notTranslated)}</p><p><a class="btn btn-primary" href="/ja/ep${pad(n)}/" hreflang="ja">${esc(L.ui.readOriginal)}</a></p></div>`;
  }
  const nav = `<nav class="ep-nav" aria-label="${esc(L.ui.toc)}">
  ${prev ? `<a class="btn btn-ghost" href="${prev}" rel="prev" data-track="prev_episode_click" data-episode="${n}">← ${esc(L.ui.prev)}</a>` : '<span></span>'}
  <a class="btn btn-ghost" href="/${L.path}/#episodes">${esc(L.ui.toc)}</a>
  ${next ? `<a class="btn btn-primary btn-next" href="${next}" rel="next" data-track="next_episode_click" data-episode="${n}">${esc(L.ui.next)} →</a>` : '<span></span>'}
</nav>`;
  const html = `${head({ L, title: fullTitle, desc, canonicalPath: `/${L.path}/ep${pad(n)}/`, altPath, altLangs: langs.filter((x) => hasChapter(x.path, n)), ogType: 'article', jsonld: ld, noindex: !avail, pageType: 'episode' })}
<body class="page-episode" data-ep="${n}" data-total="${TOTAL}" data-avail="${avail ? 1 : 0}">
<div class="progress" aria-hidden="true"><span id="progress-bar"></span></div>
${header(L, altPath)}
<main id="main" class="reader">
<nav class="crumbs" aria-label="breadcrumb"><a href="/${L.path}/">${esc(L.ui.home)}</a> › <a href="/${L.path}/#episodes">${esc(L.ui.episodes)}</a> › <span>${esc(label)}</span></nav>
<article class="chapter">
<header class="chapter-head">
  <p class="chapter-no">${esc(label)}</p>
  <h1 class="chapter-title">${inline(title)}</h1>
  <div class="font-tools" role="group" aria-label="${esc(L.ui.fontSize)}">
    <span>${esc(L.ui.fontSize)}</span>
    <button type="button" data-font="s">${esc(L.ui.fontSmall)}</button><button type="button" data-font="m">${esc(L.ui.fontMedium)}</button><button type="button" data-font="l">${esc(L.ui.fontLarge)}</button>
  </div>
</header>
${article}
</article>
${n === TOTAL && avail ? `${secretPortalBox(L)}\n${ofuseBox(L, 'final', true)}` : ''}
${nav}
${n !== TOTAL && avail ? ofuseBox(L, `episode_${n}`) : ''}
${shareBox(L, url, fullTitle)}
</main>
${footer(L)}`;
  write(`${L.path}/ep${pad(n)}/index.html`, html);
}

function rootPage() {
  const L = byLang.en || ja;
  const codes = langs.map((x) => x.path);
  const detect = `(function(){try{var codes=${JSON.stringify(codes)};var saved=localStorage.getItem('pocke_lang');var pick=null;if(saved&&codes.indexOf(saved)>=0){pick=saved;}else{var ls=(navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||'en']);for(var i=0;i<ls.length&&!pick;i++){var l=String(ls[i]).toLowerCase();var c=null;if(l.indexOf('zh')===0){c=(/hant|tw|hk|mo/.test(l))?'zh-hant':'zh-hans';}else{c=l.split('-')[0];}if(codes.indexOf(c)>=0)pick=c;}if(!pick)pick=codes.indexOf('en')>=0?'en':codes[0];try{sessionStorage.setItem('pocke_auto_lang',JSON.stringify({lang:pick,browser:(ls[0]||'')}));}catch(e){}}location.replace('/'+pick+'/'+location.search+location.hash);}catch(e){location.replace('/${L.path}/');}})();`;
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(ja.title)} | ${esc(L.title)}</title>
<meta name="description" content="${esc(ja.description)} ${esc(L.description)}">
<link rel="canonical" href="${SITE}/">
${langs.map((x) => `<link rel="alternate" hreflang="${x.hreflang}" href="${SITE}/${x.path}/">`).join('\n')}
<link rel="alternate" hreflang="x-default" href="${SITE}/">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(ja.title)} | ${esc(L.title)}">
<meta property="og:description" content="${esc(L.description)}">
<meta property="og:url" content="${SITE}/">
<meta property="og:image" content="${SITE}/assets/og/ja.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#ff8a3d">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon.png">
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script async src="https://www.googletagmanager.com/gtm.js?id=${GTM_ID}"></script>
<script>
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());
gtag('config','${GA_ID}',{allow_google_signals:false,allow_ad_personalization_signals:false,content_group:'root'});
</script>
<script>${detect}</script>
<style>body{font-family:system-ui,sans-serif;background:#fff6ec;color:#3b2a20;text-align:center;padding:40px 16px}a{display:inline-block;margin:6px;padding:10px 18px;border-radius:999px;background:#ff8a3d;color:#fff;text-decoration:none;font-weight:700}img{max-width:100%;border-radius:16px}</style>
</head>
<body>
<img src="/assets/key-visual-960.jpg" alt="${esc(L.ui.keyVisualAlt)}" width="960" height="549">
<h1>${esc(ja.title)}<br><small>${esc(L.title)}</small></h1>
<p>${esc(L.ui.chooseLanguage)}</p>
<nav>${langs.map((x) => `<a href="/${x.path}/" hreflang="${x.hreflang}" lang="${x.hreflang}">${esc(x.label)}</a>`).join('')}</nav>
</body>
</html>`;
  write('index.html', html);
}

function notFound() {
  const L = ja;
  const en = byLang.en || ja;
  const html = `${head({ L, title: `${L.ui.notFoundTitle}｜${L.title}`, desc: L.description, canonicalPath: '/404.html', altPath: null, noindex: true, pageType: '404' })}
<body class="page-404">
${header(L, () => '')}
<main id="main" class="section notfound">
<img src="/assets/characters/pocke-300.jpg" alt="" width="200" height="200">
<h1>${esc(L.ui.notFoundTitle)} / ${esc(en.ui.notFoundTitle)}</h1>
<p>${esc(L.ui.notFoundText)}</p><p>${esc(en.ui.notFoundText)}</p>
<p><a class="btn btn-primary" href="/">${esc(L.ui.backToTop)} / ${esc(en.ui.backToTop)}</a></p>
</main>
${footer(L)}`;
  write('404.html', html);
}

function sitemap() {
  const urls = [];
  const alt = (p) => langs.map((x) => `    <xhtml:link rel="alternate" hreflang="${x.hreflang}" href="${SITE}/${x.path}/${p}"/>`).join('\n');
  for (const L of langs) {
    urls.push(`  <url>\n    <loc>${SITE}/${L.path}/</loc>\n    <lastmod>${BUILD_DATE}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n${alt('')}\n  </url>`);
    urls.push(`  <url>\n    <loc>${SITE}/${L.path}/bonus/</loc>\n    <lastmod>${BUILD_DATE}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n${alt('bonus/')}\n  </url>`);
    for (let n = 1; n <= TOTAL; n++) {
      if (!hasChapter(L.path, n)) continue;
      const altLangs = langs.filter((x) => hasChapter(x.path, n));
      const a = altLangs.map((x) => `    <xhtml:link rel="alternate" hreflang="${x.hreflang}" href="${SITE}/${x.path}/ep${pad(n)}/"/>`).join('\n');
      urls.push(`  <url>\n    <loc>${SITE}/${L.path}/ep${pad(n)}/</loc>\n    <lastmod>${BUILD_DATE}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n${a}\n  </url>`);
    }
  }
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`);
  write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
}

function manifest() {
  write('manifest.webmanifest', JSON.stringify({
    name: `${ja.title} / ${(byLang.en || ja).title}`,
    short_name: 'Pocke',
    start_url: '/',
    display: 'standalone',
    background_color: '#fff6ec',
    theme_color: '#ff8a3d',
    icons: [
      { src: '/assets/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/assets/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/assets/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  }, null, 2));
}

// ---------- main ----------
// 既存の docs を消して作り直す（docs/ は生成物）
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
copyDir(path.join(ROOT, 'assets/web'), path.join(OUT, 'assets'));
copyDir(path.join(ROOT, 'site'), path.join(OUT, 'assets'));
if (fs.existsSync(path.join(ROOT, 'assets/web/icons/favicon.ico'))) fs.copyFileSync(path.join(ROOT, 'assets/web/icons/favicon.ico'), path.join(OUT, 'favicon.ico'));
write('CNAME', `${DOMAIN}\n`);
write('.nojekyll', '');
for (const L of langs) {
  landing(L);
  bonusPage(L);
  for (let n = 1; n <= TOTAL; n++) episodePage(L, n);
}
rootPage();
notFound();
sitemap();
manifest();
const report = langs.map((L) => `${L.path}:${Array.from({ length: TOTAL }, (_, i) => (hasChapter(L.path, i + 1) ? '■' : '□')).join('')}`).join('  ');
console.log(`built ${langs.length} languages → docs/   ${report}`);
