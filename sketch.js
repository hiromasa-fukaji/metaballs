let svg = null; // 読み込み前はnull（キャンバスは真っ白）
let svgText = null; // 読み込んだSVGの文字列（密度変更時の再生成に使う）
let points = []; // 描画に使う点（SVGの点 + ドラッグで描いた線の点）
let svgPoints = []; // SVGから集めた点
let svgPointsBuilt = false; // svgPointsを集め終えたか
let strokes = []; // ドラッグで描いた線（生の折れ線）
let activeStroke = null; // ドラッグ中の線（なければnull）
let history = []; // Undo用の操作履歴 { kind: 'stroke', stroke } / { kind: 'svg', prevText }
const MIN_POINT_DIST = 4; // ドラッグ中、前の点からこの距離以上動いたら新しい点を追加する(px)
let offsetXs = []; // 各点のノイズによるXオフセット（フレームごとに1回だけ計算してレイヤー間で使い回す）
let offsetYs = []; // 各点のノイズによるYオフセット（同上）
let blurTempCanvas; // 高速ブラー用の使い回しキャンバス
let pg;
let pgStroke;
let pgStroke2;
let pgStroke3;
let pgStroke4;
let pgStroke5;

let circleSize = 18;   // 円の直径
let circleDensity = 1.5; // 円の密度（SVGパスの点の間隔。小さいほど密になる）
let noiseStrength = 50; // ノイズの強さ（円が動く最大距離）
let metaballColor = "#ffffff"; // 2値化後のメタボールの色
let metaballStrokeWeight = 2.2;    // 縁取り1（一番内側）の太さ（0にすると縁取りなし）
let metaballStrokeColor = "#000000"; // 縁取り1の色
let metaballStroke2Weight = 2.7;    // 縁取り2の太さ（0にすると縁取りなし）
let metaballStroke2Color = "#ffffff"; // 縁取り2の色
let metaballStroke3Weight = 4.4;    // 縁取り3の太さ（0にすると縁取りなし）
let metaballStroke3Color = "#888888"; // 縁取り3の色
let metaballStroke4Weight = 9.7;    // 縁取り4の太さ（0にすると縁取りなし）
let metaballStroke4Color = "#ffffff"; // 縁取り4の色
let metaballStroke5Weight = 4.1;    // 縁取り5（一番外側）の太さ（0にすると縁取りなし）
let metaballStroke5Color = "#000000"; // 縁取り5の色
let blurAmount = 0; // ぼかしフィルターの強さ

let lastCircleDensity;

let noiseScale = 0.1; // ノイズの細かさ（小さいほど隣り合う点の動きが揃って滑らかに、大きいほどバラバラに）
let noiseSpeed = 0.003; // ノイズの時間変化速度（緩やかさ。小さいほどゆっくり揺れる）
let noisePhaseSpread = 0.001; // 点ごとの時間位相のずらし幅（0だと全点が同時に折り返す。大きいほど波が伝わるように見える）

let noiseMin = 0, noiseMax = 90; // ノイズの強さスライダーの範囲
let sizeMin = 0, sizeMax = 50; // 円のサイズスライダーの範囲

// --- キャンバスサイズ ---
const INITIAL_W = 630;
const INITIAL_H = 891;

function setup() {
  let cnv = createCanvas(INITIAL_W, INITIAL_H);
  cnv.parent('sketch-holder');
  pg = createGraphics(width, height);
  pgStroke = createGraphics(width, height);
  pgStroke2 = createGraphics(width, height);
  pgStroke3 = createGraphics(width, height);
  pgStroke4 = createGraphics(width, height);
  pgStroke5 = createGraphics(width, height);

  createControlPanel();
}

// 値の本体は PARAMS(Tweakpaneが書き換える)。毎フレーム syncParams() で下のグローバル変数へ写して使う。
const PARAMS = {
  circleSize: circleSize,
  circleDensity: circleDensity,
  noiseStrength: noiseStrength,
  metaballColor: metaballColor,
  strokeWeight: metaballStrokeWeight,
  strokeColor: metaballStrokeColor,
  stroke2Weight: metaballStroke2Weight,
  stroke2Color: metaballStroke2Color,
  stroke3Weight: metaballStroke3Weight,
  stroke3Color: metaballStroke3Color,
  stroke4Weight: metaballStroke4Weight,
  stroke4Color: metaballStroke4Color,
  stroke5Weight: metaballStroke5Weight,
  stroke5Color: metaballStroke5Color,
  noiseScale: noiseScale,
  noiseSpeed: noiseSpeed,
  noisePhaseSpread: noisePhaseSpread,
  blurAmount: blurAmount,
};

