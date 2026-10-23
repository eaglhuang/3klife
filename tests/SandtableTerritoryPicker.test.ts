/**
 * SandtableTerritoryPicker.test.ts — 天下沙盤領地選擇的列狀態與文字（PROG-2-0967）
 *
 * 鎖住：已放置／可放置／不可放置三種狀態、上限已滿時全部不可放置、未解鎖時全部不可放置，
 * 以及彈窗文字的路徑都存在於 sandtable-territory-main.json。
 *
 * Unity 對照：Presenter 的 EditMode 測試，只驗列狀態與 Label 字串。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { sandtableTerritories } from '../assets/scripts/core/systems/SandtableTerritories';
import {
    buildSandtableTerritoryPickerTexts,
    sandtableTerritoryRowStates,
    SANDTABLE_PICKER_ROWS,
} from '../assets/scripts/core/systems/SandtableTerritoryPicker';

interface LayoutNode {
    readonly name: string;
    readonly children?: LayoutNode[];
}

function layoutNamePaths(): Set<string> {
    const layoutPath = path.join(__dirname, '..', 'assets', 'resources', 'ui-spec', 'layouts', 'sandtable-territory-main.json');
    const layout = JSON.parse(fs.readFileSync(layoutPath, 'utf8')) as { root: LayoutNode };
    const paths = new Set<string>();
    const walk = (node: LayoutNode, prefix: string): void => {
        const current = prefix ? `${prefix}/${node.name}` : node.name;
        paths.add(current);
        for (const child of node.children ?? []) walk(child, current);
    };
    for (const child of layout.root.children ?? []) walk(child, '');
    return paths;
}

const nameOf = (id: string): string => `名${id}`;

export function createSandtableTerritoryPickerSuite(): TestSuite {
    const suite = new TestSuite('SandtableTerritoryPicker (沙盤領地選擇 PROG-2-0967)');

    suite.test('S1 有名額時：已放置的領地為已放置，其餘為可放置', () => {
        const rows = sandtableTerritoryRowStates(sandtableTerritories(), ['sili'], 'S1');
        assert.equals('placed', rows[0].state);
        assert.equals('available', rows[1].state);
    });

    suite.test('上限已滿時：未放置的領地也不可放置，已放置的仍標示已放置', () => {
        const rows = sandtableTerritoryRowStates(sandtableTerritories(), ['sili', 'yu', 'yan'], 'S1');
        assert.equals('placed', rows[0].state);
        assert.equals('unavailable', rows[3].state);
    });

    suite.test('未解鎖（stage 為 null）時全部不可放置', () => {
        const rows = sandtableTerritoryRowStates(sandtableTerritories(), [], null);
        assert.isTrue(rows.every(row => row.state === 'unavailable'));
    });

    suite.test('文字：列數固定 13，空列為占位，底部提示含階段與標記數', () => {
        const rows = sandtableTerritoryRowStates(sandtableTerritories(), ['sili'], 'S1');
        const texts = buildSandtableTerritoryPickerTexts(rows, nameOf, 'S1', 1);
        assert.equals(SANDTABLE_PICKER_ROWS, sandtableTerritories().length);
        assert.equals('名sili', texts['DialogCard/ScrollView/ScrollContent/Row0/NameLabel']);
        assert.equals('已放置', texts['DialogCard/ScrollView/ScrollContent/Row0/StateLabel']);
        assert.equals('階段 S1｜標記 1/3，每領地最多一個', texts['DialogCard/FooterBar/HintLabel']);
    });

    suite.test('所有文字路徑都存在於 sandtable-territory-main.json（setTextsByPath 寫得進去）', () => {
        const rows = sandtableTerritoryRowStates(sandtableTerritories(), [], 'S1');
        const names = layoutNamePaths();
        const missing = Object.keys(buildSandtableTerritoryPickerTexts(rows, nameOf, 'S1', 0)).filter(key => !names.has(key));
        assert.equals(0, missing.length);
    });

    return suite;
}
