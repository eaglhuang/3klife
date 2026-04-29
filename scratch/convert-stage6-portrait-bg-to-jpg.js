#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const jpeg = require('jpeg-js');

const repoRoot = path.resolve(__dirname, '..');
const inputPath = path.join(repoRoot, 'artifacts', 'ui-library', 'character-ds3', 'stage6', 'portrait-bg-decor-bake.png');
const outputPath = path.join(repoRoot, 'artifacts', 'ui-library', 'character-ds3', 'stage6', 'portrait-bg-decor-bake.jpg');

const png = PNG.sync.read(fs.readFileSync(inputPath));
const rgba = Buffer.alloc(png.width * png.height * 4);
for (let index = 0; index < png.data.length; index += 4) {
  const alpha = png.data[index + 3] / 255;
  const invAlpha = 1 - alpha;
  rgba[index] = Math.round(png.data[index] * alpha + 10 * invAlpha);
  rgba[index + 1] = Math.round(png.data[index + 1] * alpha + 10 * invAlpha);
  rgba[index + 2] = Math.round(png.data[index + 2] * alpha + 10 * invAlpha);
  rgba[index + 3] = 255;
}
const jpg = jpeg.encode({ data: rgba, width: png.width, height: png.height }, 92);
fs.writeFileSync(outputPath, jpg.data);
console.log(JSON.stringify({
  ok: true,
  input: path.relative(repoRoot, inputPath).replace(/\\/g, '/'),
  output: path.relative(repoRoot, outputPath).replace(/\\/g, '/'),
  width: png.width,
  height: png.height,
  quality: 92,
}, null, 2));
