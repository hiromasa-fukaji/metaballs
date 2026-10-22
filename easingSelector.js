// =============================================================
// easingSelector.js
// 読み込むだけでイージング選択プルダウン + カーブプレビューが
// 自動生成される、依存なしの単一ファイルライブラリ。
//
// 使い方:
//   1. index.html で p5.js の後にこのファイルを読み込む
//        <script src="easingSelector.js"></script>
//   2. スケッチ内で applyEasing(t) を呼ぶだけ (t は 0〜1)
//        const eased = applyEasing(aanimT);
//   プルダウンで種類を変えると applyEasing の結果が即座に切り替わる。
// =============================================================

(function (global) {
  "use strict";

  // ---- イージング関数辞書 (easings.net 準拠, x:0〜1 -> 0〜1) ----
  const c1 = 1.70158;
  const c2 = c1 * 1.525;
  const c3 = c1 + 1;
  const c4 = (2 * Math.PI) / 3;
  const c5 = (2 * Math.PI) / 4.5;

  function bounceOut(x) {
    const n1 = 7.5625,
      d1 = 2.75;
    if (x < 1 / d1) return n1 * x * x;
    else if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
    else if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
    else return n1 * (x -= 2.625 / d1) * x + 0.984375;
  }

  const Easings = {
    linear: (x) => x,

    easeInQuad: (x) => x * x,
    easeOutQuad: (x) => 1 - (1 - x) * (1 - x),
    easeInOutQuad: (x) =>
      x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2,

    easeInCubic: (x) => x * x * x,
    easeOutCubic: (x) => 1 - Math.pow(1 - x, 3),
    easeInOutCubic: (x) =>
      x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,

    easeInQuart: (x) => x * x * x * x,
    easeOutQuart: (x) => 1 - Math.pow(1 - x, 4),
    easeInOutQuart: (x) =>
      x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2,

    easeInQuint: (x) => x * x * x * x * x,
    easeOutQuint: (x) => 1 - Math.pow(1 - x, 5),
    easeInOutQuint: (x) =>
      x < 0.5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2,

    easeInSine: (x) => 1 - Math.cos((x * Math.PI) / 2),
    easeOutSine: (x) => Math.sin((x * Math.PI) / 2),
    easeInOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,

    easeInExpo: (x) => (x === 0 ? 0 : Math.pow(2, 10 * x - 10)),
    easeOutExpo: (x) => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    easeInOutExpo: (x) =>
      x === 0
        ? 0
        : x === 1
        ? 1
        : x < 0.5
        ? Math.pow(2, 20 * x - 10) / 2
        : (2 - Math.pow(2, -20 * x + 10)) / 2,

    easeInCirc: (x) => 1 - Math.sqrt(1 - Math.pow(x, 2)),
    easeOutCirc: (x) => Math.sqrt(1 - Math.pow(x - 1, 2)),
    easeInOutCirc: (x) =>
      x < 0.5
        ? (1 - Math.sqrt(1 - Math.pow(2 * x, 2))) / 2
        : (Math.sqrt(1 - Math.pow(-2 * x + 2, 2)) + 1) / 2,

    easeInBack: (x) => c3 * x * x * x - c1 * x * x,
    easeOutBack: (x) => 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2),
    easeInOutBack: (x) =>
      x < 0.5
        ? (Math.pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2
        : (Math.pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2,

    easeInElastic: (x) =>
      x === 0
        ? 0
        : x === 1
        ? 1
        : -Math.pow(2, 10 * x - 10) * Math.sin((x * 10 - 10.75) * c4),
    easeOutElastic: (x) =>
      x === 0
        ? 0
        : x === 1
        ? 1
        : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1,
    easeInOutElastic: (x) =>
      x === 0
        ? 0
        : x === 1
        ? 1
        : x < 0.5
        ? -(Math.pow(2, 20 * x - 10) * Math.sin((20 * x - 11.125) * c5)) / 2
        : (Math.pow(2, -20 * x + 10) * Math.sin((20 * x - 11.125) * c5)) / 2 +
          1,

    easeInBounce: (x) => 1 - bounceOut(1 - x),
    easeOutBounce: bounceOut,
    easeInOutBounce: (x) =>
      x < 0.5 ? (1 - bounceOut(1 - 2 * x)) / 2 : (1 + bounceOut(2 * x - 1)) / 2,

    // --- easeOutIn 系: 前半がOut(減速)、後半がIn(加速) ---
    easeOutInQuad: (x) =>
      x < 0.5
        ? (1 - Math.pow(1 - 2 * x, 2)) / 2
        : (Math.pow(2 * x - 1, 2) + 1) / 2,
    easeOutInCubic: (x) =>
      x < 0.5
        ? (1 - Math.pow(1 - 2 * x, 3)) / 2
        : (Math.pow(2 * x - 1, 3) + 1) / 2,
    easeOutInQuart: (x) =>
      x < 0.5
        ? (1 - Math.pow(1 - 2 * x, 4)) / 2
        : (Math.pow(2 * x - 1, 4) + 1) / 2,
    easeOutInSine: (x) =>
      x < 0.5
        ? Math.sin(x * Math.PI) / 2
        : (1 - Math.cos(((2 * x - 1) * Math.PI) / 2)) / 2 + 0.5,
    easeOutInExpo: (x) =>
      x === 0
        ? 0
        : x === 1
        ? 1
        : x < 0.5
        ? (1 - Math.pow(2, -20 * x)) / 2
        : (Math.pow(2, 20 * x - 20) + 1) / 2,
    easeOutInBack: (x) =>
      x < 0.5
        ? (1 + c3 * Math.pow(2 * x - 1, 3) + c1 * Math.pow(2 * x - 1, 2)) / 2
        : (c3 * Math.pow(2 * x - 1, 3) - c1 * Math.pow(2 * x - 1, 2) + 1) / 2,
    easeOutInElastic: (x) =>
      x === 0
        ? 0
        : x === 1
        ? 1
        : x < 0.5
        ? (Math.pow(2, -20 * x) * Math.sin((20 * x - 0.75) * c4)) / 2 + 0.5
        : (-Math.pow(2, 20 * x - 20) * Math.sin((20 * x - 20.75) * c4)) / 2 +
          0.5,
    easeOutInBounce: (x) =>
      x < 0.5 ? bounceOut(2 * x) / 2 : (1 - bounceOut(2 - 2 * x)) / 2 + 0.5,

    // ==========================================
    // 鼓動・脈打ち系
    // ==========================================
    beat: (x) => {
      if (x === 0 || x === 1) return 0;
      return (256 / 27) * x * Math.pow(1 - x, 3);
    },
    pulse: (x) => {
      if (x === 0 || x === 1) return 0;
      return Math.sin(x * Math.PI);
    },
    heartbeat: (x) => {
      if (x === 0 || x === 1) return 0;
      if (x < 0.35) {
        return Math.sin(x * (Math.PI / 0.35)) * 0.5;
      } else {
        return Math.sin((x - 0.35) * (Math.PI / 0.65));
      }
    },

    // 1ループごとに山の数・幅・高さがすべてランダムに変化する連続脈打ち
    heartbeat_enhanced: (() => {
      let peaks = [];

      const generatePeaks = () => {
        peaks = [];

        // ★ 山の数を 2〜6 の範囲でランダム決定
        const minPeaks = 1;
        const maxPeaks = 4;
        const count = Math.floor(minPeaks + Math.random() * (maxPeaks - minPeaks + 1));

        let weights = [];
        let totalWeight = 0;

        for (let i = 0; i < count; i++) {
          let w = 0.2 + Math.random() * 0.8;
          weights.push(w);
          totalWeight += w;
        }

        let currentStart = 0;
        for (let i = 0; i < count; i++) {
          let width = weights[i] / totalWeight;
          let height = 0.3 + Math.random() * 0.7;

          peaks.push({
            start: currentStart,
            end: currentStart + width,
            height: height
          });
          currentStart += width;
        }
        peaks[peaks.length - 1].end = 1.0;
      };

      return (x) => {
        if (x === 0 || peaks.length === 0) generatePeaks();
        if (x === 0 || x >= 1) return 0;

        for (let i = 0; i < peaks.length; i++) {
          const p = peaks[i];
          if (x >= p.start && x <= p.end) {
            const local = (x - p.start) / (p.end - p.start);
            return Math.sin(local * Math.PI) * p.height;
          }
        }
        return 0;
      };
    })(),

    // ==========================================
    // ルーレット(ランダム/ノイズ)系
    // ==========================================
    random: (x) => {
      if (x === 0) return 0; // 開始時はスタート値
      if (x >= 1) return 1; // 終了時は必ず目標値にピタッと止まる
      return Math.random(); // アニメーション中は乱数をバラまく
    },

    // 0〜1のノイズ × サイン波の窓関数 × 倍率（毎ループ形状が変化）
    noise: (() => {
      let noiseSeed = 0;
      let initialized = false;

      return (x) => {
        // アニメーション開始時(x=0)にシードを更新して新しい波を作る
        if (x === 0 || !initialized) {
          noiseSeed = Math.random() * 10000;
          initialized = true;
        }
        if (x === 0 || x >= 1) return 0;

        const scale = 20; // 波の細かさ（周波数）
        const amplitude = 1.25; // 揺れ幅の倍率

        const nx = x * scale;
        const i = Math.floor(nx);
        const f = nx - i;
        const u = f * f * (3.0 - 2.0 * f);

        const hash = (n) => {
          // n に noiseSeed を足すことで、ループごとに全く違うハッシュ値になる
          const h = Math.sin((n + noiseSeed) * 12.9898) * 43758.5453;
          return Math.abs(h - Math.floor(h)); // マイナス防止
        };

        const noiseVal = hash(i) * (1 - u) + hash(i + 1) * u;
        return noiseVal * Math.sin(x * Math.PI) * amplitude;
      };
    })(),
  };

  // ---- 内部状態 ----
  let currentName = "easeInOutSine"; // デフォルト
  const changeCallbacks = [];
  let previewCanvas = null;
  let selectEl = null;

  // ---- 公開関数 ----

  function applyEasing(t, name) {
    const fn = Easings[name || currentName];
    return fn ? fn(t) : t;
  }

  function getEasingNames() {
    return Object.keys(Easings);
  }

  function getEasing() {
    return currentName;
  }

  function setEasing(name) {
    if (!Easings[name]) return;
    currentName = name;
    if (selectEl) selectEl.value = name; // UIも同期
    drawPreview();
    changeCallbacks.forEach((fn) => fn(name));
  }

  function onEasingChange(fn) {
    if (typeof fn === "function") changeCallbacks.push(fn);
  }

  // ---- プレビューのカーブ描画 ----
  function drawPreview() {
    if (!previewCanvas) return;
    const ctx = previewCanvas.getContext("2d");
    const w = previewCanvas.width;
    const h = previewCanvas.height;
    const pad = 10;
    const fn = Easings[currentName];

    ctx.clearRect(0, 0, w, h);

    // 背景
    ctx.fillStyle = "#fafafa";
    ctx.fillRect(0, 0, w, h);

    // グリッド枠
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 1;
    ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);

    // 対角線
    ctx.strokeStyle = "#eee";
    ctx.beginPath();
    ctx.moveTo(pad, h - pad);
    ctx.lineTo(w - pad, pad);
    ctx.stroke();

    // イージングカーブ
    ctx.strokeStyle = "#d6336c";
    ctx.lineWidth = 2;
    ctx.beginPath();

    const steps = 150; // 山の形をくっきり描画するためステップを多めに
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      let v = fn(t);
      const x = pad + t * (w - pad * 2);
      const y = h - pad - v * (h - pad * 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // ---- UI(プルダウン + プレビュー)を生成 ----
  function build(options) {
    options = options || {};
    const pos = options.position || "top-right"; 
    if (options.defaultEasing && Easings[options.defaultEasing]) {
      currentName = options.defaultEasing;
    }

    if (document.getElementById("easing-selector-panel")) return;

    const panel = document.createElement("div");
    panel.id = "easing-selector-panel";
    Object.assign(panel.style, {
      position: "fixed",
      top: "10px",
      [pos === "top-left" ? "left" : "right"]: "10px",
      zIndex: "99999",
      background: "#ffffff",
      border: "1px solid #ccc",
      borderRadius: "8px",
      padding: "8px 10px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      fontFamily: "sans-serif",
      fontSize: "12px",
      color: "#333",
    });

    const label = document.createElement("div");
    label.textContent = "Easing";
    label.style.marginBottom = "4px";
    label.style.fontWeight = "bold";
    panel.appendChild(label);

    selectEl = document.createElement("select");
    selectEl.style.width = "150px";
    selectEl.style.fontSize = "12px";
    getEasingNames().forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      if (name === currentName) opt.selected = true;
      selectEl.appendChild(opt);
    });
    selectEl.addEventListener("change", () => setEasing(selectEl.value));
    panel.appendChild(selectEl);

    previewCanvas = document.createElement("canvas");
    previewCanvas.width = 150;
    previewCanvas.height = 100;
    previewCanvas.style.display = "block";
    previewCanvas.style.marginTop = "6px";
    previewCanvas.style.borderRadius = "4px";
    panel.appendChild(previewCanvas);

    document.body.appendChild(panel);
    drawPreview();
  }

  // ---- グローバル登録 ----
  global.applyEasing = applyEasing;
  global.Easings = Easings;
  global.getEasingNames = getEasingNames;
  global.getEasing = getEasing;
  global.setEasing = setEasing;
  global.onEasingChange = onEasingChange;
  global.EasingSelector = { build: build, draw: drawPreview };

  // ---- 自動生成(デフォルトON) ----
  if (global.EASING_SELECTOR_AUTO !== false) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => build());
    } else {
      build();
    }
  }
})(window);