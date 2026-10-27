/**
 * RivalTrade.test.ts — 與他國 AI 貿易（治理模式他國 AI 系統 E-6，PROG-2-1358）
 *
 * Unity 對照：EditMode Test，驗比率、門檻、結盟折扣、每季上限與 GameSession 入帳、存讀檔，不開 Scene。
 */
import { assert, TestSuite } from './TestRunner';
import { createRivalWorld, normalizeRivalWorld, type RivalWorld } from '../assets/scripts/core/systems/RivalNations';
import { tradeCost, tradeWithRival, TRADE_ROUTES, TRADES_PER_SEASON } from '../assets/scripts/core/systems/RivalTrade';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';

const rich = { food: 10000, gold: 10000, troops: 10000, fame: 10000 };

function withNation(id: string, patch: Record<string, unknown>): RivalWorld {
    const base = createRivalWorld();
    return { nations: base.nations.map((n) => (n.id === id ? { ...n, ...patch } : n)) };
}

export function createRivalTradeSuite(): TestSuite {
    const suite = new TestSuite('RivalTrade (他國貿易 PROG-2-1358)');

    suite.test('比率：2 糧換 1 金、3 糧換 1 兵、5 金換 1 名聲；反向進位最少 1；結盟打 8 折', () => {
        assert.equals(20, tradeCost(TRADE_ROUTES.foodToGold, 10, false));
        assert.equals(5, tradeCost(TRADE_ROUTES.goldToFood, 10, false));
        assert.equals(30, tradeCost(TRADE_ROUTES.foodToTroops, 10, false));
        assert.equals(50, tradeCost(TRADE_ROUTES.goldToFame, 10, false));
        assert.equals(1, tradeCost(TRADE_ROUTES.goldToFood, 1, false));
        assert.equals(16, tradeCost(TRADE_ROUTES.foodToGold, 10, true));
        assert.equals(40, tradeCost(TRADE_ROUTES.goldToFame, 10, true));
    });

    suite.test('邦交門檻與交戰：魏 -30 不可、蜀 20 可換兵、名聲需 40、交戰中拒絕', () => {
        const world = createRivalWorld();
        assert.isFalse(tradeWithRival(world, 'wei', 'foodToGold', 10, rich, 0).ok);
        assert.isTrue(tradeWithRival(world, 'shu', 'foodToTroops', 10, rich, 0).ok);
        assert.isFalse(tradeWithRival(world, 'shu', 'goldToFame', 10, rich, 0).ok);
        assert.isTrue(tradeWithRival(withNation('shu', { relation: 40 }), 'shu', 'goldToFame', 10, rich, 0).ok);
        assert.isFalse(tradeWithRival(withNation('shu', { atWar: true }), 'shu', 'foodToGold', 10, rich, 0).ok);
        assert.isFalse(tradeWithRival(world, 'shu', 'foodToGold', 10, { ...rich, food: 19 }, 0).ok, '糧草不足');
        assert.isFalse(tradeWithRival(world, 'shu', 'foodToGold', 0, rich, 0).ok, '數量至少 1');
    });

    suite.test('每季同一國最多 2 次，換季重置；他國不受影響；計數存讀檔保留', () => {
        let world = createRivalWorld();
        for (let i = 0; i < TRADES_PER_SEASON; i += 1) {
            const r = tradeWithRival(world, 'shu', 'foodToGold', 1, rich, 5);
            assert.isTrue(r.ok);
            world = r.world;
        }
        assert.isFalse(tradeWithRival(world, 'shu', 'foodToGold', 1, rich, 5).ok, '本季第 3 次');
        assert.isTrue(tradeWithRival(world, 'wu', 'foodToGold', 1, rich, 5).ok, '吳另計');
        assert.isTrue(tradeWithRival(world, 'shu', 'foodToGold', 1, rich, 6).ok, '下季重置');
        const reloaded = normalizeRivalWorld(JSON.parse(JSON.stringify(world)));
        assert.isFalse(tradeWithRival(reloaded, 'shu', 'foodToGold', 1, rich, 5).ok, '讀檔後仍滿');
    });

    suite.test('GameSession：糧草換黃金入錢包、黃金換名聲扣錢包、超過上限拒絕；存讀檔保留計數', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([]));
        session.setSaveService(new PlayerSaveService(adapter));
        session.setAutoSave(false);
        session.startNewGame(1);
        await session.setRivals(withNation('shu', { relation: 50, allied: true }));
        let gold = 100;
        const wallet = { get gold() { return gold; }, spend: (n: number) => { gold -= n; }, grant: (n: number) => { gold += n; } };
        const food0 = session.military.food;
        const r1 = await session.tradeWithRival('shu', 'foodToGold', 10, wallet);
        assert.isTrue(r1.ok, r1.message);
        assert.equals(food0 - 16, session.military.food);
        assert.equals(110, gold);
        const fame0 = session.fame;
        const r2 = await session.tradeWithRival('shu', 'goldToFame', 5, wallet);
        assert.isTrue(r2.ok, r2.message);
        assert.equals(90, gold);
        assert.equals(fame0 + 5, session.fame);
        assert.isFalse((await session.tradeWithRival('shu', 'foodToGold', 1, wallet)).ok, '本季已 2 次');
        await session.save();
        session.startNewGame(2);
        assert.isTrue(await session.load());
        assert.isFalse((await session.tradeWithRival('shu', 'foodToGold', 1, wallet)).ok, '讀檔後仍滿');
        const capped = await session.tradeWithRival('wu', 'goldToFood', session.military.foodCap, { gold: 1e9, spend: () => {}, grant: () => {} });
        assert.isFalse(capped.ok, '超過糧倉上限');
        assert.equals(food0 - 16, session.military.food, '拒絕時不變動');
    });

    return suite;
}
