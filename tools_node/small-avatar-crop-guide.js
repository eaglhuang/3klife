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
       --head x,y,width,height --face x,y,width,height [--extent x,y,width,height]
       --shoulders leftX,leftY,rightX,rightY [--target 0.76] [--size 256] [--guide-out <guide.png>]

Boxes use source-image pixel coordinates. --head spans the cranial hair/helmet mass to chin,
excluding tall ornamental crowns/plumes; --extent optionally marks the complete headwear
silhouette that must remain inside the crop;
--face spans forehead to chin and both cheek/jaw edges. --shoulders marks one visible
outer-contour point on each shoulder and is required for crop acceptance. Target head
height defaults to 76%, and acceptance requires 70–82%.
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
    if (!a.input || !a.out || !a.head || !a.face || !a.shoulders) { usage(); process.exitCode = 2; return; }
    const src = readPng(a.input), head = parseBox(a.head, '--head'), face = parseBox(a.face, '--face');
    const extent = a.extent ? parseBox(a.extent, '--extent') : head;
    const shoulders = parseShoulderPoints(a.shoulders);
    const target = a.target == null ? 0.76 : Number(a.target);
    const outputSize = a.size == null ? 256 : Number(a.size);
    if (!(target >= 0.70 && target <= 0.82)) throw new Error('--target must be between 0.70 and 0.82');
    if (!Number.isInteger(outputSize) || outputSize < 64 || outputSize > 2048) throw new Error('--size must be an integer between 64 and 2048');
    const centerX = face.x + face.width / 2;
    const horizontalMin = Math.min(head.x, extent.x, face.x, ...shoulders.map(p => p.x));
    const horizontalMax = Math.max(head.x + head.width, extent.x + extent.width, face.x + face.width, ...shoulders.map(p => p.x));
    const requiredVertical = Math.max(...shoulders.map(p => Math.max(0, (p.y - head.y) / 0.92, (p.y - extent.y) / 0.97)));
    const minimumSide = Math.max(head.height / target, extent.height, Math.max(0, (extent.y + extent.height - head.y) / 0.95), Math.max(0, (face.y + face.height - head.y) / 0.95), requiredVertical, horizontalMax - horizontalMin);
    const feasibleLeftRange = side => {
      // The square must contain the complete head/face/shoulder span while
      // keeping the face center inside the accepted 47–53% horizontal band.
      const left = Math.max(horizontalMax - side, centerX - side * 0.53);
      const right = Math.min(horizontalMin, centerX - side * 0.47);
      return left <= right ? [left, right] : null;
    };
    let side = minimumSide;
    let leftRange = feasibleLeftRange(side);
    if (!leftRange) {
      let high = Math.max(side * 2, src.width, src.height, 1);
      while (!feasibleLeftRange(high)) high *= 2;
      let low = side;
      for (let i = 0; i < 60; i++) {
        const mid = (low + high) / 2;
        if (feasibleLeftRange(mid)) high = mid;
        else low = mid;
      }
      side = high;
      leftRange = feasibleLeftRange(side);
    }
    const centeredLeft = centerX - side / 2;
    const cropLeft = Math.min(leftRange[1], Math.max(leftRange[0], centeredLeft));
    const crop = { x: cropLeft, y: Math.min(head.y - side * 0.05, extent.y), width: side, height: side };
    const faceCenterX = (centerX - crop.x) / side, headRatio = head.height / side;
    const headContained = head.x >= crop.x && head.x + head.width <= crop.x + side && head.y >= crop.y && head.y + head.height <= crop.y + side;
    const extentContained = extent.x >= crop.x && extent.x + extent.width <= crop.x + side && extent.y >= crop.y && extent.y + extent.height <= crop.y + side;
    const headWithinSource = head.x >= 0 && head.y >= 0 && head.x + head.width <= src.width && head.y + head.height <= src.height;
    const extentWithinSource = extent.x >= 0 && extent.y >= 0 && extent.x + extent.width <= src.width && extent.y + extent.height <= src.height;
    const faceContained = face.x >= crop.x && face.x + face.width <= crop.x + side && face.y >= crop.y && face.y + face.height <= crop.y + side;
    const faceWithinSource = face.x >= 0 && face.y >= 0 && face.x + face.width <= src.width && face.y + face.height <= src.height;
    const shoulderContained = shoulders.map(p => p.x >= crop.x && p.x <= crop.x + side && p.y >= crop.y && p.y <= crop.y + side);
    const shoulderOnArtwork = shoulders.map(p => foregroundNear(src, p));
    const shoulderClearanceBelow = shoulders.map(p => crop.y + side - p.y);
    const passesShoulderClearance = shoulderClearanceBelow.every(clearance => clearance >= side * 0.03 - 1e-9);
    const passesHeadRatio = headRatio >= 0.70 && headRatio <= 0.82;
    const passesFaceCenter = Math.abs(faceCenterX - 0.5) <= 0.03 + 1e-9;
    const passesShoulders = shoulderContained.every(Boolean) && shoulderOnArtwork.every(Boolean) && passesShoulderClearance;
    const out = new PNG({ width: outputSize, height: outputSize });
    for (let y = 0; y < out.height; y++) for (let x = 0; x < out.width; x++) {
      const sx = crop.x + (x + 0.5) * side / out.width - 0.5;
      const sy = crop.y + (y + 0.5) * side / out.height - 0.5;
      putPixel(out.data, out.width, x, y, sampleBilinear(src, sx, sy));
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
        '黃色十字：手動標記的左、右肩外輪廓點',
        '洋紅框：計算後的正方形裁框',
        `量測結果：head=${(headRatio * 100).toFixed(1)}%, faceCenterX=${(faceCenterX * 100).toFixed(1)}%, hardChecks=${passesHeadRatio && headContained && headWithinSource && faceContained && faceWithinSource && passesFaceCenter && passesShoulders}`,
        '先確認標記覆蓋原圖的真實頭臉和肩部輪廓，再檢查候選裁圖；數值通過不等於視覺驗收通過。'
      ].join('\n') + '\n', 'utf8');
    }
    const result = { input: path.resolve(a.input), output: path.resolve(a.out), source: `${src.width}x${src.height}`, outputSize: `${outputSize}x${outputSize}`, cropPixels: { x: +crop.x.toFixed(2), y: +crop.y.toFixed(2), side: +side.toFixed(2) }, headHeightRatio: +(headRatio * 100).toFixed(1), targetHeadHeightRatio: +(target * 100).toFixed(1), passesHeadRatio, headContained, headWithinSource, extentContained, extentWithinSource, faceCenterX: +(faceCenterX * 100).toFixed(1), passesFaceCenter, faceContained, faceWithinSource, shoulders: { contourPoints: shoulders, contained: shoulderContained, onVisiblePixelsWithin5px: shoulderOnArtwork, clearanceBelow: shoulderClearanceBelow.map(value => +value.toFixed(2)), passesClearanceBelow: passesShoulderClearance, passesShoulders }, passesAllHardChecks: passesHeadRatio && headContained && headWithinSource && extentContained && extentWithinSource && faceContained && faceWithinSource && passesFaceCenter && passesShoulders, note: '頭部比例只量顱部髮型／盔體，不將高聳頭冠或羽飾冒充頭部；綠框內的頭飾與髮型仍須完整保留。肩點下方須保留裁框高度3%的影像；最後仍須目視確認頭臉、完整頭飾與雙肩。工具只裁切／等比縮放，不會修正原圖五官。' };
    console.log(JSON.stringify(result, null, 2));
    if (!result.passesAllHardChecks) { process.exitCode = 3; return; }
    fs.mkdirSync(path.dirname(path.resolve(a.out)), { recursive: true });
    fs.writeFileSync(a.out, PNG.sync.write(out));
    return;
  }
  usage(); process.exitCode = 2;
}
try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
