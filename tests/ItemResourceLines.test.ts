/**
 * ItemResourceLines.test.ts — 糧草告急、安胎藥、囚犯傳家寶提示句（PROG-2-1774）
 *
 * Unity 對照：EditMode Test，驗季結算 payload 與道具背包訊息，不開 Scene。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { ITEM_FERTILITY, ITEM_REFRESH } from '../assets/scripts/core/systems/PlayerInventory';
import { prisonTreasureLine, rollPrisonTreasureDonors, rollPrisonTreasures, type PrisonEntry } from '../assets/scripts/core/systems/PrisonerOfWar';
import { FOOD_LOW_LINE } from '../assets/scripts/core/systems/ResourceCap';
import { ItemBagController } from '../assets/scripts/ui/core/ItemBagController';
import type { ItemUseResult } from '../assets/scripts/core/systems/ItemUseFlow';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const PRISONER: PrisonEntry = { targetUid: 'p', targetName: '于禁', imprisonedSeason: 0, yieldPerSeason: { intel: 0, resource: 0 } };

function setup(): GameSession {
    const session = new GameSession();
    const roster = [{ id: 'a', name: 'a', faction: 'shu', gender: '男', age: 20, hp: 1000, maxLifespan: 70 } as unknown as GeneralConfig];
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setAutoSave(false);
    session.setGovernanceEventRandom(() => 0.99);
    return session;
}

function bagMessage(itemId: string, result: ItemUseResult): string {
    const controller = new ItemBagController({ inventory: () => ({ [itemId]: 1 }), useItem: () => result, now: () => 0 });
    controller.select(0);
    controller.requestUse();
    controller.confirmUse();
    return controller.getFlowView().texts.bagMessage;
}

export function createItemResourceLinesSuite(): TestSuite {
    const suite = new TestSuite('ItemResourceLines');

    suite.test('傳家寶掉落：回傳交出的俘虜，數量與舊函式一致', () => {
        assert.equals('于禁', rollPrisonTreasureDonors([PRISONER], () => 0)[0].targetName);
        assert.equals(0, rollPrisonTreasureDonors([PRISONER], () => 0.99).length);
        assert.equals(2, rollPrisonTreasures([PRISONER, PRISONER], () => 0));
        assert.equals('囚犯 于禁 交出了一件傳家寶：傳家寶物', prisonTreasureLine('于禁', '傳家寶物'));
    });

    suite.test('季末糧草低於門檻才出現告急句', async () => {
        const session = setup();
        session.setRandomSource(() => 0.99);
        const internal = session as unknown as { _military: { food: number } };
        internal._military = { ...internal._military, food: 10 };
        assert.equals(FOOD_LOW_LINE, (await session.advanceSeason()).foodLowLine);
        internal._military = { ...internal._military, food: 500 };
        assert.isTrue((await session.advanceSeason()).foodLowLine === undefined);
    });

    suite.test('換季 payload 帶囚犯傳家寶句', async () => {
        const session = setup();
        session.setRandomSource(() => 0.01);
        const internal = session as unknown as { _prison: { prisoners: PrisonEntry[] } };
        internal._prison = { ...internal._prison, prisoners: [PRISONER] };
        const lines = (await session.advanceSeason()).prisonTreasureLines ?? [];
        assert.equals(1, lines.length);
        assert.isTrue(lines[0].startsWith('囚犯 于禁 交出了一件傳家寶：'));
        assert.isTrue(session.itemCount('ITEM_TREASURE') >= 1);
    });

    suite.test('安胎藥顯示規格句，其他道具維持原提示', () => {
        assert.equals('安胎藥服下，此次結緣成功率大增！', bagMessage(ITEM_FERTILITY, { ok: true, inventory: {}, fertilityMultiplier: 2 }));
        assert.equals('已使用 刷新券', bagMessage(ITEM_REFRESH, { ok: true, inventory: {} }));
    });

    return suite;
}
