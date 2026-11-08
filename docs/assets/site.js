/* ポッケと わすれもの探偵団 — site behaviour + GA4 events */
(function () {
  'use strict';
  var html = document.documentElement;
  var lang = html.getAttribute('data-lang') || 'ja';
  var body = document.body;

  function track(name, params) {
    params = params || {};
    params.language = lang;
    try { if (typeof gtag === 'function') gtag('event', name, params); } catch (e) {}
  }
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function progress() {
    try { return JSON.parse(load('pocke_progress_' + lang)) || { last: 0, done: [] }; } catch (e) { return { last: 0, done: [] }; }
  }
  function saveProgress(p) { store('pocke_progress_' + lang, JSON.stringify(p)); }

  // 言語の自動判定の結果を記録（ルートからのリダイレクト時のみ）
  try {
    var auto = sessionStorage.getItem('pocke_auto_lang');
    if (auto) {
      sessionStorage.removeItem('pocke_auto_lang');
      var a = JSON.parse(auto);
      track('language_auto_detect', { detected_language: a.lang, browser_language: a.browser });
    }
  } catch (e) {}

  // 言語切り替え
  var sel = document.getElementById('lang-select');
  if (sel) {
    sel.addEventListener('change', function () {
      var opt = sel.options[sel.selectedIndex];
      store('pocke_lang', opt.value);
      track('select_language', { from_language: lang, to_language: opt.value });
      setTimeout(function () { location.href = opt.getAttribute('data-href'); }, 120);
    });
  }

  // data-track 属性のついたリンク／ボタンのクリック計測
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest ? ev.target.closest('[data-track]') : null;
    if (!el) return;
    var p = { link_url: el.href || '' };
    if (el.dataset.placement) p.placement = el.dataset.placement;
    if (el.dataset.method) p.method = el.dataset.method;
    if (el.dataset.episode) p.episode_number = Number(el.dataset.episode);
    if (body.dataset.ep) p.current_episode = Number(body.dataset.ep);
    if (el.dataset.track === 'share') p.content_type = body.dataset.ep ? 'episode' : 'home';
    p.transport_type = 'beacon';
    track(el.dataset.track, p);
  });

  // シェア
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var url = b.getAttribute('data-copy');
      var done = function () { var t = b.textContent; b.textContent = b.getAttribute('data-copied'); setTimeout(function () { b.textContent = t; }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, done); else done();
      track('share', { method: 'copy_link', content_type: body.dataset.ep ? 'episode' : 'home' });
    });
  });
  document.querySelectorAll('.btn-share.native').forEach(function (b) {
    if (!navigator.share) return;
    b.hidden = false;
    b.addEventListener('click', function () {
      navigator.share({ title: b.dataset.shareTitle, text: b.dataset.shareText, url: b.dataset.shareUrl })
        .then(function () { track('share', { method: 'web_share', content_type: body.dataset.ep ? 'episode' : 'home' }); })
        .catch(function () {});
    });
  });

  // キャラクターカード
  document.querySelectorAll('details.char').forEach(function (d) {
    d.addEventListener('toggle', function () { if (d.open) track('character_view', { character_id: d.dataset.char }); });
  });
  document.querySelectorAll('details.faq-item').forEach(function (d) {
    d.addEventListener('toggle', function () { if (d.open) track('faq_open', { question: d.querySelector('summary').textContent.slice(0, 80) }); });
  });

  // トップ：続きから読む・既読表示
  if (body.classList.contains('page-home')) {
    var pr = progress();
    var cta = document.getElementById('cta-read');
    if (cta && pr.last > 0) {
      var target = pr.done.indexOf(pr.last) >= 0 && pr.last < 12 ? pr.last + 1 : pr.last;
      cta.href = '/' + lang + '/ep' + (target < 10 ? '0' : '') + target + '/';
      cta.textContent = '📖 ' + cta.dataset.continue.replace('{n}', target);
      cta.dataset.placement = 'hero_continue';
    }
    document.querySelectorAll('.ep').forEach(function (li) {
      if (pr.done.indexOf(Number(li.dataset.ep)) >= 0) {
        li.classList.add('is-read');
        var r = li.querySelector('.ep-read'); if (r) r.hidden = false;
      }
    });
    // セクション到達
    if ('IntersectionObserver' in window) {
      var seen = {};
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting && !seen[en.target.id]) { seen[en.target.id] = 1; track('section_view', { section: en.target.id }); }
        });
      }, { threshold: 0.35 });
      ['story', 'characters', 'episodes', 'support'].forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
    }
  }

  // 文字サイズ
  var font = load('pocke_font') || 'm';
  function applyFont(f) {
    html.setAttribute('data-font', f);
    document.querySelectorAll('[data-font]').forEach(function (b) { if (b.tagName === 'BUTTON') b.setAttribute('aria-pressed', b.dataset.font === f ? 'true' : 'false'); });
  }
  applyFont(font);
  document.querySelectorAll('button[data-font]').forEach(function (b) {
    b.addEventListener('click', function () { applyFont(b.dataset.font); store('pocke_font', b.dataset.font); track('font_size_change', { font_size: b.dataset.font }); });
  });

  // エピソード：開始・読了・スクロール深度
  if (body.classList.contains('page-episode') && body.dataset.avail === '1') {
    var ep = Number(body.dataset.ep), total = Number(body.dataset.total);
    var started = Date.now();
    var p = progress();
    p.last = ep; saveProgress(p);
    track('episode_start', { episode_number: ep, is_reread: p.done.indexOf(ep) >= 0 });

    var bar = document.getElementById('progress-bar');
    var chapter = document.getElementById('chapter-body');
    var marks = [25, 50, 75, 90], sent = {};
    var ticking = false;
    function onScroll() {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var r = chapter.getBoundingClientRect();
        var h = r.height - window.innerHeight * 0.6;
        var pct = Math.max(0, Math.min(100, ((-r.top) / Math.max(1, h)) * 100));
        if (bar) bar.style.width = pct + '%';
        marks.forEach(function (m) { if (pct >= m && !sent[m]) { sent[m] = 1; track('episode_progress', { episode_number: ep, percent_read: m }); } });
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // 紙吹雪（Confetti）エフェクト
    function launchConfetti(durationMs) {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      durationMs = durationMs || 3500;
      var canvas = document.createElement('canvas');
      canvas.className = 'confetti-canvas';
      canvas.style.position = 'fixed';
      canvas.style.inset = '0';
      canvas.style.width = '100vw';
      canvas.style.height = '100vh';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '9999';
      document.body.appendChild(canvas);

      var ctx = canvas.getContext('2d');
      var w = (canvas.width = window.innerWidth);
      var h = (canvas.height = window.innerHeight);

      var colors = ['#ff8a3d', '#ff6f91', '#ffd27a', '#8b5cf6', '#22a55a', '#ffffff', '#ff4d6d'];
      var pieces = [];
      var count = Math.min(100, Math.floor(w / 10));

      for (var i = 0; i < count; i++) {
        pieces.push({
          x: Math.random() * w,
          y: Math.random() * -h * 0.5,
          w: 8 + Math.random() * 8,
          h: 6 + Math.random() * 6,
          color: colors[Math.floor(Math.random() * colors.length)],
          vx: (Math.random() - 0.5) * 3,
          vy: 2.5 + Math.random() * 3.5,
          rot: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.15,
          shape: Math.random() > 0.3 ? 'rect' : 'circle'
        });
      }

      var start = Date.now();
      function tick() {
        var elapsed = Date.now() - start;
        if (elapsed > durationMs) {
          if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
          return;
        }
        ctx.clearRect(0, 0, w, h);
        for (var j = 0; j < pieces.length; j++) {
          var p = pieces[j];
          p.x += p.vx;
          p.y += p.vy;
          p.rot += p.vRot;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          if (p.shape === 'rect') {
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }
    window.launchConfetti = window.launchConfetti || launchConfetti;

    var endEl = document.getElementById('end-sentinel');
    var completed = false;
    function complete() {
      if (completed) return; completed = true;
      var secs = Math.round((Date.now() - started) / 1000);
      var q = progress();
      if (q.done.indexOf(ep) < 0) q.done.push(ep);
      q.last = ep; saveProgress(q);
      track('episode_complete', { episode_number: ep, read_seconds: secs, episodes_completed: q.done.length });
      if (ep === total) {
        track('series_complete', { episodes_completed: q.done.length });
        launchConfetti(4500);
      }
    }
    if (endEl && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) complete(); }); }, { threshold: 1 }).observe(endEl);
    }
    // OFUSE 枠の表示
    var of = document.querySelector('.ofuse');
    if (of && 'IntersectionObserver' in window) {
      var ofSeen = false;
      new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting && !ofSeen) { ofSeen = true; track('ofuse_impression', { episode_number: ep, placement: ep === total ? 'final' : 'episode' }); } }); }, { threshold: 0.5 }).observe(of);
    }
  }
})();
