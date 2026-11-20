// @spec-source → PROG-2-9153（網頁版資源 404 根治：發版後玩家不會拿到舊 config）
// 建置後處理：把網頁版入口檔都改成「檔名帶建置編號」，並讓 index.html 開機時先向 version.json 問最新編號。
//
// 為什麼：GitHub Pages 對每個檔案都送 Cache-Control: max-age=600（無法自訂標頭）。
// 發版後 10 分鐘內，玩家可能拿到舊的 settings.json／bundle config.json（或舊 index.html），
// 去要新建置裡已不存在的檔案而 404。做法：
//   1. src/settings.json → src/settings.<id>.json（application.js 的 settingsPath 同步改）
//   2. application.js → application.<id>.js、index.js → index.<id>.js（index.js 內的 import 同步改）
//   3. 每個 bundle 的 config.json／index.js 改名為 config.<id>.json／index.<id>.js，
//      並在 settings 的 bundleVers 登記編號，引擎就會去要帶編號的檔名
//   4. 寫 version.json；index.html 的啟動段改成「先抓 version.json?_=時間（每次不同網址，一定打到網路）
//      取得最新編號再啟動」；抓不到就用燒進 html 的編號。就算玩家拿到快取的舊 index.html，也會啟動最新版。
//
// 用法：node tools_node/stamp-web-build.js [--dir build/web-desktop] [--id <編號，預設 git 短 SHA>]
// 發版時放在「建置完成」之後、「本機實玩／複製到 Pages」之前。重跑會拒絕（已蓋過章）。
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

function argValue(argv, name, fallback) {
    const i = argv.indexOf(name);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
}

function defaultId() {
    return cp.execFileSync('git', ['rev-parse', '--short=9', 'HEAD'], { cwd: path.resolve(__dirname, '..') }).toString().trim();
}

function renameFile(dir, from, to) {
    const src = path.join(dir, from);
    if (!fs.existsSync(src)) throw new Error(`找不到 ${from}（${dir} 不是未蓋章的 web-desktop 建置？）`);
    fs.renameSync(src, path.join(dir, to));
}

function replaceOnce(text, from, to, what) {
    if (!text.includes(from)) throw new Error(`${what}：找不到 ${from}`);
    return text.replace(from, to);
}

/** 對建置資料夾蓋章；回傳改名的清單（測試與日誌用） */
function stampWebBuild(dir, id) {
    if (!/^[0-9a-zA-Z._-]+$/.test(id)) throw new Error(`建置編號只能含英數與 ._-：${id}`);
    if (fs.existsSync(path.join(dir, 'version.json'))) throw new Error('這個建置已經蓋過章（version.json 已存在）');
    const renamed = [];
    const ren = (from, to) => { renameFile(dir, from, to); renamed.push(`${from} -> ${to}`); };

    // 1. bundle：config.json、index.js 帶編號，並登記 bundleVers
    const bundleVers = {};
    const assetsDir = path.join(dir, 'assets');
    for (const name of fs.readdirSync(assetsDir)) {
        const bundleDir = path.join(assetsDir, name);
        if (!fs.statSync(bundleDir).isDirectory() || !fs.existsSync(path.join(bundleDir, 'config.json'))) continue;
        renameFile(bundleDir, 'config.json', `config.${id}.json`);
        renamed.push(`assets/${name}/config.json`);
        if (fs.existsSync(path.join(bundleDir, 'index.js'))) {
            renameFile(bundleDir, 'index.js', `index.${id}.js`);
            renamed.push(`assets/${name}/index.js`);
        }
        bundleVers[name] = id;
    }
    if (Object.keys(bundleVers).length === 0) throw new Error('assets 底下找不到任何 bundle');

    // 2. settings：登記 bundleVers 後改名
    const settingsPath = path.join(dir, 'src', 'settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    settings.assets.bundleVers = { ...(settings.assets.bundleVers || {}), ...bundleVers };
    fs.writeFileSync(settingsPath, JSON.stringify(settings));
    renameFile(path.join(dir, 'src'), 'settings.json', `settings.${id}.json`);
    renamed.push('src/settings.json');

    // 3. application.js、index.js（入口）
    const appPath = path.join(dir, 'application.js');
    fs.writeFileSync(appPath, replaceOnce(fs.readFileSync(appPath, 'utf8'), "'src/settings.json'", `'src/settings.${id}.json'`, 'application.js'));
    ren('application.js', `application.${id}.js`);
    const indexJsPath = path.join(dir, 'index.js');
    fs.writeFileSync(indexJsPath, replaceOnce(fs.readFileSync(indexJsPath, 'utf8'), '"./application.js"', `"./application.${id}.js"`, 'index.js'));
    ren('index.js', `index.${id}.js`);

    // 4. version.json 與 index.html 啟動段
    fs.writeFileSync(path.join(dir, 'version.json'), JSON.stringify({ id }) + '\n');
    const htmlPath = path.join(dir, 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const bootRe = /<script>\s*System\.import\('\.\/index\.js'\)[\s\S]*?<\/script>/;
    if (!bootRe.test(html)) throw new Error("index.html：找不到 System.import('./index.js') 啟動段");
    const boot = `<script>
    // PROG-2-9153：Pages 檔案快取 10 分鐘，舊 index.html 也要能啟動最新版，所以先問 version.json（網址每次不同，一定打到網路）
    (function () {
        var baked = ${JSON.stringify(id)};
        var started = false;
        function start(id) {
            if (started) return;
            started = true;
            System.import('./index.' + id + '.js').catch(function (err) { console.error(err); });
        }
        var timer = setTimeout(function () { start(baked); }, 3000);
        fetch('version.json?_=' + Date.now(), { cache: 'no-store' })
            .then(function (r) { return r.json(); })
            .then(function (v) { clearTimeout(timer); start(v && v.id ? v.id : baked); })
            .catch(function () { clearTimeout(timer); start(baked); });
    })();
</script>`;
    fs.writeFileSync(htmlPath, html.replace(bootRe, () => boot));
    return { id, bundles: Object.keys(bundleVers), renamed };
}

function main() {
    const argv = process.argv.slice(2);
    const dir = path.resolve(argValue(argv, '--dir', 'build/web-desktop'));
    const id = argValue(argv, '--id', '') || defaultId();
    const result = stampWebBuild(dir, id);
    console.log(`[stamp-web-build] 完成：id=${result.id}，bundle=${result.bundles.join(',')}，改名 ${result.renamed.length} 個檔案`);
}

if (require.main === module) {
    try { main(); } catch (e) { console.error(`[stamp-web-build] 失敗：${e.message}`); process.exit(1); }
}
module.exports = { stampWebBuild };
