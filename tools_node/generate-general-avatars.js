#!/usr/bin/env node
/**
 * generate-general-avatars.js
 *
 * 從武將立繪裁切頭像（PROG-2-1107 改版，與美術總監對齊）：
 *   - 立繪路徑讀 data/general-art-paths.json 的 portrait 樣板（標準路徑，只讀）。
 *   - 有 face 量測（髮際 top、下巴 chin、眼線 eyeY、臉中心 cx）時，裁框由臉高反推：臉高＝邊長 38%、眼線在 40%。
 *   - 裁切座標讀 data/general-avatar-crops.json；沒有座標的武將自動估算並寫回，標 "source": "auto"，
 *     美術總監看過後改 "reviewed"。已有座標的不覆蓋。
 *   - 輸出：遊戲用 256×256 → croppedAvatarDir（sprites/ui_avatars/cropped，不碰 sprites/generals）；
 *           512×512 裁切母圖 → artifacts/general-avatars/master（不進遊戲，換高解析時重出）；
 *           64px 總覽圖 → artifacts/general-avatars/overview.png（給美術總監審）。
 *   - 正式頭像（sprites/generals/avatars）由美術總監管理，本工具不寫。
 *
 * 用法：
 *   node tools_node/generate-general-avatars.js            # 全部立繪
 *   node tools_node/generate-general-avatars.js zhao-yun   # 只做指定武將
 *   node tools_node/generate-general-avatars.js --verify   # 只驗證與估算，不寫檔
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const ROOT        = path.resolve(__dirname, '..');
const RES         = path.join(ROOT, 'assets/resources');
const CROPS_PATH  = path.join(RES, 'data/general-avatar-crops.json');
const PATHS_PATH  = path.join(RES, 'data/general-art-paths.json');
const ARTIFACT_DIR = path.join(ROOT, 'artifacts/general-avatars');

const OUT_SIZE    = 256;
const MASTER_SIZE = 512;
const REVIEW_SIZE = 64;
/** 頭頂至少留 8%（翎羽、馬尾、冠飾在圓形遮罩裡不被切掉） */
const TOP_MARGIN  = 0.08;
/** 自動估算：裁切邊長 = 人物外框寬 × 此比例 */
const AUTO_WIDTH_RATIO = 0.55;
/** 臉高（髮際→下巴）佔裁框邊長比例，美術總監 2026-10-25 規範 38% ±3% */
const FACE_HEIGHT_RATIO = 0.38;
/** 眼線距裁框頂端比例 */
const EYE_LINE_RATIO = 0.40;

const args       = process.argv.slice(2);
const verifyOnly = args.includes('--verify');
const targetId   = args.find(a => !a.startsWith('--')) ?? null;

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

function fileIdOf(id) { return id.replace(/-/g, '_'); }

function fill(template, id) {
    return template.replace(/\{file\}/g, fileIdOf(id)).replace(/\{id\}/g, id);
}

/** 依 portrait 樣板反推現有立繪的武將 id */
function listPortraitIds(portraitTemplate) {
    const rel = portraitTemplate + '.png';
    const dir = path.join(RES, path.dirname(rel));
    const re = new RegExp('^' + path.basename(rel).replace('.', '\.').replace('{file}', '([a-z0-9_]+)') + '$');
    return fs.readdirSync(dir).map((f) => f.match(re)).filter(Boolean).map((m) => m[1].replace(/_/g, '-')).sort();
}

