/**
 * GovernanceEfficiencyItem — 治理效率道具（GOV-14，PROG-2-2134）
 */
import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { DOMESTIC_TASK_IDS } from '../assets/scripts/core/systems/DomesticTasks';
import {
    GOVERNANCE_EFFICIENCY_ITEMS,
    governanceBoostMultiplier,
    normalizeGovernanceBoosts,
    planGovernanceBoost,
} from '../assets/scripts/core/systems/GovernanceEfficiencyItem';
import { ITEM_GOV_BOOST_COMMERCE, ITEM_GOV_BOOST_FARMING, itemDefOf } from '../assets/scripts/core/systems/ItemDef';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function setup(adapter = new MemoryStorageAdapter()): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([{ id: 'a', name: 'a', faction: 'shu', gender: '男', age: 20, hp: 1000, maxLifespan: 70 } as unknown as GeneralConfig]));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setAutoSave(false);
    return session;
}

export function createGovernanceEfficiencyItemSuite(): TestSuite {
    const suite = new TestSuite('GovernanceEfficiencyItem');

    suite.test('道具只提升對應任務的當季倍率', () => {
        const boosts = [{ itemId: ITEM_GOV_BOOST_FARMING, season: 3 }];
        assert.equals(1.2, governanceBoostMultiplier(boosts, 'farming', 3));
        assert.equals(1, governanceBoostMultiplier(boosts, 'commerce', 3));
        assert.equals(1, governanceBoostMultiplier(boosts, 'farming', 4));
    });

    suite.test('同任務同季不可重複，其他任務可以', () => {
        const first = planGovernanceBoost([], ITEM_GOV_BOOST_FARMING, 3);
        assert.isTrue(first.ok);
        if (!first.ok) return;
        const again = planGovernanceBoost(first.boosts, ITEM_GOV_BOOST_FARMING, 3);
        assert.isFalse(again.ok);
        assert.isTrue(planGovernanceBoost(first.boosts, ITEM_GOV_BOOST_COMMERCE, 3).ok);
    });

    suite.test('下一季可再用，過季效果會被清掉', () => {
        const plan = planGovernanceBoost([{ itemId: ITEM_GOV_BOOST_FARMING, season: 3 }], ITEM_GOV_BOOST_FARMING, 4);
        assert.isTrue(plan.ok);
        if (plan.ok) assert.equals(1, plan.boosts.length);
    });

    suite.test('未知道具被拒絕', () => {
        const plan = planGovernanceBoost([], 'ITEM_REFRESH', 3);
        assert.isFalse(plan.ok);
        if (!plan.ok) assert.equals('unknown-item', plan.reason);
    });

    suite.test('讀檔丟掉壞資料', () => {
        const good = { itemId: ITEM_GOV_BOOST_FARMING, season: 3 };
        assert.equals(1, normalizeGovernanceBoosts([good, { itemId: '假的', season: 1 }, { itemId: ITEM_GOV_BOOST_FARMING, season: 'x' }, null]).length);
        assert.equals(0, normalizeGovernanceBoosts('壞資料').length);
    });

    suite.test('五個內政任務都有道具，也都有道具定義', () => {
        const items = Object.keys(GOVERNANCE_EFFICIENCY_ITEMS);
        for (const task of DOMESTIC_TASK_IDS) {
            assert.isTrue(items.some((id) => GOVERNANCE_EFFICIENCY_ITEMS[id].task === task), task);
        }
        assert.isTrue(items.every((id) => itemDefOf(id) !== null));
    });

    suite.test('沒有道具不能用，用了扣一個並計入產出倍率', async () => {
        const session = setup();
        const none = await session.useGovernanceEfficiencyItem(ITEM_GOV_BOOST_FARMING);
        assert.isFalse(none.ok);
        if (!none.ok) assert.equals('no-item', none.reason);

        const base = session.domesticOutputMultiplier('farming');
        await session.addItem(ITEM_GOV_BOOST_FARMING, 2);
        assert.isTrue((await session.useGovernanceEfficiencyItem(ITEM_GOV_BOOST_FARMING)).ok);
        assert.equals(1, session.itemCount(ITEM_GOV_BOOST_FARMING));
        assert.isTrue(Math.abs(session.domesticOutputMultiplier('farming') - base * 1.2) < 1e-9);
        assert.equals(session.domesticOutputMultiplier('commerce'), 1);

        const again = await session.useGovernanceEfficiencyItem(ITEM_GOV_BOOST_FARMING);
        assert.isFalse(again.ok);
        assert.equals(1, session.itemCount(ITEM_GOV_BOOST_FARMING));
    });

    suite.test('效果會存檔，讀回後倍率不變', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = setup(adapter);
        await session.addItem(ITEM_GOV_BOOST_FARMING, 1);
        await session.useGovernanceEfficiencyItem(ITEM_GOV_BOOST_FARMING);
        const expected = session.domesticOutputMultiplier('farming');
        await session.save();
        const loaded = setup(adapter);
        await loaded.load();
        assert.isTrue(Math.abs(loaded.domesticOutputMultiplier('farming') - expected) < 1e-9);
    });

    return suite;
}
