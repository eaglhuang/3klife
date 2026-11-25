/**
 * LobbyHallLayout.test.ts — 幕府大廳版面：任務牆每一層都要有定位，底圖能蓋滿寬螢幕（PROG-2-2193）
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { hallBgCoverScale } from '../assets/scripts/core/systems/HallBackgroundFit';

interface SpecNode {
    name?: string;
    _ucufId?: string;
    width?: number;
    height?: number;
    layout?: unknown;
    widget?: { top?: number; left?: number; right?: number; bottom?: number; hCenter?: unknown; vCenter?: unknown };
    children?: SpecNode[];
}

const DIR = path.join(__dirname, '..', 'assets', 'resources', 'ui-spec', 'layouts');

function load(file: string): SpecNode {
    return JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8')).root as SpecNode;
}

function findById(node: SpecNode, id: string): SpecNode | null {
    if (node._ucufId === id) return node;
    for (const child of node.children ?? []) {
        const hit = findById(child, id);
        if (hit) return hit;
    }
    return null;
}

export function createLobbyHallLayoutSuite(): TestSuite {
    const suite = new TestSuite('LobbyHallLayout');
    const root = load('lobby-hall-screen.json');

    for (const id of ['wall-left', 'wall-right']) {
        suite.test(`${id} 的牆頭、任務列與列內文字都有定位，不會疊在同一點`, () => {
            const wall = findById(root, `lobby-hall-screen.${id}`)!;
            const kids = wall.children!;
            const tops = kids.slice(0, -1).map((k) => k.widget?.top);
            assert.equals(new Set(tops).size, tops.length);
            for (const k of kids) assert.isTrue(k.widget !== undefined || k.layout !== undefined);
            for (const row of kids.slice(1, -1)) {
                for (const cell of row.children!) assert.isTrue(cell.widget !== undefined);
                assert.isTrue(row.widget!.top! + row.height! <= wall.height! - kids[kids.length - 1].height!);
            }
        });

        suite.test(`${id} 維持節點順序（setWall 依序取牆頭、列、頁尾）`, () => {
            const kids = findById(root, `lobby-hall-screen.${id}`)!.children!;
            assert.equals(6, kids.length);
            assert.isTrue(kids[5].widget!.bottom !== undefined);
        });
    }

    suite.test('底圖置中；16:9 不放大，較寬的視窗放大到蓋滿', () => {
        const bg = findById(root, 'lobby-hall-screen.hall-bg')!;
        assert.isTrue(bg.widget!.hCenter !== undefined && bg.widget!.vCenter !== undefined);
        assert.equals(1, hallBgCoverScale(1920, 1080));
        assert.equals(1, hallBgCoverScale(1440, 1080));
        assert.equals(2224 / 1920, hallBgCoverScale(2224, 1080));
    });

    suite.test('推進一季鈕在右下角（PROG-2-9953），不與底欄、世家面板、信箱入口重疊', () => {
        const W = 1920, H = 1080;
        const rect = (n: SpecNode) => {
            const w = n.widget!;
            const hasL = w.left !== undefined, hasT = w.top !== undefined;
            const r = w.right !== undefined ? W - w.right : w.left! + n.width!;
            const b = w.bottom !== undefined ? H - w.bottom : w.top! + n.height!;
            return { l: hasL ? w.left! : r - n.width!, r, t: hasT ? w.top! : b - n.height!, b };
        };
        const overlap = (a: ReturnType<typeof rect>, b: ReturnType<typeof rect>) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
        const back = findById(root, 'lobby-hall-screen.back')!;
        assert.isTrue(back.widget!.right !== undefined && back.widget!.bottom !== undefined);
        assert.isTrue(back.widget!.right! <= 40 && back.widget!.bottom! <= 40);
        assert.isTrue(back.width! >= 160 && back.height! >= 64);
        const br = rect(back);
        for (const id of ['dock', 'clan', 'altar', 'wall-right']) assert.isFalse(overlap(br, rect(findById(root, `lobby-hall-screen.${id}`)!)));
        // 信箱入口（MindRequestPanel）：右 250、底 38、150x56，要貼在推進鈕左側
        const mail = { l: W - 250 - 150, r: W - 250, t: H - 38 - 56, b: H - 38 };
        assert.isFalse(overlap(br, mail));
        for (const id of ['dock', 'clan', 'altar']) assert.isFalse(overlap(mail, rect(findById(root, `lobby-hall-screen.${id}`)!)));
    });

    suite.test('.json 與 .layout.json 內容一致', () => {
        assert.equals(JSON.stringify(root), JSON.stringify(load('lobby-hall-screen.layout.json')));
    });

    return suite;
}
