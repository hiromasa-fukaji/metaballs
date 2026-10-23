let svg;
let points = [];
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

  svg = new SvgToPoints('a_3.svg', circleDensity);

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

let pane;

function createControlPanel() {
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

  lastCircleDensity = circleDensity;
}

// SVGの読み込みが完了したら、パス上の点を最終的なキャンバス座標に変換して1回だけ集める
function preparePoints() {
  if (points.length > 0 || !svg.isReady) return;

  const scaleFactor = min(width / svg.svgViewBox.width, height / svg.svgViewBox.height);
  const offsetX = (width - svg.svgViewBox.width * scaleFactor) * 0.5;
  const offsetY = (height - svg.svgViewBox.height * scaleFactor) * 0.5;

  for (const part of svg.parts) {
    for (const contour of part.contours) {
      for (const pt of contour) {
        points.push({
          x: offsetX + (pt.x - svg.svgViewBox.minX) * scaleFactor,
          y: offsetY + (pt.y - svg.svgViewBox.minY) * scaleFactor
        });
      }
    }
  }
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
    points = []; // 密度が変わったのでSVGを読み込み直す
    svg = new SvgToPoints('a_3.svg', circleDensity);
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

// function mousePressed() {
//   saveCanvas('filename', 'jpg'); 
// }