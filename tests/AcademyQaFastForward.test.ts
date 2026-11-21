/**
 * AcademyQaFastForward.test.ts — PROG-2-9192 學府 QA 快進（qaAcademy 參數解析、動作選擇、快進迴圈與停點）
 */
import { assert, TestSuite } from './TestRunner';
import {
    QA_ACADEMY_MAX_STEPS,
    completedTurnsOf,
    fastForwardAcademy,
    nextFastForwardAction,
    parseQaAcademyParams,
    type AcademyFastForwardPort,
} from '../assets/scripts/ui/core/AcademyQaFastForward';
import { createAcademySnapshot, resolveAcademyAction } from '../assets/scripts/core/systems/nurture/AcademyTrainingEngine';
import { YINGCHUAN_GIMMICK } from '../assets/scripts/core/systems/nurture/YingchuanAcademy';
import { AcademyControlMode, AcademyId, type AcademyActionPayload, type AcademyStateSnapshot } from '../assets/scripts/core/systems/nurture/AcademyTypes';

function freshSnapshot(): AcademyStateSnapshot {
    return createAcademySnapshot({
        worldSeed: 'w', clanUuid: 'c', childId: 'k', academyId: AcademyId.YINGCHUAN, controlMode: AcademyControlMode.MANUAL,
        initialStats: { str: 30, lea: 30, int: 30, pol: 30, cha: 30 }, admissionTurn: 1,
    }, YINGCHUAN_GIMMICK);
}

/** 假修業控制器：真引擎推進，模擬畫面的「動作後進結算、確認後才能再動」 */
class FakePort implements AcademyFastForwardPort {
    snap: AcademyStateSnapshot = freshSnapshot();
    modeNow = 'idle';
    acts: AcademyActionPayload[] = [];
    failAfter = Infinity;
    snapshot(): AcademyStateSnapshot { return this.snap; }
    mode(): string { return this.modeNow; }
    async act(action: AcademyActionPayload): Promise<boolean> {
        if (this.acts.length >= this.failAfter) return false;
        this.acts.push(action);
        this.snap = resolveAcademyAction(this.snap, action, YINGCHUAN_GIMMICK);
        this.modeNow = action.actionType === 'TRAIN' || action.actionType === 'REST' ? 'settling' : 'idle';
        return true;
    }
    async confirm(): Promise<void> { this.modeNow = 'idle'; }
}

export function createAcademyQaFastForwardSuite(): TestSuite {
    const suite = new TestSuite('AcademyQaFastForward (PROG-2-9192)');

    suite.test('qaAcademy 參數：沒帶、非整數、超出 1~36 一律不啟用', () => {
        assert.isTrue(parseQaAcademyParams('') === null && parseQaAcademyParams(undefined) === null && parseQaAcademyParams(null) === null);
        assert.isTrue(parseQaAcademyParams('?qaSlow=0.5') === null, '只有其他 qa 參數不算');
        for (const bad of ['?qaAcademy=', '?qaAcademy=abc', '?qaAcademy=0', '?qaAcademy=37', '?qaAcademy=-3', '?qaAcademy=1.5']) {
            assert.isTrue(parseQaAcademyParams(bad) === null, `${bad} 應視為沒啟用`);
        }
        assert.equals(11, parseQaAcademyParams('?qaAcademy=11')?.turns);
        assert.equals(36, parseQaAcademyParams('?x=1&qaAcademy=36&y=2')?.turns);
    });

    suite.test('動作選擇：精力夠就訓練智力、不夠就休息、有打斷點選第一個選項、結業回 null', () => {
        const snap = freshSnapshot();
        assert.equals('TRAIN', nextFastForwardAction(snap, YINGCHUAN_GIMMICK)?.actionType);
        assert.equals('REST', nextFastForwardAction({ ...snap, energy: 10 }, YINGCHUAN_GIMMICK)?.actionType);
        const pending = nextFastForwardAction({ ...snap, pendingInterrupt: 'MIDTERM', interruptOptions: ['STRENGTH', 'BALANCE'] });
        assert.equals('RESOLVE_INTERRUPT', pending?.actionType);
        assert.equals('STRENGTH', pending?.selectedOptionId);
        assert.isTrue(nextFastForwardAction({ ...snap, graduated: true }) === null);
    });

    suite.test('快進 11 回合：停在第 12 回合開始前，期中打斷點已掛上且沒有被自動處理', async () => {
        const port = new FakePort();
        const result = await fastForwardAcademy(port, 11, YINGCHUAN_GIMMICK);
        assert.equals('target', result.stoppedBy);
        assert.equals(11, result.completedTurns);
        assert.equals(12, port.snap.currentTurn);
        assert.equals('MIDTERM', port.snap.pendingInterrupt);
        assert.isTrue(port.acts.every((a) => a.actionType !== 'RESOLVE_INTERRUPT'), '到達目標前沒有解打斷點');
        assert.isTrue(result.steps < QA_ACADEMY_MAX_STEPS);
    });

    suite.test('快進 23 回合：中途自動解開第 12 回合打斷，停在弱冠打斷點', async () => {
        const port = new FakePort();
        const result = await fastForwardAcademy(port, 23, YINGCHUAN_GIMMICK);
        assert.equals('target', result.stoppedBy);
        assert.equals('COMING_OF_AGE', port.snap.pendingInterrupt);
        assert.equals(1, port.acts.filter((a) => a.actionType === 'RESOLVE_INTERRUPT').length);
    });

    suite.test('快進 36 回合：走完結業確認，回報 graduated', async () => {
        const port = new FakePort();
        const result = await fastForwardAcademy(port, 36, YINGCHUAN_GIMMICK);
        assert.equals('graduated', result.stoppedBy);
        assert.equals(36, result.completedTurns);
        assert.isTrue(port.snap.graduated);
    });

    suite.test('動作被拒（落盤失敗等）就停下回 failed；沒有紀錄回 no-record；已完成回合算法', async () => {
        const port = new FakePort();
        port.failAfter = 3;
        assert.equals('failed', (await fastForwardAcademy(port, 20, YINGCHUAN_GIMMICK)).stoppedBy);
        const empty: AcademyFastForwardPort = { snapshot: () => null, mode: () => 'idle', act: async () => true, confirm: async () => undefined };
        const none = await fastForwardAcademy(empty, 5);
        assert.equals('no-record', none.stoppedBy);
        assert.equals(0, none.completedTurns);
        assert.equals(0, completedTurnsOf(freshSnapshot()));
        assert.equals(36, completedTurnsOf({ ...freshSnapshot(), graduated: true }));
    });

    return suite;
}
