/**
 * PROG-2-1178：派遣任務狀態與登入結算（JRN-03 第二段）
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import type { PlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';
import {
    DISPATCH_COMPLETED_LIMIT, DISPATCH_COOLDOWN_MS, EMPTY_DISPATCH_STATE, normalizeDispatchState, settleDueDispatches, startDispatch,
    type DispatchJobDef,
} from '../assets/scripts/core/systems/DispatchJobs';
import type { DispatchGeneral } from '../assets/scripts/core/systems/DispatchQuality';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const HOUR = 60 * 60 * 1000;
const JOB: DispatchJobDef = {
    jobId: 'J1', name: '邊境巡查', tags: ['Warrior'], requiredStats: { lea: 60 }, storyTags: [], durationMs: 4 * HOUR, rewardText: '糧草 50',
};
const GEN: DispatchGeneral = { roleTags: ['Warrior'], stats: { lea: 80 }, mood: 'HIGH', journalTags: [] };

function hero(id: string, name: string): GeneralConfig {
    return { id, name, faction: 'shu', hp: 1000, str: 80, int: 70, lea: 80, pol: 60, cha: 70, careerClass: 'Warrior' } as unknown as GeneralConfig;
}

export function createDispatchJobsSuite(): TestSuite {
    const suite = new TestSuite('DispatchJobs (PROG-2-1178 派遣任務狀態)');

    suite.test('startDispatch：快照分數；擋下高風險自動派遣、忙碌、同任務、非法時長', () => {
        const ok = startDispatch(EMPTY_DISPATCH_STATE, JOB, 'g1', GEN, 0);
        assert.isTrue(ok.ok);
        assert.equals(100, ok.state.active[0].score);
        assert.equals(4 * HOUR, ok.state.active[0].dueAtMs);
        assert.equals('high-risk-auto', startDispatch(EMPTY_DISPATCH_STATE, { ...JOB, highRisk: true }, 'g1', GEN, 0, true).reason ?? '');
        assert.isTrue(startDispatch(EMPTY_DISPATCH_STATE, { ...JOB, highRisk: true }, 'g1', GEN, 0).ok);
        assert.equals('general-busy', startDispatch(ok.state, { ...JOB, jobId: 'J2' }, 'g1', GEN, 0).reason ?? '');
        assert.equals('job-active', startDispatch(ok.state, JOB, 'g2', GEN, 0).reason ?? '');
        assert.equals('invalid-duration', startDispatch(EMPTY_DISPATCH_STATE, { ...JOB, durationMs: 0 }, 'g1', GEN, 0).reason ?? '');
    });

    suite.test('settleDueDispatches：到期才完成，品質依分數，武將進入冷卻', () => {
        const started = startDispatch(EMPTY_DISPATCH_STATE, JOB, 'g1', GEN, 0).state;
        assert.equals(0, settleDueDispatches(started, 4 * HOUR - 1).completed.length);
        const settled = settleDueDispatches(started, 4 * HOUR);
        assert.equals('EXCELLENT', settled.completed[0].quality);
        assert.equals(0, settled.state.active.length);
        assert.equals(4 * HOUR + DISPATCH_COOLDOWN_MS, settled.state.cooldowns.g1);
        assert.equals('general-cooldown', startDispatch(settled.state, JOB, 'g1', GEN, 4 * HOUR + 1).reason ?? '');
        assert.isTrue(startDispatch(settled.state, JOB, 'g1', GEN, 4 * HOUR + DISPATCH_COOLDOWN_MS).ok);
        // 冷卻過期的紀錄在下次結算時清掉
        assert.equals(0, Object.keys(settleDueDispatches(settled.state, 10 * HOUR).state.cooldowns).length);
    });

    suite.test('normalize：壞資料丟掉，已完成紀錄有上限', () => {
        const many = Array.from({ length: DISPATCH_COMPLETED_LIMIT + 5 }, (_, i) => ({
            jobId: `J${i}`, name: 'x', generalId: 'g', completedAtMs: i, score: 50, quality: 'NORMAL', rewardText: '',
        }));
        const state = normalizeDispatchState({ active: [{ jobId: 'bad' }], completed: [...many, { quality: 'WRONG' }], cooldowns: { g: 5, h: 'x' } });
        assert.equals(0, state.active.length);
        assert.equals(DISPATCH_COMPLETED_LIMIT, state.completed.length);
        assert.equals(JSON.stringify({ g: 5 }), JSON.stringify(state.cooldowns));
        assert.equals(JSON.stringify(EMPTY_DISPATCH_STATE), JSON.stringify(normalizeDispatchState(null)));
    });

    suite.test('GameSession：離線期間完成的派遣，登入時寫日誌並進晨報', () => {
        const session = new GameSession(1);
        session.enrollGenerals([hero('zhao', '趙雲')]);
        const start = Date.parse('2026-10-27T10:00:00+08:00');
        assert.isTrue(session.startDispatchJob(JOB, 'zhao', start)!.ok);
        assert.isTrue(session.startDispatchJob(JOB, 'nobody', start) === null);
        session.recordLoginAt(start + 5 * HOUR);
        assert.equals(1, session.dispatchState.completed.length);
        const lines = session.morningReportLines;
        assert.isTrue(lines.includes('趙雲 已完成『邊境巡查』，帶回 糧草 50。'));
        assert.equals(1, session.queryJournal({ category: 'DISPATCH', generalUid: 'zhao' }).length);
    });

    suite.test('GameSession：跨存讀檔保留派遣狀態；新局不寫入', () => {
        const session = new GameSession(1);
        session.enrollGenerals([hero('zhao', '趙雲')]);
        session.startDispatchJob(JOB, 'zhao', 0);
        const snapshot = JSON.parse(JSON.stringify(session.createSnapshot())) as PlayerSaveSnapshot;
        const restored = new GameSession(2);
        restored.restoreLifespanState(snapshot);
        assert.equals(JSON.stringify(session.dispatchState), JSON.stringify(restored.dispatchState));
        assert.isTrue(new GameSession(3).createSnapshot().generalDispatch === undefined);
    });

    return suite;
}
