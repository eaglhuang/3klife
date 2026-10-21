/**
 * GachaPullToRosterE2E.test.ts — 抽卡 → 入名冊 → 存讀檔 的真實整合（QA，PROG-2-0642）
 *
 * Unity 對照：像 PlayMode 測試把抽卡服務、名冊、存檔接成大廳實際的樣子（保底與錢包存進 GameSession），
 * 抽一輪十連、入冊、存檔、換新 Session 讀檔，看錢包、保底、名冊與重複轉生有沒有對上。
 */
import { assert, TestSuite } from './TestRunner';
import { LocalGachaService } from '../assets/scripts/core/services/LocalGachaService';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { sys } from 'cc';

function general(id: string, rarityTier: string): GeneralConfig {
    return {
        id, name: id, faction: 'player', gender: '男', age: 25, hp: 1000, vitality: 100, maxVitality: 100, maxLifespan: 120,
        str: 70, int: 60, lea: 60, pol: 50, cha: 50, luk: 40, careerClass: 'Warrior', role: 'Combat', rarityTier,
    } as unknown as GeneralConfig;
}

function newSession(adapter: MemoryStorageAdapter): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setAutoSave(false);
    session.startNewGame(7);
    return session;
}

/** 和 LobbyScene 一樣：保底與錢包存進 GameSession，亂數用存檔亂數源 */
function lobbyGacha(session: GameSession): LocalGachaService {
    return new LocalGachaService({
        readPity: () => session.gachaPityBook,
        writePity: (book) => session.setGachaPityBook(book),
        readWallet: () => session.gachaWalletSave,
        writeWallet: (wallet) => session.setGachaWalletSave(wallet),
        revision: () => session.gachaRevision,
    }, () => session.randomSource());
}

function pool(): GeneralConfig[] {
    return [
        general('ssr-1', 'legendary'), general('sr-1', 'epic'), general('sr-2', 'epic'),
        ...Array.from({ length: 6 }, (_, i) => general(`r-${i}`, 'rare')),
    ];
}

export function createGachaPullToRosterE2ESuite(): TestSuite {
    const suite = new TestSuite('GachaPullToRosterE2E (抽卡→入名冊→存讀檔)');

    suite.test('十連入冊後存讀：錢包、保底、名冊一致，且讀檔後接著抽的結果與沒讀檔完全相同', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new MemoryStorageAdapter();
        const a = newSession(adapter);
        const gachaA = lobbyGacha(a);
        gachaA.grantCurrency('gems', 5000);
        const first = await gachaA.performLocalGacha('P1', 10, 1000, pool());
        await a.addGenerals(first.map((entry) => entry.general), { rebirthOnDuplicate: true });
        await a.save();

        const b = newSession(adapter);
        assert.isTrue(await b.load());
        const gachaB = lobbyGacha(b);
        assert.equals(gachaA.getCurrencyAmount('gems'), gachaB.getCurrencyAmount('gems'));
        assert.equals(10, b.gachaPityBook['P1'].pullCount);
        assert.equals(a.roster.length, b.roster.length);

        // 讀檔不能重抽：兩邊再抽十連，結果必須逐一相同
        const nextA = await gachaA.performLocalGacha('P1', 10, 1000, pool());
        const nextB = await gachaB.performLocalGacha('P1', 10, 1000, pool());
        assert.equals(nextA.map((e) => e.general.id).join(','), nextB.map((e) => e.general.id).join(','));
        assert.equals(20, b.gachaPityBook['P1'].pullCount);
    });

    suite.test('同一批十連內抽到兩次同一位新武將：第二張視為重複，應轉生 +1（與跨批重複一致）', async () => {
        services().initialize();
        const baseline = newSession(new MemoryStorageAdapter());
        await baseline.addGenerals([general('twin', 'epic')], { rebirthOnDuplicate: true });
        // 新入冊的武將沒有轉數欄位時視為 1 轉（Rebirth.normalizeRebirthCount）
        const base = (baseline.roster.find((g) => g.id === 'twin') as unknown as { rebirthCount?: number }).rebirthCount ?? 1;

        const session = newSession(new MemoryStorageAdapter());
        const result = await session.addGenerals([general('twin', 'epic'), general('twin', 'epic')], { rebirthOnDuplicate: true });
        assert.equals(1, result.added.length);
        assert.equals(1, result.duplicates.length);
        assert.equals(1, result.rebirths.length, '批內重複也要算一次轉生');
        const twin = session.roster.find((g) => g.id === 'twin') as unknown as { rebirthCount?: number };
        assert.equals(base + 1, twin.rebirthCount);

        // 對照：跨批重複會轉生
        const again = await session.addGenerals([general('twin', 'epic')], { rebirthOnDuplicate: true });
        assert.equals(1, again.rebirths.length);
        assert.equals(base + 2, (session.roster.find((g) => g.id === 'twin') as unknown as { rebirthCount?: number }).rebirthCount);
    });

    suite.test('餘額不足：不扣款、不推進保底、不入冊', async () => {
        services().initialize();
        const session = newSession(new MemoryStorageAdapter());
        const gacha = lobbyGacha(session);
        const before = gacha.getCurrencyAmount('gems');
        let threw = false;
        try { await gacha.performLocalGacha('P1', 10, before + 1, pool()); } catch { threw = true; }
        assert.isTrue(threw);
        assert.equals(before, gacha.getCurrencyAmount('gems'));
        assert.equals(undefined, session.gachaPityBook['P1']);
    });

    return suite;
}