const DEFAULT_PARAMS = { ...PARAMS }; // Reset用の初期値(localStorage復元より前に控える)
const STORAGE_KEY = 'metaball-params';
let pane;

function loadParams() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return;
    for (const key of Object.keys(PARAMS)) {
      if (typeof saved[key] === typeof PARAMS[key]) PARAMS[key] = saved[key];
    }
  } catch (e) {}
}

function saveParams() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(PARAMS));
  } catch (e) {}
}

// SVG文字列からポイント列を作り直す。読み込めなければ今の絵をそのまま残す
function loadSvgText(text, record = true) {
  const next = new SvgToPoints(null, PARAMS.circleDensity);
  next.loadText(text);
  if (next.loadError) {
    alert('SVGを読み込めませんでした');
    return false;
  }
  if (record) history.push({ kind: 'svg', prevText: svgText });
  svgText = text;
  svg = next;
  svgPoints = [];
  svgPointsBuilt = false;
  return true;
}

function importSvgFile(file) {
  if (!file) return;
  if (!(file.type === 'image/svg+xml' || /\.svg$/i.test(file.name))) return;
  file.text().then(text => loadSvgText(text));
}

function createControlPanel() {
  loadParams();
  circleDensity = PARAMS.circleDensity;

  pane = new Tweakpane.Pane({
    title: 'METABALL',
    container: document.getElementById('pane-holder')
  });

  const shape = pane.addFolder({ title: 'Shape' });
  shape.addBinding(PARAMS, 'circleSize', { label: 'circle size', min: sizeMin, max: sizeMax, step: 0.1 });
  shape.addBinding(PARAMS, 'circleDensity', { label: 'density', min: 0.5, max: 50, step: 0.1 });
  shape.addBinding(PARAMS, 'metaballColor', { label: 'fill' });

  const stroke = pane.addFolder({ title: 'Stroke' });
  for (const n of ['', '2', '3', '4', '5']) {
    const label = n || '1';
    stroke.addBinding(PARAMS, 'stroke' + n + 'Weight', { label: 'weight ' + label, min: 0, max: 30, step: 0.1 });
    stroke.addBinding(PARAMS, 'stroke' + n + 'Color', { label: 'color ' + label });
  }

  const noiseF = pane.addFolder({ title: 'Noise' });
  noiseF.addBinding(PARAMS, 'noiseStrength', { label: 'strength', min: noiseMin, max: noiseMax, step: 0.1 });
  noiseF.addBinding(PARAMS, 'noiseScale', { label: 'scale', min: 0, max: 1, step: 0.01 });
  noiseF.addBinding(PARAMS, 'noiseSpeed', { label: 'speed', min: 0, max: 0.01, step: 0.001 });
  noiseF.addBinding(PARAMS, 'noisePhaseSpread', { label: 'phase spread', min: 0, max: 0.1, step: 0.001 });

  const fx = pane.addFolder({ title: 'Effect' });
  fx.addBinding(PARAMS, 'blurAmount', { label: 'blur', min: 0, max: 10, step: 0.1 });

  pane.addButton({ title: 'Import SVG' }).on('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.svg,image/svg+xml';
    input.onchange = () => importSvgFile(input.files[0]);
    input.click();
  });

  pane.addButton({ title: 'Reset Params' }).on('click', () => {
    Object.assign(PARAMS, DEFAULT_PARAMS);
    pane.refresh();
    saveParams();
  });
  pane.addButton({ title: 'Undo' }).on('click', undoLast);
  pane.addButton({ title: 'Clear Canvas' }).on('click', clearCanvas);

  pane.addButton({ title: 'Export SVG' }).on('click', exportSVG);

  pane.on('change', saveParams);

  lastCircleDensity = circleDensity;
}

