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

    suite.test('.json 與 .layout.json 內容一致', () => {
        assert.equals(JSON.stringify(root), JSON.stringify(load('lobby-hall-screen.layout.json')));
    });

    return suite;
}
