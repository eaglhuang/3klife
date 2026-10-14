/**
 * run-cli.ts — CLI 直接入口（由 tools/run-tests.js 以 ts-node 執行）
 *
 * 此檔案不依賴任何 Cocos 模組，僅串接純邏輯測試 + DeprecatedApiScanner。
 * 用途：在 CI 或開發機上不開 Cocos Editor 即可快速執行測試。
 *
 * 注意：path 以 require() 坐落在 async IIFE 內部，避免 Cocos Creator
 *        在編譯時將頂層 import 要求載入 Node.js 內建模組導致場景錯誤。
 */
import { TestRunner } from './TestRunner';
import { createDeprecatedApiSuite } from './DeprecatedApiScanner';

/**
 * 只在 Node.js CLI 環境（ts-node）下執行。
 * 在 Cocos Creator 預覽環境（Electron）中，`window` 是全域物件 → 跳過 IIFE，
 * 避免 process.exit() 殺掉 Cocos 的 Electron 預覽進程導致場景永遠卡在 loading。
 *
 * Unity 對照：相當於 #if UNITY_EDITOR 條件編譯，讓程式碼只在編輯器工具鏈中執行。
 */
if (typeof window === 'undefined') {
(async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    const runner = new TestRunner();

    // 自動掃描 tests/*.test.ts 與 tests/ucuf/*.test.ts：模組匯出的 create*Suite() 一律註冊。
    // 新增測試檔不必再改本檔（避免多條 PR 同時在此追加而互相衝突）。
    // Unity 對照：像 Test Runner 自動蒐集 [Test] 屬性，不用手動登記。
    // 刻意不註冊的檔案列在 SKIP（沿用原本未登記的狀態，不改變既有測試數）。
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    const SKIP = new Set<string>([
        'BattleCombatRegression', 'BattleSkillProfileAutoTargeting',
        'BattleSkillSourceTranslator', 'ResultPopup', 'UISpecParser',
        'ucuf/assetEvictionClosedLoop', 'ucuf/editableTextPanel', 'ucuf/sceneSwitchDispose.integration',
        'ucuf/specVersionDegradation', 'ucuf/validateTaskCardCli',
    ]);
    const discovered: string[] = [];
    for (const dir of ['', 'ucuf']) {
        const abs = path.join(__dirname, dir);
        for (const f of fs.readdirSync(abs).sort()) {
            if (!f.endsWith('.test.ts')) continue;
            const key = (dir ? dir + '/' : '') + f.replace(/\.test\.ts$/, '');
            if (SKIP.has(key) || f.startsWith('atm-lang-')) continue;
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const mod = require(path.join(abs, f));
            const factories = Object.keys(mod).filter(k => /^create.*Suite$/.test(k) && typeof mod[k] === 'function');
            if (factories.length === 0) continue;
            for (const k of factories) runner.register(mod[k]());
            discovered.push(key);
        }
    }

    // Deprecated API 靜態掃描
    // __dirname = tests/  →  ../ = 專案根目錄
    const projectRoot = path.resolve(__dirname, '..');
    runner.register(createDeprecatedApiSuite({
        scanRoots: [
            path.join(projectRoot, 'assets/scripts'),  // 遊戲邏輯腳本
            path.join(projectRoot, 'extensions'),       // 編輯器擴充套件 .ts
            path.join(projectRoot, 'tools'),            // 工具腳本 .ts
        ],
        relativeBase: projectRoot,  // violation 路徑與 whitelist 均相對此目錄
    }));

    // --layer N 过濾：只執行指定 層的 suite
    const layerArg = process.argv.find(a => a.startsWith('--layer=') || a === '--layer');
    let layerFilter: 1 | 2 | 3 | undefined;
    if (layerArg) {
        const raw = layerArg.includes('=') ? layerArg.split('=')[1] : process.argv[process.argv.indexOf(layerArg) + 1];
        const n = Number(raw);
        if (n === 1 || n === 2 || n === 3) layerFilter = n;
    }

    const summary = await runner.runAll(layerFilter);

    // CLI 退出碼：有失敗 → 非 0（可被 CI 捕捉）
    process.exit(summary.failed > 0 ? 1 : 0);
})();
} // end: typeof window === 'undefined' guard
