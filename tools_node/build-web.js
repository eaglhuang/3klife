#!/usr/bin/env node
/**
 * build-web.js — 用 Cocos Creator 命令列建置 Web 版（不需要操作編輯器視窗）
 *
 * Unity 對照：等同 `Unity.exe -batchmode -quit -buildTarget WebGL`。
 *
 * 用法：
 *   node tools_node/build-web.js
 *   node tools_node/build-web.js --creator "C:/ProgramData/cocos/editors/Creator/3.8.8/CocosCreator.exe"
 *   node tools_node/build-web.js --platform web-mobile --release
 *   node tools_node/build-web.js --dry-run        # 只印出將執行的命令
 *
 * 環境變數：COCOS_CREATOR_PATH（等同 --creator）
 *
 * 輸出：build/<platform>/index.html（build/ 已在 .gitignore）
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');

// Cocos Creator 命令列建置成功時可能回傳 36（官方文件：36 = 建置成功），因此不能只看 0。
const SUCCESS_EXIT_CODES = new Set([0, 36]);

function parseArgs(argv) {
    const args = { flags: new Set(), values: {} };
    for (let i = 0; i < argv.length; i++) {
        const token = argv[i];
        if (!token.startsWith('--')) continue;
        const key = token.slice(2);
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith('--')) {
            args.values[key] = next;
            i++;
        } else {
            args.flags.add(key);
        }
    }
    return args;
}

function readCreatorVersion() {
    try {
        const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
        return (pkg.creator && pkg.creator.version) || '3.8.8';
    } catch (_error) {
        return '3.8.8';
    }
}

function candidateCreatorPaths(version) {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    return [
        process.env.COCOS_CREATOR_PATH,
        `C:/ProgramData/cocos/editors/Creator/${version}/CocosCreator.exe`,
        `D:/ProgramData/cocos/editors/Creator/${version}/CocosCreator.exe`,
        `C:/Program Files/Cocos/Creator/${version}/CocosCreator.exe`,
        `/Applications/Cocos/Creator/${version}/CocosCreator.app/Contents/MacOS/CocosCreator`,
        path.join(home, `AppData/Local/Programs/CocosCreator/${version}/CocosCreator.exe`),
    ].filter(Boolean);
}

function resolveCreatorPath(explicit, version) {
    const candidates = explicit ? [explicit] : candidateCreatorPaths(version);
    const found = candidates.find((candidate) => fs.existsSync(candidate));
    return { found: found || null, candidates };
}

function buildOptionString(options) {
    return Object.entries(options).map(([key, value]) => `${key}=${value}`).join(';');
}

function main() {
    const { flags, values } = parseArgs(process.argv.slice(2));
    const version = readCreatorVersion();
    const platform = values.platform || 'web-desktop';
    const release = flags.has('release');
    const outputName = values.outputName || platform;

    const buildOptions = {
        platform,
        debug: release ? 'false' : 'true',
        buildPath: 'build',
        outputName,
    };
    const optionString = buildOptionString(buildOptions);

    const { found, candidates } = resolveCreatorPath(values.creator, version);
    const command = found || '<CocosCreator 執行檔>';
    const commandArgs = ['--project', projectRoot, '--build', optionString];

    console.log(`[build-web] Cocos Creator ${version}，platform=${platform}，debug=${buildOptions.debug}`);
    console.log(`[build-web] ${command} ${commandArgs.map((arg) => JSON.stringify(arg)).join(' ')}`);

    if (flags.has('dry-run')) {
        return 0;
    }
    if (!found) {
        console.error('[build-web] 找不到 Cocos Creator 執行檔，已嘗試：');
        candidates.forEach((candidate) => console.error(`  - ${candidate}`));
        console.error('[build-web] 請用 --creator <路徑> 或環境變數 COCOS_CREATOR_PATH 指定。');
        return 2;
    }

    const outDir = path.join(projectRoot, 'build', outputName);
    const result = spawnSync(found, commandArgs, { stdio: 'inherit', cwd: projectRoot });

    if (result.error) {
        console.error(`[build-web] 無法啟動 Cocos Creator：${result.error.message}`);
        return 2;
    }
    if (!SUCCESS_EXIT_CODES.has(result.status)) {
        console.error(`[build-web] 建置失敗，exit code=${result.status}`);
        return 1;
    }
    // 退出碼不可靠時，以輸出檔是否存在為準
    if (!fs.existsSync(path.join(outDir, 'index.html'))) {
        console.error(`[build-web] exit code=${result.status}，但找不到 ${path.join(outDir, 'index.html')}，視為建置失敗`);
        return 1;
    }
    console.log(`[build-web] 建置完成：${outDir}`);
    return 0;
}

process.exit(main());
