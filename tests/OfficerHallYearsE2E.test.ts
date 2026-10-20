/**
 * OfficerHallYearsE2E — 任務派遣 × 官職經驗 × 權限旗標，跨多年與存讀檔端到端（QA，PROG-2-0628）
 *
 * Unity 對照：像 PlayMode 測試，玩家每季派一個目前看得到的最高難度任務，
 * 一路從階位 1 升到階位 5；每年存檔再換新 session 讀回，驗官職、解鎖旗標、指派紀錄都一致。
 */
import { assert, TestSuite } from './TestRunner';
import { GAME_SESSION_EVENTS, GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { hallPlayerOf } from '../assets/scripts/core/systems/OfficerSnapshot';
import { calcOfficerExpGain } from '../assets/scripts/core/systems/OfficerState';
import type { HallGateTask } from '../assets/scripts/core/systems/HallMissionBoard';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

/** 階位 N 看得到的最高難度（F-2：EASY1 / NORMAL2 / ELITE3 / ADVANCED4 / HELL5） */
const TOP_DIFFICULTY_BY_TIER = ['', 'EASY', 'NORMAL', 'ELITE', 'ADVANCED', 'HELL'];

function hero(): GeneralConfig {
    return { id: 'hero', name: '關羽', faction: 'shu', gender: '男', age: 20, hp: 1000, vitality: 100, maxVitality: 100, str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40 } as unknown as GeneralConfig;
}

function newSession(adapter: MemoryStorageAdapter, roster: GeneralConfig[], emitted: string[]): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setRandomSource(() => 0.99);
    session.setEventEmitter({ emit: (name) => emitted.push(name) });
    return session;
}

function taskOf(index: number, difficulty: string): HallGateTask {
    return { Task_ID: `task-${index}`, Difficulty: difficulty, Required_Rank: 1, Is_Accepted: false };
}

export function createOfficerHallYearsE2ESuite(): TestSuite {
    const suite = new TestSuite('OfficerHallYearsE2E (任務派遣×官職經驗×權限旗標)');

    suite.test('越級任務被擋：階位 1 派 HELL 任務 NOT_VISIBLE，不指派、不入帳經驗', async () => {
        const emitted: string[] = [];
        const session = newSession(new MemoryStorageAdapter(), [hero()], emitted);
        const result = await session.dispatchHallTask(taskOf(0, 'HELL'), 'Military', hallPlayerOf(session.officerUnlocks), 'hero', 9999);
        assert.isFalse(result.ok);
        assert.equals(0, session.officerState.officerExp);
        assert.equals(0, Object.keys(session.hallAssignments).length);
    });

    suite.test('每季派最高可見難度任務直到階位 5：經驗逐筆累加、晉升事件逐階一次、權限旗標隨階位開啟，每年存讀檔一致', async () => {
        const adapter = new MemoryStorageAdapter();
        const emitted: string[] = [];
        let session = newSession(adapter, [hero()], emitted);
        let expectedExp = 0;
        let dispatches = 0;
        let previousTier = 1;

        for (let season = 1; season <= 40 && session.officerState.currentTier < 5; season++) {
            const tier = session.officerState.currentTier;
            const difficulty = TOP_DIFFICULTY_BY_TIER[tier];
            const result = await session.dispatchHallTask(taskOf(season, difficulty), 'Military', hallPlayerOf(session.officerUnlocks), 'hero', 9999);
            assert.isTrue(result.ok, `第 ${season} 季 ${difficulty} 任務應可派遣`);
            dispatches++;
            expectedExp += calcOfficerExpGain({ difficulty: difficulty === 'ADVANCED' ? 'HIGH' : (difficulty as 'EASY'), boardType: 'MILITARY', success: true });
            assert.equals(expectedExp, session.officerState.officerExp, `第 ${season} 季經驗`);

            const unlocks = session.officerUnlocks;
            assert.isTrue(unlocks.tier >= previousTier, '階位只升不降');
            assert.equals(unlocks.tier >= 4, unlocks.allianceDocs, `階位 ${unlocks.tier} 聯盟文書旗標`);
            assert.equals(unlocks.tier >= 5, unlocks.antiHegemonySummit, `階位 ${unlocks.tier} 反霸權會盟旗標`);
            previousTier = unlocks.tier;

            await session.advanceSeason();
            if (season % 4 === 0) {
                // 每年底存檔，換新 session 讀回，官職與指派紀錄必須一致
                await session.save();
                const before = { officer: session.officerState, assignments: session.hallAssignments, unlocks: session.officerUnlocks };
                session = newSession(adapter, [], emitted);
                assert.isTrue(await session.load());
                assert.equals(JSON.stringify(before.officer), JSON.stringify(session.officerState), `第 ${season} 季存讀後官職`);
                assert.equals(JSON.stringify(before.assignments), JSON.stringify(session.hallAssignments), `第 ${season} 季存讀後指派`);
                assert.equals(JSON.stringify(before.unlocks), JSON.stringify(session.officerUnlocks), `第 ${season} 季存讀後解鎖`);
            }
        }

        assert.equals(5, session.officerState.currentTier, '40 季內應升到階位 5');
        assert.equals(JSON.stringify([1, 2, 3, 4, 5]), JSON.stringify(session.officerState.unlockHistory));
        assert.equals(4, emitted.filter((name) => name === GAME_SESSION_EVENTS.OfficerPromoted).length, '階位 2~5 各發一次晉升事件');
        assert.isTrue(session.officerUnlocks.antiHegemonySummit);
        assert.equals(dispatches, Object.keys(session.hallAssignments).length, '每次派遣各留一筆指派');
    });

    return suite;
}
