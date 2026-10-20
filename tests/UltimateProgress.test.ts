/**
 * UltimateProgress.test.ts — 五階奧義名聲與事蹟讀取（PROG-2-0738）headless 測試
 *
 * 鎖住：缺欄位、NaN、負數一律當 0；合法值原樣讀出（取整數）；讀出的結果可直接餵 checkNextStage。
 */
import { TestSuite, assert } from './TestRunner';
import { ultimateProgressOf } from '../assets/scripts/core/systems/UltimateProgress';
import { checkNextStage, initialUltimateState } from '../assets/scripts/core/systems/BloodlineTransmissionUltimate';

export function createUltimateProgressSuite(): TestSuite {
    const suite = new TestSuite('UltimateProgress (五階奧義名聲與事蹟讀取 PROG-2-0738)');

    suite.test('缺欄位、NaN、負數一律當 0', () => {
        const progress = ultimateProgressOf({ fame: Number.NaN, incidents: -3 });
        assert.equals(0, progress.fame);
        assert.equals(0, progress.incidents);
        assert.equals(0, progress.epicIncidents);
        assert.equals(0, ultimateProgressOf(undefined).fame);
    });

    suite.test('合法值原樣讀出，小數取整數', () => {
        const progress = ultimateProgressOf({ fame: 120.9, incidents: 2, epicIncidents: 1 });
        assert.equals(120, progress.fame);
        assert.equals(2, progress.incidents);
        assert.equals(1, progress.epicIncidents);
    });

    suite.test('讀出的結果可直接判定下一階（暫定 0 時第 2 階名聲不足）', () => {
        const check = checkNextStage({ stageCap: 5, stageCurrent: 1 }, ultimateProgressOf(undefined));
        assert.isFalse(check.ok);
        assert.equals('FAME_SHORT', check.ok ? '' : check.reason);
        assert.equals(1, initialUltimateState().stageCurrent);
    });

    return suite;
}