// SVGの読み込みが完了したら、パス上の点を最終的なキャンバス座標に変換して1回だけ集める
function preparePoints() {
  if (!svg || svgPointsBuilt || !svg.isReady) return;
  svgPointsBuilt = true;

  const scaleFactor = min(width / svg.svgViewBox.width, height / svg.svgViewBox.height);
  const offsetX = (width - svg.svgViewBox.width * scaleFactor) * 0.5;
  const offsetY = (height - svg.svgViewBox.height * scaleFactor) * 0.5;

  svgPoints = [];
  for (const part of svg.parts) {
    for (const contour of part.contours) {
      for (const pt of contour) {
        svgPoints.push({
          x: offsetX + (pt.x - svg.svgViewBox.minX) * scaleFactor,
          y: offsetY + (pt.y - svg.svgViewBox.minY) * scaleFactor
        });
      }
    }
  }
  rebuildPoints();
}

// 折れ線を円の密度（点の間隔）ごとに等間隔で打ち直す
function resamplePolyline(pts, spacing) {
  const out = [];
  if (pts.length === 0) return out;
  out.push({ x: pts[0].x, y: pts[0].y });
  let carry = 0; // 前の点から進んだ距離
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const segLen = dist(a.x, a.y, b.x, b.y);
    let d = spacing - carry;
    while (d <= segLen) {
      const t = d / segLen;
      out.push({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
      d += spacing;
    }
    carry = segLen - (d - spacing);
  }
  return out;
}

// SVGの点と、ドラッグで描いた線の点をまとめて描画用の points にする
function rebuildPoints() {
  points = svgPoints.slice();
  for (const s of strokes) {
    points.push(...resamplePolyline(s, max(circleDensity, 0.5)));
  }
}

// ------------------------------------------------------------
// マウス操作：キャンバス上をドラッグして線を引くと、その線に沿って絵が生まれる
// ------------------------------------------------------------
function mousePressed(e) {
  if (e && e.target && e.target.tagName !== 'CANVAS') return;
  if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) return;
  activeStroke = [{ x: mouseX, y: mouseY }];
  strokes.push(activeStroke);
  history.push({ kind: 'stroke', stroke: activeStroke });
  rebuildPoints();
}

function mouseDragged() {
  if (!activeStroke) return;
  const last = activeStroke[activeStroke.length - 1];
  if (dist(last.x, last.y, mouseX, mouseY) < MIN_POINT_DIST) return;
  activeStroke.push({ x: mouseX, y: mouseY });
  rebuildPoints();
}

function mouseReleased() {
  activeStroke = null;
}

// 直前の操作（線を引く / SVGを読み込む）を1つ戻す
function undoLast() {
  if (activeStroke || history.length === 0) return;
  const h = history.pop();
  if (h.kind === 'stroke') {
    strokes.splice(strokes.indexOf(h.stroke), 1);
  } else if (h.prevText) {
    loadSvgText(h.prevText, false);
  } else {
    clearSvg();
  }
  rebuildPoints();
}

function clearSvg() {
  svg = null;
  svgText = null;
  svgPoints = [];
  svgPointsBuilt = false;
}

// 線もSVGもすべて消して、真っ白に戻す
function clearCanvas() {
  if (activeStroke) return;
  strokes = [];
  history = [];
  clearSvg();
  rebuildPoints();
}

function keyPressed() {
  if (key === 'z') undoLast();
  if (key === 'c') clearCanvas();
}

// 各点のノイズオフセットをフレームに1回だけ計算する（6レイヤー分の重複計算を避ける）
function updatePointOffsets() {
  for (let i = 0; i < points.length; i++) {
    let t = frameCount * noiseSpeed + i * noisePhaseSpread;
    let nx = noise(i * noiseScale, t);
    let ny = noise(i * noiseScale + 200, t);
    offsetXs[i] = map(nx, 0, 1, -noiseStrength, noiseStrength);
    offsetYs[i] = map(ny, 0, 1, -noiseStrength, noiseStrength);
  }
}

