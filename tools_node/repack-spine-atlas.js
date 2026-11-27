#!/usr/bin/env node
'use strict';
/**
 * 重打包 Spine atlas（PROG-2-10157）：把頁數多、每頁大半空白的 atlas 併成少數幾張較大的頁。
 *
 * 做法：解析 .atlas（Spine 3.8/4.x 文字格式，不支援 rotate），把每個 region 連同外圍 BLEED 像素（保留原本的出血邊）
 * 從舊頁裁下，用 shelf 演算法排進 <size>×<size> 的新頁，寫出新頁 PNG 與新 atlas。
 * 骨架 .json 只引用 region 名稱，不需要改。寫完會逐 region 把新頁像素與舊頁比對，不同就 exit 1。
 *
 * 用法：
 *   node tools_node/repack-spine-atlas.js --atlas <x.atlas> --out <輸出資料夾> [--size 1024] [--prefix <頁檔名前綴>] [--bleed 2] [--dry-run]
 *   --atlas   舊 atlas 路徑；舊頁 PNG 與它同資料夾
 *   --out     輸出資料夾（新 atlas 與新頁都寫在這裡，檔名 <prefix>_1.png…，atlas 檔名沿用舊檔名）
 *   --prefix  新頁檔名前綴，預設為 atlas 檔名（去副檔名）加 _pack
 *   --dry-run 只算頁數與填充率，不寫檔
 *
 * spine 目錄在 .gitignore（assets/resources/spine/soldiers/ 等），不進版控；本工具只做轉換，輸出由人放回各環境。
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

function parseArgs(argv) {
  const out = { size: 1024, bleed: 2, dry: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--atlas') out.atlas = argv[++i];
    else if (a === '--out') out.out = argv[++i];
    else if (a === '--size') out.size = Number(argv[++i]);
    else if (a === '--prefix') out.prefix = argv[++i];
    else if (a === '--bleed') out.bleed = Number(argv[++i]);
    else if (a === '--dry-run') out.dry = true;
    else throw new Error('未知參數 ' + a);
  }
  if (!out.atlas) throw new Error('缺 --atlas');
  if (!out.dry && !out.out) throw new Error('缺 --out');
  return out;
}

/** 解析 atlas：回傳 pages[{file, header[], regions[{name, attrs[], bounds:{x,y,w,h}}]}] */
function parseAtlas(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const pages = [];
  let page = null; let region = null;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === '') { page = null; region = null; continue; }
    if (!page) { page = { file: line.trim(), header: [], regions: [] }; pages.push(page); region = null; continue; }
    if (/^\s/.test(line)) { // 縮排的屬性行（4.x 部分輸出）
      if (region) region.attrs.push(line.trim()); continue;
    }
    if (line.includes(':')) {
      const [k, v] = line.split(/:\s*/, 2);
      if (!region) page.header.push(line.trim());
      else {
        if (k === 'bounds') { const [x, y, w, h] = v.split(',').map(Number); region.bounds = { x, y, w, h }; }
        else if (k === 'rotate' && v !== 'false' && v !== '0') throw new Error('不支援 rotate region：' + region.name);
        else region.attrs.push(line.trim());
      }
      continue;
    }
    region = { name: line.trim(), attrs: [], bounds: null }; page.regions.push(region);
  }
  for (const p of pages) for (const r of p.regions) if (!r.bounds) throw new Error('region 缺 bounds：' + r.name);
  return pages;
}

