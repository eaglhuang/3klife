#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { PNG } = require('pngjs');

const sourcePath = 'artifacts/ui-qa/general-detail-ds3-cutover/character-ds3-main.html-cocos-source-normalized.png';
const runtimePath = 'artifacts/ui-qa/general-detail-ds3-cutover/character-ds3-main.html-cocos-editor-normalized.png';
const source = PNG.sync.read(fs.readFileSync(sourcePath));
const runtime = PNG.sync.read(fs.readFileSync(runtimePath));
const tolerance = 12;

const regions = [
  { name: 'full', x: 0, y: 0, w: 1920, h: 1080 },
  { name: 'portrait-left', x: 0, y: 0, w: 1190, h: 1080 },
  { name: 'right-shell', x: 1190, y: 0, w: 730, h: 1080 },
  { name: 'story-strip', x: 0, y: 900, w: 1140, h: 180 },
  { name: 'top-left-badge', x: 0, y: 0, w: 180, h: 150 },
  { name: 'portrait-core', x: 180, y: 80, w: 900, h: 920 },
  { name: 'portrait-edge-fade', x: 900, y: 0, w: 290, h: 1080 },
  { name: 'right-content', x: 1190, y: 0, w: 560, h: 1080 },
  { name: 'tab-rail', x: 1750, y: 0, w: 170, h: 1080 },
];

function scoreRegion(region) {
  let matched = 0;
  let total = 0;
  let sad = 0;
  const maxX = Math.min(source.width, runtime.width, region.x + region.w);
  const maxY = Math.min(source.height, runtime.height, region.y + region.h);
  for (let y = region.y; y < maxY; y += 1) {
    for (let x = region.x; x < maxX; x += 1) {
      const index = (y * source.width + x) * 4;
      const dr = Math.abs(source.data[index] - runtime.data[index]);
      const dg = Math.abs(source.data[index + 1] - runtime.data[index + 1]);
      const db = Math.abs(source.data[index + 2] - runtime.data[index + 2]);
      const da = Math.abs(source.data[index + 3] - runtime.data[index + 3]);
      if (dr <= tolerance && dg <= tolerance && db <= tolerance && da <= tolerance) matched += 1;
      sad += dr + dg + db;
      total += 1;
    }
  }
  return {
    name: region.name,
    score: total ? matched / total : 0,
    matched,
    total,
    avgRgbDelta: total ? sad / (total * 3) : 0,
  };
}

for (const result of regions.map(scoreRegion)) {
  console.log(`${result.name}\tscore=${result.score.toFixed(6)}\tmatched=${result.matched}\ttotal=${result.total}\tavgRgbDelta=${result.avgRgbDelta.toFixed(2)}`);
}