// キャンバス標準のblur()フィルターを使った高速なぼかし（p5のfilter(BLUR)よりずっと速い）
function applyFastBlur(target, amount) {
  if (amount <= 0) return;

  // target.canvas は物理ピクセルサイズ（Retinaではdensity倍）、target.width/heightは論理サイズ。
  // p5のdrawingContextにはdensity倍のscale変換がかかっているので、生のcanvas同士をdrawImageする間だけ
  // その変換を外して物理ピクセル単位で扱う（外さないとRetinaで座標がズレて欠ける/拡大される）。
  const canvasEl = target.canvas;
  const density = (target.pixelDensity && target.pixelDensity()) || 1;

  if (!blurTempCanvas) {
    blurTempCanvas = document.createElement('canvas');
  }
  if (blurTempCanvas.width !== canvasEl.width || blurTempCanvas.height !== canvasEl.height) {
    blurTempCanvas.width = canvasEl.width;
    blurTempCanvas.height = canvasEl.height;
  }
  const tempCtx = blurTempCanvas.getContext('2d');
  tempCtx.setTransform(1, 0, 0, 1, 0, 0);
  tempCtx.clearRect(0, 0, blurTempCanvas.width, blurTempCanvas.height);
  tempCtx.drawImage(canvasEl, 0, 0);

  const ctx = target.drawingContext;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0); // p5のdensityスケールを一旦解除
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  ctx.filter = `blur(${amount * density}px)`; // 物理ピクセル基準なのでdensity倍しておく
  ctx.drawImage(blurTempCanvas, 0, 0);
  ctx.filter = 'none';
  ctx.restore(); // 元のdensityスケールに戻す
}

// 指定したグラフィックに、各点を中心に四角形を描いてぼかしマスクを作る
function drawBlobMask(target, size) {
  target.blendMode(BLEND);
  target.background(0);
  target.noStroke();
  target.fill(255);
  target.rectMode(CENTER);

  for (let i = 0; i < points.length; i++) {
    let pt = points[i];
    target.rect(pt.x + offsetXs[i], pt.y + offsetYs[i], size, size);
  }

  // 強いBLURフィルターをかける
  applyFastBlur(target, blurAmount);
  // 二値化は後段のrecolorMask内で行っている（pixels[i] > 128 の判定）ので、
  // ここで改めてp5のTHRESHOLDフィルターをかける必要はない
}

// 白い部分だけ指定色で塗り、黒い部分は透明にする（シール状にする）
function recolorMask(target, hexColor) {
  let c = color(hexColor);
  let cr = red(c), cg = green(c), cb = blue(c);
  target.loadPixels();
  for (let i = 0; i < target.pixels.length; i += 4) {
    if (target.pixels[i] > 128) {
      target.pixels[i] = cr;
      target.pixels[i + 1] = cg;
      target.pixels[i + 2] = cb;
      target.pixels[i + 3] = 255;
    } else {
      target.pixels[i + 3] = 0;
    }
  }
  target.updatePixels();
}

