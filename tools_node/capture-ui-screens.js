#!/usr/bin/env node
/**
 * capture-ui-screens.js
 *
 * 任務：自動化擷取 D 階段 UI 截圖（headless）。
 *
 * 用法：
 *   node tools_node/capture-ui-screens.js
 *   node tools_node/capture-ui-screens.js --target LobbyMain
 *   node tools_node/capture-ui-screens.js --target Gacha --outDir artifacts/ui-qa/UI-2-0023
 *   node tools_node/capture-ui-screens.js --browser "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
 *   node tools_node/capture-ui-screens.js --target CharacterDs3 --viewport 1920x1128 --maxWidth 0
 *   node tools_node/capture-ui-screens.js --formal-screen-id gacha-ds3 --viewport 1920x1080
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const { execSync } = require('child_process');
const { writeRuntimeVerdictCaptureResult } = require('./lib/ui-factory-manifest-validator');
const browserCaptureCore = require('./lib/browser-capture-core');

const targets = [
    { id: 'LobbyMain', screenId: 'lobby-main-screen', targetIndex: 1, uiSourceDir: 'lobby-main', runtimeScreenId: 'LobbyMain' },
    { id: 'ShopMain', screenId: 'shop-main-screen', targetIndex: 2, uiSourceDir: 'shop-main', runtimeScreenId: 'ShopMain' },
    { id: 'GachaDs3Formal', screenId: 'gacha-ds3', targetIndex: 3, formalScreenId: 'gacha-ds3', captureMode: 'formal-html-to-ucuf', uiSourceDir: 'gacha-main', runtimeScreenId: 'gacha-ds3' },
    { id: 'Gacha', screenId: 'gacha-ds3', targetIndex: 3, uiSourceDir: 'gacha-main', runtimeScreenId: 'GachaMain' },
    { id: 'GachaFromLobby', screenId: 'gacha-ds3', targetIndex: 17, uiSourceDir: 'gacha-main', runtimeScreenId: 'GachaMain' },
    { id: 'CharacterDs3', screenId: 'character-ds3-main', targetIndex: 18, previewVariant: 'zhang-fei', uiSourceDir: 'character-ds3', runtimeScreenId: 'character-ds3-main' },
    { id: 'GachaHero', screenId: 'gacha-ds3', targetIndex: 3, previewVariant: 'hero' },
    { id: 'GachaSupport', screenId: 'gacha-ds3', targetIndex: 3, previewVariant: 'support' },
    { id: 'GachaLimited', screenId: 'gacha-ds3', targetIndex: 3, previewVariant: 'limited' },
    { id: 'GachaPullResult', screenId: 'gacha-pull-result', targetIndex: 22, uiSourceDir: 'gacha-pull-result', runtimeScreenId: 'GachaPullResult' },
    { id: 'DuelChallenge', screenId: 'duel-challenge-screen', targetIndex: 4 },
    { id: 'BattleScene', screenId: 'battle-scene', targetIndex: 5, uiSourceDir: 'battle-hud', runtimeScreenId: 'BattleHUD' },
    { id: 'GeneralDetailOverview', screenId: 'general-detail-unified-screen', targetIndex: 6, uiVariant: 'unified', uiSourceDir: 'general-detail-overview', runtimeScreenId: 'GeneralDetailOverview' },
    { id: 'GeneralDetailOverviewProd', screenId: 'general-detail-unified-screen', targetIndex: 6, previewVariant: 'zhang-fei', uiSourceDir: 'character-ds3', runtimeScreenId: 'character-ds3-main' },
    { id: 'GeneralDetailOverviewDs3', screenId: 'general-detail-unified-screen', targetIndex: 6, uiVariant: 'ds3', previewVariant: 'zhang-fei', uiSourceDir: 'character-ds3', runtimeScreenId: 'character-ds3-main' },
    // Product flow parity: LobbyScene btnGenerals -> GeneralList -> select general -> Character DS3 screen host.
    { id: 'GeneralDetailFromLobbyGeneralsButton', screenId: 'character-ds3-main', targetIndex: 19, uiVariant: 'ds3', previewVariant: 'zhang-fei', uiSourceDir: 'character-ds3', runtimeScreenId: 'character-ds3-main' },
    { id: 'GeneralDetailSkills', screenId: 'general-detail-unified-screen', targetIndex: 12, uiVariant: 'unified', uiSourceDir: 'general-detail-skills', runtimeScreenId: 'GeneralDetailSkills' },
    { id: 'GeneralDetailSkillsDs3', screenId: 'general-detail-unified-screen', targetIndex: 12, uiVariant: 'ds3', previewVariant: 'zhang-fei', uiSourceDir: 'character-ds3', runtimeScreenId: 'character-ds3-main' },
    { id: 'GeneralDetailStats', screenId: 'general-detail-unified-screen', targetIndex: 13, uiVariant: 'unified', uiSourceDir: 'general-detail-stats', runtimeScreenId: 'GeneralDetailStats' },
    { id: 'GeneralDetailStatsDs3', screenId: 'general-detail-unified-screen', targetIndex: 13, uiVariant: 'ds3', previewVariant: 'zhang-fei', uiSourceDir: 'character-ds3', runtimeScreenId: 'character-ds3-main' },
    { id: 'GeneralDetailBloodline', screenId: 'general-detail-unified-screen', targetIndex: 14, uiVariant: 'unified', uiSourceDir: 'general-detail-bloodline', runtimeScreenId: 'GeneralDetailBloodline' },
    { id: 'GeneralDetailBloodlineDs3', screenId: 'general-detail-unified-screen', targetIndex: 14, uiVariant: 'ds3', previewVariant: 'zhang-fei', uiSourceDir: 'character-ds3', runtimeScreenId: 'character-ds3-main' },
    { id: 'GeneralDetailBasics', screenId: 'general-detail-unified-screen', targetIndex: 15, uiVariant: 'unified', uiSourceDir: 'general-detail-basics', runtimeScreenId: 'GeneralDetailBasics' },
    { id: 'GeneralDetailBasicsDs3', screenId: 'general-detail-unified-screen', targetIndex: 15, uiVariant: 'ds3', previewVariant: 'zhang-fei', uiSourceDir: 'character-ds3', runtimeScreenId: 'character-ds3-main' },
    { id: 'GeneralDetailAptitude', screenId: 'general-detail-unified-screen', targetIndex: 16, uiVariant: 'unified', uiSourceDir: 'general-detail-aptitude', runtimeScreenId: 'GeneralDetailAptitude' },
    { id: 'GeneralDetailAptitudeDs3', screenId: 'general-detail-unified-screen', targetIndex: 16, uiVariant: 'ds3', previewVariant: 'zhang-fei', uiSourceDir: 'character-ds3', runtimeScreenId: 'character-ds3-main' },
    { id: 'GeneralDetailOverviewZhenJi', screenId: 'general-detail-unified-screen', targetIndex: 6, uiVariant: 'unified', previewVariant: 'zhen-ji', uiSourceDir: 'general-detail-overview', runtimeScreenId: 'GeneralDetailOverview' },
    { id: 'GeneralDetailBloodlineV3', screenId: 'general-detail-bloodline-v3-screen', targetIndex: 6, uiSourceDir: 'general-detail-bloodline-v3', runtimeScreenId: 'GeneralDetailBloodlineV3', hiddenAlias: true },
    { id: 'SpiritTallyDetail', screenId: 'spirit-tally-detail-screen', targetIndex: 7, uiSourceDir: 'spirit-tally-detail', runtimeScreenId: 'SpiritTallyDetail' },
    { id: 'GeneralList', screenId: 'general-list-screen', targetIndex: 8, uiSourceDir: 'general-list', runtimeScreenId: 'GeneralList' },
    { id: 'GeneralListNpcDialogueDev', screenId: 'general-list-screen', targetIndex: 21, previewVariant: 'zhang-fei', uiSourceDir: 'general-list', runtimeScreenId: 'GeneralListNpcDialogueDev' },
    { id: 'EliteTroopCodex', screenId: 'elite-troop-codex-screen', targetIndex: 9, uiSourceDir: 'elite-troop-codex', runtimeScreenId: 'EliteTroopCodex' },
];

function resolveLoadingSceneUuid() {
    const metaPath = path.join(__dirname, '..', 'assets', 'scenes', 'LoadingScene.scene.meta');
    if (!fs.existsSync(metaPath)) {
        return '';
    }

    try {
        const raw = fs.readFileSync(metaPath, 'utf8').replace(/^\uFEFF/, '');
        const meta = JSON.parse(raw);
        return typeof meta.uuid === 'string' ? meta.uuid : '';
    } catch (error) {
        console.warn('[capture-ui-screens] 無法讀取 LoadingScene.scene.meta uuid:', error);
        return '';
    }
}

function parseArg(name, fallback = '') {
    const index = process.argv.indexOf(`--${name}`);
    if (index < 0 || index + 1 >= process.argv.length) {
        return fallback;
    }
    return process.argv[index + 1];
}

function parseAnyArg(names, fallback = '') {
    for (const name of names) {
        const value = parseArg(name, '');
        if (value) return value;
    }
    return fallback;
}

function hasFlag(name) {
    return process.argv.includes(`--${name}`);
}

function sanitizeFileStem(value) {
    return String(value || 'screen')
        .trim()
        .replace(/[^a-z0-9._-]+/gi, '-')
        .replace(/^-+|-+$/g, '') || 'screen';
}

function buildFormalTarget(screenId, explicitId) {
    const id = sanitizeFileStem(explicitId || screenId);
    return {
        id,
        screenId,
        runtimeScreenId: screenId,
        targetIndex: 0,
        formalScreenId: screenId,
        captureMode: 'formal-html-to-ucuf',
        uiSourceDir: '',
    };
}

function sha256File(filePath) {
    return 'sha256:' + crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function readPngSize(filePath) {
    try {
        const buffer = fs.readFileSync(filePath);
        if (buffer.length < 24) return null;
        const signature = buffer.subarray(0, 8).toString('hex');
        if (signature !== '89504e470d0a1a0a') return null;
        return {
            width: buffer.readUInt32BE(16),
            height: buffer.readUInt32BE(20),
        };
    } catch {
        return null;
    }
}

function buildRuntimeSpecHashes(screenId) {
    const base = path.join(__dirname, '..', 'assets', 'resources', 'ui-spec');
    const paths = {
        screen: path.join(base, 'screens', `${screenId}.json`),
        layout: path.join(base, 'layouts', `${screenId}.json`),
        skin: path.join(base, 'skins', `${screenId}.skin.json`),
        runtimeVersion: path.join(base, 'screens', `${screenId}.runtime-version.json`),
    };
    const hashes = {};
    for (const [key, filePath] of Object.entries(paths)) {
        hashes[key] = fs.existsSync(filePath) ? sha256File(filePath) : null;
    }
    return hashes;
}

function readJsonIfExists(filePath) {
    const full = path.resolve(filePath);
    if (!fs.existsSync(full)) return null;
    try {
        return JSON.parse(fs.readFileSync(full, 'utf8').replace(/^\uFEFF/, ''));
    } catch {
        return null;
    }
}

function resolveUiVersionForTarget(target, explicitVersion) {
    if (explicitVersion && explicitVersion.trim()) return explicitVersion.trim();
    const runtimeScreenId = target.runtimeScreenId || target.screenId || target.id;
    const versionPath = path.join(__dirname, '..', 'assets', 'resources', 'ui-spec', 'screens', `${runtimeScreenId}.runtime-version.json`);
    const payload = readJsonIfExists(versionPath);
    if (payload && typeof payload.uiVersion === 'string' && payload.uiVersion.trim()) {
        return payload.uiVersion.trim();
    }
    return '';
}

function parseViewport(value, fallback = { width: 1920, height: 1080 }) {
    const match = String(value || '').trim().match(/^(\d+)x(\d+)$/i);
    if (!match) {
        return fallback;
    }
    const width = Number(match[1]);
    const height = Number(match[2]);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        return fallback;
    }
    return { width, height };
}

function readBattleTacticArg() {
    return parseArg('battleTactic', '').trim();
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(task, timeoutMs, label) {
    return Promise.race([
        task,
        new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`TimeoutError: ${label} exceeded ${timeoutMs}ms`)), timeoutMs);
        }),
    ]);
}

function requestUrl(url) {
    const client = url.startsWith('https:') ? https : http;
    return new Promise((resolve, reject) => {
        const req = client.get(url, (response) => {
            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => {
                resolve({
                    statusCode: response.statusCode ?? 0,
                    body: Buffer.concat(chunks).toString('utf8'),
                });
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function triggerEditorRefresh(baseUrl) {
    const refreshUrl = new URL('/asset-db/refresh', baseUrl).toString();
    const response = await requestUrl(refreshUrl);
    if (response.statusCode >= 400) {
        throw new Error(`asset-db refresh failed (${response.statusCode}): ${response.body.slice(0, 200)}`);
    }
    return response.body;
}

function resolveBrowserExecutable(customPath) {
    if (customPath && fs.existsSync(customPath)) {
        return customPath;
    }

    const candidates = [];
    if (process.platform === 'win32') {
        candidates.push(
            'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
            'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
            'C:/Program Files/Google/Chrome/Application/chrome.exe',
            'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
        );
    } else if (process.platform === 'darwin') {
        candidates.push(
            '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        );
    } else {
        candidates.push('/usr/bin/microsoft-edge', '/usr/bin/google-chrome', '/usr/bin/chromium-browser');
    }

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    return '';
}

function selectTargets(targetId) {
    if (!targetId) {
        return targets.filter(t => !t.hiddenAlias);
    }
    const selected = targets.find(t => t.id.toLowerCase() === targetId.toLowerCase());
    if (!selected) {
        throw new Error(`未知 target: ${targetId}，可用值: ${targets.map(t => t.id).join(', ')}`);
    }
    return [selected];
}

function buildPublicTargets() {
    return targets
        .filter((target) => !target.hiddenAlias)
        .map((target) => ({
            id: target.id,
            screenId: target.screenId,
            runtimeScreenId: target.runtimeScreenId || null,
            targetIndex: target.targetIndex,
            formalScreenId: target.formalScreenId || null,
            captureMode: target.captureMode || 'legacy-preview-target',
            uiSourceDir: target.uiSourceDir || null,
        }));
}

function printTargetList(jsonOutput) {
    const payload = {
        version: '1.0.0',
        mode: 'capture-ui-screens-target-list',
        canonicalWrites: false,
        count: buildPublicTargets().length,
        targets: buildPublicTargets(),
    };

    if (jsonOutput) {
        process.stdout.write(`${JSON.stringify(payload)}\n`);
        return;
    }

    console.log('# capture-ui-screens target list');
    for (const target of payload.targets) {
        console.log(`- ${target.id} (screenId=${target.screenId}, runtime=${target.runtimeScreenId || '-'})`);
    }
}

function buildPrecheckCheck(name, ok, detail, extra = {}) {
    return {
        name,
        status: ok ? 'pass' : 'fail',
        detail,
        ...extra,
    };
}

async function runTwoLayerPrecheck({
    baseUrl,
    browserExecutable,
    selectedTargets,
    requestedTargetId,
    formalScreenId,
    timeoutMs,
}) {
    const checks = [];
    checks.push(
        buildPrecheckCheck(
            'browser-executable',
            Boolean(browserExecutable),
            browserExecutable || 'no browser executable found',
            { executablePath: browserExecutable || null },
        ),
    );

    checks.push(
        buildPrecheckCheck(
            'target-selection',
            Array.isArray(selectedTargets) && selectedTargets.length > 0,
            Array.isArray(selectedTargets) && selectedTargets.length > 0
                ? `targets=${selectedTargets.map((target) => target.id).join(',')}`
                : 'no target selected',
            {
                requestedTargetId: requestedTargetId || null,
                formalScreenId: formalScreenId || null,
                selectedTargetIds: Array.isArray(selectedTargets) ? selectedTargets.map((target) => target.id) : [],
            },
        ),
    );

    try {
        const response = await withTimeout(
            requestUrl(baseUrl),
            Math.max(timeoutMs, 1000),
            'capture-ui-screens precheck host',
        );
        const reachable = response.statusCode > 0 && response.statusCode < 500;
        checks.push(
            buildPrecheckCheck(
                'editor-host',
                reachable,
                reachable
                    ? `reachable status=${response.statusCode}`
                    : `unreachable status=${response.statusCode}`,
                {
                    url: baseUrl,
                    httpStatus: response.statusCode,
                },
            ),
        );
    } catch (error) {
        checks.push(
            buildPrecheckCheck(
                'editor-host',
                false,
                `request failed: ${String(error)}`,
                {
                    url: baseUrl,
                    httpStatus: 0,
                },
            ),
        );
    }

    const ok = checks.every((item) => item.status === 'pass');
    return {
        version: '1.0.0',
        mode: 'capture-ui-screens-precheck',
        canonicalWrites: false,
        generatedAt: new Date().toISOString(),
        ok,
        checks,
        inputs: {
            baseUrl,
            requestedTargetId: requestedTargetId || null,
            formalScreenId: formalScreenId || null,
            targetCount: Array.isArray(selectedTargets) ? selectedTargets.length : 0,
        },
    };
}

function emitPrecheckReport(report, jsonOutput) {
    if (jsonOutput) {
        process.stdout.write(`${JSON.stringify(report)}\n`);
        return;
    }

    console.log('[capture-ui-screens] precheck summary');
    for (const item of report.checks || []) {
        console.log(`- [${item.status}] ${item.name}: ${item.detail}`);
    }
    console.log(`[capture-ui-screens] precheck result: ${report.ok ? 'PASS' : 'FAIL'}`);
}

function createPageDiagnostics(page) {
    const diagnostics = {
        console: [],
        pageErrors: [],
        requestFailures: [],
    };

    page.on('console', (message) => {
        const type = message.type();
        if (type !== 'warning' && type !== 'warn' && type !== 'error') {
            return;
        }

        diagnostics.console.push({
            type,
            text: message.text(),
        });
    });

    page.on('pageerror', (error) => {
        diagnostics.pageErrors.push(String(error));
    });

    page.on('requestfailed', (request) => {
        diagnostics.requestFailures.push({
            url: request.url(),
            method: request.method(),
            failure: request.failure()?.errorText ?? 'unknown',
        });
    });

    return diagnostics;
}

function summarizeBodyText(bodyText) {
    return String(bodyText || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 300);
}

/**
 * 這是 capture 階段的安全縮圖，不等於最終 view_image 讀圖尺寸。
 * 使用 PowerShell System.Drawing，不需要額外 npm 依賴。
 * maxWidth=0 代表跳過縮圖；formal-html-to-ucuf 截圖會強制保留 full-size，避免污染 95% gate。
 */
