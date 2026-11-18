/**
 * BattleAftermath.test.ts — 戰後獎懲接回大廳＋開局資源回規格（PROG-2-9149）
 *
 * 勝／敗結算帳、戰損回扣兵源（含極速決戰）、失敗扣民心、黃金上限隨太守府等級、開局黃金 1000、玉買加速卡。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import {
    BATTLE_AFTERMATH_TUNING, aftermathOutcomeOf, formatAftermathLines, planBattleAftermath, quickSortieCost,
} from '../assets/scripts/core/systems/BattleAftermath';
import { BASE_RESOURCE_CAPS, goldCapOfLevel } from '../assets/scripts/core/systems/ResourceCap';
import { QA_STARTER_GACHA_WALLET, STARTER_GACHA_WALLET } from '../assets/scripts/core/services/GachaWalletRules';
import { INITIAL_MORALE, MORALE_DELTA } from '../assets/scripts/core/systems/CityEconomy';
import { ITEM_STONE, ITEM_WOOD } from '../assets/scripts/core/systems/ItemDef';
import { ITEM_WISH_SPEED_CARD } from '../assets/scripts/core/systems/PlayerInventory';
import { SPEED_CARD_PRICE } from '../assets/scripts/core/systems/WishPool';
import { WishAltarController } from '../assets/scripts/ui/core/WishAltarController';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const REWARD = BATTLE_AFTERMATH_TUNING.rewards;

function makeGeneral(id: string): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age: 30, hp: 1000, ep: 10,
        vitality: 100, maxVitality: 100,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40,
    } as unknown as GeneralConfig;
}

interface FakeWallet { gold: number }

/** 帶假錢包的 session：random 預設 0.99（不掉戰利品） */
function setup(opts: { gold?: number; food?: number; troops?: number; level?: number; random?: number } = {}): { session: GameSession; wallet: FakeWallet } {
    const session = new GameSession(3);
    session.setRosterStore(new InMemoryRosterStore([makeGeneral('lead-1')]));
    session.setRandomSource(() => opts.random ?? 0.99);
    const wallet: FakeWallet = { gold: opts.gold ?? 1000 };
    const internal = session as unknown as {
        _hallWallet: { gold(): number; spend(n: number): boolean; grant(n: number): void };
        _military: { food: number; foodCap: number; cityTroops: number; cityTroopsCap: number };
        _territoryLevel: number;
    };
    internal._hallWallet = {
        gold: () => wallet.gold,
        spend: (n) => { if (wallet.gold < n) return false; wallet.gold -= n; return true; },
        grant: (n) => { wallet.gold += n; },
    };
    internal._military.food = opts.food ?? 500;
    internal._military.cityTroops = opts.troops ?? 2000;
    if (opts.level) internal._territoryLevel = opts.level;
    return { session, wallet };
}

function altarWith(session: GameSession, gems: { n: number }, buy: boolean): WishAltarController {
    const now = Date.UTC(2026, 2, 28, 5);
    return new WishAltarController({
        now: () => now,
        pool: () => session.wishPool,
        speedCards: () => session.itemCount(ITEM_WISH_SPEED_CARD),
        startWish: (itemId, t) => session.startWish(itemId, t),
        speedUp: (wishId, cards, t) => session.speedUpWish(wishId, cards, t),
        claim: (t) => session.claimWishes(t),
        gems: () => gems.n,
        buyCard: () => {
            if (!buy || gems.n < SPEED_CARD_PRICE) return false;
            gems.n -= SPEED_CARD_PRICE;
            void session.addItem(ITEM_WISH_SPEED_CARD, 1, 'SHOP');
            return true;
        },
    });
}

