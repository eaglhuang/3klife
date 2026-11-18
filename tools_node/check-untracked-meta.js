// @spec-source → PROG-2-9153（網頁版資源 404 根治）
// 檢查 git 追蹤的 assets 資源檔與資料夾，其 .meta 是否也有進版控。
// 為什麼：.meta 沒進版控時，乾淨工作樹建置每次都會重產 uuid；玩家瀏覽器若還拿著舊 config，
// 就會去要新建置已不存在的 uuid（issue #2319、#2223 的 404 根因）。
// 規則：assets 底下被追蹤的檔案或資料夾 X，必須同時追蹤 X.meta；點開頭的檔案（.ccignore 等）不需要。
// 用法：node tools_node/check-untracked-meta.js [--json]；有缺就 exit 1。
const cp = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function trackedAssets() {
    const out = cp.execFileSync('git', ['ls-files', '-z', '--', 'assets'], { cwd: ROOT, maxBuffer: 1 << 28 }).toString('utf8');
    return out.split('\0').filter(Boolean);
}

/** 回傳缺 .meta 的路徑（檔案與資料夾）。純函式，方便測試 */
function findMissingMeta(tracked) {
    const set = new Set(tracked);
    const needs = new Set();
    for (const p of tracked) {
        if (p.endsWith('.meta')) continue;
        const parts = p.split('/');
        if (parts.some((seg) => seg.startsWith('.'))) continue; // 隱藏檔不被 Cocos 匯入
        needs.add(p);
        // 祖先資料夾（assets 本身除外）
        for (let i = 2; i < parts.length; i++) needs.add(parts.slice(0, i).join('/'));
    }
    return [...needs].filter((p) => !set.has(`${p}.meta`)).sort();
}

function main() {
    const missing = findMissingMeta(trackedAssets());
    if (process.argv.includes('--json')) {
        console.log(JSON.stringify({ missing }, null, 2));
    } else if (missing.length === 0) {
        console.log('[check-untracked-meta] OK：assets 底下所有被追蹤的資源都有對應的 .meta');
    } else {
        console.error(`[check-untracked-meta] 有 ${missing.length} 個資源缺 .meta（沒進版控會讓每次建置 uuid 重產，網頁版 404）：`);
        for (const p of missing.slice(0, 50)) console.error(`  ${p}.meta`);
        if (missing.length > 50) console.error(`  ...另外 ${missing.length - 50} 個`);
        console.error('修法：用 Cocos 編輯器開專案讓它產生 .meta，再 git add 這些 .meta（不要刪掉重產，否則引用會斷）。');
    }
    process.exit(missing.length === 0 ? 0 : 1);
}

if (require.main === module) main();
module.exports = { findMissingMeta };