function resizePng(filePath, maxWidth) {
    if (!maxWidth || maxWidth <= 0) {
        return { attempted: false, resized: false, maxWidth: 0 };
    }
    const before = readPngSize(filePath);
    const fp = filePath.replace(/'/g, "''"); // escape single quotes for PS string
    const ps = [
        'Add-Type -AssemblyName System.Drawing',
        `$fp = '${fp}'`,
        '$src = [System.Drawing.Image]::FromFile($fp)',
        '$w = $src.Width; $h = $src.Height',
        `if ($w -le ${maxWidth}) { $src.Dispose(); exit 0 }`,
        `$scale = ${maxWidth} / [double]$w`,
        `$nw = ${maxWidth}; $nh = [int]($h * $scale)`,
        '$dst = New-Object System.Drawing.Bitmap $nw, $nh',
        '$g = [System.Drawing.Graphics]::FromImage($dst)',
        '$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic',
        '$g.DrawImage($src, 0, 0, $nw, $nh)',
        '$g.Dispose(); $src.Dispose()',
        '$dst.Save($fp, [System.Drawing.Imaging.ImageFormat]::Png)',
        '$dst.Dispose()',
    ].join('\n');
    try {
        execSync('powershell -NoProfile -NonInteractive -Command -', { input: ps, timeout: 15000 });
        const after = readPngSize(filePath);
        const resized = Boolean(before && after && (before.width !== after.width || before.height !== after.height));
        if (resized) {
            console.log(`[capture-ui-screens] resized to max ${maxWidth}px wide: ${path.basename(filePath)}`);
        }
        return { attempted: true, resized, maxWidth, before, after };
    } catch (err) {
        console.warn(`[capture-ui-screens] resize failed (non-fatal): ${err.message}`);
        return { attempted: true, resized: false, failed: true, maxWidth, before, error: err.message };
    }
}

function isFormalCaptureTarget(target) {
    return target && target.captureMode === 'formal-html-to-ucuf';
}

function resolveEffectiveMaxWidth(target, requestedMaxWidth) {
    if (isFormalCaptureTarget(target)) {
        if (requestedMaxWidth > 0) {
            console.warn(`[capture-ui-screens] ${target.id} is formal-html-to-ucuf; ignoring --maxWidth ${requestedMaxWidth} and keeping full-size output.`);
        }
        return 0;
    }
    return requestedMaxWidth;
}

async function collectBrowserViewportDiagnostics(page) {
    return page.evaluate(() => {
        const rectOf = (element) => {
            if (!element || !element.getBoundingClientRect) return null;
            const rect = element.getBoundingClientRect();
            return {
                x: Math.round(rect.x * 1000) / 1000,
                y: Math.round(rect.y * 1000) / 1000,
                width: Math.round(rect.width * 1000) / 1000,
                height: Math.round(rect.height * 1000) / 1000,
                top: Math.round(rect.top * 1000) / 1000,
                left: Math.round(rect.left * 1000) / 1000,
                right: Math.round(rect.right * 1000) / 1000,
                bottom: Math.round(rect.bottom * 1000) / 1000,
            };
        };
        const canvasEl = document.querySelector('canvas');
        const gameDiv = document.querySelector('#GameDiv');
        const cocosContainer = document.querySelector('#Cocos3dGameContainer');
        const styleOf = (element) => {
            if (!element) return null;
            const style = window.getComputedStyle(element);
            return {
                width: style.width,
                height: style.height,
                transform: style.transform,
                transformOrigin: style.transformOrigin,
                position: style.position,
            };
        };
        const canvasRect = rectOf(canvasEl || gameDiv);
        return {
            window: {
                innerWidth: window.innerWidth,
                innerHeight: window.innerHeight,
                devicePixelRatio: window.devicePixelRatio,
            },
            canvasRect,
            gameDivRect: rectOf(gameDiv),
            cocosContainerRect: rectOf(cocosContainer),
            gameDivStyle: styleOf(gameDiv),
            canvasStyle: styleOf(canvasEl),
            toolbarHeight: canvasRect ? Math.max(0, Math.round(canvasRect.top)) : 30,
        };
    });
}

async function collectRuntimeGeometry(page) {
    return page.evaluate(() => {
        const cc = window.cc;
        const scene = cc?.director?.getScene?.();
        const watchNames = [
            'Canvas',
            'UIScreenPreviewHost',
            '__safeArea',
            'GachaDs3',
            'GachaDs3_body',
            'GachaDs3_div_1',
            'BannerSlide_general',
            'BannerSlide_legendary',
            'BannerSlide_support',
            'skinLayer_GachaDs3_div_2',
            'skinLayer_GachaDs3_div_3',
            'skinLayer_GachaDs3_div_4',
            'skinLayer_GachaDs3_div_6',
            'skinLayer_GachaDs3_div_5_GachaDs3_div_6',
            'skinLayer_GachaDs3_div_12',
            'skinLayer_GachaDs3_div_16',
            'skinLayer_GachaDs3_div_15_GachaDs3_div_16',
            'skinLayer_GachaDs3_div_22',
            'skinLayer_GachaDs3_div_26',
            'skinLayer_GachaDs3_div_25_GachaDs3_div_26',
            'RightPanel',
            'GachaDs3_div_35',
            'GachaDs3_div_38',
            'GachaDs3_div_43',
            'GachaDs3_div_48',
        ];
        if (!scene || !cc) {
            return { ok: false, reason: 'scene-or-cc-unavailable', watchNames };
        }

        const round = (value) => {
            const number = Number(value);
            return Number.isFinite(number) ? Math.round(number * 1000) / 1000 : null;
        };
        const find = (name, root = scene) => {
            if (!root) return null;
            if (root.name === name) return root;
            for (const child of root.children || []) {
                const found = find(name, child);
                if (found) return found;
            }
            return null;
        };
        const vec = (value) => value ? { x: round(value.x), y: round(value.y), z: round(value.z) } : null;
        const size = (value) => value ? { width: round(value.width), height: round(value.height) } : null;
        const readWidget = (node) => {
            try {
                const widget = node.getComponent && node.getComponent('cc.Widget');
                if (!widget) return null;
                return {
                    enabled: Boolean(widget.enabled),
                    alignMode: widget.alignMode ?? null,
                    isAlignTop: Boolean(widget.isAlignTop),
                    isAlignBottom: Boolean(widget.isAlignBottom),
                    isAlignLeft: Boolean(widget.isAlignLeft),
                    isAlignRight: Boolean(widget.isAlignRight),
                    top: round(widget.top),
                    bottom: round(widget.bottom),
                    left: round(widget.left),
                    right: round(widget.right),
                };
            } catch {
                return null;
            }
        };
        const readOpacity = (node) => {
            try {
                const opacity = node.getComponent && node.getComponent('cc.UIOpacity');
                if (!opacity) return null;
                return {
                    enabled: Boolean(opacity.enabled),
                    opacity: round(opacity.opacity),
                };
            } catch {
                return null;
            }
        };
        const readSprite = (node) => {
            try {
                const sprite = node.getComponent && node.getComponent('cc.Sprite');
                if (!sprite) return null;
                const color = sprite.color || null;
                return {
                    enabled: Boolean(sprite.enabled),
                    type: sprite.type ?? null,
                    sizeMode: sprite.sizeMode ?? null,
                    color: color ? { r: round(color.r), g: round(color.g), b: round(color.b), a: round(color.a) } : null,
                    hasSpriteFrame: Boolean(sprite.spriteFrame),
                };
            } catch {
                return null;
            }
        };
        const readGradient = (node) => {
            try {
                const gradient = node.getComponent && node.getComponent('GradientBackground');
                if (!gradient) return null;
                return {
                    enabled: Boolean(gradient.enabled),
                    type: gradient._gradientType || null,
                    repeating: Boolean(gradient._repeating),
                    center: { x: round(gradient._radialCenterX), y: round(gradient._radialCenterY) },
                    radius: { x: round(gradient._radialRadiusX), y: round(gradient._radialRadiusY) },
                    repeatSpanPx: round(gradient._repeatSpanPx),
                    repeatSpanRatio: round(gradient._repeatSpanRatio),
                };
            } catch {
                return null;
            }
        };
        const readNode = (name) => {
            const node = find(name);
            if (!node) return { exists: false };
            const transform = node.getComponent && node.getComponent('cc.UITransform');
            const width = transform ? round(transform.width) : null;
            const height = transform ? round(transform.height) : null;
            const anchorX = transform ? round(transform.anchorX) : null;
            const anchorY = transform ? round(transform.anchorY) : null;
            let worldTopLeft = null;
            let worldBottomRight = null;
            try {
                if (transform && typeof transform.convertToWorldSpaceAR === 'function' && cc.Vec3 && width != null && height != null) {
                    worldTopLeft = vec(transform.convertToWorldSpaceAR(new cc.Vec3(-anchorX * width, (1 - anchorY) * height, 0)));
                    worldBottomRight = vec(transform.convertToWorldSpaceAR(new cc.Vec3((1 - anchorX) * width, -anchorY * height, 0)));
                }
            } catch {
                worldTopLeft = null;
                worldBottomRight = null;
            }
            return {
                exists: true,
                name: node.name,
                active: Boolean(node.active),
                activeInHierarchy: Boolean(node.activeInHierarchy ?? node.active),
                parent: node.parent ? node.parent.name : null,
                childNames: (node.children || []).slice(0, 24).map(child => child && child.name ? child.name : null).filter(Boolean),
                position: vec(node.position),
                worldPosition: vec(node.worldPosition),
                size: { width, height },
                anchor: { x: anchorX, y: anchorY },
                widget: readWidget(node),
                opacity: readOpacity(node),
                sprite: readSprite(node),
                gradient: readGradient(node),
                worldTopLeft,
                worldBottomRight,
            };
        };

        const nodes = {};
        for (const name of watchNames) nodes[name] = readNode(name);
        return {
            ok: true,
            sceneName: scene.name || null,
            designResolution: cc.view?.getDesignResolutionSize ? size(cc.view.getDesignResolutionSize()) : null,
            visibleSize: cc.view?.getVisibleSize ? size(cc.view.getVisibleSize()) : null,
            frameSize: cc.view?.getFrameSize ? size(cc.view.getFrameSize()) : null,
            viewScale: {
                x: round(cc.view?._scaleX),
                y: round(cc.view?._scaleY),
            },
            watchNames,
            nodes,
        };
    });
}

function buildCaptureProtocol(target, args) {
    const finalCompareViolations = [];
    if (isFormalCaptureTarget(target)) {
        if (args.effectiveMaxWidth > 0) {
            finalCompareViolations.push(`formal capture was resized with maxWidth=${args.effectiveMaxWidth}`);
        }
        if (!args.finalImageSize) {
            finalCompareViolations.push('unable to read final PNG dimensions');
        } else if (args.finalImageSize.width !== args.viewport.width || args.finalImageSize.height !== args.viewport.height) {
            finalCompareViolations.push(`final PNG dimensions ${args.finalImageSize.width}x${args.finalImageSize.height} do not match viewport ${args.viewport.width}x${args.viewport.height}`);
        }
    }
    return {
        captureMode: target.captureMode || 'legacy-preview-target',
        finalCompareIntent: isFormalCaptureTarget(target) ? 'formal-html-to-ucuf' : 'debug-preview',
        finalCompareEligible: isFormalCaptureTarget(target) ? finalCompareViolations.length === 0 : false,
        finalCompareViolations,
        viewport: {
            width: args.viewport.width,
            height: args.viewport.height,
            deviceScaleFactor: args.viewport.deviceScaleFactor || 1,
        },
        requestedMaxWidth: args.requestedMaxWidth,
        effectiveMaxWidth: args.effectiveMaxWidth,
        resize: args.resizeResult,
        screenshotClip: args.screenshotClip || null,
        toolbarHeight: args.toolbarHeight,
        imageSizeAfterScreenshot: args.imageSizeAfterScreenshot,
        finalImageSize: args.finalImageSize,
        browserViewport: args.browserViewport,
    };
}

function isRetryableCaptureError(error, debugState) {
    const message = String(error);
    const bodyText = debugState?.state?.bodyText ?? '';
    return message.includes('TimeoutError')
        || message.includes('Unable to resolve bare specifier')
        || bodyText.includes('Unable to resolve bare specifier')
        || bodyText.includes('Please open the console to see detailed errors');
}

async function waitForCaptureReady(page, screenId, timeoutMs) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
        let snapshot;
        try {
            snapshot = await page.evaluate(() => {
                const state = window.__UI_CAPTURE_STATE__ ?? null;
                const bodyText = document.body ? document.body.innerText : '';
                return {
                    state,
                    bodyText,
                };
            });
        } catch (error) {
            const message = String(error);
            if (message.includes('Execution context was destroyed') || message.includes('Cannot find context with specified id')) {
                await delay(500);
                continue;
            }
            throw error;
        }

        const state = snapshot?.state ?? null;
        const bodyText = snapshot?.bodyText ?? '';

        if (state?.status === 'error') {
            throw new Error(`UI capture error: ${state.error || 'unknown'}`);
        }

        if (bodyText.includes('Unable to resolve bare specifier')) {
            throw new Error(`Preview compile failed: ${summarizeBodyText(bodyText)}`);
        }

        if (state?.status === 'ready' && state.screenId === screenId) {
            return state;
        }

        await delay(500);
    }

    throw new Error(`TimeoutError: Waiting failed: ${timeoutMs}ms exceeded`);
}

