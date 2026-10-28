/**
 * GachaSyncRecordFlow.test.ts — 抽卡結算產生同步列（GCH-14 / PROG-2-1256）
 *
 * 鎖住三件事：
 *   1. 抽 SSR 時保底狀態記下 lastSsrPull；其餘抽不動它
 *   2. 轉蛋結算後，本地同步佇列的召喚紀錄帶 gachaSync，數值與結算後的保底、結義點數一致，且通過同步列校驗
 *   3. 舊存檔缺 lastSsrPull 時讀回為 0，不會讓同步列校驗失敗
 *
 * Unity 對照：像在 Summon 結算的最後一步寫一份 Analytics 事件，事件內容直接取自結算後的狀態，不另外重算。
 */
import { assert, TestSuite } from './TestRunner';
import { LocalGachaService } from '../assets/scripts/core/services/LocalGachaService';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { drawGeneralOnce, normalizeGachaPity, type GachaPityBook, type GachaPool } from '../assets/scripts/core/systems/GachaDraw';
import { buildGachaSyncRecord, validateGachaSyncRecord } from '../assets/scripts/core/systems/GachaSyncRecord';
import { sys } from 'cc';

function resetSyncDevice(): void {
    sys.localStorage.removeItem('CLIENT_DEVICE_ID');
}

function newSession(): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
    session.setLifecycle(new LegacyService(new MemoryStorageAdapter()));
    session.startNewGame(1);
    return session;
}

function storeOf(session: GameSession) {
    return {
        readPity: () => session.gachaPityBook,
        writePity: (book: Parameters<GameSession['setGachaPityBook']>[0]) => session.setGachaPityBook(book),
        readWallet: () => session.gachaWalletSave,
        writeWallet: (wallet: Parameters<GameSession['setGachaWalletSave']>[0]) => session.setGachaWalletSave(wallet),
        revision: () => session.gachaRevision,
    };
}

function lcg(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

function makeGenerals(): GeneralConfig[] {
    const out: GeneralConfig[] = [];
    for (let i = 0; i < 40; i++) {
        out.push({ id: `g${i}`, name: `n${i}`, faction: 'player', rarityTier: i < 3 ? 'legendary' : i < 10 ? 'epic' : 'common' } as unknown as GeneralConfig);
    }
    return out;
}

/** 取出最後一筆召喚紀錄的 gachaSync 欄位（同步佇列是本地真相）。 */
function lastGachaSync(): unknown {
    const records = (services().sync as unknown as { actionRecords: Array<{ Payload: Record<string, unknown> }> }).actionRecords;
    return records[records.length - 1]?.Payload?.gachaSync;
}

export function createGachaSyncRecordFlowSuite(): TestSuite {
    const suite = new TestSuite('GachaSyncRecordFlow (抽卡結算同步列 GCH-14)');

    suite.test('抽到 SSR 時 lastSsrPull 記為當下累計抽數；非 SSR 不動它', () => {
        const ssrOnly: GachaPool<string> = { ssrUp: ['S1'], ssrOther: [], srUp: [], srOther: [], rOther: [] };
        const sure = drawGeneralOnce(ssrOnly, { pullCount: 6 }, lcg(1), { SSR: 1, SR: 0, R: 0 });
        assert.equals('SSR', sure.rarity);
        assert.equals(7, sure.nextPity.pullCount);
        assert.equals(7, sure.nextPity.lastSsrPull ?? -1);

        const rOnly: GachaPool<string> = { ssrUp: [], ssrOther: [], srUp: [], srOther: [], rOther: ['R1'] };
        const plain = drawGeneralOnce(rOnly, { pullCount: 6, lastSsrPull: 3 }, lcg(1), { SSR: 0, SR: 0, R: 1 });
        assert.equals('R', plain.rarity);
        assert.equals(3, plain.nextPity.lastSsrPull ?? -1);
    });

    suite.test('舊存檔缺 lastSsrPull 或值超出累計抽數：讀回為 0 以下的無效值被丟棄', () => {
        assert.isTrue(normalizeGachaPity({ pullCount: 5 }).lastSsrPull === undefined);
        assert.isTrue(normalizeGachaPity({ pullCount: 5, lastSsrPull: 9 }).lastSsrPull === undefined);
        assert.equals(4, normalizeGachaPity({ pullCount: 5, lastSsrPull: 4 }).lastSsrPull ?? -1);
    });

    suite.test('結算後本地同步佇列的 gachaSync 與結算後的保底、結義點數一致，且通過校驗', async () => {
        resetSyncDevice();
        const session = newSession();
        session.setGachaPityBook({});
        const svc = new LocalGachaService(storeOf(session));
        svc.grantCurrency('tickets', 100);
        await svc.performTicketSummon(12, makeGenerals(), { rng: lcg(3) });

        const pools = Object.keys(session.gachaPityBook);
        assert.isTrue(pools.length > 0, '應該至少有一個池子被計數');
        const poolId = pools[0];
        const expected = buildGachaSyncRecord(normalizeGachaPity(session.gachaPityBook[poolId]), session.bondPoints);
        const synced = lastGachaSync();
        assert.isTrue(synced !== undefined, '召喚紀錄應帶 gachaSync');
        assert.equals(JSON.stringify(expected), JSON.stringify(synced));
        assert.equals(12, (synced as { totalPulls: number }).totalPulls);
        assert.equals(0, validateGachaSyncRecord(synced as Parameters<typeof validateGachaSyncRecord>[0]).length);
    });

    suite.test('同步列的 bondingPoints 與結算當下的存檔結義點數相同', async () => {
        resetSyncDevice();
        const session = newSession();
        session.setGachaPityBook({} as GachaPityBook);
        const svc = new LocalGachaService(storeOf(session));
        svc.grantCurrency('tickets', 100);
        await svc.performTicketSummon(1, makeGenerals(), { rng: lcg(4) });
        const first = lastGachaSync() as { bondingPoints: number };
        assert.equals(session.bondPoints, first.bondingPoints);
    });

    return suite;
}
