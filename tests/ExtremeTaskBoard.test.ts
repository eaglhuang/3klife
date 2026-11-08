/**
 * ExtremeTaskBoard — 天下征鋒入口（PROG-2-2101）。
 */
import { assert, TestSuite } from './TestRunner';
import * as fs from 'fs';
import * as path from 'path';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import {
    EXTREME_TASK_STAGE_IDS, ITEM_EXTREME_CHALLENGE_ORDER, createExtremeTaskState, extremeFreeAttemptsLeft, extremeStageOfWeek,
    extremeWeekIndexOf, isExtremeStage, normalizeExtremeTaskState, rolloverExtremeTask, startExtremeTask,
} from '../assets/scripts/core/systems/ExtremeTaskBoard';
import { extremeDropText, extremeTaskFlowView } from '../assets/scripts/ui/core/ExtremeTaskPanelController';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

/** 2026-11-09 是週一 */
const MONDAY_NOON = Date.UTC(2026, 10, 9, 4);
const DAY = 24 * 60 * 60 * 1000;

function sessionWithLead(): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([{ id: 'a', name: 'a', age: 30 } as unknown as GeneralConfig]));
    return session;
}

export function createExtremeTaskBoardSuite(): TestSuite {
    const suite = new TestSuite('ExtremeTaskBoard (天下征鋒入口 PROG-2-2101)');

    suite.test('週次以週一 00:00（UTC+8）切換', () => {
        const mondayStart = Date.UTC(2026, 10, 8, 16);
        assert.equals(extremeWeekIndexOf(mondayStart), extremeWeekIndexOf(mondayStart + 7 * DAY - 1));
        assert.equals(extremeWeekIndexOf(mondayStart) - 1, extremeWeekIndexOf(mondayStart - 1));
    });

    suite.test('每週 3 次免費，用完才消耗挑戰令，都沒有就拒絕', () => {
        let state = createExtremeTaskState();
        for (let i = 0; i < 3; i++) {
            const result = startExtremeTask(state, MONDAY_NOON, 0);
            assert.isTrue(result.ok);
            if (result.ok) {
                assert.equals(false, result.usedOrder);
                state = result.state;
            }
        }
        assert.equals(0, extremeFreeAttemptsLeft(state, MONDAY_NOON));
        assert.equals(false, startExtremeTask(state, MONDAY_NOON, 0).ok);
        const withOrder = startExtremeTask(state, MONDAY_NOON, 1);
        assert.isTrue(withOrder.ok && withOrder.usedOrder);
    });

    suite.test('跨週次數歸零，待領獎勵保留；BOSS 依週次輪替', () => {
        const state = { ...createExtremeTaskState(), weekIndex: extremeWeekIndexOf(MONDAY_NOON), freeUsed: 3, attempts: 3, rewards: [{ kind: 'gold' as const, amount: 100 }] };
        const next = rolloverExtremeTask(state, MONDAY_NOON + 7 * DAY);
        assert.equals(0, next.freeUsed);
        assert.equals(1, next.rewards.length);
        assert.equals(EXTREME_TASK_STAGE_IDS[0], extremeStageOfWeek(0));
        assert.equals(EXTREME_TASK_STAGE_IDS[1], extremeStageOfWeek(1 + EXTREME_TASK_STAGE_IDS.length));
    });

    suite.test('正規化：壞值與不明關卡都清掉', () => {
        assert.equals(-1, normalizeExtremeTaskState(undefined).weekIndex);
        const state = normalizeExtremeTaskState({ weekIndex: 5, freeUsed: 'x', activeStageId: 'nope', rewards: [{ kind: 'gold', amount: 200 }, { kind: 'gold' }, 'x'] });
        assert.equals(0, state.freeUsed);
        assert.equals(null, state.activeStageId);
        assert.equals(1, state.rewards.length);
    });

    suite.test('每個 BOSS 都有關卡資料，標記 extreme、最高難度，敵將存在', () => {
        const root = path.join(__dirname, '..', 'assets', 'resources', 'data');
        const encounters = JSON.parse(fs.readFileSync(path.join(root, 'encounters.json'), 'utf8')).encounters as Array<Record<string, unknown>>;
        const generals = JSON.parse(fs.readFileSync(path.join(root, 'generals.json'), 'utf8')) as Array<{ id: string }>;
        const difficulties = JSON.parse(fs.readFileSync(path.join(root, 'ai-difficulty.json'), 'utf8')).difficulties as unknown;
        assert.isTrue(JSON.stringify(difficulties).includes('hell'));
        for (const id of EXTREME_TASK_STAGE_IDS) {
            const encounter = encounters.find((e) => e.id === id);
            assert.isTrue(encounter !== undefined, `${id} 缺關卡`);
            assert.equals(true, encounter!.extreme);
            assert.equals('hell', encounter!.aiDifficulty);
            assert.equals(undefined, encounter!.chainId);
            assert.isTrue(generals.some((g) => g.id === encounter!.enemyGeneralId), `${id} 敵將不存在`);
        }
    });

    suite.test('GameSession：通關才產獎勵，領取後清空；金幣走錢包、道具進背包', async () => {
        const session = sessionWithLead();
        const started = await session.startExtremeTask(MONDAY_NOON);
        assert.isTrue(started.ok);
        const stageId = started.ok ? started.stageId : '';
        await session.recordBattle(['a'], 'player-win', { stageId });
        assert.equals(false, session.clearedStageIds.includes(stageId));
        assert.equals(1, session.extremeTaskStatus(MONDAY_NOON).pendingRewards.length);
        let gold = 0;
        const drops = await session.claimExtremeTaskRewards((amount) => { gold += amount; });
        assert.equals(1, drops.length);
        const drop = drops[0];
        if (drop.kind === 'gold') assert.equals(drop.amount, gold);
        else assert.equals(1, session.itemCount(drop.itemId));
        assert.equals(0, session.extremeTaskStatus(MONDAY_NOON).pendingRewards.length);
        assert.equals(0, (await session.claimExtremeTaskRewards(() => undefined)).length);
    });

    suite.test('GameSession：戰敗不給獎勵且次數不退；其他關卡的戰鬥不影響進行中的極限戰', async () => {
        const session = sessionWithLead();
        const started = await session.startExtremeTask(MONDAY_NOON);
        const stageId = started.ok ? started.stageId : '';
        await session.recordBattle(['a'], 'player-win', { stageId: 'encounter-001' });
        assert.equals(stageId, session.extremeTaskStatus(MONDAY_NOON).activeStageId!);
        await session.recordBattle(['a'], 'enemy-win', { stageId });
        const status = session.extremeTaskStatus(MONDAY_NOON);
        assert.equals(0, status.pendingRewards.length);
        assert.equals(null, status.activeStageId);
        assert.equals(2, status.freeLeft);
    });

    suite.test('GameSession：挑戰令會扣；沒有時拒絕；未開戰的通關不發獎', async () => {
        const session = sessionWithLead();
        await session.recordBattle(['a'], 'player-win', { stageId: EXTREME_TASK_STAGE_IDS[0] });
        assert.equals(0, session.extremeTaskStatus(MONDAY_NOON).pendingRewards.length);
        for (let i = 0; i < 3; i++) await session.startExtremeTask(MONDAY_NOON);
        assert.equals(false, (await session.startExtremeTask(MONDAY_NOON)).ok);
        await session.addItem(ITEM_EXTREME_CHALLENGE_ORDER, 1);
        const started = await session.startExtremeTask(MONDAY_NOON);
        assert.isTrue(started.ok && started.usedOrder);
        assert.equals(0, session.itemCount(ITEM_EXTREME_CHALLENGE_ORDER));
    });

    suite.test('存讀檔保留次數與待領獎勵', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = sessionWithLead();
        session.setSaveService(new PlayerSaveService(adapter));
        const started = await session.startExtremeTask(MONDAY_NOON);
        await session.recordBattle(['a'], 'player-win', { stageId: started.ok ? started.stageId : '' });
        await session.save();
        const restored = sessionWithLead();
        restored.setSaveService(new PlayerSaveService(adapter));
        await restored.load();
        const status = restored.extremeTaskStatus(MONDAY_NOON);
        assert.equals(2, status.freeLeft);
        assert.equals(1, status.pendingRewards.length);
    });

    suite.test('彈窗 FlowView：沒次數時停用挑戰鍵；掉落文字正確', () => {
        const full = extremeTaskFlowView({ freeLeft: 3, orders: 0, bossName: '呂布' }, '');
        assert.equals(true, full.enabled.btnChallenge);
        assert.equals('本週 BOSS：呂布', full.texts.etBossLabel);
        assert.equals(false, extremeTaskFlowView({ freeLeft: 0, orders: 0, bossName: '呂布' }, '').enabled.btnChallenge);
        assert.equals(true, extremeTaskFlowView({ freeLeft: 0, orders: 1, bossName: '呂布' }, '').enabled.btnChallenge);
        assert.equals('金幣 300', extremeDropText({ kind: 'gold', amount: 300 }));
        assert.isTrue(isExtremeStage('extreme-lu-bu'));
        assert.equals(false, isExtremeStage('encounter-001'));
    });

    return suite;
}