function resolveUiSourceScreenDir(target) {
    if (!target.uiSourceDir) {
        return '';
    }
    return path.join(__dirname, '..', 'artifacts', 'ui-source', target.uiSourceDir);
}

function summarizeDiagnostics(diagnostics) {
    const consoleEntries = Array.isArray(diagnostics?.console) ? diagnostics.console : [];
    const pageErrors = Array.isArray(diagnostics?.pageErrors) ? diagnostics.pageErrors : [];
    const requestFailures = Array.isArray(diagnostics?.requestFailures) ? diagnostics.requestFailures : [];
    const consoleErrorCount = consoleEntries.filter((entry) => entry.type === 'error').length;
    const consoleWarningCount = consoleEntries.filter((entry) => entry.type === 'warning' || entry.type === 'warn').length;

    return {
        consoleErrorCount,
        consoleWarningCount,
        pageErrorCount: pageErrors.length,
        requestFailureCount: requestFailures.length,
    };
}

function collectDiagnosticSamples(diagnostics) {
    const consoleEntries = Array.isArray(diagnostics?.console) ? diagnostics.console : [];
    const counts = new Map();

    for (const entry of consoleEntries) {
        if (!entry || (entry.type !== 'warning' && entry.type !== 'warn' && entry.type !== 'error')) {
            continue;
        }
        const text = String(entry.text || '').replace(/\s+/g, ' ').trim();
        const key = `${entry.type}:${text}`;
        counts.set(key, {
            type: entry.type,
            text,
            count: (counts.get(key)?.count || 0) + 1,
        });
    }

    return Array.from(counts.values())
        .sort((left, right) => right.count - left.count || left.text.localeCompare(right.text))
        .slice(0, 20);
}

