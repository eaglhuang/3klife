/**
 * BloodlineUltimateState.test.ts — 五階奧義狀態欄位（PROG-2-0737）headless 測試
 *
 * 鎖住：缺欄位與超出範圍的值會夾回合法範圍；存檔快照往返後 roster 上的 bloodlineUltimate 保留。
 */
import { TestSuite, assert } from './TestRunner';
import { normalizeUltimateState } from '../assets/scripts/core/systems/BloodlineTransmissionUltimate';
import { createPlayerSaveSnapshot, validatePlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';
import { createInitialGameTimeState } from '../assets/scripts/core/systems/GameClock';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

export function createBloodlineUltimateStateSuite(): TestSuite {
    const suite = new TestSuite('BloodlineUltimateState (五階奧義狀態欄位 PROG-2-0737)');

    suite.test('缺欄位時補成初始值（上限 1、已點亮 1）', () => {
        assert.equals(1, normalizeUltimateState(undefined).stageCap);
        assert.equals(1, normalizeUltimateState({}).stageCurrent);
    });

    suite.test('超出範圍的值夾回 1..5，且已點亮不超過上限', () => {
        const high = normalizeUltimateState({ stageCap: 9, stageCurrent: 7 });
        assert.equals(5, high.stageCap);
        assert.equals(5, high.stageCurrent);
        const capped = normalizeUltimateState({ stageCap: 3, stageCurrent: 5 });
        assert.equals(3, capped.stageCurrent);
    });

    suite.test('存檔快照往返後 roster 的 bloodlineUltimate 保留', () => {
        const roster = [{ id: 'g1', bloodlineUltimate: { stageCap: 3, stageCurrent: 2 } } as unknown as GeneralConfig];
        const snapshot = createPlayerSaveSnapshot(createInitialGameTimeState(), roster, new Date(0));
        const restored = validatePlayerSaveSnapshot(JSON.parse(JSON.stringify(snapshot)));
        assert.equals(3, restored.roster[0].bloodlineUltimate!.stageCap!);
        assert.equals(2, restored.roster[0].bloodlineUltimate!.stageCurrent!);
    });

    return suite;
}
