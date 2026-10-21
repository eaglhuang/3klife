/**
 * CrossSystemSeasonChainE2E.test.ts — 跨系統多季一條龍整合（QA，PROG-2-0669）
 *
 * 用真實 LegacyService 與存檔服務，連跑多季：委任、治理、退役、老死、虎符、戰魂碎片、物件庫、日誌，
 * 每季檢查跨系統不變量，並做「存檔 → 新會話讀檔 → 再存檔」的往返，找出某個系統漏接線或漏存的缺口。
 *
 * Unity 對照：像一場完整的 PlayMode 長流程測試：玩十個回合，每回合都問「各個 Manager 的帳還對得上嗎」，
 * 並隨時存檔重開，看有沒有哪個 Manager 重開後忘了東西。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { sys } from 'cc';

function gen(id: string, age: number, extra: Record<string, unknown> = {}): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age, hp: 900, str: 80, int: 60, lea: 70, pol: 50, cha: 50, luk: 40, ep: 70,
        maxLifespan: 70, vitality: 100, maxVitality: 100, careerClass: 'Warrior', role: 'Combat', rarityTier: 'epic', ...extra,
    } as unknown as GeneralConfig;
}

function build(adapter: MemoryStorageAdapter, roster: GeneralConfig[]): GameSession {
    const session = new GameSession(5);
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setLifecycle(new LegacyService(new MemoryStorageAdapter()));
    session.setSaveService(new PlayerSaveService(adapter));
    return session;
}

/** 鍵排序後再序列化，物件欄位順序不同不算差異 */
function canonical(value: unknown): string {
    // settledAt 是結算當下的現實時間（不是遊戲時間），兩次執行必然不同，不列入比較
    return JSON.stringify(value, (key, v) => key === 'settledAt' ? undefined : (v && typeof v === 'object' && !Array.isArray(v)
        ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([x], [y]) => x.localeCompare(y)))
        : v));
}

/** 讀檔後再存檔，快照必須與原本一致（時間戳固定），否則代表有系統漏存或漏讀 */
async function roundTripDiff(session: GameSession, adapter: MemoryStorageAdapter): Promise<string[]> {
    await session.save();
    const restored = build(adapter, []);
    assert.isTrue(await restored.load(), '讀檔應成功');
    const a = JSON.parse(JSON.stringify(session.createSnapshot(new Date(0)))) as Record<string, unknown>;
    const b = JSON.parse(JSON.stringify(restored.createSnapshot(new Date(0)))) as Record<string, unknown>;
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].filter((k) => canonical(a[k]) !== canonical(b[k])).map((k) => `${k}:${canonical(a[k])}≠${canonical(b[k])}`);
}

