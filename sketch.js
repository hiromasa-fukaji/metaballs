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

let sizeSlider, densitySlider, noiseSlider, strokeSlider, strokeSlider2, strokeSlider3, strokeSlider4, strokeSlider5, noiseScaleSlider, noiseSpeedSlider, noisePhaseSpreadSlider, blurSlider;
let fillColorPicker, strokeColorPicker, strokeColorPicker2, strokeColorPicker3, strokeColorPicker4, strokeColorPicker5;
let lastCircleDensity;

let noiseScale = 0.1; // ノイズの細かさ（小さいほど隣り合う点の動きが揃って滑らかに、大きいほどバラバラに）
let noiseSpeed = 0.003; // ノイズの時間変化速度（緩やかさ。小さいほどゆっくり揺れる）
let noisePhaseSpread = 0.001; // 点ごとの時間位相のずらし幅（0だと全点が同時に折り返す。大きいほど波が伝わるように見える）

let noiseMin = 0, noiseMax = 90; // ノイズの強さスライダーの範囲（アニメーションでも使う）
let noiseAnimActive = false;
let noiseAnimStartTime = 0;
let noiseAnimDurationMs = 5000; // 最小→最大→最小の1往復にかける時間

let noiseSpeedAnimMin = 0.006, noiseSpeedAnimMax = 0.006; // ノイズの強さと連動する速さの範囲（強さ最大→速さ最小、強さ最小→速さ最大）

let sizeMin = 0, sizeMax = 50; // 円のサイズスライダーの範囲（アニメーションでも使う）
let sizeAnimActive = false;
let sizeAnimStartTime = 0;
let sizeAnimDurationMs = 5000; // 最小→最大→最小の1往復にかける時間