/** shelf 打包：依高度由大到小排，逐列放；放不下開新頁 */
function pack(items, size) {
  const sorted = [...items].sort((a, b) => (b.h - a.h) || (b.w - a.w));
  const pages = [];
  const open = () => { const p = { shelves: [], used: 0 }; pages.push(p); return p; };
  for (const it of sorted) {
    if (it.w > size || it.h > size) throw new Error('region 比頁面大：' + it.name);
    let placed = false;
    for (const page of pages) {
      for (const shelf of page.shelves) {
        if (it.h <= shelf.h && shelf.x + it.w <= size) { it.page = page; it.px = shelf.x; it.py = shelf.y; shelf.x += it.w; placed = true; break; }
      }
      if (placed) break;
      const top = page.shelves.length ? page.shelves[page.shelves.length - 1] : null;
      const y = top ? top.y + top.h : 0;
      if (y + it.h <= size) { page.shelves.push({ y, h: it.h, x: it.w }); it.page = page; it.px = 0; it.py = y; placed = true; break; }
    }
    if (!placed) {
      const page = open(); page.shelves.push({ y: 0, h: it.h, x: it.w }); it.page = page; it.px = 0; it.py = 0;
    }
  }
  return pages;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const atlasPath = path.resolve(args.atlas);
  const dir = path.dirname(atlasPath);
  const pages = parseAtlas(fs.readFileSync(atlasPath, 'utf8'));
  const pngs = new Map();
  for (const p of pages) pngs.set(p.file, PNG.sync.read(fs.readFileSync(path.join(dir, p.file))));

  const items = [];
  let regionPx = 0;
  for (const p of pages) {
    const img = pngs.get(p.file);
    for (const r of p.regions) {
      const x0 = Math.max(0, r.bounds.x - args.bleed), y0 = Math.max(0, r.bounds.y - args.bleed);
      const x1 = Math.min(img.width, r.bounds.x + r.bounds.w + args.bleed), y1 = Math.min(img.height, r.bounds.y + r.bounds.h + args.bleed);
      items.push({ name: r.name, region: r, srcPage: p, x0, y0, w: x1 - x0, h: y1 - y0 });
      regionPx += r.bounds.w * r.bounds.h;
    }
  }
  const packed = pack(items, args.size);
  const oldPx = pages.reduce((s, p) => s + pngs.get(p.file).width * pngs.get(p.file).height, 0);
  const newPx = packed.length * args.size * args.size;
  console.log(`舊 ${pages.length} 頁 ${(oldPx * 4 / 1048576).toFixed(1)}MB → 新 ${packed.length} 頁 ${args.size}² ${(newPx * 4 / 1048576).toFixed(1)}MB；region 像素佔新頁 ${(regionPx / newPx * 100).toFixed(0)}%`);
  if (args.dry) return;

  fs.mkdirSync(args.out, { recursive: true });
  const prefix = args.prefix || (path.basename(atlasPath, path.extname(atlasPath)) + '_pack');
  const outPngs = packed.map(() => new PNG({ width: args.size, height: args.size }));
  for (const it of items) {
    const src = pngs.get(it.srcPage.file); const dst = outPngs[packed.indexOf(it.page)];
    for (let y = 0; y < it.h; y += 1) {
      const so = ((it.y0 + y) * src.width + it.x0) * 4; const doff = ((it.py + y) * dst.width + it.px) * 4;
      src.data.copy(dst.data, doff, so, so + it.w * 4);
    }
  }
  const header0 = pages[0].header;
  const outLines = [];
  packed.forEach((page, idx) => {
    const file = `${prefix}_${idx + 1}.png`;
    fs.writeFileSync(path.join(args.out, file), PNG.sync.write(outPngs[idx]));
    outLines.push(file);
    outLines.push(...header0.map(h => (h.startsWith('size:') ? `size: ${args.size},${args.size}` : h)));
    for (const it of items.filter(i => i.page === page)) {
      outLines.push(it.name);
      for (const a of it.region.attrs) outLines.push(a);
      const bx = it.px + (it.region.bounds.x - it.x0), by = it.py + (it.region.bounds.y - it.y0);
      outLines.push(`bounds: ${bx},${by},${it.region.bounds.w},${it.region.bounds.h}`);
    }
    outLines.push('');
  });
  fs.writeFileSync(path.join(args.out, path.basename(atlasPath)), outLines.join('\n'));

  // 逐 region 像素比對（新頁 vs 舊頁）
  const reparsed = parseAtlas(fs.readFileSync(path.join(args.out, path.basename(atlasPath)), 'utf8'));
  const readBack = new Map(reparsed.map(p => [p.file, PNG.sync.read(fs.readFileSync(path.join(args.out, p.file)))]));
  const oldByName = new Map(); for (const p of pages) for (const r of p.regions) oldByName.set(r.name, { p, r });
  let bad = 0; let checked = 0;
  for (const np of reparsed) for (const nr of np.regions) {
    const { p: op, r: or } = oldByName.get(nr.name);
    const o = pngs.get(op.file); const n = readBack.get(np.file);
    for (let y = 0; y < or.bounds.h && !bad; y += 1) for (let x = 0; x < or.bounds.w; x += 1) {
      const a = ((or.bounds.y + y) * o.width + or.bounds.x + x) * 4; const b = ((nr.bounds.y + y) * n.width + nr.bounds.x + x) * 4;
      if (o.data[a] !== n.data[b] || o.data[a + 1] !== n.data[b + 1] || o.data[a + 2] !== n.data[b + 2] || o.data[a + 3] !== n.data[b + 3]) { bad += 1; console.error('像素不同：', nr.name, x, y); break; }
    }
    checked += 1;
  }
  console.log(`比對 ${checked}/${oldByName.size} 個 region：${bad ? '失敗' : '全部一致'}`);
  if (bad || checked !== oldByName.size) process.exit(1);
}

main();
