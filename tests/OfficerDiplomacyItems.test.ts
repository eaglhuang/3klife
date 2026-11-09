/**
 * OfficerDiplomacyItems — 通商節鉞刷新令與外交拜帖錦囊（OFC-12）的 headless 測試
 *
 * 鎖住：單季次數限制、失敗不扣資源、每日免費與超額 60 玉璧、存讀檔保留。
 */
import { assert, TestSuite } from './TestRunner';
import {
    createRivalWorld,
    GIFT_GOLD_COST,
    GIFT_LETTER_RELATION_BONUS,
    GIFT_RELATION_GAIN,
    normalizeRivalWorld,
    sendGiftWithLetter,
    type RivalWorld,
} from '../assets/scripts/core/systems/RivalNations';
import { refreshRivalTrade, tradesUsed } from '../assets/scripts/core/systems/RivalTrade';
import { ITEM_DIPLOMACY_LETTER } from '../assets/scripts/core/systems/ItemDef';
import { addItem, itemCount } from '../assets/scripts/core/systems/PlayerInventory';
import { GameSession } from '../assets/scripts/core/managers/GameSession';

const ID = 'wei';
const SEASON = 7;
const DAY1 = Date.UTC(2026, 10, 9, 4);
const DAY2 = Date.UTC(2026, 10, 10, 4);

function patch(world: RivalWorld, fields: object): RivalWorld {
    return { ...world, nations: world.nations.map((n) => (n.id === ID ? { ...n, ...fields } : n)) };
}
const nationOf = (world: RivalWorld) => world.nations.find((n) => n.id === ID)!;

function sessionWithTrades(): { session: GameSession; internals: any } {
    const session = new GameSession();
    const internals = session as any;
    internals._rivals = patch(internals._rivals, { tradeSeason: internals._clock.state.totalSeasonsElapsed, tradeCount: 2 });
    return { session, internals };
}

function gemWallet(gems: number) {
    const wallet = { gems, spent: 0, spend: (n: number) => { wallet.gems -= n; wallet.spent += n; } };
    return wallet;
}

