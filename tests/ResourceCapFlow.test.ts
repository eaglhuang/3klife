/**
 * ResourceCapFlow.test.ts — 基礎資源上限統一走 ResourceCap（ECO-11，PROG-2-1010）
 *
 * Unity 對照：像 PlayMode 測試把同一張上限表接到軍備與名聲兩個面板，連續幾季內政後看數值一直被夾在上限內。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { BASE_RESOURCE_CAPS } from '../assets/scripts/core/systems/ResourceCap';
import { STARTER_MILITARY } from '../assets/scripts/core/systems/MilitaryReserve';

export function createResourceCapFlowSuite(): TestSuite {
    const suite = new TestSuite('ResourceCapFlow (ECO-11 多回合上限)');

    suite.test('開新局：軍備上限與名聲上限取 ResourceCap，兵源起始值不超過上限', () => {
        const session = new GameSession(1);
        assert.equals(BASE_RESOURCE_CAPS.food, session.military.foodCap);
        assert.equals(BASE_RESOURCE_CAPS.troops, session.military.cityTroopsCap);
        assert.equals(STARTER_MILITARY.cityTroopsCap, session.military.cityTroops);
        assert.isTrue(session.military.cityTroops <= BASE_RESOURCE_CAPS.troops);
    });

    suite.test('連續多季外交：名聲逐季累加，但永遠夾在 2000 上限內', async () => {
        const session = new GameSession(1);
        let last = 0;
        for (let season = 0; season < 60; season++) {
            const result = await session.chooseDomesticTask('diplomacy');
            assert.isTrue(result.ok, `第 ${season} 季外交應可選`);
            assert.isTrue(session.fame <= BASE_RESOURCE_CAPS.fame, `第 ${season} 季名聲不超過上限`);
            assert.isTrue(session.fame >= last, '名聲只增不減');
            last = session.fame;
            await session.advanceSeason();
        }
        assert.equals(BASE_RESOURCE_CAPS.fame, session.fame, '累積到上限即停在 2000');
    });

    return suite;
}