export function createCrossSystemSeasonChainE2ESuite(): TestSuite {
    const suite = new TestSuite('CrossSystemSeasonChainE2E (跨系統多季一條龍 PROG-2-0669)');

    suite.test('多季：委任、治理、退役、老死、虎符、戰魂、物件庫、日誌各帳相符，且每季存讀檔往返無漏', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new MemoryStorageAdapter();
        const roster = [
            gen('liu', 69.75, { templateId: 'liu-bei-1', isHistorical: true, bloodlineId: 'bl-1', totalTp: 500 }),
            gen('cao', 66, { templateId: 'cao-cao-1', isHistorical: true, bloodlineId: 'bl-2' }),
            gen('zhang', 30, { templateId: 'zhang-fei-1', bloodlineId: 'bl-1', totalTp: 10 }),
            gen('zhao', 28, { templateId: 'zhao-yun-1', bloodlineId: 'bl-3' }),
            gen('ma', 27, { templateId: 'ma-chao-1', bloodlineId: 'bl-4' }),
        ];
        const session = build(adapter, roster);
        session.setAutoSave(false);
        session.startNewGame(11);
        const everDead = new Set<string>();

        assert.isTrue(session.assignGovernor('farming', 'zhao').ok);
        assert.isTrue((await session.autoAssignHallMission({ taskId: 'T1', AI_Assign_Enabled: true, Difficulty: 'EASY', board: 'Military' } as never, 'y1')).ok);
        await session.retireGeneral('cao');
        assert.equals(0, Object.keys(session.tallyCards).length, '退役不產虎符');
        session.spendLifespan('liu', 'breeding');

        for (let season = 1; season <= 6; season++) {
            await session.advanceSeason();
            const present = new Set(session.roster.filter((g) => g.status !== 'dead').map((g) => g.id));
            for (const g of roster) if (!present.has(g.id)) everDead.add(g.id);

            // 虎符卡與統一物件庫視圖一致
            const cardUids = Object.keys(session.tallyCards).sort();
            assert.equals(cardUids.join(','), Object.keys(session.inventoryViews.talismans).sort().join(','), `第 ${season} 季 物件庫與虎符卡不一致`);
            // 治理指派只留在活著的名冊武將
            const aliveIds = new Set(session.roster.filter((g) => g.status !== 'dead').map((g) => g.id));
            for (const a of session.governanceAssignments) assert.isTrue(aliveIds.has(a.generalUid), `第 ${season} 季 治理指派到不在世的 ${a.generalUid}`);
            // 日誌 ID 不重複
            const journal = session.queryJournal();
            assert.equals(new Set(journal.map((e) => e.entryId)).size, journal.length, `第 ${season} 季 日誌 ID 重複`);
            // 戰魂碎片只來自亡者
            for (const uid of Object.keys(session.soulFragmentLedger())) {
                assert.isTrue(everDead.has(uid) || !aliveIds.has(uid), `第 ${season} 季 活人 ${uid} 有戰魂碎片`);
            }
            // 存讀檔往返
            const diff = await roundTripDiff(session, adapter);
            assert.isTrue(diff.length === 0, `第 ${season} 季 存讀檔往返有欄位不一致：${diff.join(',')}`);
        }

        assert.isTrue(everDead.has('liu'), '李名將應已老死');
        assert.equals(1, Object.keys(session.tallyCards).length, '名將老死應產生一張虎符');
        assert.isTrue(Object.keys(session.soulFragmentLedger()).includes('liu'), '亡者應留下戰魂碎片');
    });

    suite.test('中途存檔重開再續玩，結果與一路玩到底的快照完全一致（沒有系統漏存狀態或亂數）', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const make = (): GeneralConfig[] => [
            gen('liu', 69.75, { templateId: 'liu-bei-1', isHistorical: true, bloodlineId: 'bl-1', totalTp: 500 }),
            gen('cao', 66, { templateId: 'cao-cao-1', isHistorical: true, bloodlineId: 'bl-2' }),
            gen('zhang', 30, { templateId: 'zhang-fei-1', bloodlineId: 'bl-1', totalTp: 10 }),
            gen('zhao', 28, { templateId: 'zhao-yun-1', bloodlineId: 'bl-3' }),
            gen('ma', 27, { templateId: 'ma-chao-1', bloodlineId: 'bl-4' }),
        ];
        const setupRun = async (adapter: MemoryStorageAdapter): Promise<GameSession> => {
            const session = build(adapter, make());
            session.setAutoSave(false);
            session.startNewGame(11);
            session.assignGovernor('farming', 'zhao');
            await session.autoAssignHallMission({ taskId: 'T1', AI_Assign_Enabled: true, Difficulty: 'EASY', board: 'Military' } as never, 'y1');
            await session.retireGeneral('cao');
            session.spendLifespan('liu', 'breeding');
            return session;
        };

        const straight = await setupRun(new MemoryStorageAdapter());
        for (let i = 0; i < 6; i++) await straight.advanceSeason();

        const adapter = new MemoryStorageAdapter();
        const first = await setupRun(adapter);
        for (let i = 0; i < 3; i++) await first.advanceSeason();
        await first.save();
        const resumed = build(adapter, []);
        resumed.setAutoSave(false);
        assert.isTrue(await resumed.load());
        for (let i = 0; i < 3; i++) await resumed.advanceSeason();

        const a = JSON.parse(JSON.stringify(straight.createSnapshot(new Date(0)))) as Record<string, unknown>;
        const b = JSON.parse(JSON.stringify(resumed.createSnapshot(new Date(0)))) as Record<string, unknown>;
        const differing = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => canonical(a[k]) !== canonical(b[k]));
        assert.isTrue(differing.length === 0, `續玩後與一路玩到底不一致的欄位：${differing.join(",")}` + differing.map((k) => ` [${k}] ${canonical(a[k])} ≠ ${canonical(b[k])}`).join(""));
    });

    return suite;
}
