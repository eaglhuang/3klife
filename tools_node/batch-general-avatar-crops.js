#!/usr/bin/env node
// Batch candidate export. Never writes to the formal art library.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { PNG } = require('pngjs');

const root = path.resolve(__dirname, '..');
const guide = path.join(__dirname, 'small-avatar-crop-guide.js');
const [manifestFile, runName] = process.argv.slice(2);
if (!manifestFile || !/^[a-z0-9_-]+$/i.test(runName || '')) {
  throw new Error('Usage: node tools_node/batch-general-avatar-crops.js <manifest.json> <run-name>');
}

const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
const out = path.join(root, 'artwork', 'temp', 'avatar-batch-' + runName);

const results = [];
const seen = new Set();
const generated = [];
const references = manifest.references.map(file => path.resolve(root, file));
if (references.length !== 7 || new Set(references).size !== 7 || references.some(file => !fs.existsSync(file))) {
  throw new Error('Provide seven distinct, existing approved small-avatar references.');
}

// Keep head size and face size separate: the user-approved targets are 75%
// head height and 44% face height. Treating the head target as a face target
// makes almost every valid portrait impossible to crop.
const headCalibration = manifest.smallHeadCalibration ?? { minimum: 0.70, target: 0.75 };
const faceCalibration = manifest.smallFaceCalibration ?? { minimum: 0.38, target: 0.44 };
for (const [label, calibration, upper] of [
  ['smallHeadCalibration', headCalibration, 0.90],
  ['smallFaceCalibration', faceCalibration, 0.60],
]) {
  const { minimum, target } = calibration;
  if (typeof minimum !== 'number' || typeof target !== 'number' ||
      !(minimum > 0 && minimum <= target && target <= upper)) {
    throw new Error(`${label} requires numeric minimum and target with 0 < minimum <= target <= ${upper}.`);
  }
}

fs.mkdirSync(out, { recursive: false });

function runGuide(args) {
  return spawnSync(process.execPath, [guide, ...args], { encoding: 'utf8', cwd: root });
}

function renderLarge(source, output) {
  const im = PNG.sync.read(fs.readFileSync(path.resolve(root, source.file)));
  const [hx, hy, hw, hh] = source.extent;
  const [fx, fy, fw, fh] = source.face;
  const [lx, ly, rx, ry] = source.shoulders;
  const [chestTop, chestBottom] = source.chest;
  const values = [hx, hy, hw, hh, fx, fy, fw, fh, lx, ly, rx, ry, chestTop, chestBottom];
  if (!values.every(Number.isFinite) || Math.min(hw, hh, fw, fh) <= 0 || chestBottom <= chestTop) {
    throw new Error('Invalid large-avatar marks');
  }

  // Search from the largest face scale to the smallest permitted by the brief.
  for (let side = Math.ceil(fh / 0.35); side <= Math.floor(fh / 0.28); side++) {
    const x = Math.round(fx + fw / 2 - side / 2);
    for (let y = Math.floor(hy - side * 0.03); y >= Math.max(0, chestTop - side); y--) {
      const bottom = y + side;
      const chestRatio = (bottom - chestTop) / side;
      if (x < 0 || y < 0 || x + side > im.width || bottom > im.height) continue;
      if (chestRatio < 0.35 || chestRatio > 0.45 || bottom > chestBottom) continue;
      if (hx < x || hx + hw > x + side || hy + hh > bottom) continue;
      if (fx < x || fx + fw > x + side || fy < y || fy + fh > bottom) continue;
      if (lx >= fx || rx <= fx + fw) continue;
      if (![ [lx, ly], [rx, ry] ].every(([px, py]) =>
        px >= x && px < x + side && py >= y && py < bottom &&
        im.data[(Math.round(py) * im.width + Math.round(px)) * 4 + 3] > 16
      )) continue;
      const crop = new PNG({ width: 256, height: 256 });
      for (let row = 0; row < 256; row++) {
        for (let col = 0; col < 256; col++) {
          const from = ((y + Math.floor((row + 0.5) * side / 256)) * im.width +
            x + Math.floor((col + 0.5) * side / 256)) * 4;
          im.data.copy(crop.data, (row * 256 + col) * 4, from, from + 4);
        }
      }
      fs.writeFileSync(output, PNG.sync.write(crop));
      return { x, y, side, faceRatio: fh / side, chestRatio };
    }
  }
  throw new Error('No square satisfies the marked headwear, face, shoulders and chest.');
}

for (const entry of manifest.entries) {
  if (!/^[a-z0-9_-]+$/i.test(entry.id) || seen.has(entry.id)) throw new Error('Invalid or duplicate character ID');
  seen.add(entry.id);
  for (const size of ['small', 'large']) {
    const attempts = [];
    let candidateStatus;
    for (const [index, source] of entry.sources.entries()) {
      const output = path.join(out, entry.id + '-' + size + '-' + (index + 1) + '.png');
      try {
        let crop;
        let geometry;
        if (size === 'large') {
          if (!source.file.startsWith('artwork/general-art-library/standing/')) continue;
          crop = renderLarge(source, output);
        } else {
          const args = ['crop', '--input', source.file, '--out', output,
            '--guide-out', output.replace('.png', '-marks.png')];
          for (const mark of ['head', 'face', 'extent', 'shoulders']) args.push('--' + mark, source[mark].join(','));
          if (source.noseX != null) args.push('--nose-x', String(source.noseX));
          args.push('--min-head-ratio', String(headCalibration.minimum),
            '--target', String(headCalibration.target),
            '--min-face-ratio', String(faceCalibration.minimum),
            '--target-face-ratio', String(faceCalibration.target));
          const minimumWidth = source.minFaceWidthRatio ?? faceCalibration.minimumWidth ?? 0.276;
          args.push('--min-face-width-ratio', String(minimumWidth));
          const result = runGuide(args);
          if (result.stdout.trim()) geometry = JSON.parse(result.stdout);
          if (result.status === 0 && geometry) {
            const faceHeight = geometry.faceHeightRatio;
            const faceWidth = geometry.faceWidthRatio;
            if (faceHeight < 38 || faceHeight > 50 || faceWidth > 39.6) {
              attempts.push({
                source: source.file,
                reason: 'Face scale falls outside the approved Da Qiao reference window (height 38–50%, width 27.6–39.6%).',
                geometry,
              });
              continue;
            }
          }
          if (result.status !== 0) {
            attempts.push({
              source: source.file,
              reason: geometry?.faceSizeFailure || result.stderr.trim() || 'Crop geometry failed.',
              geometry,
            });
            continue;
          }
          crop = geometry.cropPixels;
        }
        const status = 'needs-visual-review';
        attempts.push({ source: source.file, output, crop, geometry, status });
        if (candidateStatus !== 'needs-visual-review') candidateStatus = status;
        generated.push({ size, output });
      } catch (error) {
        attempts.push({ source: source.file, reason: error.message });
      }
    }
    results.push({ id: entry.id, size, status: candidateStatus || 'no-candidate', attempts });
  }
}

fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(results, null, 2) + '\n');
for (const size of ['small', 'large']) {
  const files = generated.filter(item => item.size === size).map(item => item.output);
  for (let start = 0; start < files.length; start += 8) {
    const board = path.join(out, size + '-review-' + (start / 8 + 1) + '.png');
    const result = runGuide(['compare', '--out', board, ...(size === 'small' ? references : []), ...files.slice(start, start + 8)]);
    if (result.status !== 0) throw new Error(result.stderr || String(result.error));
  }
}
console.log(out);