export function createOfficerDiplomacyItemsSuite(): TestSuite {
    const suite = new TestSuite('OfficerDiplomacyItems');

    suite.test('刷新令：交易次數歸零，同季同國只能一次，隔季可再用', () => {
        const world = patch(createRivalWorld(), { tradeSeason: SEASON, tradeCount: 2 });
        const first = refreshRivalTrade(world, ID, SEASON);
        assert.equals(true, first.ok);
        assert.equals(0, tradesUsed(nationOf(first.world), SEASON));

        const used = patch(first.world, { tradeCount: 1 });
        assert.equals(false, refreshRivalTrade(used, ID, SEASON).ok);

        const nextSeason = patch(first.world, { tradeSeason: SEASON + 1, tradeCount: 1 });
        assert.equals(true, refreshRivalTrade(nextSeason, ID, SEASON + 1).ok);
    });

    suite.test('刷新令：本季沒交易過或勢力不存在都拒絕', () => {
        assert.equals(false, refreshRivalTrade(createRivalWorld(), ID, SEASON).ok);
        assert.equals(false, refreshRivalTrade(createRivalWorld(), 'nope', SEASON).ok);
    });

    suite.test('拜帖：一般送禮再加額外邦交，同季同國最多 2 次，隔季重算', () => {
        const start = patch(createRivalWorld(), { relation: 0 });
        const first = sendGiftWithLetter(start, ID, GIFT_GOLD_COST, SEASON);
        assert.equals(true, first.ok);
        assert.equals(GIFT_GOLD_COST, first.goldSpent);
        assert.equals(GIFT_RELATION_GAIN + GIFT_LETTER_RELATION_BONUS, nationOf(first.world).relation);

        const second = sendGiftWithLetter(first.world, ID, GIFT_GOLD_COST, SEASON);
        assert.equals(true, second.ok);
        const third = sendGiftWithLetter(second.world, ID, GIFT_GOLD_COST, SEASON);
        assert.equals(false, third.ok);
        assert.equals(0, third.goldSpent);
        assert.equals(true, sendGiftWithLetter(second.world, ID, GIFT_GOLD_COST, SEASON + 1).ok);
    });

    suite.test('拜帖：金幣不足或宿敵拒收時不記次數', () => {
        const broke = sendGiftWithLetter(createRivalWorld(), ID, 0, SEASON);
        assert.equals(false, broke.ok);
        assert.equals(undefined, nationOf(broke.world).giftLetterCount);
        assert.equals(false, sendGiftWithLetter(patch(createRivalWorld(), { relation: -80 }), ID, GIFT_GOLD_COST, SEASON).ok);
    });

    suite.test('次數欄位經世界正規化保留', () => {
        const world = patch(createRivalWorld(), { tradeRefreshSeason: 3, giftLetterSeason: 3, giftLetterCount: 2 });
        const nation = nationOf(normalizeRivalWorld(JSON.parse(JSON.stringify(world))));
        assert.equals(3, nation.tradeRefreshSeason);
        assert.equals(3, nation.giftLetterSeason);
        assert.equals(2, nation.giftLetterCount);
    });

    suite.test('GameSession 刷新令：第一次免費，第二次 60 玉璧，玉璧不足不動，隔日又免費', async () => {
        const { session, internals } = sessionWithTrades();
        assert.equals(0, session.previewRivalTradeRefresh(0, DAY1).gemCost);
        const wallet = gemWallet(70);
        assert.equals(true, (await session.refreshRivalTrade(ID, wallet, DAY1)).ok);
        assert.equals(0, wallet.spent);

        const season = internals._clock.state.totalSeasonsElapsed;
        internals._rivals = patch(internals._rivals, { tradeSeason: season, tradeCount: 1, tradeRefreshSeason: season - 1 });
        const poor = gemWallet(10);
        assert.equals(false, (await session.refreshRivalTrade(ID, poor, DAY1)).ok);
        assert.equals(0, poor.spent);
        assert.equals(1, nationOf(internals._rivals).tradeCount);

        assert.equals(true, (await session.refreshRivalTrade(ID, wallet, DAY1)).ok);
        assert.equals(60, wallet.spent);

        internals._rivals = patch(internals._rivals, { tradeSeason: season, tradeCount: 1, tradeRefreshSeason: season - 1 });
        assert.equals(0, session.previewRivalTradeRefresh(0, DAY2).gemCost);
        assert.equals(true, (await session.refreshRivalTrade(ID, wallet, DAY2)).ok);
        assert.equals(60, wallet.spent);
    });

    suite.test('GameSession 刷新令：無效刷新不消耗每日額度', async () => {
        const session = new GameSession();
        const wallet = gemWallet(0);
        assert.equals(false, (await session.refreshRivalTrade(ID, wallet, DAY1)).ok);
        assert.equals(true, session.previewRivalTradeRefresh(0, DAY1).free);
    });

    suite.test('GameSession 拜帖：沒道具或送禮失敗都不扣，成功才扣道具與金幣', async () => {
        const session = new GameSession();
        const internals = session as any;
        let spent = 0;
        const wallet = (gold: number) => ({ gold, spend: (n: number) => { spent += n; } });

        assert.equals(false, (await session.sendRivalGiftWithLetter(ID, wallet(GIFT_GOLD_COST))).ok);

        internals._inventory = addItem(internals._inventory, ITEM_DIPLOMACY_LETTER, 1);
        assert.equals(false, (await session.sendRivalGiftWithLetter(ID, wallet(0))).ok);
        assert.equals(1, itemCount(internals._inventory, ITEM_DIPLOMACY_LETTER));
        assert.equals(0, spent);

        assert.equals(true, (await session.sendRivalGiftWithLetter(ID, wallet(GIFT_GOLD_COST))).ok);
        assert.equals(0, itemCount(internals._inventory, ITEM_DIPLOMACY_LETTER));
        assert.equals(GIFT_GOLD_COST, spent);
    });

    suite.test('GameSession：額度隨存檔讀回，沒用過不寫欄位', async () => {
        assert.equals(undefined, (new GameSession() as any).lifespanSaveFields().paidFeatureQuota);
        const { session } = sessionWithTrades();
        await session.refreshRivalTrade(ID, gemWallet(0), DAY1);
        const fields = (session as any).lifespanSaveFields();
        const reloaded = new GameSession();
        reloaded.restoreLifespanState(fields);
        assert.equals(false, reloaded.previewRivalTradeRefresh(0, DAY1).free);
    });

    return suite;
}
