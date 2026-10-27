/**
 * ItemRefreshEffect.test.ts — 刷新券讓傭兵池與救美任務冷卻到期（PROG-2-1033，ITM-04b）
 *
 * 鎖住：使用後兩個冷卻都判為到期；效果值非正數時派發失敗；派發失敗不產生新時間戳。
 */
import { assert, TestSuite } from './TestRunner';
import { applyRefreshItem } from '../assets/scripts/core/systems/ItemRefreshEffect';
import { isFemalePoolRefreshDue } from '../assets/scripts/core/systems/FemalePoolRefresh';
import { isRescueRefreshDue } from '../assets/scripts/core/systems/DungeonRescue';

const NOW_MS = Date.UTC(2026, 9, 27, 12, 0, 0);
const ONE_HOUR_MS = 60 * 60 * 1000;

export function createItemRefreshEffectSuite(): TestSuite {
    const suite = new TestSuite('ItemRefreshEffect (刷新券 REFRESH ITM-04b)');

    suite.test('剛刷新過的傭兵池與救美任務，使用刷新券後立即到期', () => {
        const justRefreshed = NOW_MS - ONE_HOUR_MS;
        assert.isFalse(isFemalePoolRefreshDue(justRefreshed, NOW_MS));
        assert.isFalse(isRescueRefreshDue(justRefreshed, NOW_MS));

        const result = applyRefreshItem(1, { nowMs: NOW_MS });
        assert.isTrue(result.ok);
        if (!result.ok) return;
        assert.isTrue(isFemalePoolRefreshDue(result.result.femalePoolLastRefreshMs, NOW_MS));
        assert.isTrue(isRescueRefreshDue(result.result.dungeonRescueLastRefreshMs, NOW_MS));
    });

    suite.test('效果值非正數時派發失敗，呼叫端不會拿到新時間戳', () => {
        const zero = applyRefreshItem(0, { nowMs: NOW_MS });
        assert.isTrue(!zero.ok && zero.reason === 'INVALID_VALUE');
        const negative = applyRefreshItem(-1, { nowMs: NOW_MS });
        assert.isTrue(!negative.ok && negative.reason === 'INVALID_VALUE');
    });

    suite.test('時鐘回撥時仍然判為到期，不會把池子鎖住', () => {
        const result = applyRefreshItem(1, { nowMs: 0 });
        assert.isTrue(result.ok);
        if (!result.ok) return;
        assert.isTrue(isFemalePoolRefreshDue(result.result.femalePoolLastRefreshMs, 0));
        assert.isTrue(isRescueRefreshDue(result.result.dungeonRescueLastRefreshMs, 0));
    });

    return suite;
}