function buildRuntimeResiduals(summary, extraResiduals = []) {
    const residuals = [];
    if (summary.consoleErrorCount > 0) {
        residuals.push(`console errors: ${summary.consoleErrorCount}`);
    }
    if (summary.consoleWarningCount > 0) {
        residuals.push(`console warnings: ${summary.consoleWarningCount}`);
    }
    if (summary.pageErrorCount > 0) {
        residuals.push(`page errors: ${summary.pageErrorCount}`);
    }
    if (summary.requestFailureCount > 0) {
        residuals.push(`request failures: ${summary.requestFailureCount}`);
    }
    return residuals.concat(extraResiduals.filter(Boolean));
}

function buildRuntimeStatus(summary, failed) {
    if (failed || summary.pageErrorCount > 0 || summary.requestFailureCount > 0) {
        return 'fail';
    }
    if (summary.consoleErrorCount > 0 || summary.consoleWarningCount > 0) {
        return 'pass-with-minor-residuals';
    }
    return 'pass';
}

function writeRuntimeVerdictForTarget(target, outDir, metadata) {
    const screenDir = resolveUiSourceScreenDir(target);
    if (!screenDir || !fs.existsSync(screenDir)) {
        return;
    }

    writeRuntimeVerdictCaptureResult(screenDir, {
        screenId: target.runtimeScreenId || metadata.screenId || target.id,
        latestStage: 'runtimeCapture',
        ...metadata,
    });
}