export function createBattleAftermathSuite(): TestSuite {
    const suite = new TestSuite('BattleAftermath (PROG-2-9149 戰後獎懲與開局資源)');

    // ── 純邏輯：帳本 ───────────────────────────────────────────────
    suite.test('戰場結果換勝敗：ongoing 不結算', () => {
        assert.equals('win', aftermathOutcomeOf('player-win'));
        assert.equals('loss', aftermathOutcomeOf('enemy-win'));
        assert.equals('draw', aftermathOutcomeOf('draw'));
        assert.equals(null, aftermathOutcomeOf('ongoing'));
    });

    suite.test('勝利帳：糧草＋黃金＋武將經驗，全部取自常數表，無民心變動', () => {
        const ledger = planBattleAftermath('win', { food: 0, foodCap: 10000, gold: 0, goldCap: 5000, random: () => 0.99 });
        assert.equals(REWARD.win.food, ledger.food);
        assert.equals(REWARD.win.gold, ledger.gold);
        assert.equals(REWARD.win.generalExp, ledger.generalExp);
        assert.equals(0, ledger.morale);
        assert.equals(0, ledger.loot.length);
    });

    suite.test('失敗帳：民心 −3、沒有糧草黃金、只有少許經驗', () => {
        const ledger = planBattleAftermath('loss', { food: 0, foodCap: 10000, gold: 0, goldCap: 5000, random: () => 0 });
        assert.equals(-3, ledger.morale);
        assert.equals(0, ledger.food);
        assert.equals(0, ledger.gold);
        assert.equals(REWARD.loss.generalExp, ledger.generalExp);
        assert.equals(0, ledger.loot.length, '失敗不掉戰利品');
    });

    suite.test('入帳不超過上限，超出的列入截掉', () => {
        const ledger = planBattleAftermath('win', { food: 9950, foodCap: 10000, gold: 4900, goldCap: 5000, random: () => 0.99 });
        assert.equals(50, ledger.food);
        assert.equals(REWARD.win.food - 50, ledger.foodTruncated);
        assert.equals(100, ledger.gold);
        assert.equals(REWARD.win.gold - 100, ledger.goldTruncated);
    });

    suite.test('戰利品：勝利才擲、依表機率；random=0 全掉', () => {
        const all = planBattleAftermath('win', { food: 0, foodCap: 100, gold: 0, goldCap: 100, random: () => 0 });
        assert.equals(BATTLE_AFTERMATH_TUNING.loot.length, all.loot.length);
        assert.equals(1, all.loot.find((d) => d.itemId === ITEM_WOOD)?.quantity);
        const none = planBattleAftermath('win', { food: 0, foodCap: 100, gold: 0, goldCap: 100, random: () => 0.99 });
        assert.equals(0, none.loot.length);
    });

    suite.test('結算文字：列出獎賞、兵源回扣、戰利品、民心', () => {
        const win = planBattleAftermath('win', { food: 0, foodCap: 10000, gold: 0, goldCap: 5000, random: () => 0 });
        win.lostTroops = 35;
        const text = formatAftermathLines(win).join('\n');
        assert.contains(text, `糧草 +${REWARD.win.food}`);
        assert.contains(text, `黃金 +${REWARD.win.gold}`);
        assert.contains(text, `武將經驗 +${REWARD.win.generalExp}`);
        assert.contains(text, '城市兵源 -35');
        assert.contains(text, '木材');
        const loss = planBattleAftermath('loss', { food: 0, foodCap: 10000, gold: 0, goldCap: 5000, random: () => 0 });
        assert.contains(formatAftermathLines(loss).join('\n'), '民心 -3');
    });

    suite.test('極速決戰戰損推估：依勝敗比率、至少下限、不超過現有兵源', () => {
        const win = quickSortieCost('win', 2000);
        assert.equals(60, win.lostTroops);
        assert.equals(BATTLE_AFTERMATH_TUNING.quickSortie.foodSpent, win.foodSpent);
        assert.equals(160, quickSortieCost('loss', 2000).lostTroops);
        assert.equals(BATTLE_AFTERMATH_TUNING.quickSortie.minLostTroops, quickSortieCost('win', 100).lostTroops);
        assert.equals(4, quickSortieCost('win', 4).lostTroops);
    });

    // ── 開局與上限 ─────────────────────────────────────────────────
    suite.test('正式開局黃金 1000；12.8 萬只在 QA 種子', () => {
        assert.equals(1000, STARTER_GACHA_WALLET.gold);
        assert.equals(128450, QA_STARTER_GACHA_WALLET.gold);
        assert.equals(STARTER_GACHA_WALLET.gems, QA_STARTER_GACHA_WALLET.gems);
    });

    suite.test('黃金上限隨太守府等級提高：Lv1 為規格 5000', () => {
        assert.equals(BASE_RESOURCE_CAPS.gold, goldCapOfLevel(1));
        assert.equals(5000, goldCapOfLevel(1));
        assert.equals(7500, goldCapOfLevel(2));
        assert.equals(10000, goldCapOfLevel(3));
        assert.equals(5000, goldCapOfLevel(0), '壞值視為 1 級');
        assert.equals(5000, goldCapOfLevel(Number.NaN));
    });

    // ── GameSession 接線 ───────────────────────────────────────────
    suite.test('勝利：糧草、黃金入帳，經驗折 EP，結算有文字', async () => {
        const { session, wallet } = setup({ gold: 1000, food: 500 });
        const result = await session.recordBattle(['lead-1'], 'player-win', {});
        assert.equals(500 + REWARD.win.food, session.military.food);
        assert.equals(1000 + REWARD.win.gold, wallet.gold);
        assert.equals(INITIAL_MORALE, session.cityMorale);
        assert.isTrue(result.aftermathLines.length > 0);
        assert.contains(result.aftermathLines.join('\n'), '戰後獎賞');
        // 勝場 EP +1（名冊結算）＋武將經驗折 EP
        const ep = session.roster.find((g) => g.id === 'lead-1')?.ep ?? 0;
        assert.equals(10 + 1 + REWARD.win.generalExp / BATTLE_AFTERMATH_TUNING.generalExpPerEp, ep);
    });

    suite.test('失敗：民心 −3、不給糧金', async () => {
        const { session, wallet } = setup({ gold: 1000, food: 500 });
        const before = session.cityMorale;
        await session.recordBattle(['lead-1'], 'enemy-win', {});
        assert.equals(before + MORALE_DELTA.defenseDefeat, session.cityMorale);
        assert.equals(before - 3, session.cityMorale);
        assert.equals(500, session.military.food);
        assert.equals(1000, wallet.gold);
    });

    suite.test('戰場出征帳本：戰損回扣城市兵源，結算列出回扣', async () => {
        const { session } = setup({ troops: 2000 });
        const result = await session.recordBattle(['lead-1'], 'player-win', { sortie: { lostTroops: 120, foodSpent: 0 } });
        assert.equals(1880, session.military.cityTroops);
        assert.equals(120, result.aftermath?.lostTroops);
        assert.contains(result.aftermathLines.join('\n'), '城市兵源 -120');
    });

    suite.test('極速決戰（offBoard）：沒有帳本也依常數表回扣兵源與糧耗', async () => {
        const { session } = setup({ troops: 2000, food: 500 });
        const cost = quickSortieCost('win', 2000);
        await session.recordBattle(['lead-1'], 'player-win', { offBoard: true });
        assert.equals(2000 - cost.lostTroops, session.military.cityTroops);
        assert.equals(500 - cost.foodSpent + REWARD.win.food, session.military.food);
    });

    suite.test('出戰武將不在名冊（沒有可結算的武將）：戰損與獎賞照樣入帳', async () => {
        const { session } = setup({ troops: 2000, food: 500 });
        const cost = quickSortieCost('win', 2000);
        const result = await session.recordBattle(['not-in-roster'], 'player-win', { offBoard: true });
        assert.equals(2000 - cost.lostTroops, session.military.cityTroops);
        assert.equals(500 - cost.foodSpent + REWARD.win.food, session.military.food);
        assert.isTrue(result.aftermathLines.length > 0);
    });

    suite.test('沒有 offBoard 也沒有帳本：兵源不變（舊行為）', async () => {
        const { session } = setup({ troops: 2000 });
        await session.recordBattle(['lead-1'], 'player-win', {});
        assert.equals(2000, session.military.cityTroops);
    });

    suite.test('黃金上限隨太守府等級：Lv1 差 50 滿截斷，Lv2 全額入帳', async () => {
        const lv1 = setup({ gold: 4950, level: 1 });
        const r1 = await lv1.session.recordBattle(['lead-1'], 'player-win', {});
        assert.equals(5000, lv1.wallet.gold);
        assert.equals(REWARD.win.gold - 50, r1.aftermath?.goldTruncated);
        const lv2 = setup({ gold: 4950, level: 2 });
        await lv2.session.recordBattle(['lead-1'], 'player-win', {});
        assert.equals(4950 + REWARD.win.gold, lv2.wallet.gold);
    });

    suite.test('戰利品進背包（random=0 全掉）；失敗不掉', async () => {
        const win = setup({ random: 0 });
        await win.session.recordBattle(['lead-1'], 'player-win', {});
        assert.isTrue(win.session.itemCount(ITEM_WOOD) >= 1);
        assert.isTrue(win.session.itemCount(ITEM_STONE) >= 1);
        const loss = setup({ random: 0 });
        await loss.session.recordBattle(['lead-1'], 'enemy-win', {});
        assert.equals(0, loss.session.itemCount(ITEM_WOOD));
    });

    suite.test('進行中不結算獎懲', async () => {
        const { session, wallet } = setup({ gold: 1000, food: 500 });
        const ongoing = await session.recordBattle(['lead-1'], 'ongoing', {});
        assert.equals(0, ongoing.aftermathLines.length);
        assert.equals(500, session.military.food);
        assert.equals(1000, wallet.gold);
    });

    suite.test('錢包尚未綁定：糧草照給、黃金不入帳也不提示', async () => {
        const session = new GameSession(3);
        session.setRosterStore(new InMemoryRosterStore([makeGeneral('lead-1')]));
        session.setRandomSource(() => 0.99);
        const food = session.military.food;
        const result = await session.recordBattle(['lead-1'], 'player-win', {});
        assert.equals(0, result.aftermath?.gold);
        assert.equals(0, result.aftermath?.goldTruncated);
        assert.isTrue(session.military.food >= food);
    });

    // ── 玉：許願祭壇加速 ───────────────────────────────────────────
    suite.test('玉買加速卡：沒卡時點進行中插槽，扣玉並縮短時間', () => {
        const session = new GameSession(1);
        const gems = { n: 20 };
        const panel = altarWith(session, gems, true);
        assert.isTrue(panel.wish());
        const endBefore = session.wishPool.activeWishes[0].endMs;
        assert.isTrue(panel.getFlowView().enabled.waSlot0, '有玉就算沒卡也可點加速');
        assert.contains(panel.getFlowView().texts.waStatusLabel, '玉 20');
        assert.isTrue(panel.tapSlot(0));
        assert.equals(20 - SPEED_CARD_PRICE, gems.n);
        assert.isTrue(session.wishPool.activeWishes[0].endMs < endBefore);
        assert.contains(panel.message, `${SPEED_CARD_PRICE} 玉`);
        assert.equals(0, session.itemCount(ITEM_WISH_SPEED_CARD), '買的卡立刻用掉');
    });

    suite.test('玉不足：不扣、不加速、訊息說明', () => {
        const session = new GameSession(1);
        const gems = { n: 2 };
        const panel = altarWith(session, gems, true);
        panel.wish();
        assert.isFalse(panel.getFlowView().enabled.waSlot0);
        assert.isFalse(panel.tapSlot(0));
        assert.equals(2, gems.n);
        assert.contains(panel.message, '玉不足');
    });

    return suite;
}