function draw() {
  metaballStrokeWeight = PARAMS.strokeWeight;
  metaballStroke2Weight = PARAMS.stroke2Weight;
  metaballStroke3Weight = PARAMS.stroke3Weight;
  metaballStroke4Weight = PARAMS.stroke4Weight;
  metaballStroke5Weight = PARAMS.stroke5Weight;
  metaballColor = PARAMS.metaballColor;
  metaballStrokeColor = PARAMS.strokeColor;
  metaballStroke2Color = PARAMS.stroke2Color;
  metaballStroke3Color = PARAMS.stroke3Color;
  metaballStroke4Color = PARAMS.stroke4Color;
  metaballStroke5Color = PARAMS.stroke5Color;
  noiseScale = PARAMS.noiseScale;
  noiseSpeed = PARAMS.noiseSpeed;
  noisePhaseSpread = PARAMS.noisePhaseSpread;
  blurAmount = PARAMS.blurAmount;

  circleSize = PARAMS.circleSize;
  noiseStrength = PARAMS.noiseStrength;

  let newDensity = PARAMS.circleDensity;
  if (newDensity !== lastCircleDensity) {
    lastCircleDensity = newDensity;
    circleDensity = newDensity;
    // 密度が変わったのでSVGを読み込み直し、描いた線も新しい間隔で打ち直す
    if (svgText) loadSvgText(svgText, false);
    rebuildPoints();
  }

  background(255);

  preparePoints();
  updatePointOffsets();

  // 縁取り5（一番外側）用：5層分まとめて膨張させた円で作ったマスクをストローク色で塗る
  if (metaballStroke5Weight > 0) {
    drawBlobMask(pgStroke5, circleSize + (metaballStrokeWeight + metaballStroke2Weight + metaballStroke3Weight + metaballStroke4Weight + metaballStroke5Weight) * 2);
    recolorMask(pgStroke5, metaballStroke5Color);
    image(pgStroke5, 0, 0);
  }

  // 縁取り4用：4層分まとめて膨張させた円で作ったマスクをストローク色で塗る
  if (metaballStroke4Weight > 0) {
    drawBlobMask(pgStroke4, circleSize + (metaballStrokeWeight + metaballStroke2Weight + metaballStroke3Weight + metaballStroke4Weight) * 2);
    recolorMask(pgStroke4, metaballStroke4Color);
    image(pgStroke4, 0, 0);
  }

  // 縁取り3用：3層分まとめて膨張させた円で作ったマスクをストローク色で塗る
  if (metaballStroke3Weight > 0) {
    drawBlobMask(pgStroke3, circleSize + (metaballStrokeWeight + metaballStroke2Weight + metaballStroke3Weight) * 2);
    recolorMask(pgStroke3, metaballStroke3Color);
    image(pgStroke3, 0, 0);
  }

  // 縁取り2用：2層分まとめて膨張させた円で作ったマスクをストローク色で塗る
  if (metaballStroke2Weight > 0) {
    drawBlobMask(pgStroke2, circleSize + (metaballStrokeWeight + metaballStroke2Weight) * 2);
    recolorMask(pgStroke2, metaballStroke2Color);
    image(pgStroke2, 0, 0);
  }

  // 縁取り1（一番内側）用：少し大きい円で作ったマスクをストローク色で塗る
  if (metaballStrokeWeight > 0) {
    drawBlobMask(pgStroke, circleSize + metaballStrokeWeight * 2);
    recolorMask(pgStroke, metaballStrokeColor);
    image(pgStroke, 0, 0);
  }

  // 塗りつぶし用：通常サイズの円で作ったマスクをmetaballColorで塗る
  drawBlobMask(pg, circleSize);
  recolorMask(pg, metaballColor);

  // メインキャンバスに描画（縁取りの上に塗りつぶしを重ねる）
  image(pg, 0, 0);
}

// ============================================================
// SVG書き出し(Illustrator等で編集する用)
//
// 画面と同じく、縁取り5→1→塗りの順に重ねる。ぼかしなしなら四角形の合体(Clipper)で直角のまま、
// ぼかしありなら画面の二値化(明るさ128)と同じしきい値で d3-contour の輪郭線(marching squares)を取って、
// 1レイヤー=1つの <path> にする(穴は fill-rule="evenodd" で表現)。
// 現在のフレームのノイズ位置をそのまま書き出す。
// ============================================================
const SIMPLIFY_EPSILON = 0.2; // 輪郭の点を間引く許容誤差(px)

function exportSVG() {
  if (points.length === 0) {
    alert('書き出す絵がありません');
    return;
  }
  const svgString = buildSvgString();
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'metaball.svg';
  a.click();
  URL.revokeObjectURL(url);
}

