/**
 * TroopPanelPresenter — 城市兵源與出征軍勢面板列的 headless 測試（PROG-2-0249，TSK-11）
 */
import { assert, TestSuite } from './TestRunner';
import { buildTroopPanelRows } from '../assets/scripts/core/systems/TroopPanelPresenter';
import type { SortieSummary } from '../assets/scripts/core/systems/SortieDeploy';

const sortie = {
    poolMax: 8000, poolRemaining: 5200, returnedTroops: 2100, lostTroops: 700,
} as unknown as SortieSummary;

export function createTroopPanelPresenterSuite(): TestSuite {
    const suite = new TestSuite('TroopPanelPresenter (城市兵源與出征軍勢面板 TSK-11)');

    suite.test('治理頁（沒有出征資料）只回傳城市兵源列', () => {
        const rows = buildTroopPanelRows({ cityTroops: 9000, cityTroopsCap: 12000 });
        assert.equals(1, rows.length);
        assert.equals('city', rows[0].key);
        assert.equals('9000 / 12000', rows[0].value);
    });

    suite.test('出征後加上軍勢、返還與戰損列，數值與出征結算一致', () => {
        const rows = buildTroopPanelRows({ cityTroops: 9000, cityTroopsCap: 12000 }, sortie);
        assert.equals(4, rows.length);
        assert.equals('5200 / 8000', rows.find((r) => r.key === 'pool')?.value ?? '');
        assert.equals('2100', rows.find((r) => r.key === 'returned')?.value ?? '');
        assert.equals('700', rows.find((r) => r.key === 'lost')?.value ?? '');
    });

    return suite;
}
