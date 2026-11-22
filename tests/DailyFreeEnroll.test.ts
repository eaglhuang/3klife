/**
 * DailyFreeEnroll.test.ts — 每日免費入學令退場（PROG-2-9206，原 PROG-2-1374 / ITM-06）
 *
 * 鎖住：登入（含切日）不再發入學令，入學令只由季結 item.settlePeriodic 發放；
 * 新遊戲首個季結即得 1 張；登入日高水位保留（時鐘回撥不重觸發），舊存檔的 enrollGrantDay 讀得到。
 *
 * Unity 對照：像把 Idle 遊戲的每日領取按鈕拿掉，只剩每季發放的信箱；日期紀錄仍留著給別處判斷。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { createLocalApi } from '../assets/scripts/core/api/localserver/createLocalApi';
import type { WalletAuthority } from '../assets/scripts/core/api/localserver/WalletCommands';
import { isNewEnrollGrantDay, normalizeEnrollGrantDay } from '../assets/scripts/core/systems/DailyFreeEnroll';
import { ITEM_ADMISSION_TOKEN } from '../assets/scripts/core/systems/PlayerInventory';

const DAY_MS = 24 * 60 * 60 * 1000;
// 2026-10-28 12:00（UTC+8）
const DAY_ONE = Date.UTC(2026, 9, 28, 4, 0);

class FakeWallet implements WalletAuthority {
    public gold = 100;
    public balance(currency: string): number { return currency === 'gold' ? this.gold : 0; }
    public spend(): boolean { return false; }
    public snapshot(): Record<string, number> { return { gold: this.gold }; }
    public credit(currency: string, amount: number): void { if (currency === 'gold') this.gold += amount; }
}

function wiredSession(store: PlayerSaveService, wallet: FakeWallet = new FakeWallet()): GameSession {
    const bundle = createLocalApi(store, { now: () => 1_000 });
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(store);
    session.setRandomSource(() => 0.4);
    bundle.setWallet(wallet);
    bundle.setItemAuthority(session.itemAuthority());
    session.setItemApi(bundle.api);
    return session;
}

export function createDailyFreeEnrollSuite(): TestSuite {
    const suite = new TestSuite('DailyFreeEnroll (每日免費入學令退場 PROG-2-9206)');

    suite.test('連續多日登入都不發入學令，錢包也不動', () => {
        const store = new PlayerSaveService(new MemoryStorageAdapter());
        const wallet = new FakeWallet();
        const session = wiredSession(store, wallet);
        for (let i = 0; i < 5; i += 1) session.recordLoginAt(DAY_ONE + i * DAY_MS);
        assert.equals(0, session.itemCount(ITEM_ADMISSION_TOKEN));
        assert.equals(100, wallet.gold);
    });

    suite.test('新遊戲首個季結經 item.settlePeriodic 得 1 張，之後每季 +1，期間登入不多發', async () => {
        const store = new PlayerSaveService(new MemoryStorageAdapter());
        const session = wiredSession(store);
        session.startNewGame(7);
        assert.equals(0, session.itemCount(ITEM_ADMISSION_TOKEN));
        session.recordLoginAt(DAY_ONE);
        session.recordLoginAt(DAY_ONE + DAY_MS);
        assert.equals(0, session.itemCount(ITEM_ADMISSION_TOKEN), '季結前登入不發');
        await session.advanceSeason();
        assert.equals(1, session.itemCount(ITEM_ADMISSION_TOKEN), '首季結 1 張，新玩家首年可入學');
        session.recordLoginAt(DAY_ONE + 2 * DAY_MS);
        assert.equals(1, session.itemCount(ITEM_ADMISSION_TOKEN), '季結後登入不多發');
        await session.advanceSeason();
        assert.equals(2, session.itemCount(ITEM_ADMISSION_TOKEN));
    });

    suite.test('登入日高水位保留：存讀後仍在（欄位名沿用），時鐘回撥不發令', async () => {
        const adapter = new MemoryStorageAdapter();
        const make = (): GameSession => {
            const s = new GameSession();
            s.setRosterStore(new InMemoryRosterStore([]));
            s.setSaveService(new PlayerSaveService(adapter));
            return s;
        };
        const first = make();
        first.recordLoginAt(DAY_ONE);
        await first.save();
        const snap = await new PlayerSaveService(adapter).load();
        assert.equals('2026-10-28', (snap as { enrollGrantDay?: string } | null)?.enrollGrantDay);

        const second = make();
        assert.isTrue(await second.load());
        second.recordLoginAt(DAY_ONE - DAY_MS);
        second.recordLoginAt(DAY_ONE + DAY_MS);
        assert.equals(0, second.itemCount(ITEM_ADMISSION_TOKEN));
    });

    suite.test('舊存檔：有 enrollGrantDay 與入學令數量，讀檔不報錯、數量不變，登入不再加', async () => {
        const adapter = new MemoryStorageAdapter();
        const seed = new GameSession();
        seed.setRosterStore(new InMemoryRosterStore([]));
        seed.setSaveService(new PlayerSaveService(adapter));
        await seed.addItem(ITEM_ADMISSION_TOKEN, 2, 'EVENT');
        seed.recordLoginAt(DAY_ONE);
        await seed.save();

        const loaded = new GameSession();
        loaded.setRosterStore(new InMemoryRosterStore([]));
        loaded.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await loaded.load());
        assert.equals(2, loaded.itemCount(ITEM_ADMISSION_TOKEN));
        loaded.recordLoginAt(DAY_ONE + DAY_MS);
        assert.equals(2, loaded.itemCount(ITEM_ADMISSION_TOKEN));
    });

    suite.test('高水位判斷：從未記過或今天晚於已記日才算新的一天；讀檔值不合格視為 null', () => {
        assert.isTrue(isNewEnrollGrantDay(null, '2026-10-28'));
        assert.isTrue(isNewEnrollGrantDay('2026-10-27', '2026-10-28'));
        assert.isFalse(isNewEnrollGrantDay('2026-10-28', '2026-10-28'));
        assert.isFalse(isNewEnrollGrantDay('2026-10-28', '2026-10-27'));
        assert.equals('2026-10-28', normalizeEnrollGrantDay('2026-10-28'));
        assert.isTrue(normalizeEnrollGrantDay('10/28') === null);
        assert.isTrue(normalizeEnrollGrantDay(20261028) === null);
    });

    return suite;
}