async function collectTargetRuntimeGuard(page, target) {
    if (target.id !== 'GeneralDetailOverview'
        && target.id !== 'GeneralDetailOverviewProd'
        && target.id !== 'GeneralDetailOverviewZhenJi'
        && target.id !== 'GeneralDetailOverviewDs3') {
        return null;
    }

    return page.evaluate(() => {
        const cc = window.cc;
        const scene = cc?.director?.getScene?.();
        if (!scene) {
            return {
                guardId: 'general-detail-overview-runtime-visibility',
                passed: false,
                failures: ['scene unavailable'],
                nodes: {},
            };
        }

        const find = (name, node = scene) => {
            if (!node) return null;
            if (node.name === name) return node;
            for (const child of node.children || []) {
                const found = find(name, child);
                if (found) return found;
            }
            return null;
        };

        const readActive = (name) => {
            const node = find(name);
            if (!node) {
                return { exists: false, active: false };
            }
            return {
                exists: true,
                active: Boolean(node.activeInHierarchy ?? node.active),
            };
        };

        const expectedVisible = ['OverviewSlot', 'RightContentArea'];
        const expectedRemoved = ['RightContentAreaFill', 'OverviewStateChrome', 'TopLeftInfo', 'BottomLeftInfo', 'FooterPanel'];
        const failures = [];
        const nodes = {};

        for (const name of expectedVisible) {
            const state = readActive(name);
            nodes[name] = state;
            if (!state.exists) {
                failures.push(`${name} missing`);
            } else if (!state.active) {
                failures.push(`${name} hidden`);
            }
        }

        for (const name of expectedRemoved) {
            const state = readActive(name);
            nodes[name] = state;
            if (state.exists) {
                failures.push(`${name} should be removed`);
            }
        }

        const contentSlot = readActive('ContentSlot');
        nodes.ContentSlot = contentSlot;
        if (contentSlot.exists && contentSlot.active) {
            failures.push('ContentSlot should be hidden during Overview mode');
        }

        return {
            guardId: 'general-detail-overview-runtime-visibility',
            passed: failures.length === 0,
            failures,
            nodes,
        };
    });
}

