/**
 * TallyFoodShortage.test.ts — 虎符糧不足 8 折（兵種（虎符）系統 TRP-12）headless 測試（PROG-2-0331）
 *
 * 規則（PM 暫定 2026-10-14）：季結算前剩餘糧草 < 50 → 只打折季後「第一場」出征的虎符糧耗，8 折無條件捨去。
 *
 * Unity 對照：EditMode Test 直接驗證出征帳本的扣糧，再用 GameSession 驗證季末標記只消耗一次。
 */
import { assert, TestSuite } from './TestRunner';
import {
    applyDeploy,
    checkDeploy,
    createSortieState,
    getDeployCost,
    TALLY_SHORTAGE_FOOD_THRESHOLD,
} from '../assets/scripts/core/systems/SortieDeploy';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';

const SSR3 = { troopType: 'infantry', tally: { quality: 'SSR', star: 3 } } as const;

function sortieWith(discount: boolean) {
    return createSortieState({
        commandCapacity: 20000,
        cityTroops: 20000,
        stageSortieCap: 20000,
        food: 1000,
        tallyFoodDiscount: discount,
    });
}

export function createTallyFoodShortageSuite(): TestSuite {
    const suite = new TestSuite('TallyFoodShortage (虎符糧不足 8 折 TRP-12)');

    suite.test('門檻為 50，8 折無條件捨去', () => {
        assert.equals(50, TALLY_SHORTAGE_FOOD_THRESHOLD);
        // SSR★3 基礎糧耗 92 → 92 × 0.8 = 73.6 → 73
        assert.equals(92, getDeployCost(SSR3).foodCost);
        assert.equals(73, checkDeploy(sortieWith(true), SSR3).cost.foodCost);
    });

    suite.test('沒有折扣標記時維持原糧耗', () => {
        assert.equals(92, checkDeploy(sortieWith(false), SSR3).cost.foodCost);
    });

    suite.test('折扣只套在虎符部隊，普通步兵糧耗不變', () => {
        const infantry = { troopType: 'infantry' } as const;
        assert.equals(
            getDeployCost(infantry).foodCost,
            checkDeploy(sortieWith(true), infantry).cost.foodCost,
        );
    });

    suite.test('部署成功時依折後糧耗扣糧草', () => {
        const applied = applyDeploy(sortieWith(true), 'unit-1', SSR3);
        assert.isTrue(applied.ok);
        assert.equals(1000 - 73, applied.state.food);
        assert.equals(73, applied.state.foodSpent);
    });

    suite.test('GameSession：季末糧 < 50 時標記下一場，消耗一次後清除', async () => {
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([]));
        (session as unknown as { _military: { food: number } })._military.food = TALLY_SHORTAGE_FOOD_THRESHOLD - 1;
        await session.advanceSeason();
        assert.isTrue(session.consumeTallyFoodDiscount());
        assert.isFalse(session.consumeTallyFoodDiscount());
    });

    suite.test('GameSession：季末糧 ≥ 50 時不標記', async () => {
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([]));
        (session as unknown as { _military: { food: number } })._military.food = TALLY_SHORTAGE_FOOD_THRESHOLD;
        await session.advanceSeason();
        assert.isFalse(session.consumeTallyFoodDiscount());
    });

    return suite;
}
