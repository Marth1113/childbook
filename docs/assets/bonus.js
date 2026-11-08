/* ポッケと わすれもの探偵団 — 読了特典（団員証発行・10問クイズ・限定壁紙） */
(function () {
  'use strict';

  // 1. 紙吹雪（Confetti）エフェクト
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
  window.launchConfetti = launchConfetti;

  // 2. 団員証キャンバス描画
  var cardCanvas = document.getElementById('card-canvas');
  var nameInput = document.getElementById('member-name-input');
  var downloadBtn = document.getElementById('btn-download-card');
  var badgeImg = new Image();
  badgeImg.src = '/assets/member_badge.png';

  if (cardCanvas && nameInput) {
    var ctx = cardCanvas.getContext('2d');
    var W = (cardCanvas.width = 800);
    var H = (cardCanvas.height = 500);

    function drawCard(name) {
      name = (name || '').trim() || '見習い探偵';

      // 背景グラデーション（あたたかなクリーム羊皮紙風）
      var bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#fffbf5');
      bg.addColorStop(0.5, '#fff6ea');
      bg.addColorStop(1, '#ffeedb');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // 外枠・飾り枠（銅金色のダブルボーダー）
      ctx.strokeStyle = '#d48a37';
      ctx.lineWidth = 6;
      ctx.strokeRect(18, 18, W - 36, H - 36);

      ctx.strokeStyle = '#f3b469';
      ctx.lineWidth = 2;
      ctx.strokeRect(26, 26, W - 52, H - 52);

      // 四隅の星飾り
      function drawStar(cx, cy, r, fill) {
        ctx.save();
        ctx.fillStyle = fill || '#d48a37';
        ctx.beginPath();
        for (var k = 0; k < 4; k++) {
          var a = (k * Math.PI) / 2;
          ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
          ctx.lineTo(cx + Math.cos(a + Math.PI / 4) * (r * 0.35), cy + Math.sin(a + Math.PI / 4) * (r * 0.35));
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      drawStar(38, 38, 14);
      drawStar(W - 38, 38, 14);
      drawStar(38, H - 38, 14);
      drawStar(W - 38, H - 38, 14);

      // ヘッダー小見出し
      ctx.fillStyle = '#b3621b';
      ctx.font = 'bold 16px "Zen Maru Gothic", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('月見坂わすれもの相談所 公認', W / 2, 62);

      // メインタイトル
      ctx.fillStyle = '#3b2a20';
      ctx.font = '900 32px "Zen Maru Gothic", sans-serif';
      ctx.fillText('わすれもの探偵団 正式団員証', W / 2, 102);

      // 英語サブタイトル
      ctx.fillStyle = '#9b704f';
      ctx.font = 'bold 13px "Fredoka", sans-serif';
      ctx.fillText('OFFICIAL DETECTIVE MEMBER CERTIFICATE', W / 2, 122);

      // 仕切り線
      ctx.strokeStyle = '#e8bc8a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(80, 136);
      ctx.lineTo(W - 80, 136);
      ctx.stroke();

      // 団員番号
      var memberNum = 'No. ' + (Math.abs(hashString(name)) % 900 + 100);
      ctx.textAlign = 'left';
      ctx.font = 'bold 15px "Fredoka", "Zen Maru Gothic", sans-serif';
      ctx.fillStyle = '#b3621b';
      ctx.fillText('団員番号: ' + memberNum, 75, 175);

      // 団員名
      ctx.textAlign = 'left';
      ctx.font = 'bold 22px "Zen Maru Gothic", sans-serif';
      ctx.fillStyle = '#3b2a20';
      ctx.fillText('団員名：', 75, 222);

      ctx.font = '900 34px "Zen Maru Gothic", sans-serif';
      ctx.fillStyle = '#e5484d';
      var displayName = name.length > 10 ? name.slice(0, 10) + '…' : name;
      ctx.fillText(displayName + ' 殿', 170, 224);

      // 任命文
      ctx.font = '500 15px "Zen Maru Gothic", sans-serif';
      ctx.fillStyle = '#5c4333';
      ctx.fillText('あなたは、町のわすれものたちの小さな声に耳を傾け、', 75, 270);
      ctx.fillText('人の大切な思い出をあたたかく守る、わすれもの探偵団の', 75, 296);
      ctx.fillText('正式な仲間であることを、ここに証します。', 75, 322);

      // ポッケの公式エンブレムバッジ
      if (badgeImg.complete && badgeImg.naturalWidth > 0) {
        ctx.save();
        ctx.shadowColor = 'rgba(120, 60, 20, 0.2)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;
        ctx.drawImage(badgeImg, 545, 165, 185, 185);
        ctx.restore();
      } else {
        // 画像読み込み前フォールバック：ポッケの赤い手ぶくろ印章（朱肉スタンプ風）
        ctx.save();
        ctx.translate(640, 255);
        ctx.rotate(-0.08);
        ctx.strokeStyle = '#e5484d';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 50, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#e5484d';
        ctx.font = 'bold 13px "Zen Maru Gothic", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ポッケ公認', 0, -22);

        ctx.beginPath();
        ctx.arc(0, 6, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-14, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '900 12px "Zen Maru Gothic", sans-serif';
        ctx.fillStyle = '#fff';
        ctx.fillText('済', 0, 10);
        ctx.restore();
      }

      // 下部の署名欄
      ctx.textAlign = 'left';
      ctx.fillStyle = '#7a6656';
      ctx.font = 'bold 13px "Zen Maru Gothic", sans-serif';
      ctx.fillText('【団長】 星川こはる　　【相棒】 ポッケ　　【副団長】 九条アヤメ', 75, 415);
      ctx.fillText('【団員】 犬飼タイガ　　【団員】 夜見カナタ　　【相談所長】 シオリ', 75, 440);
    }

    badgeImg.onload = function () {
      drawCard(nameInput.value);
    };

    function hashString(str) {
      var h = 0;
      for (var i = 0; i < str.length; i++) {
        h = (h << 5) - h + str.charCodeAt(i);
        h |= 0;
      }
      return h;
    }

    nameInput.addEventListener('input', function () {
      drawCard(nameInput.value);
    });

    if (downloadBtn) {
      downloadBtn.addEventListener('click', function () {
        var n = (nameInput.value || '').trim() || '探偵団員';
        var link = document.createElement('a');
        link.download = 'わすれもの探偵団_団員証_' + n + '.png';
        link.href = cardCanvas.toDataURL('image/png');
        link.click();
        if (typeof gtag === 'function') {
          gtag('event', 'download_member_card', { member_name_length: n.length });
        }
      });
    }

    // 初回描画（フォントロード完了時にも再描画）
    drawCard(nameInput.value);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        drawCard(nameInput.value);
      });
    }
  }

  // 3. 探偵団マスタークイズ（全10問）
  var quizData = [
    {
      q: '第1問：こはるの実家のパン屋さん「ほしかわベーカリー」で、こはるが大好きなパンは何？',
      choices: ['カレーパン', 'メロンパン', 'あんぱん'],
      ans: 1,
      exp: '正解！ お砂糖の粒がキラキラ光る、焼きたてサクサクのメロンパン！ こはるもポッケも大好物です。'
    },
    {
      q: '第2問：ポッケは、どんな落とし物から生まれた付喪神（つくもがみ）？',
      choices: ['黄色い雨がさ', 'サッカーボール', '赤い毛糸の手ぶくろ'],
      ans: 2,
      exp: '正解！ 片っぽだけになってしまった赤い毛糸の手ぶくろが、持ち主を待ち続けてポッケになりました。'
    },
    {
      q: '第3問：転校生の夜見カナタくんが持っている銀の懐中時計。針は何時で止まっていた？',
      choices: ['夕方5時', '夜の12時', '朝の8時'],
      ans: 0,
      exp: '正解！ ゆうやけチャイムが鳴る「夕方5時」ぴったり。たそがれの国への鍵でもありました。'
    },
    {
      q: '第4問：学級委員の九条アヤメちゃんが、ポッケを初めて見たときに心の中で叫んだ言葉は？',
      choices: ['「お、おばけだー！」', '「か、かわいい……！」', '「ふざけないで！」'],
      ans: 1,
      exp: '正解！ クールなアヤメちゃんですが、実は可愛いものが大好きで、心の中で大興奮していました！'
    },
    {
      q: '第5問：タイガがおじいちゃんにもらった大切なボールを探すため、一番苦手なのに勇気を出して入った場所は？',
      choices: ['理科室', '時計台のてっぺん', 'おばけトンネル'],
      ans: 2,
      exp: '正解！ 怖がりなタイガが、大嫌いな「おばけトンネル」へ仲間と入り、思い出のボールを取り戻しました！'
    },
    {
      q: '第6問：いつもクールなカナタくんが、実は「乗れない」ことがバレてしまった乗り物は何？',
      choices: ['キックボード', '自転車', '電車'],
      ans: 1,
      exp: '正解！ たそがれの国を自由に動けるのに、普通の自転車には乗れず、こはるたちを和ませました。'
    },
    {
      q: '第7問：アヤメちゃんとお母さんが、誕生日に毎年一緒に見る約束をしていた星空の場所はどこ？',
      choices: ['星見ヶ丘', '月見坂駅のホーム', '潮風公園'],
      ans: 0,
      exp: '正解！ 忙しいお医者さんのお母さんと毎年カシオペア座を見る、約束の丘「星見ヶ丘」でした。'
    },
    {
      q: '第8問：タイガがシオリさんから受け取った、たそがれに迷った人を呼びもどす道具は何？',
      choices: ['わすれな手帳', 'よびもどしの笛', '星めがね'],
      ans: 1,
      exp: '正解！ 木の小さな笛「よびもどしの笛」。第11話で記憶を奪われかけたこはるを救う奇跡を呼びました！'
    },
    {
      q: '第9問：学芸会の日、みんなの「覚えてるよ」の気持ちが集まって、星めがねが進化した新しい姿は何？',
      choices: ['星のステッキ', '星のコンパス', '星のランタン'],
      ans: 2,
      exp: '正解！ こはるのケープが純白と夕焼け色の二重ケープになり、星のランタンへと奇跡の進化を遂げました！'
    },
    {
      q: '第10問：5年前の冬祭り、寒さで震えて泣いていた男の子（カナタくん）に、5歳のこはるが貸してあげたものは何？',
      choices: ['黄色いレインケープ', '右手の赤い手ぶくろ', '星のヘアピン'],
      ans: 1,
      exp: '正解！ 右手を貸して「ぜったい迎えに来るから！」と約束したこはる。左手の手ぶくろがポッケでした！'
    }
  ];

  var quizContainer = document.getElementById('quiz-list');
  var scoreEl = document.getElementById('quiz-score');
  var unlockBox = document.getElementById('wallpaper-unlock-box');

  if (quizContainer) {
    var answered = {};
    var correctCount = 0;

    quizData.forEach(function (item, idx) {
      var qCard = document.createElement('div');
      qCard.className = 'quiz-card';
      qCard.id = 'quiz-card-' + idx;

      var qTitle = document.createElement('h3');
      qTitle.className = 'quiz-question';
      qTitle.textContent = item.q;
      qCard.appendChild(qTitle);

      var choicesDiv = document.createElement('div');
      choicesDiv.className = 'quiz-choices';

      item.choices.forEach(function (ch, cIdx) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quiz-choice-btn';
        btn.textContent = ch;
        btn.addEventListener('click', function () {
          handleAnswer(idx, cIdx, btn, qCard, item);
        });
        choicesDiv.appendChild(btn);
      });
      qCard.appendChild(choicesDiv);

      var expP = document.createElement('div');
      expP.className = 'quiz-exp';
      expP.style.display = 'none';
      qCard.appendChild(expP);

      quizContainer.appendChild(qCard);
    });

    function handleAnswer(qIdx, cIdx, btn, qCard, item) {
      var expP = qCard.querySelector('.quiz-exp');
      var allBtns = qCard.querySelectorAll('.quiz-choice-btn');

      if (cIdx === item.ans) {
        // 正解
        allBtns.forEach(function (b) {
          b.disabled = true;
        });
        btn.classList.add('correct');
        expP.textContent = '🎉 ' + item.exp;
        expP.className = 'quiz-exp correct';
        expP.style.display = 'block';

        if (!answered[qIdx]) {
          answered[qIdx] = true;
          correctCount++;
          updateScore();
        }
      } else {
        // 不正解
        btn.classList.add('wrong');
        expP.textContent = '💦 おしい！ もう一度えらんでみてね。';
        expP.className = 'quiz-exp wrong';
        expP.style.display = 'block';
        setTimeout(function () {
          btn.classList.remove('wrong');
        }, 1200);
      }
    }

    function updateScore() {
      if (scoreEl) {
        scoreEl.textContent = correctCount + ' / ' + quizData.length;
      }
      if (correctCount === quizData.length) {
        // 全問正解アンロック！
        if (unlockBox) {
          unlockBox.classList.remove('locked');
          unlockBox.classList.add('unlocked');
          launchConfetti(4500);
          setTimeout(function () {
            unlockBox.scrollIntoView({ behavior: 'smooth' });
          }, 400);
        }
        if (typeof gtag === 'function') {
          gtag('event', 'quiz_all_correct', { correct_answers: correctCount });
        }
      }
    }
  }
})();