async function captureOne(browser, baseUrl, outputDir, target, timeoutMs, sceneUuid) {
    const page = await browser.newPage();
    const diagnostics = createPageDiagnostics(page);
    const effectiveTimeoutMs = target.id === 'GeneralDetailOverview'
        || target.id === 'GeneralDetailOverviewProd'
        || target.id === 'GeneralDetailOverviewZhenJi'
        || target.id === 'GeneralDetailOverviewDs3'
        || target.id === 'GeneralDetailFromLobbyGeneralsButton'
        ? Math.max(timeoutMs, 70000)
        : timeoutMs;

    await page.setCacheEnabled(false);
    await page.setExtraHTTPHeaders({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
    });

    await page.evaluateOnNewDocument((targetIndex, previewVariant, debugHidePaths, uiVariant, uiVersion, formalScreenId) => {
        localStorage.setItem('PREVIEW_MODE', 'true');
        localStorage.setItem('PREVIEW_TARGET', String(targetIndex));
        if (formalScreenId) {
            localStorage.setItem('FORMAL_SCREEN_ID', formalScreenId);
        } else {
            localStorage.removeItem('FORMAL_SCREEN_ID');
        }
        if (previewVariant) {
            localStorage.setItem('PREVIEW_VARIANT', previewVariant);
        } else {
            localStorage.removeItem('PREVIEW_VARIANT');
        }
        if (uiVariant) {
            localStorage.setItem('__ucuf_general_detail_variant', uiVariant);
        } else {
            localStorage.removeItem('__ucuf_general_detail_variant');
        }
        if (debugHidePaths) {
            localStorage.setItem('GENERAL_DETAIL_OVERVIEW_HIDE_PATHS', debugHidePaths);
        } else {
            localStorage.removeItem('GENERAL_DETAIL_OVERVIEW_HIDE_PATHS');
        }

        if (uiVersion) {
            localStorage.setItem('UI_CAPTURE_VERSION', uiVersion);
        } else {
            localStorage.removeItem('UI_CAPTURE_VERSION');
        }

        const ensureVersionBadge = () => {
            if (!uiVersion) return;
            const canvasEl = document.querySelector('canvas') || document.querySelector('#GameDiv');
            const canvasRect = canvasEl && canvasEl.getBoundingClientRect ? canvasEl.getBoundingClientRect() : null;
            const topOffset = canvasRect ? Math.max(0, Math.round(canvasRect.top) + 4) : 4;
            let badge = document.getElementById('__ucuf-runtime-version-badge');
            if (!badge) {
                badge = document.createElement('div');
                badge.id = '__ucuf-runtime-version-badge';
                document.body.appendChild(badge);
            }
            badge.textContent = uiVersion;
            Object.assign(badge.style, {
                position: 'fixed',
                left: '4px',
                top: `${topOffset}px`,
                zIndex: '2147483647',
                fontFamily: 'monospace',
                fontSize: '11px',
                lineHeight: '1.2',
                padding: '1px 4px',
                color: '#d6f5ff',
                background: 'rgba(0,0,0,0.45)',
                borderRadius: '2px',
                pointerEvents: 'none',
                userSelect: 'none',
                opacity: '0.95',
            });
        };

        window.addEventListener('DOMContentLoaded', ensureVersionBadge, { once: true });
        window.addEventListener('load', ensureVersionBadge, { once: true });
        const prev = window.__UCUF_VERSION_BADGE_TIMER__;
        if (prev) clearInterval(prev);
        window.__UCUF_VERSION_BADGE_TIMER__ = window.setInterval(ensureVersionBadge, 300);
    }, target.targetIndex, target.previewVariant ?? '', target.debugHidePaths ?? '', target.uiVariant ?? '', target.uiVersion ?? '', target.formalScreenId ?? '');

    const query = new URLSearchParams();
    query.set('previewMode', 'true');
    query.set('previewTarget', String(target.targetIndex));
    if (target.formalScreenId) {
        query.set('formalScreenId', target.formalScreenId);
    }
    if (target.previewVariant) {
        query.set('previewVariant', target.previewVariant);
    }
    if (target.uiVariant) {
        query.set('ui', target.uiVariant);
    }
    if (target.uiVersion) {
        query.set('uiVersion', target.uiVersion);
    }
    if (target.debugHidePaths) {
        query.set('debugHidePaths', target.debugHidePaths);
    }
    const battleTactic = readBattleTacticArg();
    if (battleTactic) {
        query.set('battleTactic', battleTactic);
    }
    query.set('t', String(Date.now()));
    if (sceneUuid) {
        query.set('scene', sceneUuid);
    }

    const url = `${baseUrl}?${query.toString()}`;
    try {
        console.log(`[capture-ui-screens] ${target.id} navigating -> ${url}`);
        // Cocos Editor preview 頁常駐長連線，不能用 networkidle2 當成功條件。
        await withTimeout(
            page.goto(url, { waitUntil: 'domcontentloaded', timeout: effectiveTimeoutMs }),
            effectiveTimeoutMs + 5000,
            `${target.id} page.goto`,
        );
        console.log(`[capture-ui-screens] ${target.id} waiting capture ready (${target.screenId})`);
        const captureState = await withTimeout(
            waitForCaptureReady(page, target.screenId, effectiveTimeoutMs),
            effectiveTimeoutMs + 5000,
            `${target.id} waitForCaptureReady`,
        );
        console.log(`[capture-ui-screens] ${target.id} capture ready`);

        if (target.uiVersion) {
            const badgeVersion = await page.evaluate(() => {
                const el = document.getElementById('__ucuf-runtime-version-badge');
                return el ? String(el.textContent || '').trim() : '';
            });
            if (badgeVersion !== String(target.uiVersion).trim()) {
                throw new Error(`${target.id} ui version badge mismatch: expected=${target.uiVersion} actual=${badgeVersion || '(empty)'}`);
            }
        }

        const runtimeGuard = await collectTargetRuntimeGuard(page, target);
        if (runtimeGuard && !runtimeGuard.passed) {
            console.warn(`[capture-ui-screens] ${target.id} runtime guard failed: ${runtimeGuard.failures.join('; ')}`);
        }

        const filePath = path.join(outputDir, `${target.id}.png`);

        if (target.id === 'BattleScene') {
            const dump = await page.evaluate(() => {
                let scene = undefined;
                try {
                    const gameWin = document.querySelector('iframe')?.contentWindow || window;
                    const cc = gameWin.cc;
                    if (cc && cc.director) {
                        scene = cc.director.getScene();
                    }
                } catch(_e) {}

                if (!scene) return "No scene";

                // Find BattleLogPanel canvas node
                const findNode = (root, name) => {
                    if (root.name === name) return root;
                    for (const c of (root.children || [])) {
                        const found = findNode(c, name);
                        if (found) return found;
                    }
                    return null;
                };

                const getInfo = (n) => {
                    if (!n) return null;
                    const tf = n.getComponent && n.getComponent('cc.UITransform');
                    const wp = n.worldPosition;
                    return {
                        name: n.name,
                        active: n.active,
                        actH: n.activeInHierarchy,
                        wx: wp ? Math.round(wp.x) : null,
                        wy: wp ? Math.round(wp.y) : null,
                        w: tf ? Math.round(tf.width) : null,
                        h: tf ? Math.round(tf.height) : null,
                        children: n.children ? n.children.length : 0
                    };
                };

                const logPanelCanvasNode = findNode(scene, 'BattleLogPanel');
                const sidePanelRoot = logPanelCanvasNode ? findNode(logPanelCanvasNode, 'SidePanelRoot') : null;

                const result = {
                    BattleLogPanelNode: getInfo(logPanelCanvasNode),
                    SidePanelRoot: getInfo(sidePanelRoot),
                };

                const battleSceneNode = findNode(scene, 'BattleScene');
                const boardRendererNode = findNode(scene, 'BoardRenderer');
                const battleSceneComp = battleSceneNode && battleSceneNode.getComponent ? battleSceneNode.getComponent('BattleScene') : null;
                const boardRendererComp = boardRendererNode && boardRendererNode.getComponent ? boardRendererNode.getComponent('BoardRenderer') : null;
                const colorSummary = (value) => value && typeof value === 'object'
                    ? { r: value.r ?? null, g: value.g ?? null, b: value.b ?? null, a: value.a ?? null }
                    : value;
                const readMaterialColor = (material, propertyName = 'mainColor') => {
                    if (!material) return null;
                    try {
                        const value = material.getProperty ? material.getProperty(propertyName) : material[propertyName];
                        return colorSummary(value);
                    } catch {
                        return null;
                    }
                };
                result.BattleScene = battleSceneComp ? {
                    tactic: battleSceneComp.ctrl?.state?.battleTactic ?? null,
                    gridDebugText: battleSceneComp.gridDebugLabel?.string ?? null,
                    hasBoardRenderer: !!battleSceneComp.boardRenderer,
                } : null;
                result.BoardRenderer = boardRendererComp ? {
                    floodRippleReady: !!(boardRendererComp.floodRippleFillMaterial && boardRendererComp.floodRippleAccentFillMaterial),
                    hasFloodBase: !!boardRendererComp.floodBaseFillMaterial,
                    hasFloodCurrentFoam: !!boardRendererComp.floodCurrentFoamFillMaterial,
                    floodBaseFillColor: readMaterialColor(boardRendererComp.floodBaseFillMaterial, 'fillColor'),
                    floodBaseEdgeColor: readMaterialColor(boardRendererComp.floodBaseFillMaterial, 'edgeColor'),
                    floodBaseHighlightColor: readMaterialColor(boardRendererComp.floodBaseFillMaterial, 'highlightColor'),
                    floodCurrentColor: readMaterialColor(boardRendererComp.floodCurrentFoamFillMaterial),
                    floodRippleBaseColor: readMaterialColor(boardRendererComp.floodRippleFillMaterial),
                    floodRippleAccentColor: readMaterialColor(boardRendererComp.floodRippleAccentFillMaterial),
                } : null;

                if (sidePanelRoot) {
                    for (const child of (sidePanelRoot.children || [])) {
                        result[child.name] = getInfo(child);
                        // Also check grandchildren of BattleLogPanel sub-node
                        if (child.name === 'BattleLogPanel') {
                            for (const gc of (child.children || [])) {
                                result['BLP.' + gc.name] = getInfo(gc);
                            }
                        }
                    }
                }

                // Canvas info
                const canvas = findNode(scene, 'Canvas');
                if (canvas) {
                    const tf = canvas.getComponent && canvas.getComponent('cc.UITransform');
                    result.Canvas = {
                        wx: Math.round(canvas.worldPosition.x),
                        wy: Math.round(canvas.worldPosition.y),
                        w: tf ? Math.round(tf.width) : null,
                        h: tf ? Math.round(tf.height) : null,
                    };
                }

                return result;
            });
            require('fs').writeFileSync('artifacts/dump.json', JSON.stringify(dump, null, 2));
        }

        const browserViewport = await collectBrowserViewportDiagnostics(page);
        const runtimeGeometry = await collectRuntimeGeometry(page);
        const toolbarHeight = browserViewport?.toolbarHeight ?? 30;
        const vp = page.viewport() || { width: 1920, height: 1080 };
        const clip = toolbarHeight > 0
            ? { x: 0, y: toolbarHeight, width: vp.width, height: vp.height - toolbarHeight }
            : undefined;
        console.log(`[capture-ui-screens] ${target.id} writing screenshot -> ${filePath}`);
        await withTimeout(
            page.screenshot({ path: filePath, fullPage: false, ...(clip ? { clip } : {}) }),
            20000,
            `${target.id} page.screenshot`,
        );
        const imageSizeAfterScreenshot = readPngSize(filePath);
        console.log(`[capture-ui-screens] ${target.id} screenshot written`);
        return {
            filePath,
            page,
            diagnostics,
            runtimeGuard,
            uiVersion: target.uiVersion || null,
            captureState,
            browserViewport,
            runtimeGeometry,
            screenshotClip: clip || null,
            toolbarHeight,
            imageSizeAfterScreenshot,
        };
    } catch (error) {
        error.diagnostics = diagnostics;
        error.page = page;
        throw error;
    }
}

