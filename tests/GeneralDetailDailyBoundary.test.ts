/**
 * GeneralDetailDailyBoundary — 日常人物頁 v3 可行性邊界守則（武將人物介面規格補遺 doc_ui_0013「可行性評估」；GDV3-08；PROG-2-2058）
 *
 * 規格：長駐血脈虛影、大量發光動效、自動捲動式故事跑馬燈不混入日常頁，應留在血脈命鏡過場 / 覺醒頁。
 * 自動檢查日常頁 layout（含 $ref 片段）與 skin：
 * - 不得有動畫、輪播、自動捲動類欄位。
 * - 節點與 slot 名稱不得是虛影、跑馬燈。
 * - 發光 slot 只能是靜態 sprite-frame（規格允許命紋徽記以靜態 sprite / badge 落地）。
 *
 * Unity 對照：像一支 EditMode 測試掃 Prefab，找出不該出現在日常頁的 Animator 或粒子元件。
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';

const UI_SPEC_DIR = path.resolve(__dirname, '../assets/resources/ui-spec');

/** 日常頁的 screen：只檢查這些 screen 指向的 layout 與 skin */
const DAILY_SCREENS = ['general-detail-bloodline-v3-screen', 'general-detail-unified-screen'];

const FORBIDDEN_KEY = /tween|anim|marquee|autoscroll|autoplay|loop|pulse|flicker|particle|breath/i;
const FORBIDDEN_NAME = /phantom|ghost|marquee|ticker|虛影|跑馬燈|幻影/i;

interface BoundaryIssue {
    source: string;
    path: string;
    reason: string;
}

function readSpec(relative: string): unknown {
    const file = path.join(UI_SPEC_DIR, relative.endsWith('.json') ? relative : `${relative}.json`);
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** 掃一份 spec（遇到 $ref 片段遞迴展開，同一片段只掃一次） */
function scanSpec(spec: unknown, source: string, issues: BoundaryIssue[], seen: Set<string>, at = ''): void {
    if (Array.isArray(spec)) {
        spec.forEach((item, index) => scanSpec(item, source, issues, seen, `${at}[${index}]`));
        return;
    }
    if (!spec || typeof spec !== 'object') return;
    for (const [key, value] of Object.entries(spec as Record<string, unknown>)) {
        const here = at ? `${at}.${key}` : key;
        if (FORBIDDEN_KEY.test(key)) issues.push({ source, path: here, reason: '動畫／自動捲動欄位' });
        if (FORBIDDEN_NAME.test(key) || (typeof value === 'string' && FORBIDDEN_NAME.test(value))) {
            issues.push({ source, path: here, reason: '虛影／跑馬燈命名' });
        }
        if (key === '$ref' && typeof value === 'string' && !seen.has(value)) {
            seen.add(value);
            scanSpec(readSpec(value), value, issues, seen);
        }
        scanSpec(value, source, issues, seen, here);
    }
}

/** skin 的發光 slot 必須是靜態 sprite-frame */
function scanGlowSlots(skin: unknown, source: string, issues: BoundaryIssue[]): void {
    const slots = (skin as { slots?: Record<string, { kind?: string }> }).slots ?? {};
    for (const [slotId, slot] of Object.entries(slots)) {
        if (/glow/i.test(slotId) && slot.kind !== 'sprite-frame') {
            issues.push({ source, path: `slots.${slotId}`, reason: '發光 slot 不是靜態 sprite-frame' });
        }
    }
}

function scanScreen(screenId: string): BoundaryIssue[] {
    const screen = readSpec(`screens/${screenId}`) as { layout: string; skin: string };
    const issues: BoundaryIssue[] = [];
    const seen = new Set<string>();
    const layoutId = `layouts/${screen.layout}`;
    const skinId = `skins/${screen.skin}`;
    scanSpec(readSpec(layoutId), layoutId, issues, seen);
    const skin = readSpec(skinId);
    scanSpec(skin, skinId, issues, seen);
    scanGlowSlots(skin, skinId, issues);
    return issues;
}

function format(issues: readonly BoundaryIssue[]): string {
    return issues.map((i) => `${i.source} ${i.path}：${i.reason}`).join('\n');
}

export function createGeneralDetailDailyBoundarySuite(): TestSuite {
    const suite = new TestSuite('GeneralDetailDailyBoundary (日常頁可行性邊界 GDV3-08 PROG-2-2058)');

    for (const screenId of DAILY_SCREENS) {
        suite.test(`${screenId}：無虛影、發光動效、跑馬燈`, () => {
            const issues = scanScreen(screenId);
            assert.equals(0, issues.length, format(issues));
        });
    }

    suite.test('檢查器本身：動畫欄位、虛影命名、非靜態發光 slot 都會被抓到', () => {
        const issues: BoundaryIssue[] = [];
        scanSpec({ children: [{ name: 'BloodlinePhantom', tween: { loop: true } }, { name: '故事跑馬燈' }] }, 'fake', issues, new Set());
        scanGlowSlots({ slots: { 'x.glow': { kind: 'particle' }, 'y.glow': { kind: 'sprite-frame' } } }, 'fake', issues);
        assert.equals(5, issues.length, format(issues));
        assert.equals(1, issues.filter((i) => i.reason === '發光 slot 不是靜態 sprite-frame').length);
    });

    return suite;
}
