/**
 * MentorCardLayout.test.ts — 教官卡詳情版面對應（MENT-13 cc 接線）headless 測試
 *
 * Unity 對照：像 Prefab 的 EditMode 檢查，確認 ViewModel 輸出的每個欄位都對得到版面節點，
 * 且版面用到的皮膚 / 文字樣式都在預設樣式表內有定義。
 */
import { TestSuite, assert } from './TestRunner';
import {
    buildMentorCardTabView,
    toMentorCardLayoutState,
    type MentorCardData,
} from '../assets/scripts/core/systems/MentorCardTabs';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');

function readJson<T>(rel: string): T {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')) as T;
}

interface LayoutNode { id?: string; skinSlot?: string; styleSlot?: string; children?: LayoutNode[] }

function collect(node: LayoutNode, ids: Set<string>, slots: Set<string>): void {
    if (node.id) ids.add(node.id);
    if (node.skinSlot) slots.add(node.skinSlot);
    if (node.styleSlot) slots.add(node.styleSlot);
    for (const child of node.children ?? []) collect(child, ids, slots);
}

const CARD: MentorCardData = {
    star: 2,
    effects: [{ id: 'E1', label: '武力加成' }],
    events: [1, 2, 3].map((group) => ({ id: `EV${group}`, group, skillName: `戰法${group}` })),
    stories: [{ id: 'S1', title: '對話一' }],
};

export function createMentorCardLayoutSuite(): TestSuite {
    const suite = new TestSuite('MentorCardLayout (教官卡詳情版面 MENT-13 cc 接線)');

    suite.test('每個 texts / actives key 都對得到版面節點 id', () => {
        const layout = readJson<{ root: LayoutNode }>('assets/resources/ui-spec/layouts/mentor-card-detail-main.json');
        const ids = new Set<string>();
        collect(layout.root, ids, new Set<string>());
        for (const tab of ['effects', 'events', 'story'] as const) {
            const state = toMentorCardLayoutState(buildMentorCardTabView(CARD, tab), '武將');
            for (const key of [...Object.keys(state.texts), ...Object.keys(state.actives)]) {
                assert.isTrue(ids.has(key), `版面缺少節點 ${key}`);
            }
        }
    });

    suite.test('版面用到的皮膚與樣式 slot 都在 nurture-flow-default.json 定義', () => {
        const layout = readJson<{ root: LayoutNode }>('assets/resources/ui-spec/layouts/mentor-card-detail-main.json');
        const slots = new Set<string>();
        collect(layout.root, new Set<string>(), slots);
        const defaults = JSON.stringify(readJson<unknown>('assets/resources/ui-spec/skins/nurture-flow-default.json'));
        for (const slot of slots) {
            assert.isTrue(defaults.includes(`"${slot}"`), `未定義的 slot ${slot}`);
        }
    });

    suite.test('頁籤切換：目前頁籤名稱加「▸」，列格依列數顯示', () => {
        const state = toMentorCardLayoutState(buildMentorCardTabView(CARD, 'events'), '武將');
        assert.equals('▸ 培育事件', state.texts.tabEventsLabel);
        assert.equals('支援效果', state.texts.tabEffectsLabel);
        assert.isTrue(state.actives.row_2);
        assert.isFalse(state.actives.row_3);
    });

    return suite;
}