async function writeFailureArtifacts(page, outputDir, target, error, diagnostics) {
    const safeTarget = target ? target.id : 'unknown';
    const debugScreenshotPath = path.join(outputDir, `${safeTarget}-debug.png`);
    const debugStatePath = path.join(outputDir, `${safeTarget}-debug-state.json`);

    try {
        await page.screenshot({ path: debugScreenshotPath, fullPage: true });
    } catch (screenshotError) {
        console.warn('[capture-ui-screens] 無法寫入 debug screenshot:', screenshotError);
    }

    try {
        const state = await page.evaluate(() => ({
            href: window.location.href,
            title: document.title,
            captureState: (window).__UI_CAPTURE_STATE__ ?? null,
            bodyText: document.body ? document.body.innerText.slice(0, 1200) : '',
            iframeCount: document.querySelectorAll('iframe').length,
            canvasCount: document.querySelectorAll('canvas').length,
        }));

        fs.writeFileSync(debugStatePath, JSON.stringify({
            createdAt: new Date().toISOString(),
            target: safeTarget,
            error: String(error),
            state,
            diagnostics,
        }, null, 2), 'utf8');
    } catch (stateError) {
        console.warn('[capture-ui-screens] 無法寫入 debug state:', stateError);
    }
}

async function main() {
    const jsonOutput = hasFlag('json');
    if (hasFlag('list-targets')) {
        printTargetList(jsonOutput);
        return;
    }

    const targetId = parseArg('target', '');
    const formalScreenId = parseAnyArg(['formal-screen-id', 'formalScreenId'], '').trim();
    const formalTargetId = parseAnyArg(['formal-target-id', 'formalTargetId'], '').trim();
    const precheckOnly = hasFlag('precheck-only') || parseArg('precheck', '').trim().toLowerCase() === 'only';
    const precheckTimeoutMs = Number(parseArg('precheckTimeout', '7000'));
    const outDir = parseArg('outDir', path.join('artifacts', 'ui-qa', 'UI-2-0023'));
    const baseUrl = parseArg('url', 'http://localhost:7456');
    const timeoutMs = Number(parseArg('timeout', '45000'));
    const browserArg = parseArg('browser', '');
    const sceneUuid = parseArg('sceneUuid', resolveLoadingSceneUuid());
    const retries = Number(parseArg('retries', '1'));
    const refreshBefore = parseArg('refreshBefore', 'true') !== 'false';
    const maxWidth = Number(parseArg('maxWidth', '125'));
    const hidePaths = parseArg('hidePaths', '').trim();
    const uiVersionArg = parseArg('uiVersion', '').trim();
    const viewport = parseViewport(parseArg('viewport', '1920x1080'));

    const browserExecutable = resolveBrowserExecutable(browserArg);
    if (!browserExecutable) {
        console.error('[capture-ui-screens] 找不到可用瀏覽器，請用 --browser 指定 Edge/Chrome executable path');
        process.exit(1);
    }

    const selectedTargets = (formalScreenId
        ? [buildFormalTarget(formalScreenId, formalTargetId)]
        : selectTargets(targetId)
    ).map((target) => {
        const uiVersion = resolveUiVersionForTarget(target, uiVersionArg);
        return {
            ...target,
            debugHidePaths: hidePaths,
            uiVersion,
        };
    });

    const precheckReport = await runTwoLayerPrecheck({
        baseUrl,
        browserExecutable,
        selectedTargets,
        requestedTargetId: targetId,
        formalScreenId,
        timeoutMs: precheckTimeoutMs,
    });
    if (precheckOnly || !precheckReport.ok) {
        emitPrecheckReport(precheckReport, jsonOutput);
        if (!precheckReport.ok) {
            process.exit(2);
        }
        return;
    }
    console.log('[capture-ui-screens] precheck passed, start screenshot capture');

    fs.mkdirSync(outDir, { recursive: true });

    console.log('='.repeat(70));
    console.log('[capture-ui-screens] Headless capture start');
    console.log(`- host: ${baseUrl}`);
    console.log(`- targets: ${selectedTargets.map(t => t.id).join(', ')}`);
    console.log(`- output: ${outDir}`);
    console.log(`- browser: ${browserExecutable}`);
    console.log(`- sceneUuid: ${sceneUuid || '(none)'}`);
    console.log(`- retries: ${retries}`);
    console.log(`- viewport: ${viewport.width}x${viewport.height}`);
    console.log('='.repeat(70));

    if (refreshBefore) {
        console.log('[capture-ui-screens] refreshing asset-db before capture...');
        await triggerEditorRefresh(baseUrl);
        await delay(1200);
    }

    const browser = await browserCaptureCore.launchBrowser({
        executablePath: browserExecutable,
        viewport: {
            width: viewport.width,
            height: viewport.height,
            deviceScaleFactor: viewport.deviceScaleFactor || 1,
        },
        headless: true,
    });

    const captured = [];
    const runtimeUpdates = [];

    try {
        for (const target of selectedTargets) {
            let lastError = null;

            for (let attempt = 1; attempt <= retries + 1; attempt++) {
                let captureResult = null;
                try {
                    console.log(`[capture-ui-screens] ${target.id} attempt ${attempt}/${retries + 1}`);
                    captureResult = await captureOne(browser, baseUrl, outDir, target, timeoutMs, sceneUuid);
                    const effectiveMaxWidth = resolveEffectiveMaxWidth(target, maxWidth);
                    const resizeResult = resizePng(captureResult.filePath, effectiveMaxWidth);
                    const finalImageSize = readPngSize(captureResult.filePath);
                    const vp = captureResult.browserViewport?.window || viewport;
                    const captureProtocol = buildCaptureProtocol(target, {
                        viewport: {
                            width: viewport.width,
                            height: viewport.height,
                            deviceScaleFactor: vp.devicePixelRatio || 1,
                        },
                        requestedMaxWidth: maxWidth,
                        effectiveMaxWidth,
                        resizeResult,
                        screenshotClip: captureResult.screenshotClip,
                        toolbarHeight: captureResult.toolbarHeight,
                        imageSizeAfterScreenshot: captureResult.imageSizeAfterScreenshot,
                        finalImageSize,
                        browserViewport: captureResult.browserViewport,
                    });
                    const diagnosticsSummary = summarizeDiagnostics(captureResult.diagnostics);
                    const diagnosticSamples = collectDiagnosticSamples(captureResult.diagnostics);
                    const runtimeGuardFailures = Array.isArray(captureResult.runtimeGuard?.failures)
                        ? captureResult.runtimeGuard.failures
                        : [];
                    const status = buildRuntimeStatus(diagnosticsSummary, runtimeGuardFailures.length > 0);
                    const residuals = buildRuntimeResiduals(diagnosticsSummary, runtimeGuardFailures);
                    const relativeFile = path.relative(path.join(__dirname, '..'), captureResult.filePath).replace(/\\/g, '/');
                    const expectedScreenId = target.screenId;
                    const actualScreenId = captureResult.captureState?.screenId || null;
                    const screenshotHash = sha256File(captureResult.filePath);
                    captured.push({
                        target: target.id,
                        screenId: target.runtimeScreenId || target.screenId,
                        expectedScreenId,
                        actualScreenId,
                        runtimeScreenId: target.runtimeScreenId || null,
                        targetScreenId: target.screenId,
                        captureMode: target.captureMode || 'legacy-preview-target',
                        uiVersion: target.uiVersion || null,
                        runtimeVersion: target.uiVersion || null,
                        runtimeSpecHash: buildRuntimeSpecHashes(target.runtimeScreenId || target.screenId),
                        screenshotHash,
                        captureProtocol,
                        runtimeGeometry: captureResult.runtimeGeometry ?? null,
                        file: captureResult.filePath,
                        diagnosticsSummary,
                        diagnosticSamples,
                        runtimeGuard: captureResult.runtimeGuard ?? null,
                        status,
                    });
                    writeRuntimeVerdictForTarget(target, outDir, {
                        runId: path.basename(outDir),
                        status,
                        residuals,
                        promoteable: status !== 'fail',
                        diagnosticsSummary,
                        runtimeGuard: captureResult.runtimeGuard ?? null,
                        captureArtifacts: {
                            screenshotPath: relativeFile,
                            captureProtocol,
                        },
                        factoryLearnings: status === 'pass'
                            ? ['runtime capture connected to capture-ui-screens.js']
                            : [],
                    });
                    runtimeUpdates.push({ target: target.id, status });
                    console.log(`[capture-ui-screens] captured ${target.id} -> ${captureResult.filePath}`);
                    await withTimeout(captureResult.page.close(), 10000, `${target.id} page.close`);
                    lastError = null;
                    break;
                } catch (error) {
                    lastError = error;
                    const debugState = {
                        state: null,
                        diagnostics: error.diagnostics ?? null,
                    };
                    if (error.page) {
                        await writeFailureArtifacts(error.page, outDir, target, error, error.diagnostics ?? null);
                        try {
                            debugState.state = JSON.parse(fs.readFileSync(path.join(outDir, `${target.id}-debug-state.json`), 'utf8'));
                        } catch {
                            // 讀不到 debug 檔時，保留 null
                        }
                        await error.page.close();
                    }

                    const retryable = attempt <= retries && isRetryableCaptureError(error, debugState.state);
                    const diagnosticsSummary = summarizeDiagnostics(error.diagnostics);
                    const diagnosticSamples = collectDiagnosticSamples(error.diagnostics);
                    const residuals = buildRuntimeResiduals(diagnosticsSummary, [String(error)]);
                    writeRuntimeVerdictForTarget(target, outDir, {
                        runId: path.basename(outDir),
                        status: retryable ? 'pass-with-minor-residuals' : 'fail',
                        residuals,
                        promoteable: false,
                        diagnosticsSummary,
                        factoryLearnings: ['runtime capture failure should be triaged before promoting the screen'],
                        captureArtifacts: {
                            debugScreenshotPath: path.relative(path.join(__dirname, '..'), path.join(outDir, `${target.id}-debug.png`)).replace(/\\/g, '/'),
                            debugStatePath: path.relative(path.join(__dirname, '..'), path.join(outDir, `${target.id}-debug-state.json`)).replace(/\\/g, '/'),
                        },
                    });
                    const debugSamplesPath = path.join(outDir, `${target.id}-diagnostic-samples.json`);
                    fs.writeFileSync(debugSamplesPath, JSON.stringify({ diagnosticSamples }, null, 2), 'utf8');
                    console.warn(`[capture-ui-screens] ${target.id} attempt ${attempt} failed: ${error}`);
                    if (!retryable) {
                        throw error;
                    }

                    console.log('[capture-ui-screens] retryable failure detected, refreshing asset-db and retrying...');
                    await triggerEditorRefresh(baseUrl);
                    await delay(1500);
                }
            }

            if (lastError) {
                throw lastError;
            }
        }
    } catch (error) {
        throw error;
    } finally {
        await browserCaptureCore.closeBrowser(browser);
    }

    const report = {
        createdAt: new Date().toISOString(),
        host: baseUrl,
        machine: os.hostname(),
        uiVersion: uiVersionArg || null,
        captures: captured,
        runtimeUpdates,
    };
    const captureReportPath = path.join(outDir, 'capture-report.json');
    fs.writeFileSync(captureReportPath, JSON.stringify(report, null, 2), 'utf8');

    for (const target of selectedTargets) {
        const matched = captured.find((entry) => entry.target === target.id);
        if (!matched) {
            continue;
        }
        writeRuntimeVerdictForTarget(target, outDir, {
            runId: path.basename(outDir),
            captureArtifacts: {
                captureReportPath: path.relative(path.join(__dirname, '..'), captureReportPath).replace(/\\/g, '/'),
            },
        });
    }

    console.log(`[capture-ui-screens] 完成，共 ${captured.length} 張。`);
}

main().catch((error) => {
    console.error('[capture-ui-screens] failed:', error);
    process.exit(1);
});
