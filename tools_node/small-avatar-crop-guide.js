#!/usr/bin/env node
// Create comparable small-avatar boards or calculate a crop around marked head/face boxes.
// This tool only resizes/crops existing pixels; it never redraws or warps a character.
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

function usage() {
  console.log(`Usage:
  node tools_node/small-avatar-crop-guide.js compare --out <board.png> <image.png>...
  node tools_node/small-avatar-crop-guide.js crop --input <image.png> --out <crop.png>
       --head x,y,width,height --face x,y,width,height --extent x,y,width,height
       [--shoulders leftX,leftY,rightX,rightY] [--target 0.75] [--min-head-ratio 0.75] [--max-head-ratio 0.80]
       [--min-face-ratio 0.38] [--target-face-ratio 0.44]
       [--min-face-width-ratio 0.276] [--max-face-width-ratio 0.396]
       [--extent-padding-ratio 0.03]
       [--vertical-shift <source-pixels>] [--size 256] [--guide-out <guide.png>]
       [--centerline-out <preview.png>]

Boxes use source-image pixel coordinates. --head spans the cranial hair/helmet mass to chin,
excluding tall ornamental crowns/plumes; required --extent marks the entire visible head
silhouette, including hair, ears, helmets, crowns, hairpins, ornaments, and plumes, all of
which must remain complete inside the crop;
face spans forehead to chin and both cheek/jaw edges. The head-box lower edge must align
with the face-box chin within 2% of the final crop side (or 2 source pixels, whichever is
larger); otherwise the measurement fails to prevent neck from inflating head height.
Optional --shoulders marks one clearly visible point on each shoulder surface, slightly
inward from the outermost edge. Each point should sit at least 5% of the crop side beyond
its corresponding face edge; do not mark the neck, hair, collar, or chest center. Missing
or out-of-frame shoulder points are warnings only and must never shrink an otherwise
compliant head.
Target head height defaults to 75%; accepted head height is 75–80%. Face height defaults to a 44% target and 38% minimum, and face width defaults to a 27.6% minimum. Face size, centerline, and complete head extent are hard gates. Shoulder anchors are visibility warnings only; do not shrink an otherwise compliant head to satisfy them. If the source cannot show shoulders at the target head scale, record the warning and review the crop visually.
To maximize the head within that standard, keep only 2% clearance above the head and
3% clearance around the complete --extent head silhouette by default. If that margin alone
prevents the 75% head target, --extent-padding-ratio may be lowered to 0.005–0.03 after
confirming the marked extent covers every visible head pixel. Never lower it enough to crop
hair or headwear; reject the source if complete content cannot fit at 75%.
Use --vertical-shift to move only the square crop frame in source pixels (negative moves
the frame upward); every shifted frame must still pass complete-head, face, and centering checks.
`);
}
function argsOf(list) {
  const out = { _: [] };
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (!a.startsWith('--')) out._.push(a);
    else out[a.slice(2)] = list[++i];
  }
  return out;
}
function parseBox(value, label) {
  const values = String(value || '').split(',').map(Number);
  if (values.length !== 4 || values.some(v => !Number.isFinite(v)) || values[2] <= 0 || values[3] <= 0) {
    throw new Error(`${label} must be x,y,width,height in source pixels`);
  }
  return { x: values[0], y: values[1], width: values[2], height: values[3] };
}
function parseShoulderPoints(value) {
  const v = String(value || '').split(',').map(Number);
  if (v.length !== 4 || v.some(n => !Number.isFinite(n))) throw new Error('--shoulders must be leftX,leftY,rightX,rightY in source pixels');
  return [{ x: v[0], y: v[1] }, { x: v[2], y: v[3] }];
}
function readPng(file) { return PNG.sync.read(fs.readFileSync(file)); }
function putPixel(dst, width, x, y, rgba) {
  const i = (y * width + x) * 4;
  dst[i] = rgba[0]; dst[i + 1] = rgba[1]; dst[i + 2] = rgba[2]; dst[i + 3] = rgba[3];
}
function drawRect(dst, box, rgba) {
  const x0 = Math.floor(box.x), y0 = Math.floor(box.y);
  const x1 = Math.ceil(box.x + box.width) - 1, y1 = Math.ceil(box.y + box.height) - 1;
  for (let x = x0; x <= x1; x++) {
    if (x >= 0 && x < dst.width) {
      if (y0 >= 0 && y0 < dst.height) putPixel(dst.data, dst.width, x, y0, rgba);
      if (y1 >= 0 && y1 < dst.height) putPixel(dst.data, dst.width, x, y1, rgba);
    }
  }
  for (let y = y0; y <= y1; y++) {
    if (y >= 0 && y < dst.height) {
      if (x0 >= 0 && x0 < dst.width) putPixel(dst.data, dst.width, x0, y, rgba);
      if (x1 >= 0 && x1 < dst.width) putPixel(dst.data, dst.width, x1, y, rgba);
    }
  }
}
function drawCrosshair(dst, point, rgba, radius = 6) {
  const cx = Math.round(point.x), cy = Math.round(point.y);
  for (let d = -radius; d <= radius; d++) {
    if (cx + d >= 0 && cx + d < dst.width && cy >= 0 && cy < dst.height) putPixel(dst.data, dst.width, cx + d, cy, rgba);
    if (cx >= 0 && cx < dst.width && cy + d >= 0 && cy + d < dst.height) putPixel(dst.data, dst.width, cx, cy + d, rgba);
  }
}
function drawDashedVertical(dst, x, rgba, phase = 0, dash = 5, gap = 4) {
  const cx = Math.round(x), cycle = dash + gap;
  for (let y = 0; y < dst.height; y++) {
    if ((y + phase) % cycle >= dash) continue;
    for (let dx = -1; dx <= 1; dx++) {
      const px = cx + dx;
      if (px >= 0 && px < dst.width) putPixel(dst.data, dst.width, px, y, rgba);
    }
  }
}
function drawCenterlineComparison(src, canvasCenterX, faceCenterX) {
  const guide = new PNG({ width: src.width, height: src.height });
  Buffer.from(src.data).copy(guide.data);
  const canvasColor = [0, 220, 255, 255];
  const faceColor = [255, 0, 190, 255];
  if (Math.abs(canvasCenterX - faceCenterX) <= 1) {
    const cx = Math.round((canvasCenterX + faceCenterX) / 2);
    for (let y = 0; y < guide.height; y++) {
      const color = Math.floor(y / 5) % 2 === 0 ? canvasColor : faceColor;
      for (let dx = -1; dx <= 1; dx++) {
        const px = cx + dx;
        if (px >= 0 && px < guide.width) putPixel(guide.data, guide.width, px, y, color);
      }
    }
  } else {
    drawDashedVertical(guide, canvasCenterX, canvasColor);
    drawDashedVertical(guide, faceCenterX, faceColor, 4);
  }
  return guide;
}
function sampleBilinear(src, x, y) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const accum = [0, 0, 0, 0];
  for (let dy = 0; dy <= 1; dy++) for (let dx = 0; dx <= 1; dx++) {
    const sx = x0 + dx, sy = y0 + dy;
    if (sx < 0 || sy < 0 || sx >= src.width || sy >= src.height) continue;
    const w = (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy), i = (sy * src.width + sx) * 4;
    const a = src.data[i + 3] / 255 * w;
    accum[0] += src.data[i] * a; accum[1] += src.data[i + 1] * a; accum[2] += src.data[i + 2] * a; accum[3] += a;
  }
  if (accum[3] <= 0) return [0, 0, 0, 0];
  return [Math.round(accum[0] / accum[3]), Math.round(accum[1] / accum[3]), Math.round(accum[2] / accum[3]), Math.round(accum[3] * 255)];
}
function foregroundNear(src, point, radius = 5) {
  const cx = Math.round(point.x), cy = Math.round(point.y);
  for (let y = Math.max(0, cy - radius); y <= Math.min(src.height - 1, cy + radius); y++) {
    for (let x = Math.max(0, cx - radius); x <= Math.min(src.width - 1, cx + radius); x++) {
      if (src.data[(y * src.width + x) * 4 + 3] > 16) return true;
    }
  }
  return false;
}
function renderFit(src, dst, dstW, dstH, x0, y0, w, h) {
  const scale = Math.min(w / src.width, h / src.height), rw = Math.round(src.width * scale), rh = Math.round(src.height * scale);
  const ox = Math.round(x0 + (w - rw) / 2), oy = Math.round(y0 + (h - rh) / 2);
  for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) {
    const c = sampleBilinear(src, (x + 0.5) / scale - 0.5, (y + 0.5) / scale - 0.5);
    const i = ((oy + y) * dstW + ox + x) * 4, a = c[3] / 255;
    dst.data[i] = Math.round(c[0] * a + 255 * (1 - a));
    dst.data[i + 1] = Math.round(c[1] * a + 255 * (1 - a));
    dst.data[i + 2] = Math.round(c[2] * a + 255 * (1 - a));
    dst.data[i + 3] = 255;
  }
}
function main() {
  const command = process.argv[2], a = argsOf(process.argv.slice(3));
  if (command === 'compare') {
    const files = a._;
    if (!a.out || files.length < 1) { usage(); process.exitCode = 2; return; }
    const tile = 256, cols = Math.min(3, files.length), rows = Math.ceil(files.length / cols);
    const board = new PNG({ width: cols * tile, height: rows * tile }); board.data.fill(255);
    files.forEach((file, i) => {
      const src = readPng(file), x = (i % cols) * tile, y = Math.floor(i / cols) * tile;
      renderFit(src, board, board.width, board.height, x + 8, y + 8, tile - 16, tile - 16);
      console.log(`${String(i + 1).padStart(2, '0')}  ${path.resolve(file)}  ${src.width}x${src.height}`);
    });
    fs.mkdirSync(path.dirname(path.resolve(a.out)), { recursive: true });
    fs.writeFileSync(a.out, PNG.sync.write(board));
    fs.writeFileSync(`${a.out}.txt`, files.map((file, i) => `${String(i + 1).padStart(2, '0')}  ${path.resolve(file)}`).join('\n') + '\n', 'utf8');
    console.log(`比較圖：${path.resolve(a.out)} (${board.width}x${board.height})`);
    return;
  }
  if (command === 'crop') {
    if (!a.input || !a.out || !a.head || !a.extent || !a.face) { usage(); process.exitCode = 2; return; }
    const src = readPng(a.input), head = parseBox(a.head, '--head'), face = parseBox(a.face, '--face');
    const extent = parseBox(a.extent, '--extent');
    const shoulders = a.shoulders ? parseShoulderPoints(a.shoulders) : [];
    const target = a.target == null ? 0.75 : Number(a.target);
    const minHeadRatio = a['min-head-ratio'] == null ? 0.75 : Number(a['min-head-ratio']);
    const maxHeadRatio = a['max-head-ratio'] == null ? 0.80 : Number(a['max-head-ratio']);
    // Face ratios use the hairline-to-chin box, independently of headwear.
    const minFaceRatio = a['min-face-ratio'] == null ? 0.38 : Number(a['min-face-ratio']);
    const minFaceWidthRatio = a['min-face-width-ratio'] == null ? 0.276 : Number(a['min-face-width-ratio']);
    const maxFaceWidthRatio = a['max-face-width-ratio'] == null ? 0.396 : Number(a['max-face-width-ratio']);
    const targetFaceRatio = a['target-face-ratio'] == null ? 0.44 : Number(a['target-face-ratio']);
    for (const [name, value] of [['min-face-ratio', minFaceRatio], ['target-face-ratio', targetFaceRatio], ['min-face-width-ratio', minFaceWidthRatio], ['max-face-width-ratio', maxFaceWidthRatio]]) {
      if (value !== null && !(value > 0 && value < 1)) throw new Error(`--${name} must be between 0 and 1`);
    }
    if (minFaceWidthRatio !== null && maxFaceWidthRatio !== null && maxFaceWidthRatio < minFaceWidthRatio) {
      throw new Error('--max-face-width-ratio must be at least --min-face-width-ratio');
    }
    if (targetFaceRatio !== null && (minFaceRatio === null || targetFaceRatio < minFaceRatio)) {
      throw new Error('--target-face-ratio requires --min-face-ratio and must be at least as large');
    }
    const verticalShift = a['vertical-shift'] == null ? 0 : Number(a['vertical-shift']);
    const extentPaddingRatio = a['extent-padding-ratio'] == null ? 0.03 : Number(a['extent-padding-ratio']);
    const outputSize = a.size == null ? 256 : Number(a.size);
    if (!(minHeadRatio >= 0.75 && minHeadRatio <= 0.80)) throw new Error('--min-head-ratio must be between 0.75 and 0.80 for new small avatars');
    if (!(maxHeadRatio >= minHeadRatio && maxHeadRatio <= 0.80)) throw new Error('--max-head-ratio must be between --min-head-ratio and 0.80');
    if (!(target >= minHeadRatio && target <= maxHeadRatio)) throw new Error('--target must be between --min-head-ratio and --max-head-ratio');
    if (!Number.isFinite(verticalShift)) throw new Error('--vertical-shift must be a finite number of source pixels');
    if (!(extentPaddingRatio >= 0.005 && extentPaddingRatio <= 0.03)) throw new Error('--extent-padding-ratio must be between 0.005 and the default maximum 0.03');
    if (!Number.isInteger(outputSize) || outputSize < 64 || outputSize > 2048) throw new Error('--size must be an integer between 64 and 2048');
    const noseX = a['nose-x'] == null ? null : Number(a['nose-x']);
    if (noseX !== null && !(noseX >= face.x && noseX <= face.x + face.width)) {
      throw new Error('--nose-x must be a source pixel coordinate inside the face box');
    }
    const centerX = face.x + face.width / 2;
    const horizontalSideForBox = box =>
      Math.max(centerX - box.x, box.x + box.width - centerX) / (0.5 - extentPaddingRatio);
    const horizontalSide = Math.max(
      horizontalSideForBox(head), horizontalSideForBox(extent), horizontalSideForBox(face),
    );
    const headTopMarginRatio = 0.02;
    // Shoulder anchors are diagnostic only. They must never enlarge the crop
    // square, because doing so would shrink the head to satisfy a secondary mark.
    const side = Math.max(head.height / target, targetFaceRatio === null ? 0 : Math.min(face.height / targetFaceRatio, head.height / minHeadRatio), maxFaceWidthRatio === null ? 0 : face.width / maxFaceWidthRatio, extent.height / (1 - 2 * extentPaddingRatio), Math.max(0, (extent.y + extent.height - head.y) / (1 - headTopMarginRatio - extentPaddingRatio)), Math.max(0, (face.y + face.height - head.y) / (1 - headTopMarginRatio)), horizontalSide);
    const cropLeft = centerX - side / 2;
    const crop = { x: cropLeft, y: Math.min(head.y - side * headTopMarginRatio, extent.y - side * extentPaddingRatio) + verticalShift, width: side, height: side };
    const faceCenterX = (centerX - crop.x) / side, headRatio = head.height / side;
    const faceHeightRatio = face.height / side;
    const passesFaceSize = minFaceRatio === null ? null : faceHeightRatio + 1e-9 >= minFaceRatio;
    const headTopClearance = head.y - crop.y;
    const headContained = head.x >= crop.x && head.x + head.width <= crop.x + side && head.y >= crop.y && head.y + head.height <= crop.y + side;
    const extentPadding = Math.min(extent.x - crop.x, crop.x + side - (extent.x + extent.width), extent.y - crop.y, crop.y + side - (extent.y + extent.height));
    const extentContained = extentPadding >= side * extentPaddingRatio - 1e-9;
    const headWithinSource = head.x >= 0 && head.y >= 0 && head.x + head.width <= src.width && head.y + head.height <= src.height;
    const extentWithinSource = extent.x >= 0 && extent.y >= 0 && extent.x + extent.width <= src.width && extent.y + extent.height <= src.height;
    const faceContained = face.x >= crop.x && face.x + face.width <= crop.x + side && face.y >= crop.y && face.y + face.height <= crop.y + side;
    const faceWithinSource = face.x >= 0 && face.y >= 0 && face.x + face.width <= src.width && face.y + face.height <= src.height;
    const cropWithinSource = crop.x >= 0 && crop.y >= 0 && crop.x + side <= src.width && crop.y + side <= src.height;
    const shoulderContained = shoulders.map(p => p.x >= crop.x && p.x <= crop.x + side && p.y >= crop.y && p.y <= crop.y + side);
    const shoulderOnArtwork = shoulders.map(p => foregroundNear(src, p));
    const shoulderOutsideFace = shoulders.map((p, index) => index === 0
      ? p.x <= face.x - side * 0.05
      : p.x >= face.x + face.width + side * 0.05);
    const shoulderClearanceBelow = shoulders.map(p => crop.y + side - p.y);
    const passesShoulderClearance = shoulders.length === 2 && shoulderClearanceBelow.every(clearance => clearance >= side * 0.03 - 1e-9);
    // A head-height box must end at the chin. Otherwise neck or shoulders can
    // be mis-marked into the box and falsely pass the 75% head-size gate.
    const headBottom = head.y + head.height;
    const faceBottom = face.y + face.height;
    const headChinDelta = Math.abs(headBottom - faceBottom);
    const headChinTolerance = Math.max(2, side * 0.02);
    const passesHeadChinAlignment = headChinDelta <= headChinTolerance;
    const passesHeadRatio = headRatio >= minHeadRatio && headRatio <= maxHeadRatio;
    const faceCenterTolerance = 1 / outputSize;
    const passesFaceCenter = Math.abs(faceCenterX - 0.5) <= faceCenterTolerance + 1e-9;
    const passesShoulders = shoulders.length === 2 && shoulderContained.every(Boolean) && shoulderOnArtwork.every(Boolean) && shoulderOutsideFace.every(Boolean) && passesShoulderClearance;
    const faceWidthRatio = face.width / side;
    const passesFaceWidth = (minFaceWidthRatio === null || faceWidthRatio >= minFaceWidthRatio)
      && (maxFaceWidthRatio === null || faceWidthRatio <= maxFaceWidthRatio);
    const passesFaceChecks = passesFaceSize !== false && passesFaceWidth !== false;
    let passesPriorityChecks = passesHeadRatio && passesHeadChinAlignment && headContained && headWithinSource && extentContained && extentWithinSource && faceContained && faceWithinSource && passesFaceCenter && passesFaceChecks;
    const out = new PNG({ width: outputSize, height: outputSize });
    for (let y = 0; y < out.height; y++) for (let x = 0; x < out.width; x++) {
      const sx = crop.x + (x + 0.5) * side / out.width - 0.5;
      const sy = crop.y + (y + 0.5) * side / out.height - 0.5;
      putPixel(out.data, out.width, x, y, sampleBilinear(src, sx, sy));
    }
    const outputEdgeAlphaCounts = { top: 0, right: 0, bottom: 0, left: 0 };
    const extentStartY = Math.max(0, Math.floor((extent.y - crop.y) / side * out.height));
    const extentEndY = Math.min(out.height - 1, Math.ceil((extent.y + extent.height - crop.y) / side * out.height));
    for (let i = 0; i < out.width; i++) {
      if (out.data[i * 4 + 3] >= 8) outputEdgeAlphaCounts.top++;
      if (out.data[((out.height - 1) * out.width + i) * 4 + 3] >= 8) outputEdgeAlphaCounts.bottom++;
    }
    for (let y = extentStartY; y <= extentEndY; y++) {
      if (out.data[(y * out.width + out.width - 1) * 4 + 3] >= 8) outputEdgeAlphaCounts.right++;
      if (out.data[(y * out.width) * 4 + 3] >= 8) outputEdgeAlphaCounts.left++;
    }
    // Check top and side borders only across the marked complete head extent;
    // clothing or shoulders outside that vertical band must not cause a false reject.
    // The bottom edge remains a visual warning because a shoulder-up avatar may crop clothing there.
    const touchesHeadBoundary = outputEdgeAlphaCounts.top > 0
      || outputEdgeAlphaCounts.left > 0
      || outputEdgeAlphaCounts.right > 0;
    if (touchesHeadBoundary) passesPriorityChecks = false;
    const outputCanvasCenterX = (out.width - 1) / 2;
    const outputFaceCenterX = faceCenterX * out.width;
    if (a['centerline-out']) {
      const centerlinePath = path.resolve(a['centerline-out']);
      const centerlinePreview = drawCenterlineComparison(out, outputCanvasCenterX, outputFaceCenterX);
      fs.mkdirSync(path.dirname(centerlinePath), { recursive: true });
      fs.writeFileSync(centerlinePath, PNG.sync.write(centerlinePreview));
      fs.writeFileSync(`${centerlinePath}.txt`, [
        '青色虛線：畫布垂直中心線。',
        '洋紅虛線：標記臉框的垂直中心線。',
        '兩線重疊時以青／洋紅交替短線段顯示。請再確認臉框沿額際、雙頰與下顎準確標記；幾何置中數值不會自動驗證標記是否正確。'
      ].join('\n') + '\n', 'utf8');
    }
    if (a['guide-out']) {
      const guidePath = path.resolve(a['guide-out']);
      const guide = new PNG({ width: src.width, height: src.height });
      for (let i = 0; i < src.data.length; i += 4) {
        const alpha = src.data[i + 3] / 255;
        guide.data[i] = Math.round(src.data[i] * alpha + 255 * (1 - alpha));
        guide.data[i + 1] = Math.round(src.data[i + 1] * alpha + 255 * (1 - alpha));
        guide.data[i + 2] = Math.round(src.data[i + 2] * alpha + 255 * (1 - alpha));
        guide.data[i + 3] = 255;
      }
      drawRect(guide, extent, [0, 180, 80, 255]);
      drawRect(guide, head, [0, 210, 255, 255]);
      drawRect(guide, face, [255, 55, 55, 255]);
      drawRect(guide, crop, [255, 0, 255, 255]);
      shoulders.forEach(point => drawCrosshair(guide, point, [255, 220, 0, 255]));
      fs.mkdirSync(path.dirname(guidePath), { recursive: true });
      fs.writeFileSync(guidePath, PNG.sync.write(guide));
      fs.writeFileSync(`${guidePath}.txt`, [
        '綠色框：需完整保留的頭飾／頭髮範圍',
        '青色框：頭部比例量測範圍（顱部髮型／盔體頂至下巴，不含高聳頭冠／羽飾）',
        '紅色框：手動標記的臉部範圍（額際至下巴、兩側臉頰／下顎）',
        '黃色十字：選填的左、右肩面錨點；缺少、未入鏡或下緣空間不足只列警示，不改變裁框',
        `洋紅框：計算後的正方形裁框；完整頭部安全邊距 ${(extentPaddingRatio * 100).toFixed(1)}%`,
        `量測結果：head=${(headRatio * 100).toFixed(1)}%, head-to-chin-delta=${headChinDelta.toFixed(1)}px (limit ${headChinTolerance.toFixed(1)}px), faceCenterX=${(faceCenterX * 100).toFixed(1)}%, topClearance=${(headTopClearance / side * 100).toFixed(1)}%, verticalShift=${verticalShift}px, hardChecks=${passesPriorityChecks}, shoulders=${passesShoulders}`,
        '先確認標記覆蓋原圖的真實頭臉；肩點僅供可見度參考。再檢查候選裁圖；數值通過不等於視覺驗收通過。'
      ].join('\n') + '\n', 'utf8');
    }
    const result = { acceptanceStatus: passesPriorityChecks ? (passesShoulders ? 'geometry-pass-needs-visual-review' : 'geometry-pass-shoulder-warning') : 'geometry-fail', visualReviewRequired: true, input: path.resolve(a.input), output: path.resolve(a.out), source: `${src.width}x${src.height}`, outputSize: `${outputSize}x${outputSize}`, cropPixels: { x: +crop.x.toFixed(2), y: +crop.y.toFixed(2), side: +side.toFixed(2) }, verticalShift: +verticalShift.toFixed(2), headTopClearance: +headTopClearance.toFixed(2), headHeightRatio: +(headRatio * 100).toFixed(1), targetHeadHeightRatio: +(target * 100).toFixed(1), acceptedHeadHeightRange: `${(minHeadRatio * 100).toFixed(1)}–${(maxHeadRatio * 100).toFixed(1)}%`, passesHeadRatio, headContained, headWithinSource, extentContained, cropWithinSource, cropOutsideSourceTransparentPadding: !cropWithinSource, extentPadding: +extentPadding.toFixed(2), extentPaddingRatio: +extentPaddingRatio.toFixed(3), extentWithinSource, faceCenterX: +((face.x + face.width / 2 - crop.x) / side * 100).toFixed(1), passesFaceCenter, faceContained, faceWithinSource, shoulders: { shoulderAnchors: shoulders, contained: shoulderContained, onVisiblePixelsWithin5px: shoulderOnArtwork, outsideFaceByAtLeast5Percent: shoulderOutsideFace, clearanceBelow: shoulderClearanceBelow.map(value => +value.toFixed(2)), passesClearanceBelow: passesShoulderClearance, passesShoulders }, passesPriorityChecks, passesAllHardChecks: passesPriorityChecks, shoulderStatus: passesShoulders ? 'pass' : 'warning', note: `頭高接受範圍75–80%，預設目標75%；頭高量顱部髮型／盔體頂至下巴，不含高聳冠飾。臉高接受範圍38–50%、臉寬接受範圍27.6–39.6%；臉框中線與完整頭部內容是硬性條件。左右肩面可見度僅列次要警示，不得為符合肩點而縮小頭像。extent 須涵蓋全部可見頭髮、耳朵、頭盔和頭飾；預設留白3%，只有標記完整且預設留白會阻止75%頭高時才可明確降低至0.5–3%，確認裁框未切掉任何頭部像素。若有標記肩點，回報其是否入框與可見度；肩點缺失或出框不會使其他頭部硬性檢查判退。頭頂保留2%空間。工具只裁切／等比縮放，不修正人物。` };
    result.outputEdgeAlphaCounts = outputEdgeAlphaCounts;
    result.touchesHeadBoundary = touchesHeadBoundary;
    result.bottomEdgeNeedsVisualReview = outputEdgeAlphaCounts.bottom > 0;
    if (touchesHeadBoundary) {
      result.headBoundaryFailure = 'Opaque character pixels touch the top or side canvas edge; reframe and confirm complete hair and headwear before acceptance.';
    }
    result.headChinAlignment = {
      headBottom: +headBottom.toFixed(2),
      faceChin: +faceBottom.toFixed(2),
      delta: +headChinDelta.toFixed(2),
      tolerance: +headChinTolerance.toFixed(2),
      passes: passesHeadChinAlignment,
    };
    result.note += ' 頭高框下緣需與臉框下巴對齊（容差為裁框邊長2%或2來源像素取大），避免把頸部算入頭高。';
    result.centerlineCheck = {
      canvasCenterX: +outputCanvasCenterX.toFixed(2),
      faceBoxCenterX: +outputFaceCenterX.toFixed(2),
      separationPixels: +Math.abs(outputCanvasCenterX - outputFaceCenterX).toFixed(2),
      tolerancePixels: 1,
      preview: a['centerline-out'] ? path.resolve(a['centerline-out']) : null,
    };
    result.faceHeightRatio = +(faceHeightRatio * 100).toFixed(1);
    result.faceWidthRatio = +(faceWidthRatio * 100).toFixed(1);
    result.faceCenterTolerancePixels = 1;
    result.faceCenterTolerancePercent = +(100 / outputSize).toFixed(3);
    result.minFaceHeightRatio = minFaceRatio === null ? null : minFaceRatio * 100;
    result.minFaceWidthPercent = minFaceWidthRatio === null ? null : minFaceWidthRatio * 100;
    result.maxFaceWidthPercent = maxFaceWidthRatio === null ? null : maxFaceWidthRatio * 100;
    result.passesFaceWidth = passesFaceWidth;
    result.passesFaceSize = passesFaceSize === false || passesFaceWidth === false ? false : passesFaceSize;
    result.centerAnchor = 'face-box';
    result.noseCenterX = noseX === null ? null : +((noseX - crop.x) / side * 100).toFixed(1);
    if (minFaceRatio !== null || minFaceWidthRatio !== null) {
      const maximumSideForMinimum = Math.min(
        face.height / minFaceRatio,
        face.width / minFaceWidthRatio,
        head.height / minHeadRatio,
      );
      const maximumSideForTarget = Math.min(face.height / targetFaceRatio, face.width / minFaceWidthRatio, head.height / minHeadRatio);
      const minimumSidePreservingMarkedFeatures = Math.max(
        maxFaceWidthRatio === null ? 0 : face.width / maxFaceWidthRatio,
        head.height / 0.80,
        extent.height / (1 - 2 * extentPaddingRatio),
        Math.max(0, (extent.y + extent.height - head.y) / (1 - headTopMarginRatio - extentPaddingRatio)),
        Math.max(0, (face.y + face.height - head.y) / (1 - headTopMarginRatio)),
        horizontalSide,
      );
      result.faceScaleAdvice = {
        recommendedUniformZoomToFaceTarget: Math.ceil(Math.max(1, side / maximumSideForTarget) * 1000) / 1000,
        minimumUniformZoomToPassFaceFloors: Math.ceil(Math.max(1, side / maximumSideForMinimum) * 1000) / 1000,
        targetCropSidePixels: +maximumSideForTarget.toFixed(2),
        maximumCropSideToPassMinimumsPixels: +maximumSideForMinimum.toFixed(2),
        minimumCropSideToPassMaximumFaceWidthPixels: maxFaceWidthRatio === null ? null : +(face.width / maxFaceWidthRatio).toFixed(2),
        minimumCropSideToPreserveHeadAndExtentPixels: +minimumSidePreservingMarkedFeatures.toFixed(2),
        canFitMarkedFeaturesAtMinimumScale: minimumSidePreservingMarkedFeatures <= maximumSideForMinimum + 1e-9,
        canFitMarkedFeaturesAtTargetScale: minimumSidePreservingMarkedFeatures <= maximumSideForTarget + 1e-9,
      };
      result.faceTargetStatus = faceHeightRatio + 1e-9 >= targetFaceRatio
        ? 'target-met'
        : result.faceScaleAdvice.canFitMarkedFeaturesAtTargetScale
          ? 'target-shortfall-review-required'
          : 'target-infeasible-with-complete-head';
    }
    if (passesFaceSize === null && result.passesAllHardChecks) {
      result.acceptanceStatus = passesShoulders
        ? 'geometry-pass-face-scale-uncalibrated'
        : 'geometry-pass-face-scale-uncalibrated-shoulder-warning';
    }
    if (result.passesFaceSize === false) {
      result.acceptanceStatus = 'geometry-fail';
      result.passesAllHardChecks = false;
      result.faceSizeFailure = 'The crop produces a face smaller than the configured minimum.';
    }
    if (!passesFaceWidth) {
      result.acceptanceStatus = 'geometry-fail';
      result.passesAllHardChecks = false;
      result.faceWidthFailure = faceWidthRatio < minFaceWidthRatio
        ? 'The face is narrower than the configured minimum width.'
        : 'The face is wider than the configured maximum width; enlarging the crop to fit would reduce head height below its minimum.';
    }
    if (result.passesAllHardChecks && result.faceTargetStatus && result.faceTargetStatus !== 'target-met') {
      result.acceptanceStatus = passesShoulders
        ? 'geometry-pass-face-target-shortfall-needs-visual-review'
        : 'geometry-pass-face-target-shortfall-shoulder-warning-needs-visual-review';
    }
    console.log(JSON.stringify(result, null, 2));
    if (!result.passesAllHardChecks) { process.exitCode = 3; return; }
    fs.mkdirSync(path.dirname(path.resolve(a.out)), { recursive: true });
    fs.writeFileSync(a.out, PNG.sync.write(out));
    return;
  }
  usage(); process.exitCode = 2;
}
try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
