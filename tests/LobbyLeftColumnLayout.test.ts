/**
 * PROG-2-1082：大廳左側浮層（季度卡、出戰卡組、出戰主將、官職卡）在 1920x1080 設計解析度下不可互相重疊，
 * 季度卡的按鈕要整顆落在卡內、不壓到上方季度文字，也不可壓到底部導覽列（高 92）。
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';

const LAYOUT_DIR = path.resolve(__dirname, '../assets/resources/ui-spec/layouts');
const DESIGN_W = 1920;
const DESIGN_H = 1080;
const NAV_H = 92;

interface Rect { x: number; y: number; w: number; h: number; name: string }
interface LayoutNode { name: string; width?: number; height?: number; widget?: Record<string, number | boolean>; children?: LayoutNode[] }

function card(file: string, name: string): LayoutNode {
    const json = JSON.parse(fs.readFileSync(path.join(LAYOUT_DIR, file), 'utf8'));
    const root: LayoutNode = json.root ?? json;
    const node = (root.children ?? []).find((c) => c.name === name);
    if (!node) throw new Error(`${file} 缺少 ${name}`);
    return node;
}

/** 以 widget 的 top/left/right/bottom 換算節點在父容器內的矩形（只支援本測試用到的組合） */
function place(node: LayoutNode, parentW: number, parentH: number): Rect {
    const w = node.widget ?? {};
    const num = (k: string) => (typeof w[k] === 'number' ? (w[k] as number) : undefined);
    const left = num('left'); const right = num('right'); const top = num('top'); const bottom = num('bottom');
    const width = left !== undefined && right !== undefined ? parentW - left - right : node.width ?? 0;
    const height = top !== undefined && bottom !== undefined ? parentH - top - bottom : node.height ?? 0;
    const x = left !== undefined ? left : parentW - (right ?? 0) - width;
    const y = top !== undefined ? top : parentH - (bottom ?? 0) - height;
    return { x, y, w: width, h: height, name: node.name };
}

const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

export function createLobbyLeftColumnLayoutSuite(): TestSuite {
    const suite = new TestSuite('LobbyLeftColumnLayout');

    suite.test('左側浮層互不重疊，也不壓到底部導覽列', () => {
        const rects = [
            place(card('lobby-season-hud-main.json', 'SeasonHudCard'), DESIGN_W, DESIGN_H),
            place(card('lobby-deck-select-main.json', 'DeckSelectCard'), DESIGN_W, DESIGN_H),
            place(card('lobby-lead-select-main.json', 'LeadSelectCard'), DESIGN_W, DESIGN_H),
            place(card('lobby-officer-hud-main.json', 'OfficerHudCard'), DESIGN_W, DESIGN_H),
        ];
        for (let i = 0; i < rects.length; i++) {
            assert.isTrue(rects[i].y + rects[i].h <= DESIGN_H - NAV_H, `${rects[i].name} 壓到底部導覽列`);
            for (let j = i + 1; j < rects.length; j++) {
                assert.isFalse(overlap(rects[i], rects[j]), `${rects[i].name} 與 ${rects[j].name} 重疊`);
            }
        }
    });

    suite.test('季度卡按鈕都在卡內、互不重疊，且不壓到季度文字', () => {
        const hud = card('lobby-season-hud-main.json', 'SeasonHudCard');
        const W = hud.width ?? 0; const H = hud.height ?? 0;
        const kids = (hud.children ?? []).map((c) => ({ node: c, rect: place(c, W, H) }));
        const labels = kids.filter((k) => !/Button|BtnOpen/.test(k.node.name));
        const buttons = kids.filter((k) => /Button|BtnOpen/.test(k.node.name));
        assert.equals(8, buttons.length);
        const textBottom = Math.max(...labels.map((l) => l.rect.y + l.rect.h));
        for (const b of buttons) {
            assert.isTrue(b.rect.y >= textBottom, `${b.node.name} 壓到季度文字`);
            assert.isTrue(b.rect.y + b.rect.h <= H && b.rect.x >= 0 && b.rect.x + b.rect.w <= W, `${b.node.name} 超出卡片`);
        }
        for (let i = 0; i < buttons.length; i++) {
            for (let j = i + 1; j < buttons.length; j++) {
                assert.isFalse(overlap(buttons[i].rect, buttons[j].rect), `${buttons[i].node.name} 與 ${buttons[j].node.name} 重疊`);
            }
        }
    });

    return suite;
}
