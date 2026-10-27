/**
 * ItemUseFlow.test.ts — 道具使用流程：刷新券與安胎藥（PROG-2-1038，ITM-04b）
 *
 * 鎖住：刷新券使用後傭兵池與救美冷卻到期並扣一張；安胎藥扣一張並記下 armed；
 * 數量不足給商城導向提示；已 armed 不重複累加；不支援的道具（含原型屬性名）不接受。
 */
import { assert, TestSuite } from './TestRunner';
import { useItem } from '../assets/scripts/core/systems/ItemUseFlow';
import { isFemalePoolRefreshDue } from '../assets/scripts/core/systems/FemalePoolRefresh';
import { isRescueRefreshDue } from '../assets/scripts/core/systems/DungeonRescue';
import { ITEM_FERTILITY, ITEM_FERTILITY_ARMED, ITEM_REFRESH } from '../assets/scripts/core/systems/PlayerInventory';

const NOW_MS = Date.UTC(2026, 9, 27, 12, 0, 0);
const ONE_HOUR_MS = 60 * 60 * 1000;

export function createItemUseFlowSuite(): TestSuite {
    const suite = new TestSuite('ItemUseFlow (道具使用流程 ITM-04b PROG-2-1038)');

    suite.test('刷新券：扣一張，傭兵池與救美冷卻皆到期', () => {
        const result = useItem({ [ITEM_REFRESH]: 2 }, ITEM_REFRESH, NOW_MS);
        assert.isTrue(result.ok);
        if (!result.ok || !result.refresh) return;
        assert.equals(1, result.inventory[ITEM_REFRESH] ?? 0);
        assert.isTrue(isFemalePoolRefreshDue(result.refresh.femalePoolLastRefreshMs, NOW_MS));
        assert.isTrue(isRescueRefreshDue(result.refresh.dungeonRescueLastRefreshMs, NOW_MS));
    });

    suite.test('刷新券數量不足：回傳商城導向提示，背包不變', () => {
        const result = useItem({}, ITEM_REFRESH, NOW_MS);
        assert.isTrue(!result.ok && result.reason === 'LACK');
        if (result.ok || result.reason !== 'LACK') return;
        assert.equals('刷新券 不足，是否前往商城？', result.prompt.text);
    });

    suite.test('安胎藥：扣一張並記下 armed，受孕倍率為 1.5', () => {
        const result = useItem({ [ITEM_FERTILITY]: 1 }, ITEM_FERTILITY, NOW_MS);
        assert.isTrue(result.ok);
        if (!result.ok) return;
        assert.equals(0, result.inventory[ITEM_FERTILITY] ?? 0);
        assert.equals(1, result.inventory[ITEM_FERTILITY_ARMED] ?? 0);
        assert.equals(1.5, result.fertilityMultiplier ?? 0);
    });

    suite.test('安胎藥已 armed 時再用，回傳 ALREADY_ARMED 且背包不變', () => {
        const inventory = { [ITEM_FERTILITY]: 2, [ITEM_FERTILITY_ARMED]: 1 };
        const result = useItem(inventory, ITEM_FERTILITY, NOW_MS);
        assert.isTrue(!result.ok && result.reason === 'ALREADY_ARMED');
        assert.equals(2, inventory[ITEM_FERTILITY]);
    });

    suite.test('不支援的道具與原型屬性名稱都回傳 NOT_USABLE', () => {
        assert.isTrue(!useItem({}, 'ITEM_TRIAL_TICKET', NOW_MS).ok);
        assert.isTrue(!useItem({}, 'toString', NOW_MS).ok);
        const result = useItem({}, 'constructor', NOW_MS);
        assert.isTrue(!result.ok && result.reason === 'NOT_USABLE');
    });

    suite.test('刷新券使用後一小時內再用，仍是到期狀態（重抽由既有流程負責）', () => {
        const result = useItem({ [ITEM_REFRESH]: 1 }, ITEM_REFRESH, NOW_MS + ONE_HOUR_MS);
        assert.isTrue(result.ok);
        if (!result.ok || !result.refresh) return;
        assert.isTrue(isFemalePoolRefreshDue(result.refresh.femalePoolLastRefreshMs, NOW_MS + ONE_HOUR_MS));
    });

    return suite;
}
