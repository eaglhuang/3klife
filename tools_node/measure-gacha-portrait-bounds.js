#!/usr/bin/env node
// @spec-source → 使用者裁定（轉蛋立繪大小不一）：統一腳底基準線、統一縮放、以最高者驗算頭頂不出畫面
/**
 * 量測全身立繪的「不透明邊界」（頭頂／腳底／水平中心），寫進 data/general-portrait-bounds.json。
 *
 * 執行期（GachaPortraitBaseline.ts）只讀這份 JSON，依腳底基準線與統一縮放係數換算位置，
 * 不逐人手調常數。新增或換圖後重跑本工具即可。
 *
 * 用法：
 *   node tools_node/measure-gacha-portrait-bounds.js            # 寫入 JSON
 *   node tools_node/measure-gacha-portrait-bounds.js --check    # 只比對，不寫檔（有差異回傳非 0）
 *
 * 量測規則：alpha > ALPHA_THRESHOLD 的像素才算人物；透明的上下邊距（含光暈）不計入。
 * 座標皆為原圖像素，y 向下（與 Cocos 紋理座標一致）。
 *   top    = 第一列有不透明像素的 y（頭頂）
 *   bottom = 最後一列有不透明像素的 y + 1（腳底的下緣）
 *   cx     = 不透明像素的水平中心（x）
 *   headTop = 頭頂（含頭冠）第一列：只看躯幹中軸左右各 14% 圖寬的帶狀範圍、且連續不透明寬度 >= 4% 圖寬，
 *             所以舉在身旁、超過頭頂的長槍／戟尖不會被當成頭頂（PROG-2-9156，招賢館頭頂齊平用）
 *   headCx  = 頭頂往下 5% 身高內的不透明水平中心（頭的中線，不受兵器影響）
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const ROOT = path.resolve(__dirname, '..');
const PORTRAIT_DIR = path.join(ROOT, 'assets', 'resources', 'sprites', 'generals');
const OUT_FILE = path.join(ROOT, 'assets', 'resources', 'data', 'general-portrait-bounds.json');
const ALPHA_THRESHOLD = 16;
const SUFFIX = '_portrait.png';
/**
 * 身高比例覆寫（id → 比例，1 = 標準身高）。目前沒有可靠的結構化身高資料，全部預設 1（統一身高比例）。
 * 要讓某位武將比標準高／矮，改這裡再重跑工具；最高者由執行期 verifyBaselineFits 驗算頭頂不超出畫面。
 */
const HEIGHT_RATIO_OVERRIDES = {};

function idFromFile(name) {
    // 與 GeneralArtPaths 的規則相反：cao_cao → cao-cao
    return name.slice(0, -SUFFIX.length).replace(/_/g, '-');
}

function measure(file) {
    const png = PNG.sync.read(fs.readFileSync(file));
    const { width, height, data } = png;
    let top = -1;
    let bottom = -1;
    let left = width;
    let right = -1;
    for (let y = 0; y < height; y++) {
        let rowHit = false;
        for (let x = 0; x < width; x++) {
            if (data[(y * width + x) * 4 + 3] <= ALPHA_THRESHOLD) continue;
            rowHit = true;
            if (x < left) left = x;
            if (x > right) right = x;
        }
        if (rowHit) {
            if (top < 0) top = y;
            bottom = y + 1;
        }
    }
    if (top < 0) return null;
    const head = measureHead(png, top, bottom);
    return { w: width, h: height, top, bottom, cx: Math.round(((left + right + 1) / 2) * 10) / 10, ...head };
}

const HEAD_BAND_RATIO = 0.14;
const HEAD_MIN_RUN_RATIO = 0.04;
const HEAD_CX_DEPTH_RATIO = 0.05;

function opaqueRange(png, y, x0, x1) {
    let first = -1;
    let last = -1;
    for (let x = x0; x < x1; x++) {
        if (png.data[(y * png.width + x) * 4 + 3] <= ALPHA_THRESHOLD) continue;
        if (first < 0) first = x;
        last = x;
    }
    return first < 0 ? null : [first, last];
}