/** alpha 外框 */
function alphaBBox(png) {
    let x0 = png.width, y0 = png.height, x1 = -1, y1 = -1;
    for (let y = 0; y < png.height; y++) {
        for (let x = 0; x < png.width; x++) {
            if (png.data[(y * png.width + x) * 4 + 3] > 24) {
                if (x < x0) x0 = x; if (x > x1) x1 = x;
                if (y < y0) y0 = y; if (y > y1) y1 = y;
            }
        }
    }
    return x1 < 0 ? { x: 0, y: 0, w: png.width, h: png.height } : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** 自動估算正方形裁切：人物外框頂端置中，頭頂留 TOP_MARGIN */
function autoCrop(png) {
    const bb = alphaBBox(png);
    const size = Math.round(Math.min(bb.w * AUTO_WIDTH_RATIO, png.width));
    const cx = bb.x + bb.w / 2;
    return { x: Math.round(cx - size / 2), y: Math.round(bb.y - size * TOP_MARGIN), w: size, h: size };
}

/** 由臉部量測反推正方形裁框：face = { top, chin, eyeY, cx }（立繪原始像素） */
function cropFromFace(face) {
    const size = Math.round((face.chin - face.top) / FACE_HEIGHT_RATIO);
    return { x: Math.round(face.cx - size / 2), y: Math.round(face.eyeY - size * EYE_LINE_RATIO), w: size, h: size };
}

/** Box filter 縮放；裁切框超出原圖的部分當透明 */
function cropAndResize(src, cx, cy, cw, ch, outSize) {
    const out = new PNG({ width: outSize, height: outSize, filterType: -1 });
    out.data = Buffer.alloc(outSize * outSize * 4);
    const sx = cw / outSize, sy = ch / outSize, area = sx * sy;
    for (let oy = 0; oy < outSize; oy++) {
        for (let ox = 0; ox < outSize; ox++) {
            const x0 = cx + ox * sx, y0 = cy + oy * sy, x1 = x0 + sx, y1 = y0 + sy;
            let r = 0, g = 0, b = 0, a = 0;
            for (let iy = Math.max(0, Math.floor(y0)); iy <= Math.min(src.height - 1, Math.ceil(y1 - 1e-9)); iy++) {
                for (let ix = Math.max(0, Math.floor(x0)); ix <= Math.min(src.width - 1, Math.ceil(x1 - 1e-9)); ix++) {
                    const w = Math.max(0, Math.min(ix + 1, x1) - Math.max(ix, x0)) * Math.max(0, Math.min(iy + 1, y1) - Math.max(iy, y0));
                    if (w <= 0) continue;
                    const si = (iy * src.width + ix) * 4, wa = w * src.data[si + 3];
                    r += src.data[si] * wa; g += src.data[si + 1] * wa; b += src.data[si + 2] * wa; a += wa;
                }
            }
            const oi = (oy * outSize + ox) * 4;
            if (a > 0) { out.data[oi] = Math.round(r / a); out.data[oi + 1] = Math.round(g / a); out.data[oi + 2] = Math.round(b / a); }
            out.data[oi + 3] = Math.round(a / area);
        }
    }
    return out;
}

function validate(id, crop, png) {
    const errors = [];
    if (!(crop.w > 0 && crop.h > 0)) errors.push(`裁切尺寸無效 w=${crop.w} h=${crop.h}`);
    if (crop.x + crop.w <= 0 || crop.x >= png.width || crop.y + crop.h <= 0 || crop.y >= png.height) errors.push('裁切框完全在立繪外');
    if (errors.length) { console.error(`  ❌ ${id}：${errors.join('；')}`); return false; }
    return true;
}

/** 64px 總覽圖（深底，給美術總監看縮小後是否認得出人） */
function writeOverview(items) {
    const cols = 9, pad = 8, cell = REVIEW_SIZE + pad;
    const rows = Math.ceil(items.length / cols);
    const sheet = new PNG({ width: cols * cell + pad, height: rows * cell + pad, filterType: -1 });
    for (let i = 0; i < sheet.data.length; i += 4) { sheet.data[i] = 26; sheet.data[i + 1] = 20; sheet.data[i + 2] = 16; sheet.data[i + 3] = 255; }
    items.forEach((png, n) => {
        const ox = pad + (n % cols) * cell, oy = pad + Math.floor(n / cols) * cell;
        for (let y = 0; y < REVIEW_SIZE; y++) for (let x = 0; x < REVIEW_SIZE; x++) {
            const si = (y * REVIEW_SIZE + x) * 4, di = ((oy + y) * sheet.width + ox + x) * 4, a = png.data[si + 3] / 255;
            for (let c = 0; c < 3; c++) sheet.data[di + c] = Math.round(png.data[si + c] * a + sheet.data[di + c] * (1 - a));
        }
    });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'overview.png'), PNG.sync.write(sheet));
}

function main() {
    const paths = readJson(PATHS_PATH);
    const cropsDoc = readJson(CROPS_PATH);
    cropsDoc.crops = cropsDoc.crops || {};
    const portraitTemplate = paths.portrait[0];
    const outDir = path.join(RES, paths.croppedAvatarDir);
    const ids = targetId ? [targetId] : listPortraitIds(portraitTemplate);

    console.log(`\n武將頭像${verifyOnly ? '（驗證模式）' : ''}：${ids.length} 位\n`);
    let ok = 0, fail = 0, added = 0;
    const review = [];
    for (const id of ids) {
        const src = path.join(RES, fill(portraitTemplate, id) + '.png');
        if (!fs.existsSync(src)) { console.warn(`  ⚠  找不到立繪：${path.relative(ROOT, src)}`); fail++; continue; }
        const png = PNG.sync.read(fs.readFileSync(src));
        let crop = cropsDoc.crops[id];
        if (!crop) {
            crop = { ...autoCrop(png), source: 'auto' };
            cropsDoc.crops[id] = crop;
            added++;
        }
        if (crop.face) {
            const derived = cropFromFace(crop.face);
            if (['x', 'y', 'w', 'h'].some((k) => crop[k] !== derived[k])) { Object.assign(crop, derived); added++; }
        }
        if (!validate(id, crop, png)) { fail++; continue; }
        console.log(`  ✓  ${id.padEnd(16)} ${String(crop.source || 'manual').padEnd(8)} (${crop.x},${crop.y})+${crop.w}×${crop.h}`);
        ok++;
        if (verifyOnly) continue;
        fs.mkdirSync(outDir, { recursive: true });
        fs.mkdirSync(path.join(ARTIFACT_DIR, 'master'), { recursive: true });
        fs.writeFileSync(path.join(outDir, `${fileIdOf(id)}_avatar.png`), PNG.sync.write(cropAndResize(png, crop.x, crop.y, crop.w, crop.h, OUT_SIZE)));
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'master', `${fileIdOf(id)}_avatar.png`), PNG.sync.write(cropAndResize(png, crop.x, crop.y, crop.w, crop.h, MASTER_SIZE)));
        review.push(cropAndResize(png, crop.x, crop.y, crop.w, crop.h, REVIEW_SIZE));
    }
    if (!verifyOnly) {
        if (added) fs.writeFileSync(CROPS_PATH, JSON.stringify(cropsDoc, null, 2) + '\n');
        if (review.length) writeOverview(review);
        console.log(`\n輸出：${paths.croppedAvatarDir}（遊戲）、artifacts/general-avatars（512 母圖與 64px 總覽）；新增／更新座標 ${added} 筆`);
    }
    console.log(`結果：${ok} 成功  ${fail} 失敗`);
    if (fail > 0) process.exit(1);
}

main();
