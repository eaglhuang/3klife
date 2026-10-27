/**
 * TerritoryUpgradeWalletSaveE2E.test.ts — 太守府升級下單接 LobbyScene 錢包路徑的存讀檔複查（PROG-2-0674）
 *
 * Unity 對照：像在 PlayMode 按下升級鈕，錢包扣款與 GameSession 扣糧同時發生，確認存檔三者（金錢、糧草、待生效等級）一起落地。
 */
import { assert, TestSuite } from './TestRunner';
import { LocalGachaService } from '../assets/scripts/core/services/LocalGachaService';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { sys } from 'cc';

function newSession(adapter: MemoryStorageAdapter): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setAutoSave(false);
    session.startNewGame(7);
    return session;
}

/** 與 LobbyScene 一致：錢包寫入即存檔（fire-and-forget），收集 promise 供測試等待 */
function lobbyGacha(session: GameSession, saves: Promise<unknown>[]): LocalGachaService {
    const saveNow = (): void => { saves.push(session.save().catch(() => undefined)); };
    return new LocalGachaService({
        readPity: () => session.gachaPityBook,
        writePity: (book) => { session.setGachaPityBook(book); saveNow(); },
        readWallet: () => session.gachaWalletSave,
        writeWallet: (wallet) => { session.setGachaWalletSave(wallet); saveNow(); },
        revision: () => session.gachaRevision,
        enroll: () => undefined,
        batch: (fn) => fn(),
    }, () => session.randomSource());
}

/** 與 LobbyScene._onUpgradeTerritory 同形 */
function upgrade(session: GameSession, gacha: LocalGachaService, saves: Promise<unknown>[]) {
    const plan = session.orderTerritoryUpgrade((amount) => gacha.spendCurrency('gold', amount));
    if (plan.ok) saves.push(session.save().catch(() => undefined));
    return plan;
}

export function createTerritoryUpgradeWalletSaveE2ESuite(): TestSuite {
    const suite = new TestSuite('TerritoryUpgradeWalletSaveE2E (PROG-2-0674 太守府升級錢包存檔)');

    suite.test('下單後存檔：金錢、糧草、待生效等級讀回一致，季結後升級', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new MemoryStorageAdapter();
        const a = newSession(adapter);
        (a as unknown as { _military: { food: number } })._military.food = 10000;
        const saves: Promise<unknown>[] = [];
        const gacha = lobbyGacha(a, saves);
        const goldBefore = gacha.getCurrencyAmount('gold');

        assert.isTrue(upgrade(a, gacha, saves).ok);
        await Promise.all(saves);

        const b = newSession(adapter);
        assert.isTrue(await b.load());
        assert.equals(2, b.pendingTerritoryLevel!);
        assert.equals(a.military.food, b.military.food);
        assert.equals(goldBefore - 4000, lobbyGacha(b, []).getCurrencyAmount('gold'));

        await b.advanceSeason();
        assert.equals(2, b.territoryLevel);
        assert.equals(3, b.maxTaskSlots);
    });

    suite.test('金錢不足：整筆不成立，存檔裡糧草與待生效不變', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new MemoryStorageAdapter();
        const a = newSession(adapter);
        (a as unknown as { _military: { food: number } })._military.food = 10000;
        const saves: Promise<unknown>[] = [];
        const gacha = lobbyGacha(a, saves);
        gacha.spendCurrency('gold', gacha.getCurrencyAmount('gold'));
        await Promise.all(saves);
        const foodBefore = a.military.food;

        const plan = upgrade(a, gacha, saves);
        await Promise.all(saves);
        assert.isFalse(plan.ok);
        assert.equals(foodBefore, a.military.food);

        const b = newSession(adapter);
        assert.isTrue(await b.load());
        assert.isTrue(b.pendingTerritoryLevel === null);
        assert.equals(foodBefore, b.military.food);
    });

    return suite;
}
