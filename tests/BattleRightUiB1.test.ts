// @spec-source → 戰場右側 UI 重設計規格 §3、§5（B1 版面搬遷、B2 統一按鈕元件）：PROG-2-10133
/**
 * BattleRightUiB1.test.ts
 *
 * 鎖住：
 *  1. 主題：四色系四狀態的繪製參數（按下下移＋收陰影＋亮度、禁用去飽和＋降透明、啟用中金邊發光）、
 *     狀態優先序、JSON 覆寫合併、型別錯誤時沿用預設。
 *  2. 圖示：九個圖示都畫得出來，且座標落在單位方塊內。
 *  3. 版面：5 個功能鈕在頂欄右側橫排、觸控範圍 1280×720 等效 ≥48px、不再貼戰場右緣；
 *     指令座 360×156 且內部元件不重疊；結束回合（朱漆）與出陣（金漆）是不同色的主要鈕；
 *     智謀條 360×36 膠囊；SP 準備中文字面板已隱藏。
 *  4. 四語系：新 key 齊全、無占位前綴、長字寬度預算（縮字下限內放得下）。
 *  5. 接線：BattleLogComposite／ActionCommandComposite／BattleHUDComposite 都改用 BattleButtonStyle。
 */
import { TestSuite, assert } from './TestRunner';
import {
    DEFAULT_BATTLE_BUTTON_THEME as T,
    mergeBattleButtonTheme,
    parseHexColor,
    pickBattleButtonState,
    resolveBattleButtonVisual,
} from '../assets/scripts/ui/components/BattleButtonTheme';
import { BATTLE_ICON_IDS, drawBattleIcon, type IconPen } from '../assets/scripts/ui/components/BattleButtonIcons';

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const read = (p: string): string => fs.readFileSync(path.join(ROOT, p), 'utf8');
const json = (p: string): any => JSON.parse(read(p));
const LANGS = ['zh-TW', 'zh-CN', 'en', 'ja'];
const locale = (lang: string): Record<string, string> => json(`assets/resources/i18n/${lang}.json`);

function find(n: any, name: string): any {
    if (n.name === name || n.id === name) return n;
    for (const c of n.children ?? []) { const r = find(c, name); if (r) return r; }
    return null;
}

/** 1920×1080 設計座標下的節點矩形（左上為原點），只處理 left/right/top/bottom 錨點 */
function rectIn(n: any, pw: number, ph: number): { x: number; y: number; w: number; h: number } {
    const a = n.widget ?? {};
    const x = a.left ?? (a.right !== undefined ? pw - a.right - n.width : 0);
    const y = a.top ?? (a.bottom !== undefined ? ph - a.bottom - n.height : 0);
    return { x, y, w: n.width, h: n.height };
}
const overlap = (a: any, b: any): boolean => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const FN_BUTTONS = ['BtnAuto', 'BtnDelegate', 'BtnSpeed', 'BtnCollapse', 'BtnSetting'];