function longestRun(png, y, x0, x1) {
    let best = 0;
    let cur = 0;
    for (let x = x0; x < x1; x++) {
        if (png.data[(y * png.width + x) * 4 + 3] > ALPHA_THRESHOLD) { cur++; if (cur > best) best = cur; } else cur = 0;
    }
    return best;
}

/** 頭頂與頭中線；找不到時退回整體 top 與整體 cx（呼叫端不用另外處理） */
function measureHead(png, top, bottom) {
    const { width } = png;
    const body = bottom - top;
    const centers = [];
    for (let y = top + Math.floor(body * 0.30); y < top + Math.floor(body * 0.45); y++) {
        const r = opaqueRange(png, y, 0, width);
        if (r) centers.push((r[0] + r[1]) / 2);
    }
    centers.sort((a, b) => a - b);
    const torso = centers.length ? centers[Math.floor(centers.length / 2)] : width / 2;
    const x0 = Math.max(0, Math.floor(torso - width * HEAD_BAND_RATIO));
    const x1 = Math.min(width, Math.ceil(torso + width * HEAD_BAND_RATIO));
    let headTop = top;
    for (let y = top; y < bottom; y++) {
        if (longestRun(png, y, x0, x1) >= width * HEAD_MIN_RUN_RATIO) { headTop = y; break; }
    }
    let lo = width;
    let hi = -1;
    const depth = headTop + Math.max(1, Math.floor(body * HEAD_CX_DEPTH_RATIO));
    for (let y = headTop; y < depth && y < bottom; y++) {
        const r = opaqueRange(png, y, x0, x1);
        if (r) { lo = Math.min(lo, r[0]); hi = Math.max(hi, r[1]); }
    }
    const headCx = hi >= 0 ? Math.round(((lo + hi + 1) / 2) * 10) / 10 : torso;
    return { headTop, headCx };
}

function build() {
    const files = fs.readdirSync(PORTRAIT_DIR).filter((f) => f.endsWith(SUFFIX)).sort();
    const portraits = {};
    const skipped = [];
    for (const f of files) {
        const m = measure(path.join(PORTRAIT_DIR, f));
        if (!m) skipped.push(f);
        else {
            const id = idFromFile(f);
            portraits[id] = { ...m, heightRatio: HEIGHT_RATIO_OVERRIDES[id] ?? 1 };
        }
    }
    return {
        $comment: '全身立繪不透明邊界（tools_node/measure-gacha-portrait-bounds.js 產出，勿手改）。單位：原圖像素，y 向下。',
        version: 1,
        alphaThreshold: ALPHA_THRESHOLD,
        portraits,
        ...(skipped.length ? { skipped } : {}),
    };
}

function main(argv = process.argv.slice(2)) {
    const doc = build();
    const text = JSON.stringify(doc, null, 2) + '\n';
    const count = Object.keys(doc.portraits).length;
    const bodies = Object.values(doc.portraits).map((p) => p.bottom - p.top);
    console.log(`量測 ${count} 張立繪；身高（不透明高，原圖 px）min=${Math.min(...bodies)} max=${Math.max(...bodies)}；略過 ${doc.skipped?.length ?? 0} 張`);
    if (argv.includes('--check')) {
        const old = fs.existsSync(OUT_FILE) ? fs.readFileSync(OUT_FILE, 'utf8') : '';
        if (old !== text) {
            console.error('general-portrait-bounds.json 與目前立繪不一致，請重跑本工具。');
            process.exitCode = 1;
        } else console.log('一致。');
        return doc;
    }
    fs.writeFileSync(OUT_FILE, text, 'utf8');
    console.log(`已寫入 ${path.relative(ROOT, OUT_FILE)}`);
    return doc;
}

if (require.main === module) main();

module.exports = { measure, build, idFromFile };