function buildSvgString() {
  updatePointOffsets(); // 描画前でも、点の数とずれが合うようにしておく
  const w5 = metaballStrokeWeight + metaballStroke2Weight + metaballStroke3Weight + metaballStroke4Weight + metaballStroke5Weight;
  const w4 = w5 - metaballStroke5Weight;
  const w3 = w4 - metaballStroke4Weight;
  const w2 = w3 - metaballStroke3Weight;
  const w1 = metaballStrokeWeight;

  // 奥(外側の縁取り)から手前(塗り)の順。太さ0の縁取りは画面と同じく描かない
  const layers = [
    { id: 'stroke5', weight: metaballStroke5Weight, size: circleSize + w5 * 2, color: metaballStroke5Color },
    { id: 'stroke4', weight: metaballStroke4Weight, size: circleSize + w4 * 2, color: metaballStroke4Color },
    { id: 'stroke3', weight: metaballStroke3Weight, size: circleSize + w3 * 2, color: metaballStroke3Color },
    { id: 'stroke2', weight: metaballStroke2Weight, size: circleSize + w2 * 2, color: metaballStroke2Color },
    { id: 'stroke1', weight: metaballStrokeWeight, size: circleSize + w1 * 2, color: metaballStrokeColor },
    { id: 'fill', weight: 1, size: circleSize, color: metaballColor },
  ].filter(l => l.weight > 0);

  const f = v => Math.round(v * 100) / 100;
  let body = `<rect id="background" width="${width}" height="${height}" fill="#ffffff"/>\n`;
  layers.forEach(l => {
    const d = maskOutlinePathD(l.size, f);
    if (d) body += `<path id="${l.id}" fill="${l.color}" fill-rule="evenodd" d="${d}"/>\n`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n${body}</svg>\n`;
}

// 指定サイズのぼかしマスクを作り、その輪郭(しきい値128)を path の d にして返す
function maskOutlinePathD(size, f) {
  // ぼかしなしなら、四角形の合体をポリゴン演算で厳密に求める(角が直角のまま書き出せる)
  if (blurAmount <= 0 && typeof ClipperLib !== 'undefined') {
    try {
      return squaresUnionPathD(size, f);
    } catch (e) {
      console.warn('四角形の合体に失敗したため、輪郭の抽出で書き出します', e);
    }
  }
  drawBlobMask(pg, size); // 画面と同じマスク。pgは次のフレームで描き直されるので使い回してよい
  pg.loadPixels();
  const density = pg.pixelDensity();
  const W = pg.width * density, H = pg.height * density;

  const values = new Float32Array(W * H);
  for (let i = 0; i < values.length; i++) values[i] = pg.pixels[i * 4] / 255;

  const multi = d3.contours().size([W, H]).thresholds([128 / 255])(values)[0];
  let d = '';
  for (const polygon of multi.coordinates) {
    for (const ring of polygon) {
      const pts = ring.map(p => ({ x: p[0] / density, y: p[1] / density }));
      const simple = simplifyPolyline(pts, SIMPLIFY_EPSILON);
      if (simple.length < 3) continue;
      d += 'M' + simple.map(p => `${f(p.x)} ${f(p.y)}`).join('L') + 'Z';
    }
  }
  return d;
}

// Clipperは整数で計算するので、座標をCLIPPER_SCALE倍してから渡し、結果を戻す
const CLIPPER_SCALE = 100;

// 各点を中心とする size 角の四角形をすべて合体した外形を、path の d にして返す
function squaresUnionPathD(size, f) {
  const h = size / 2;
  const S = CLIPPER_SCALE;
  const subj = points.map((pt, i) => {
    const cx = pt.x + offsetXs[i], cy = pt.y + offsetYs[i];
    return [
      { X: Math.round((cx - h) * S), Y: Math.round((cy - h) * S) },
      { X: Math.round((cx + h) * S), Y: Math.round((cy - h) * S) },
      { X: Math.round((cx + h) * S), Y: Math.round((cy + h) * S) },
      { X: Math.round((cx - h) * S), Y: Math.round((cy + h) * S) }
    ];
  });
  const clipper = new ClipperLib.Clipper();
  clipper.AddPaths(subj, ClipperLib.PolyType.ptSubject, true);
  const solution = new ClipperLib.Paths();
  clipper.Execute(ClipperLib.ClipType.ctUnion, solution,
    ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);

  return solution.map(ring =>
    'M' + ring.map(p => `${f(p.X / S)} ${f(p.Y / S)}`).join('L') + 'Z'
  ).join('');
}

// Ramer–Douglas–Peucker法で、折れ線を許容誤差 epsilon(px)以内で単純化する
function simplifyPolyline(pts, epsilon) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [lo, hi] = stack.pop();
    const a = pts[lo], b = pts[hi];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    let maxD = 0, maxI = -1;
    for (let i = lo + 1; i < hi; i++) {
      const dd = len === 0
        ? Math.hypot(pts[i].x - a.x, pts[i].y - a.y)
        : Math.abs(dy * (pts[i].x - a.x) - dx * (pts[i].y - a.y)) / len;
      if (dd > maxD) { maxD = dd; maxI = i; }
    }
    if (maxD > epsilon) {
      keep[maxI] = 1;
      stack.push([lo, maxI], [maxI, hi]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

// function mousePressed() {
//   saveCanvas('filename', 'jpg'); 
// }