function setup() {
  let cnv = createCanvas(400, 400);
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

function createControlPanel() {
  let panel = createDiv();
  panel.position(10, 10);
  panel.style('background', 'rgba(255,255,255,0.9)');
  panel.style('border', '1px solid #ccc');
  panel.style('border-radius', '8px');
  panel.style('padding', '10px');
  panel.style('font-family', 'sans-serif');
  panel.style('font-size', '12px');
  panel.style('z-index', '99999');

  sizeSlider = addSliderRow(panel, '円のサイズ', sizeMin, sizeMax, circleSize, 0.1);
  densitySlider = addSliderRow(panel, '円の密度', 0.5, 50, circleDensity, 0.1);
  noiseSlider = addSliderRow(panel, 'ノイズの強さ', noiseMin, noiseMax, noiseStrength, 0.1);

  fillColorPicker = addColorPickerRow(panel, '塗りの色', metaballColor);

  strokeSlider = addSliderRow(panel, '縁取り1の太さ', 0, 30, metaballStrokeWeight, 0.1);
  strokeColorPicker = addColorPickerRow(panel, '縁取り1の色', metaballStrokeColor);

  strokeSlider2 = addSliderRow(panel, '縁取り2の太さ', 0, 30, metaballStroke2Weight, 0.1);
  strokeColorPicker2 = addColorPickerRow(panel, '縁取り2の色', metaballStroke2Color);

  strokeSlider3 = addSliderRow(panel, '縁取り3の太さ', 0, 30, metaballStroke3Weight, 0.1);
  strokeColorPicker3 = addColorPickerRow(panel, '縁取り3の色', metaballStroke3Color);

  strokeSlider4 = addSliderRow(panel, '縁取り4の太さ', 0, 30, metaballStroke4Weight, 0.1);
  strokeColorPicker4 = addColorPickerRow(panel, '縁取り4の色', metaballStroke4Color);

  strokeSlider5 = addSliderRow(panel, '縁取り5の太さ', 0, 30, metaballStroke5Weight, 0.1);
  strokeColorPicker5 = addColorPickerRow(panel, '縁取り5の色', metaballStroke5Color);

  noiseScaleSlider = addSliderRow(panel, 'ノイズの細かさ', 0, 1, noiseScale, 0.01);
  noiseSpeedSlider = addSliderRow(panel, 'ノイズの速さ', 0, 0.01, noiseSpeed, 0.001);
  noisePhaseSpreadSlider = addSliderRow(panel, '折り返しのずらし', 0, 0.1, noisePhaseSpread, 0.001);
  blurSlider = addSliderRow(panel, 'ぼかしの強さ', 0, 10, blurAmount, 0.1);

  let animButton = createButton('ノイズ強さアニメーション');
  animButton.parent(panel);
  animButton.style('display', 'block');
  animButton.style('margin-top', '4px');
  animButton.mousePressed(startNoiseAnimation);

  let sizeAnimButton = createButton('円のサイズアニメーション');
  sizeAnimButton.parent(panel);
  sizeAnimButton.style('display', 'block');
  sizeAnimButton.style('margin-top', '4px');
  sizeAnimButton.mousePressed(startSizeAnimation);

  lastCircleDensity = circleDensity;
}

function startNoiseAnimation() {
  noiseAnimActive = !noiseAnimActive;
  if (noiseAnimActive) noiseAnimStartTime = millis();
}

function startSizeAnimation() {
  sizeAnimActive = !sizeAnimActive;
  if (sizeAnimActive) sizeAnimStartTime = millis();
}

function addSliderRow(parent, labelText, min, max, value, step) {
  let row = createDiv();
  row.parent(parent);
  row.style('margin-bottom', '8px');

  let label = createSpan(labelText + ': ');
  label.parent(row);

  let valueLabel = createSpan(String(value));
  valueLabel.parent(row);
  valueLabel.style('float', 'right');

  let slider = createSlider(min, max, value, step);
  slider.parent(row);
  slider.style('width', '160px');
  slider.style('display', 'block');

  slider.input(() => {
    valueLabel.html(slider.value());
  });

  return slider;
}

// 色ピッカーと現在のHEXコード表示をセットにした行を作る
function addColorPickerRow(parent, labelText, defaultColor) {
  let row = createDiv();
  row.parent(parent);
  row.style('margin-bottom', '8px');
  row.style('display', 'flex');
  row.style('align-items', 'center');
  row.style('justify-content', 'space-between');

  let label = createSpan(labelText + ': ');
  label.parent(row);

  let picker = createColorPicker(defaultColor);
  picker.parent(row);
  picker.style('margin-left', '8px');

  let hexLabel = createSpan(defaultColor);
  hexLabel.parent(row);
  hexLabel.style('margin-left', '8px');
  hexLabel.style('font-family', 'monospace');

  picker.input(() => {
    hexLabel.html(picker.value());
  });

  return picker;
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
  metaballStrokeWeight = strokeSlider.value();
  metaballStroke2Weight = strokeSlider2.value();
  metaballStroke3Weight = strokeSlider3.value();
  metaballStroke4Weight = strokeSlider4.value();
  metaballStroke5Weight = strokeSlider5.value();
  metaballColor = fillColorPicker.value();
  metaballStrokeColor = strokeColorPicker.value();
  metaballStroke2Color = strokeColorPicker2.value();
  metaballStroke3Color = strokeColorPicker3.value();
  metaballStroke4Color = strokeColorPicker4.value();
  metaballStroke5Color = strokeColorPicker5.value();
  noiseScale = noiseScaleSlider.value();
  noiseSpeed = noiseSpeedSlider.value();
  noisePhaseSpread = noisePhaseSpreadSlider.value();
  blurAmount = blurSlider.value();

  if (sizeAnimActive) {
    let elapsed = millis() - sizeAnimStartTime;
    let p = (elapsed % sizeAnimDurationMs) / sizeAnimDurationMs; // 0→1 を繰り返す（ループ）

    if (p < 0.5) {
      let localT = p / 0.5; // 0→1（往路）
      circleSize = lerp(sizeMin, sizeMax, applyEasing(localT));
    } else {
      let localT = (p - 0.5) / 0.5; // 0→1（復路）
      circleSize = lerp(sizeMax, sizeMin, applyEasing(localT));
    }
    sizeSlider.value(circleSize); // スライダーの見た目も同期させる
  } else {
    circleSize = sizeSlider.value();
  }

  if (noiseAnimActive) {
    let elapsed = millis() - noiseAnimStartTime;
    let p = (elapsed % noiseAnimDurationMs) / noiseAnimDurationMs; // 0→1 を繰り返す（ループ）

    if (p < 0.5) {
      let localT = p / 0.5; // 0→1（往路）
      noiseStrength = lerp(noiseMin, noiseMax, applyEasing(localT));
    } else {
      let localT = (p - 0.5) / 0.5; // 0→1（復路）
      noiseStrength = lerp(noiseMax, noiseMin, applyEasing(localT));
    }
    noiseSlider.value(noiseStrength); // スライダーの見た目も同期させる

    // ノイズの強さと速さを連動させる（強さ最大の時は速さ最小、強さ最小の時は速さ最大）
    let strengthFrac = (noiseStrength - noiseMin) / (noiseMax - noiseMin);
    noiseSpeed = lerp(noiseSpeedAnimMax, noiseSpeedAnimMin, strengthFrac);
    noiseSpeedSlider.value(noiseSpeed); // スライダーの見た目も同期させる
  } else {
    noiseStrength = noiseSlider.value();
  }

  let newDensity = densitySlider.value();
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