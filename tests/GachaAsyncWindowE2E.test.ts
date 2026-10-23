/**
 * GachaAsyncWindowE2E.test.ts — 抽卡原子性補丁（#743／#745）後的非同步空窗複查（QA，PROG-2-0659）
 *
 * Unity 對照：像在 PlayMode 裡連按兩次十連、再模擬寫檔失敗，確認錢包、保底、名冊、教官日誌永遠一起進同一份存檔。
 */
import { assert, TestSuite } from './TestRunner';
import { LocalGachaService } from '../assets/scripts/core/services/LocalGachaService';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { sys } from 'cc';

class FlakyAdapter extends MemoryStorageAdapter {
    public failWrites = false;
    async set<T>(key: string, value: T): Promise<void> {
        if (this.failWrites) throw new Error('write interrupted');
        return super.set(key, value);
    }
}

function general(id: string, rarityTier: string): GeneralConfig {
    return {
        id, name: id, faction: 'player', gender: '男', age: 25, hp: 1000, vitality: 100, maxVitality: 100, maxLifespan: 120,
        str: 70, int: 60, lea: 60, pol: 50, cha: 50, luk: 40, careerClass: 'Warrior', role: 'Combat', rarityTier,
    } as unknown as GeneralConfig;
}

function pool(): GeneralConfig[] {
    return [
        general('ssr-1', 'legendary'), general('sr-1', 'epic'), general('sr-2', 'epic'),
        ...Array.from({ length: 6 }, (_, i) => general(`r-${i}`, 'rare')),
    ];
}

function newSession(adapter: MemoryStorageAdapter): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setAutoSave(false);
    session.startNewGame(7);
    return session;
}

/** 與 LobbyScene 一致：batch 內不存檔，結束時存一次（存檔是 fire-and-forget，這裡收集 promise 供測試等待） */
function lobbyGacha(session: GameSession, saves: Promise<unknown>[]): LocalGachaService {
    let batching = false;
    const saveNow = (): void => { if (!batching) saves.push(session.save().catch(() => undefined)); };
    return new LocalGachaService({
        readPity: () => session.gachaPityBook,
        writePity: (book) => { session.setGachaPityBook(book); saveNow(); },
        readWallet: () => session.gachaWalletSave,
        writeWallet: (wallet) => { session.setGachaWalletSave(wallet); saveNow(); },
        revision: () => session.gachaRevision,
        enroll: (results) => {
            session.enrollGenerals(results.map((entry) => entry.general), { rebirthOnDuplicate: true });
            session.queueGachaMentorDraw({ drawn: results.map((entry) => entry.general), time: { ...session.gameTime }, poolId: results[0]?.poolId });
        },
        batch: (fn) => {
            batching = true;
            try { return fn(); } finally { batching = false; saveNow(); }
        },
    }, () => session.randomSource());
}

export function createGachaAsyncWindowE2ESuite(): TestSuite {
    const suite = new TestSuite('GachaAsyncWindowE2E (抽卡原子性 非同步空窗 PROG-2-0659)');

    suite.test('連抽兩次十連（不等第一次存完）：存檔最終的錢包、保底、名冊、日誌一起對上', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new MemoryStorageAdapter();
        const a = newSession(adapter);
        const saves: Promise<unknown>[] = [];
        const gacha = lobbyGacha(a, saves);
        gacha.grantCurrency('gems', 5000);
        await Promise.all(saves.splice(0));
        await gacha.performLocalGacha('P1', 10, 1000, pool());
        await gacha.performLocalGacha('P1', 10, 1000, pool());
        await Promise.all(saves);

        const b = newSession(adapter);
        assert.isTrue(await b.load());
        assert.equals(gacha.getCurrencyAmount('gems'), new LocalGachaService({
            readPity: () => b.gachaPityBook, writePity: () => undefined,
            readWallet: () => b.gachaWalletSave, writeWallet: () => undefined, revision: () => b.gachaRevision,
        }, () => b.randomSource()).getCurrencyAmount('gems'));
        assert.equals(20, b.gachaPityBook['P1'].pullCount);
        assert.equals(a.roster.length, b.roster.length);
        assert.equals(2, b.gachaMentorJournal.length, '兩次抽卡各留一筆日誌');
    });

    suite.test('寫檔失敗：磁碟維持抽卡前；之後下一次存檔成功時，三者一次到位，不會缺任何一項', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new FlakyAdapter();
        const a = newSession(adapter);
        const saves: Promise<unknown>[] = [];
        const gacha = lobbyGacha(a, saves);
        gacha.grantCurrency('gems', 5000);
        await Promise.all(saves.splice(0));
        await a.save();
        const rosterBefore = a.roster.length;

        adapter.failWrites = true;
        await gacha.performLocalGacha('P1', 10, 1000, pool());
        await Promise.all(saves.splice(0));
        const crashed = newSession(adapter);
        assert.isTrue(await crashed.load());
        assert.equals(rosterBefore, crashed.roster.length, '寫檔失敗時磁碟仍是抽卡前');
        assert.equals(0, crashed.gachaMentorJournal.length);

        adapter.failWrites = false;
        await a.save();
        const restored = newSession(adapter);
        assert.isTrue(await restored.load());
        assert.equals(a.roster.length, restored.roster.length);
        assert.equals(10, restored.gachaPityBook['P1'].pullCount);
        assert.equals(1, restored.gachaMentorJournal.length);
    });

    return suite;
}
