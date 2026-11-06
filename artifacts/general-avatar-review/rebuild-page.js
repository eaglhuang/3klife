const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.resolve(__dirname, '..', '..');
const pageNumber = Number(process.argv[2]);
if (!Number.isInteger(pageNumber) || pageNumber < 1) {
  throw new Error('Usage: node artifacts/general-avatar-review/rebuild-page.js <page-number>');
}

const pageName = `page-${String(pageNumber).padStart(3, '0')}`;
const index = JSON.parse(fs.readFileSync(path.join(__dirname, `${pageName}.json`), 'utf8'));
const canvas = new PNG({ width: 296, height: 296 });
const background = [24, 20, 17];
const tileSize = 80;
const cellStep = 96;
const margin = 8;
const imageRoot = path.join(root, 'assets/resources/sprites/generals/avatars');

for (let i = 0; i < canvas.width * canvas.height; i++) {
  const p = i * 4;
  canvas.data[p] = background[0];
  canvas.data[p + 1] = background[1];
  canvas.data[p + 2] = background[2];
  canvas.data[p + 3] = 255;
}

for (const item of index.items) {
  const sourcePath = path.join(imageRoot, item.file);
  const source = PNG.sync.read(fs.readFileSync(sourcePath));
  const cell = item.position - 1;
  const left = margin + (cell % 3) * cellStep + 4;
  const top = margin + Math.floor(cell / 3) * cellStep + 4;

  for (let y = 0; y < tileSize; y++) {
    const sy = Math.min(source.height - 1, Math.floor((y + 0.5) * source.height / tileSize));
    for (let x = 0; x < tileSize; x++) {
      const sx = Math.min(source.width - 1, Math.floor((x + 0.5) * source.width / tileSize));
      const src = (sy * source.width + sx) * 4;
      const dst = ((top + y) * canvas.width + left + x) * 4;
      const alpha = source.data[src + 3] / 255;
      for (let c = 0; c < 3; c++) {
        canvas.data[dst + c] = Math.round(source.data[src + c] * alpha + background[c] * (1 - alpha));
      }
      canvas.data[dst + 3] = 255;
    }
  }
}

const outputPath = path.join(__dirname, `${pageName}.png`);
fs.writeFileSync(outputPath, PNG.sync.write(canvas));
console.log(`Rendered ${pageName} from ${index.items.length} current avatar assets: ${outputPath}`);
