/**
 * LobbySeasonLoopE2E.test.ts — 大廳一季循環流程（QA，PROG-2-1454）
 * 登入、月卡每日領取、許願池許願＋加速＋領取、內政任務同季限選一次、季結換季後可再選，
 * 中途與結尾各存讀檔一次，月卡、許願池、內政紀錄與取得來源紀錄都不能遺失。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { MONTHLY_CARD_DAILY_SPEED_CARDS, MONTHLY_CARD_DAYS } from '../assets/scripts/core/systems/MonthlyCard';
import { ITEM_VITALITY_PILL, ITEM_WISH_SPEED_CARD, itemCount } from '../assets/scripts/core/systems/PlayerInventory';
import { wishAmountOf, wishItemDef } from '../assets/scripts/core/systems/WishPool';
import { person } from './MvpMainFlowE2E.test';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { sys } from 'cc';

const DAY0 = Date.UTC(2026, 2, 1, 4, 0);
const DAY_MS = 24 * 3600 * 1000;
const HOUR_MS = 3600 * 1000;

function build(adapter: MemoryStorageAdapter, roster: GeneralConfig[] = []): GameSession {
    const s = new GameSession(17);
    s.setRosterStore(new InMemoryRosterStore(roster));
    s.setLifecycle(new LegacyService(new MemoryStorageAdapter()));
    s.setSaveService(new PlayerSaveService(adapter));
    s.setAutoSave(false);
    return s;
}

export function createLobbySeasonLoopE2ESuite(): TestSuite {
    const suite = new TestSuite('LobbySeasonLoopE2E (大廳一季循環 PROG-2-1454)');

    suite.test('登入→月卡→許願→內政→季結→再選內政，中途與結尾存讀檔都不遺失', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new MemoryStorageAdapter();
        const a = build(adapter, [person('lead', '男', 30)]);
        a.startNewGame(31);
        const gold: number[] = [];
        const grant = (n: number): void => { gold.push(n); };

        // 第 1 天：登入、開通月卡、領一次，同日再領為 0
        a.recordLoginAt(DAY0, grant);
        assert.equals(MONTHLY_CARD_DAYS, a.activateMonthlyCard(DAY0), '開通後剩餘天數');
        const cardsBefore = itemCount(a.inventory, ITEM_WISH_SPEED_CARD);
        assert.equals(MONTHLY_CARD_DAILY_SPEED_CARDS, a.claimMonthlyCardDaily(DAY0), '第一次領取');
        assert.equals(0, a.claimMonthlyCardDaily(DAY0 + HOUR_MS), '同日不可重領');
        assert.equals(cardsBefore + MONTHLY_CARD_DAILY_SPEED_CARDS, itemCount(a.inventory, ITEM_WISH_SPEED_CARD));

        // 許願：活力丸，之後加速並領取
        const def = wishItemDef(ITEM_VITALITY_PILL)!;
        const wished = a.startWish(ITEM_VITALITY_PILL, DAY0 + HOUR_MS);
        assert.isTrue(wished.ok, '許願應成功');
        assert.equals(1, a.wishPool.activeWishes.length);
        assert.equals(0, a.claimWishes(DAY0 + 2 * HOUR_MS).length, '未到期不能領');

        // 內政：選一項後同季不可再選
        const first = await a.chooseDomesticTask('farming', grant);
        assert.isTrue(first.ok, '內政第一次成功');
        const second = await a.chooseDomesticTask('commerce', grant);
        assert.isFalse(second.ok, '同季第二次被擋');
        const foodAfterFirst = a.military.food;

        // 中途存讀檔：月卡、許願、內政紀錄都保留
        await a.save();
        const b = build(adapter, []);
        assert.isTrue(await b.load(), '讀檔成功');
        assert.equals(a.monthlyCardStatus(DAY0).daysLeft, b.monthlyCardStatus(DAY0).daysLeft, '月卡剩餘天數保留');
        assert.isTrue(b.monthlyCardStatus(DAY0).claimedToday, '今日已領的標記保留');
        assert.equals(0, b.claimMonthlyCardDaily(DAY0 + 2 * HOUR_MS), '讀檔後同日仍不能重領');
        assert.equals(1, b.wishPool.activeWishes.length, '許願保留');
        assert.equals(foodAfterFirst, b.military.food, '糧草保留');
        assert.isFalse((await b.chooseDomesticTask('commerce', grant)).ok, '讀檔後同季仍只能選一次');

        // 用加速卡把許願催熟後領取，來源記為 EVENT
        const wishId = b.wishPool.activeWishes[0].wishId;
        const used = b.speedUpWish(wishId, 10, DAY0 + 2 * HOUR_MS);
        assert.isTrue(used >= 1, '至少用掉一張加速卡');
        const pillBefore = itemCount(b.inventory, ITEM_VITALITY_PILL);
        const claimedAt = DAY0 + 2 * HOUR_MS + def.redemptionHours * HOUR_MS;
        const got = b.claimWishes(claimedAt);
        assert.equals(1, got.length, '催熟後可領');
        assert.equals(pillBefore + wishAmountOf(def), itemCount(b.inventory, ITEM_VITALITY_PILL), '入庫數量');
        assert.isTrue(b.queryItemAcquisitions({ itemId: ITEM_VITALITY_PILL }).every((r) => r.source === 'EVENT'), '許願來源為 EVENT');
        assert.isTrue(b.queryItemAcquisitions({ itemId: ITEM_WISH_SPEED_CARD }).every((r) => r.source === 'SHOP'), '月卡加速卡來源為 SHOP');

        // 季結換季：內政可再選，月卡仍有效
        await b.advanceSeason();
        const third = await b.chooseDomesticTask('arms', grant);
        assert.isTrue(third.ok, '新的一季可再選內政');

        // 結尾存讀檔：再往返一次
        await b.save();
        const c = build(adapter, []);
        assert.isTrue(await c.load(), '結尾讀檔成功');
        assert.equals(0, c.wishPool.activeWishes.length, '許願已領光');
        assert.equals(b.monthlyCardStatus(DAY0 + DAY_MS).daysLeft, c.monthlyCardStatus(DAY0 + DAY_MS).daysLeft);
        assert.equals(b.itemAcquisitionLog.length, c.itemAcquisitionLog.length, '取得紀錄筆數一致');
        assert.isFalse((await c.chooseDomesticTask('scouting', grant)).ok, '換季後讀檔，同季仍只能選一次');
        // 隔天登入仍可再領月卡
        c.recordLoginAt(DAY0 + DAY_MS, grant);
        assert.equals(MONTHLY_CARD_DAILY_SPEED_CARDS, c.claimMonthlyCardDaily(DAY0 + DAY_MS), '隔天可再領');
    });

    return suite;
}