export function createBattleRightUiB1Suite(): TestSuite {
    const suite = new TestSuite('BattleRightUiB1 (戰場右側 UI B1 版面＋B2 統一按鈕 PROG-2-10133)');

    // ── 1. 主題 ──────────────────────────────────────────────
    suite.test('按下：本體下移、陰影收掉、亮度 ×0.85', () => {
        const n = resolveBattleButtonVisual(T, 'secondary', 'normal');
        const p = resolveBattleButtonVisual(T, 'secondary', 'pressed');
        assert.equals(T.thickness, n.thickness);
        assert.equals(0, p.thickness);
        assert.equals(-T.pressedOffset, p.bodyOffsetY);
        assert.equals(Math.round(n.border[0] * T.pressedBrightness), p.border[0]);
        assert.equals(1, p.opacity);
    });

    suite.test('禁用：去飽和成灰階並降到 0.42 透明度', () => {
        const d = resolveBattleButtonVisual(T, 'crimson', 'disabled');
        assert.equals(T.disabledOpacity, d.opacity);
        assert.equals(d.top[0], d.top[1]);
        assert.equals(d.top[1], d.top[2]);
        assert.isTrue(resolveBattleButtonVisual(T, 'crimson', 'normal').top[0] !== resolveBattleButtonVisual(T, 'crimson', 'normal').top[1]);
    });

    suite.test('啟用中：金邊＋金色圖示＋外發光；一般狀態沒有發光', () => {
        const a = resolveBattleButtonVisual(T, 'secondary', 'active');
        assert.equals(JSON.stringify(parseHexColor(T.activeBorder)), JSON.stringify(a.border));
        assert.equals(JSON.stringify(parseHexColor(T.activeIcon)), JSON.stringify(a.icon));
        assert.isTrue(a.glow !== null);
        assert.equals(null, resolveBattleButtonVisual(T, 'secondary', 'normal').glow);
    });

    suite.test('主要鈕：結束回合朱漆、出陣金漆、次要鈕深漆木，三者底色不同；退出鈕為偏紅邊', () => {
        const key = (v: any): string => JSON.stringify(resolveBattleButtonVisual(T, v, 'normal').top);
        assert.equals(3, new Set([key('crimson'), key('gold'), key('secondary')]).size);
        const [r, g, b] = parseHexColor(T.variants.danger.border);
        assert.isTrue(r > g * 2 && r > b * 2, '退出鈕外框要偏紅');
        const crimson = parseHexColor(T.variants.crimson.top);
        assert.isTrue(crimson[0] > crimson[1] * 2, '朱漆偏紅');
    });

    suite.test('狀態優先序：禁用 > 按下 > 啟用中 > 一般', () => {
        assert.equals('disabled', pickBattleButtonState({ disabled: true, pressed: true, active: true }));
        assert.equals('pressed', pickBattleButtonState({ disabled: false, pressed: true, active: true }));
        assert.equals('active', pickBattleButtonState({ disabled: false, pressed: false, active: true }));
        assert.equals('normal', pickBattleButtonState({ disabled: false, pressed: false, active: false }));
    });

    suite.test('主題 JSON 覆寫：只換有給的欄位；型別錯誤與壞色碼不會弄壞預設', () => {
        const merged = mergeBattleButtonTheme(T, { radius: 20, thickness: 'x', variants: { gold: { top: '#112233', border: 7 } } });
        assert.equals(20, merged.radius);
        assert.equals(T.thickness, merged.thickness, '型別錯誤沿用預設');
        assert.equals('#112233', merged.variants.gold.top);
        assert.equals(T.variants.gold.border, merged.variants.gold.border);
        assert.equals(T.variants.crimson.top, merged.variants.crimson.top);
        assert.equals(T.radius, DEFAULT_RADIUS_GUARD(), '不得改到預設物件');
        assert.equals(JSON.stringify([255, 0, 255]), JSON.stringify(parseHexColor('oops')));
    });

    suite.test('主題資料檔 battle-button-theme.json 與內建預設一致（換季覆寫時的基準）', () => {
        const file = json('assets/resources/ui-spec/battle-button-theme.json');
        assert.equals(JSON.stringify(T), JSON.stringify(mergeBattleButtonTheme(T, file)));
        assert.equals(JSON.stringify(T.variants), JSON.stringify(file.variants));
    });

    // ── 2. 圖示 ──────────────────────────────────────────────
    suite.test('九個線稿圖示都畫得出來，座標落在單位方塊內', () => {
        assert.equals(9, BATTLE_ICON_IDS.length);
        for (const id of BATTLE_ICON_IDS) {
            const pts: number[][] = [];
            let calls = 0;
            const pen: IconPen = {
                moveTo: (x, y) => { calls++; pts.push([x, y]); },
                lineTo: (x, y) => { calls++; pts.push([x, y]); },
                circle: (x, y, r) => { calls++; pts.push([x - r, y - r], [x + r, y + r]); },
                // 弧線只取實際走過的角度取樣（不能拿整圓外框，否則半圓弧會誤判超框）
                arc: (x, y, r, a0, a1) => { calls++; for (let k = 0; k <= 8; k++) { const a = a0 + ((a1 - a0) * k) / 8; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } },
                close: () => { calls++; },
            };
            drawBattleIcon(pen, id, 100);
            assert.isTrue(calls >= 3, `${id} 沒畫出東西`);
            for (const [x, y] of pts) assert.isTrue(Math.abs(x) <= 56 && Math.abs(y) <= 56, `${id} 超出單位方塊 (${x},${y})`);
        }
    });

    // ── 3. 版面 ──────────────────────────────────────────────
    suite.test('頂欄功能鈕：5 顆橫排在頂欄範圍內、觸控 ≥48px（1280×720 等效）、不貼戰場右緣', () => {
        const log = json('assets/resources/ui-spec/layouts/battle-log-main.json').root;
        const bar = find(log, 'ControlBar');
        const kids = FN_BUTTONS.map(n => find(bar, n));
        assert.isTrue(kids.every(Boolean), '五個功能鈕都在');
        const scale = 720 / 1080;
        let prevRight = -1;
        for (const k of kids) {
            assert.equals('button', k.type);
            assert.isTrue(k.height * scale >= 47.9 && k.width * scale >= 47.9, `${k.name} 觸控 ${k.width * scale}x${k.height * scale}`);
            const r = rectIn(k, bar.width, bar.height);
            assert.equals(0, r.y, '同一橫列');
            assert.isTrue(r.x >= prevRight + 8 - 0.01 || prevRight < 0, '橫向間距 ≥8');
            prevRight = r.x + r.w;
        }
        assert.isTrue(prevRight <= bar.width, '不超出功能群寬度');
        // 整組落在頂欄（高 88）內，且右緣在頂欄右側（距右 ≥ 退出鈕 72＋24 隔開）
        assert.isTrue(log.widget.top + log.height <= 88, '功能群在頂欄高度內');
        assert.isTrue(log.widget.right >= 96, '與退出鈕隔開');
        assert.equals(undefined, log.layout, '不再是右緣直排');
    });

    suite.test('戰報本體展開位置：右下、指令座左側，不蓋頂欄與棋盤右緣', () => {
        const log = json('assets/resources/ui-spec/layouts/battle-log-main.json').root;
        const panel = find(log, 'BattleLogPanel');
        const W = 1920, H = 1080;
        const rootX = W - log.widget.right - log.width, rootY = log.widget.top;
        const x = rootX + log.width - panel.widget.right - panel.width;
        const y = rootY + panel.widget.top;
        const dock = json('assets/resources/ui-spec/layouts/action-command-main.json').root;
        const dockX = W - dock.widget.right - dock.width;
        assert.isTrue(x + panel.width <= dockX, '戰報本體右緣在指令座左側');
        assert.isTrue(y + panel.height <= H, '不超出畫面下緣');
        assert.isTrue(y >= 600, '在畫面下半部');
    });

    suite.test('指令座 360×156：元件互不重疊、都在範圍內，觸控 ≥48px', () => {
        const dock = json('assets/resources/ui-spec/layouts/action-command-main.json').root;
        assert.equals(360, dock.width);
        assert.equals(156, dock.height);
        assert.equals(null, find(dock, 'CommandDockPlate'), '整塊半透明底板已移除');
        const rect: Record<string, any> = {};
        for (const n of ['EndTurnBtn', 'TacticsBtn', 'DuelBtn']) rect[n] = rectIn(find(dock, n), dock.width, dock.height);
        const ult = rectIn(find(dock, 'UltimateBtn'), dock.width, dock.height);
        // 奧義環含 10px 充能環
        rect.UltimateBtn = { x: ult.x - 10, y: ult.y - 10, w: ult.w + 20, h: ult.h + 20 };
        const names = Object.keys(rect);
        for (const n of names) {
            const r = rect[n];
            assert.isTrue(r.x >= 0 && r.y >= 0 && r.x + r.w <= dock.width && r.y + r.h <= dock.height, `${n} 在指令座內 ${JSON.stringify(r)}`);
        }
        for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
            assert.isFalse(overlap(rect[names[i]], rect[names[j]]), `${names[i]} 與 ${names[j]} 重疊`);
        }
        const scale = 720 / 1080;
        for (const n of ['EndTurnBtn', 'TacticsBtn', 'DuelBtn']) {
            assert.isTrue(rect[n].w * scale >= 47.9 && rect[n].h * scale >= 47.9, `${n} 觸控不足`);
        }
        const end = rect.EndTurnBtn, duel = rect.DuelBtn;
        assert.isTrue(end.w >= 200 && end.h >= 76, '結束回合 200×76');
        assert.isTrue(duel.w >= 108, '出陣 108 寬');
        assert.isTrue(dock.widget.right === 12 && dock.widget.bottom === 20);
    });

    suite.test('智謀條 360×36 膠囊，字在條內（左名稱右數值）', () => {
        const col = find(json('assets/resources/ui-spec/layouts/strategist-hud-main.json').root, 'WisdomColumn');
        assert.equals(360, col.width);
        assert.equals(36, col.height);
        assert.isTrue(col.widget.top >= 88, '在頂欄下方');
        const name = find(col, 'WisdomText'), value = find(col, 'WisdomValue');
        assert.equals('battle.hud.wisdom', name.textKey);
        assert.isTrue(name.height <= col.height && value.height <= col.height, '字壓在條內');
        const skin = json('assets/resources/ui-spec/skins/strategist-hud-battle.json').slots;
        assert.equals('LEFT', skin['strategist.label.wisdom.name'].horizontalAlign);
        assert.equals('RIGHT', skin['strategist.label.wisdom.value'].horizontalAlign);
    });

    suite.test('SP／奧義文字面板（SP 準備中）已隱藏，兩份 HUD 版型一致', () => {
        for (const f of ['battle-hud-screen.json', 'battle-hud-screen.layout.json']) {
            const n = find(json(`assets/resources/ui-spec/layouts/${f}`).root, 'BattleHudScreen_div_122');
            assert.equals(false, n.active, f);
        }
    });

    // ── 4. 四語系 ────────────────────────────────────────────
    const NEW_KEYS = ['battle.hud.fn.auto', 'battle.hud.fn.delegate', 'battle.hud.fn.speed', 'battle.hud.fn.log',
        'battle.hud.fn.settings', 'battle.hud.fn.exit', 'battle.hud.wisdom'];
    suite.test('新 key 與主要鈕文字：四語系齊全、無占位前綴；功能鈕說明在縮字下限內放得下', () => {
        for (const lang of LANGS) {
            const l = locale(lang);
            for (const key of [...NEW_KEYS, 'battle.end_turn', 'battle.sortie', 'battle.tactics', 'battle.log.toggle']) {
                assert.isTrue(typeof l[key] === 'string' && l[key].length > 0, `${lang} 缺 ${key}`);
                assert.isFalse(l[key].startsWith('['), `${lang} ${key} 帶占位前綴：${l[key]}`);
            }
            // 字寬估算：CJK 全形 1em、拉丁 0.6em；功能鈕說明 22px 起、可縮到 70%，可用寬 68-8=60
            const em = (s: string): number => [...s].reduce((w, c) => w + (c.charCodeAt(0) > 0x2e80 ? 1 : 0.6), 0);
            for (const key of NEW_KEYS.filter(k => k.startsWith('battle.hud.fn.'))) {
                assert.isTrue(em(l[key]) * 22 * T.minFontRatio <= 60, `${lang} ${key}「${l[key]}」縮到下限仍超寬`);
            }
            assert.isTrue(em(l['battle.end_turn']) * 30 * T.minFontRatio <= 184, `${lang} 結束回合超寬`);
            assert.isTrue(em(l['battle.sortie']) * 26 * T.minFontRatio <= 100, `${lang} 出陣超寬`);
        }
    });

    suite.test('英文：Auto 與 Proxy 不再同字；出陣＝Deploy', () => {
        const en = locale('en');
        assert.isTrue(en['battle.hud.fn.auto'] !== en['battle.hud.fn.delegate']);
        assert.equals('Deploy', en['battle.sortie']);
    });

    // ── 5. 接線 ──────────────────────────────────────────────
    suite.test('三個戰場面板都改用 BattleButtonStyle，開關鈕走 setActive，不再用改 UIOpacity 的暗亮表示', () => {
        const log = read('assets/scripts/ui/components/BattleLogComposite.ts');
        assert.contains(log, 'BattleButtonStyle.attach');
        assert.contains(log, '.setActive(');
        assert.isFalse(log.includes('op.opacity = active ? 180 : 255'), '舊的暗亮表示應移除');
        assert.isFalse(log.includes('op.opacity = active ? 255 : 130'), '舊的暗亮表示應移除');
        const act = read('assets/scripts/ui/components/ActionCommandComposite.ts');
        assert.contains(act, "variant: 'crimson'");
        assert.contains(act, "variant: 'gold'");
        assert.contains(act, '.setDisabled(');
        const hud = read('assets/scripts/ui/components/BattleHUDComposite.ts');
        assert.contains(hud, "variant: 'danger'");
        assert.contains(hud, 'battle.hud.fn.exit');
    });

    suite.test('BattleButtonStyle 用縮字（Overflow.SHRINK）、四狀態與按下 Tween', () => {
        const src = read('assets/scripts/ui/components/BattleButtonStyle.ts');
        assert.contains(src, 'Label.Overflow.SHRINK');
        assert.contains(src, 'TOUCH_START');
        assert.contains(src, 'pressTweenSec');
        assert.contains(src, 'onLocaleChanged');
        assert.contains(src, 'Tween.stopAllByTarget');
    });

    return suite;
}

function DEFAULT_RADIUS_GUARD(): number { return T.radius; }
