/**
 * HallSeasonSettleE2E.test.ts — 季結自動結算大廳委任（#806）的多季真實流程（QA，PROG-2-0664）
 *
 * Unity 對照：像在 PlayMode 裡先委任任務、再真的推進一季，看結果有沒有寫回紀錄、武將有沒有被釋放、
 * 官職經驗有沒有入帳，委任的武將在季中老死時又怎麼算。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { formatSeasonLabel } from '../assets/scripts/core/systems/GameClock';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { estimateSortiePower } from '../assets/scripts/core/systems/SortiePrediction';
import { judgeHallMissionSuccess } from '../assets/scripts/core/systems/HallMissionDispatch';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { sys } from 'cc';

function general(id: string, str: number, extra: Record<string, unknown> = {}): GeneralConfig {
    return {
        id, name: id, faction: 'player', gender: '男', age: 25, hp: 1000, vitality: 100, maxVitality: 100, maxLifespan: 120,
        str, int: 60, lea: 60, pol: 50, cha: 50, luk: 40, careerClass: 'Warrior', role: 'Combat', rarityTier: 'epic', ...extra,
    } as unknown as GeneralConfig;
}

function setup(roster: GeneralConfig[], adapter = new MemoryStorageAdapter()): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setAutoSave(false);
    session.setLifecycle({
        settleSeason: async (r: GeneralConfig[]) => ({ roster: r.filter((g) => g.status !== 'dead'), settlement: { spiritCards: [] } }),
        retireGeneral: async () => { throw new Error('not used'); },
    } as never);
    session.startNewGame(7);
    return session;
}

const task = (id: string, Difficulty?: string) => ({ taskId: id, AI_Assign_Enabled: true, ...(Difficulty ? { Difficulty, board: 'Military' as const } : {}) });

export function createHallSeasonSettleE2ESuite(): TestSuite {
    const suite = new TestSuite('HallSeasonSettleE2E (季結結算大廳委任 PROG-2-0664)');

    suite.test('推進一季：委任依戰力判成敗、寫回紀錄、釋放武將、入帳官職經驗，存讀檔後結果保留', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new MemoryStorageAdapter();
        const strong = general('strong', 100);
        const session = setup([strong], adapter);
        const power = estimateSortiePower(strong);
        const expected = judgeHallMissionSuccess('EASY', power);
        assert.isTrue((await session.autoAssignHallMission(task('T1', 'EASY'), 'y1')).ok);
        assert.isFalse((await session.autoAssignHallMission(task('T2', 'EASY'), 'y1')).ok, '唯一武將忙碌中');
        const expBefore = JSON.stringify(session.officerState);
        const endingSeasonLabel = formatSeasonLabel(session.gameTime);

        await session.advanceSeason();
        const record = session.listHallAssignRecords('T1')[0];
        assert.equals(expected ? 'success' : 'failure', record.outcome!);
        assert.isTrue(record.settledAt !== undefined);
        assert.equals(endingSeasonLabel, record.settledAt!, 'settledAt 用遊戲內季標籤，不是現實時間');
        assert.isTrue(JSON.stringify(session.officerState) !== expBefore, '官職經驗有入帳');
        assert.isTrue((await session.autoAssignHallMission(task('T2', 'EASY'), 'y2')).ok, '結算後武將釋放');

        await session.save();
        const restored = setup([strong], adapter);
        assert.isTrue(await restored.load());
        assert.equals(record.outcome!, restored.listHallAssignRecords('T1')[0].outcome!);
    });

    suite.test('委任的武將在季中老死：判失敗，不當機', async () => {
        services().initialize();
        const frail = general('frail', 100, { age: 69.75, maxLifespan: 70 });
        const session = setup([frail]);
        assert.isTrue((await session.autoAssignHallMission(task('T1', 'EASY'), 'y1')).ok);
        session.spendLifespan('frail', 'breeding');
        await session.advanceSeason();
        assert.equals('failure', session.listHallAssignRecords('T1')[0].outcome!);
    });

    suite.test('沒有難度資料的舊委任：季結判失敗且不入帳官職經驗；已結算的紀錄不會被重算', async () => {
        services().initialize();
        const session = setup([general('strong', 100), general('other', 100)]);
        assert.isTrue((await session.autoAssignHallMission(task('T-old'), 'y1')).ok);
        const expBefore = JSON.stringify(session.officerState);
        await session.advanceSeason();
        const first = session.listHallAssignRecords('T-old')[0];
        assert.equals('failure', first.outcome!);
        assert.equals(expBefore, JSON.stringify(session.officerState));
        await session.advanceSeason();
        assert.equals(first.settledAt!, session.listHallAssignRecords('T-old')[0].settledAt!, '第二季不重算');
    });

    return suite;
}
