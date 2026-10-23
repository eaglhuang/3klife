/**
 * FailurePathsE2E — 失敗路徑端到端（QA，PROG-2-0630）
 * 超齡死亡、戰敗、精力不足結緣被擋、存檔損毀。
 *
 * Unity 對照：像 PlayMode 的負面測試，玩家做了「不順利」的事，遊戲要擋得住、狀態不能被弄壞，
 * 而且玩家回到主選單重來時，存檔還能正常覆寫。
 */
import { assert, TestSuite } from './TestRunner';
import { GAME_SESSION_EVENTS, GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PLAYER_SAVE_KEY, PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { createInitialGameTimeState } from '../assets/scripts/core/systems/GameClock';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function person(id: string, gender: '男' | '女', age: number, extra: Record<string, unknown> = {}): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender, age, hp: 1000, vitality: 100, maxVitality: 100, maxLifespan: 120,
        str: 80, int: 60, lea: 70, pol: 50, cha: 100, luk: 40,
        ...extra,
    } as unknown as GeneralConfig;
}

function build(adapter: MemoryStorageAdapter, roster: GeneralConfig[], emitted: string[] = []): { session: GameSession; store: InMemoryRosterStore } {
    const session = new GameSession();
    const store = new InMemoryRosterStore(roster);
    session.setRosterStore(store);
    session.setSaveService(new PlayerSaveService(adapter));
    session.setLifecycle(new LegacyService(adapter));
    session.setEventEmitter({ emit: (name) => emitted.push(name) });
    session.setRandomSource(() => 0);
    return { session, store };
}

async function rejects(task: () => Promise<unknown>): Promise<boolean> {
    try { await task(); return false; } catch { return true; }
}

export function createFailurePathsE2ESuite(): TestSuite {
    const suite = new TestSuite('FailurePathsE2E (超齡死亡／戰敗／精力不足／存檔損毀)');

    suite.test('超齡死亡：年底老死的武將離開名冊，主將指派被清掉，年報死亡數 1，存讀檔後仍不在', async () => {
        const adapter = new MemoryStorageAdapter();
        const emitted: string[] = [];
        const { session, store } = build(adapter, [person('old', '男', 95, { maxLifespan: 70 }), person('young', '男', 20)], emitted);
        session.startNewGame(20261020);
        assert.isTrue(await session.setLeadGeneral('old'));
        const report = await session.advanceYear();
        assert.equals(1, report.deaths);
        assert.isFalse(store.getAll().some((g) => g.id === 'old'), '老死者離開名冊');
        assert.isTrue(store.getAll().some((g) => g.id === 'young'), '其他武將不受影響');
        assert.equals(null, session.leadGeneralId, '主將老死後指派清掉');
        assert.isTrue(emitted.includes(GAME_SESSION_EVENTS.YearEnded));

        const reloaded = build(adapter, []);
        assert.isTrue(await reloaded.session.load());
        assert.isFalse(reloaded.store.getAll().some((g) => g.id === 'old'), '讀檔後老死者仍不在');
        assert.equals(null, reloaded.session.leadGeneralId);
    });

    suite.test('戰敗：不記通關、不算首次通關，戰績記一敗；之後勝利才通關', async () => {
        const { session, store } = build(new MemoryStorageAdapter(), [person('hero', '男', 30)]);
        session.startNewGame(20261020);
        await session.recordBattle(['hero'], 'enemy-win', { stageId: 'stage-1' });
        assert.equals(0, session.clearedStageIds.length, '戰敗不記通關');
        const record = (store.getAll()[0] as GeneralConfig & { battleRecord?: { wins: number; losses: number } }).battleRecord;
        assert.equals(1, record?.losses ?? -1, '記一敗');
        assert.equals(0, record?.wins ?? -1);

        await session.recordBattle(['hero'], 'draw', { stageId: 'stage-1' });
        assert.equals(0, session.clearedStageIds.length, '平手也不通關');

        await session.recordBattle(['hero'], 'player-win', { stageId: 'stage-1' });
        assert.equals(1, session.clearedStageIds.length);
        const after = (store.getAll()[0] as GeneralConfig & { battleRecord?: { wins: number; losses: number } }).battleRecord;
        assert.equals(1, after?.wins ?? -1);
        assert.equals(1, after?.losses ?? -1, '先前的敗績保留');
    });

    suite.test('精力不足結緣：被擋下，不扣精力、不生子嗣、名冊不變', () => {
        const store = new InMemoryRosterStore([person('weak', '男', 30, { vitality: 10 }), person('lady', '女', 28)]);
        const breeding = new BreedingService(store, new BloodlineGraph(), { random: () => 0.01 });
        const before = JSON.stringify(store.getAll());
        const eligibility = breeding.checkEligibility('weak', 'lady');
        assert.isFalse(eligibility.ok);
        assert.isTrue(eligibility.reasons.includes('father-low-vigor'));
        const result = breeding.breed('weak', 'lady');
        assert.equals('blocked', result.outcome);
        assert.equals(undefined, result.child);
        assert.equals(before, JSON.stringify(store.getAll()), '被擋下後名冊逐字不變');
    });

    suite.test('存檔損毀：壞檔讀不進來且不弄壞進行中的遊戲，重新存檔後可正常讀回', async () => {
        const adapter = new MemoryStorageAdapter();
        const { session, store } = build(adapter, [person('hero', '男', 30)]);
        session.startNewGame(20261020);
        await session.advanceSeason();
        const seasons = session.gameTime.totalSeasonsElapsed;
        const rosterBefore = JSON.stringify(store.getAll());

        for (const garbage of ['garbage', 42, { schemaVersion: 999 }, { schemaVersion: 1, savedAt: 'x', gameTime: createInitialGameTimeState(), roster: 'oops' }, { schemaVersion: 1, savedAt: 'x', gameTime: createInitialGameTimeState(), roster: [{ name: '沒有 id' }] }]) {
            await adapter.set(PLAYER_SAVE_KEY, garbage as never);
            assert.isTrue(await rejects(() => session.load()), `壞檔應拒絕: ${JSON.stringify(garbage)}`);
            assert.equals(seasons, session.gameTime.totalSeasonsElapsed, '拒絕後遊戲時鐘不變');
            assert.equals(rosterBefore, JSON.stringify(store.getAll()), '拒絕後名冊不變');
        }

        await session.save();
        const fresh = build(adapter, []);
        assert.isTrue(await fresh.session.load(), '重新存檔後可讀回');
        assert.equals(seasons, fresh.session.gameTime.totalSeasonsElapsed);
    });

    suite.test('存檔欄位局部損毀：選填欄位的壞值被校正為預設，不擋住讀檔', async () => {
        const adapter = new MemoryStorageAdapter();
        await adapter.set(PLAYER_SAVE_KEY, {
            schemaVersion: 1,
            savedAt: '2026-10-01T00:00:00.000Z',
            gameTime: createInitialGameTimeState(),
            roster: [person('hero', '男', 30)],
            officerState: { currentTier: 'x', officerExp: -5 },
            clearedStageIds: [1, null, 'stage-1'],
            inventory: { ITEM_ORACLE: -3 },
        } as never);
        const { session } = build(adapter, []);
        assert.isTrue(await session.load(), '局部壞值不應擋住讀檔');
        assert.equals(1, session.officerState.currentTier);
        assert.equals(0, session.officerState.officerExp);
        assert.isTrue(session.clearedStageIds.every((id) => typeof id === 'string'), '通關紀錄只留字串');
        assert.isTrue(session.itemCount('ITEM_ORACLE') >= 0, '道具數量不為負');
    });

    return suite;
}
