/**
 * 死亡結算寫入精華快照（LIFE-11，PROG-2-0802 的死亡路徑測試，PROG-2-0803 補測）
 *
 * 鎖住：武將死亡後英靈卡 legacyEssence = floor(totalTp × 0.5)（封頂 300）；
 * 沒有培育 TP 的武將快照為 0；同一武將重跑結算時保留既有值。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore, SeasonAdvancedPayload } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { LEGACY_ARENA_TUNING } from '../assets/scripts/core/systems/LegacyArena';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function makeGeneral(id: string, totalTp: number): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age: 70, maxLifespan: 70, hp: 1000,
        vitality: 100, maxVitality: 100, str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, totalTp,
    } as unknown as GeneralConfig;
}

function createSession(adapter: MemoryStorageAdapter, roster: GeneralConfig[]): { session: GameSession; legacy: LegacyService } {
    const session = new GameSession();
    const legacy = new LegacyService(adapter);
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setLifecycle(legacy);
    session.setEventEmitter({ emit: () => undefined });
    session.setRandomSource(() => 0);
    return { session, legacy };
}

async function advanceUntilDied(session: GameSession, limit = 400): Promise<SeasonAdvancedPayload> {
    for (let i = 0; i < limit; i++) {
        const payload = await session.advanceSeason();
        if (payload.agingEvents.some((e) => e.type === 'died')) return payload;
    }
    throw new Error(`推進 ${limit} 季仍未死亡`);
}

export function createLegacyEssenceSettlementSuite(): TestSuite {
    const suite = new TestSuite('LegacyEssenceSettlement (死亡結算寫入精華快照 LIFE-11)');

    suite.test('死亡結算：英靈卡 legacyEssence = floor(totalTp × 0.5)', async () => {
        const adapter = new MemoryStorageAdapter();
        const { session, legacy } = createSession(adapter, [makeGeneral('hero', 200)]);
        await advanceUntilDied(session);
        const card = await legacy.getArchiver().getSpiritCard('hero');
        assert.equals(100, card!.legacyEssence!);
    });

    suite.test('死亡結算：精華快照封頂於 snapshotCap', async () => {
        const adapter = new MemoryStorageAdapter();
        const { session, legacy } = createSession(adapter, [makeGeneral('giant', 1_000_000)]);
        await advanceUntilDied(session);
        const card = await legacy.getArchiver().getSpiritCard('giant');
        assert.equals(LEGACY_ARENA_TUNING.snapshotCap, card!.legacyEssence!);
    });

    suite.test('死亡結算：沒有培育 TP 的武將快照為 0', async () => {
        const adapter = new MemoryStorageAdapter();
        const { session, legacy } = createSession(adapter, [makeGeneral('idle', 0)]);
        await advanceUntilDied(session);
        const card = await legacy.getArchiver().getSpiritCard('idle');
        assert.equals(0, card!.legacyEssence!);
    });

    return suite;
}
