/**
 * M5ViewSpec.test.ts — M5 戰場 View 層 headless 測試（PROG-2-0081~0083）
 *
 * 不開 Cocos 編輯器：驗 ui-spec JSON 有程式會查找的節點路徑、screen 有路由，
 * 再驗 Presenter（純邏輯）輸出的文字。
 * Unity 對照：EditMode Test 檢查 Prefab 階層有 SerializeField 綁定的子物件，再測 Presenter。
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';
import { buildBattleRecordTabText } from '../assets/scripts/core/systems/BattleRecordStats';

const UI_SPEC = path.resolve(__dirname, '../assets/resources/ui-spec');

interface SpecNode { name?: string; children?: SpecNode[] }

function readSpec<T = SpecNode>(rel: string): T {
    return JSON.parse(fs.readFileSync(path.join(UI_SPEC, rel), 'utf8')) as T;
}

function findPath(root: SpecNode, nodePath: string): SpecNode | null {
    let current: SpecNode | null = root;
    for (const segment of nodePath.split('/')) {
        current = current?.children?.find((c) => c.name === segment) ?? null;
        if (!current) return null;
    }
    return current;
}

function findByName(root: SpecNode, name: string): SpecNode | null {
    if (root.name === name) return root;
    for (const child of root.children ?? []) {
        const hit = findByName(child, name);
        if (hit) return hit;
    }
    return null;
}

export function createM5ViewSpecSuite(): TestSuite {
    const suite = new TestSuite('M5ViewSpec');

    suite.test('0081 戰績分頁：unified 版面有「戰」按鈕、screen 有 Record 路由、fragment 有子面板要的 Label', () => {
        const layout = readSpec<{ root?: SpecNode } & SpecNode>('layouts/general-detail-unified-main.json');
        const tabBar = findByName(layout.root ?? layout, 'RightTabBar');
        assert.isTrue(!!tabBar && !!findPath(tabBar, 'BtnTabRecord/Label'), 'RightTabBar/BtnTabRecord');
        assert.equals(7, tabBar!.children!.length, '七個分頁按鈕');
        const screen = readSpec<{ tabRouting: Record<string, { slotId: string; fragment: string }> }>('screens/general-detail-unified-screen.json');
        assert.equals('fragments/layouts/gd-tab-record', screen.tabRouting.Record?.fragment);
        assert.equals('ContentSlot', screen.tabRouting.Record?.slotId);
        const fragment = readSpec('fragments/layouts/gd-tab-record.json');
        assert.equals('TabRecordContent', fragment.name);
        for (const p of ['SummaryCard/CareerValue', 'SummaryCard/WinRateValue', 'StatsCard/StatsValue', 'MilestoneCard/MilestoneValue', 'RetireCard/RetireValue']) {
            assert.isTrue(!!findPath(fragment, p), `fragment 缺 ${p}`);
        }
    });

    suite.test('0081 戰績分頁文字：沒出征過顯示「尚未出征」，有戰績時列出五項與里程碑', () => {
        const empty = buildBattleRecordTabText(undefined);
        assert.equals('尚未出征', empty.career);
        assert.equals('勝率 —', empty.winRate);
        assert.isTrue(empty.stats.includes('勝場：0'));
        assert.equals('里程碑：尚未達成', empty.milestones);
        assert.equals('退役評價：N', empty.retire);

        const veteran = buildBattleRecordTabText({ wins: 30, losses: 10, draws: 0, kills: 1200, totalDamage: 123456, guardianPower: 5000, milestones: ['KILL_100', 'KILL_1000'] });
        assert.equals('生涯戰績：30勝 10敗 斬1200人', veteran.career);
        assert.equals('勝率 75%', veteran.winRate);
        assert.isTrue(veteran.stats.includes('傷害總量：123,456'), veteran.stats);
        assert.equals(5, veteran.stats.split('\n').length);
        assert.equals('里程碑：百人斬、千人斬', veteran.milestones);
        assert.equals('退役評價：R', veteran.retire, `retire ${veteran.retire}`);
    });

    return suite;
}
