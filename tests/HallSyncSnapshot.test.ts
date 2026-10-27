/**
 * HallSyncSnapshot.test.ts — 大廳伺服端同步列（HALL-14，PROG-2-1257）headless 測試
 *
 * 鎖住：三塊狀態與更新時間往返不變、同步後情報度判定結果一致（整合）、
 * 單一 JSON 欄位壞掉時回報該欄位、缺時間欄時失敗、缺欄位時回報欄位名。
 */
import { assert, TestSuite } from './TestRunner';
import {
    buildHallSyncRow,
    parseHallSyncRow,
    type HallSyncRow,
    type HallSyncState,
} from '../assets/scripts/core/systems/HallSyncSnapshot';
import { getHallTaskIntelRevealPercent } from '../assets/scripts/core/systems/HallTaskIntel';

const STATE: HallSyncState = {
    theme: { period: 'EVENING', festival: null },
    missions: [
        { id: 'm-1', Intel_Reveal_Percent: 100, AI_Assign_Enabled: true },
        { id: 'm-2' },
    ],
    characters: ['zhao-yun', 'guan-yu'],
    updatedAt: '2026-10-27T11:00:00',
};

export function createHallSyncSnapshotSuite(): TestSuite {
    const suite = new TestSuite('HallSyncSnapshot (大廳伺服端同步列 HALL-14 PROG-2-1257)');

    suite.test('三塊狀態與更新時間往返不變', () => {
        const row = buildHallSyncRow(STATE);
        const result = parseHallSyncRow(row);
        assert.isTrue(result.ok);
        if (!result.ok) return;
        assert.equals(JSON.stringify(STATE.theme), JSON.stringify(result.state.theme));
        assert.equals(JSON.stringify(STATE.missions), JSON.stringify(result.state.missions));
        assert.equals(JSON.stringify(STATE.characters), JSON.stringify(result.state.characters));
        assert.equals(STATE.updatedAt, result.state.updatedAt);
    });

    suite.test('同步後情報度判定結果一致（整合）', () => {
        const result = parseHallSyncRow(buildHallSyncRow(STATE));
        assert.isTrue(result.ok);
        if (!result.ok) return;
        const missions = result.state.missions as Array<{ id: string; Intel_Reveal_Percent?: number; AI_Assign_Enabled?: boolean }>;
        assert.equals(100, getHallTaskIntelRevealPercent(missions[0]));
        assert.equals(50, getHallTaskIntelRevealPercent(missions[1]));
    });

    suite.test('單一 JSON 欄位壞掉時回報該欄位', () => {
        const row: HallSyncRow = { ...buildHallSyncRow(STATE), hall_mission_json: '[{bad' };
        const result = parseHallSyncRow(row);
        assert.isFalse(result.ok);
        if (result.ok) return;
        assert.equals(1, result.errors.length);
        assert.isTrue(result.errors[0].includes('hall_mission_json'));
    });

    suite.test('缺時間欄或缺 JSON 欄位時失敗並列出欄位', () => {
        const noTime = parseHallSyncRow({ ...buildHallSyncRow(STATE), hall_updated_at: '' });
        assert.isFalse(noTime.ok);

        const missing = parseHallSyncRow({ hall_theme_json: 'null', hall_updated_at: '2026-10-27T11:00:00' });
        assert.isFalse(missing.ok);
        if (missing.ok) return;
        assert.isTrue(missing.errors.some((e) => e.includes('hall_mission_json')));
        assert.isTrue(missing.errors.some((e) => e.includes('hall_character_json')));
    });

    return suite;
}
