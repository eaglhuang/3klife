import { assert, TestSuite } from './TestRunner';
import {
    appendAssignRecord,
    autoAssignHallTask,
    HallAutoAssignRecord,
    listAssignRecords,
    pickAutoAssignGeneral,
    settleLatestAssign,
    settleOpenAssignsForSeason,
} from '../assets/scripts/core/systems/HallAutoAssign';

const ENABLED = { taskId: 't1', Intel_Reveal_Percent: 40, AI_Assign_Enabled: true };
const DISABLED = { taskId: 't2', Intel_Reveal_Percent: 40, AI_Assign_Enabled: false };
const CANDIDATES = [
    { generalId: 'guan-yu', power: 90 },
    { generalId: 'zhang-fei', power: 95 },
    { generalId: 'zhao-yun', power: 95 },
];

export function createHallAutoAssignSuite(): TestSuite {
    const suite = new TestSuite('HallAutoAssign (HALL-05 委任與回看紀錄)');

    suite.test('未開啟委任時拒絕，且不產生紀錄', () => {
        const result = autoAssignHallTask(DISABLED, CANDIDATES, '2026-10-14T20:00:00Z');
        assert.isFalse(result.ok);
        assert.equals('not-enabled', (result as { reason: string }).reason);
    });

    suite.test('開啟委任時 AI 選戰力最高者，同分取 generalId 字典序較小者', () => {
        assert.equals('zhang-fei', pickAutoAssignGeneral(CANDIDATES) ?? '');
        const result = autoAssignHallTask(ENABLED, CANDIDATES, '2026-10-14T20:00:00Z');
        assert.isTrue(result.ok);
        if (!result.ok) return;
        assert.equals('t1', result.record.taskId);
        assert.equals('zhang-fei', result.record.generalId);
        assert.equals('2026-10-14T20:00:00Z', result.record.assignedAt);
    });

    suite.test('沒有可選武將時拒絕，忽略非有限戰力', () => {
        assert.equals<string | null>(null, pickAutoAssignGeneral([]));
        assert.equals<string | null>(null, pickAutoAssignGeneral([{ generalId: 'x', power: Number.NaN }]));
        assert.equals('guan-yu', pickAutoAssignGeneral([
            { generalId: 'x', power: Number.NaN },
            { generalId: 'guan-yu', power: 10 },
        ]) ?? '');
        const result = autoAssignHallTask(ENABLED, [], '2026-10-14T20:00:00Z');
        assert.isFalse(result.ok);
        assert.equals('no-candidate', (result as { reason: string }).reason);
    });

    suite.test('同一任務已有未結算委任時拒絕，不重複委任', () => {
        const open: HallAutoAssignRecord[] = [{ taskId: 't1', generalId: 'guan-yu', assignedAt: 'T1' }];
        const result = autoAssignHallTask(ENABLED, CANDIDATES, 'T2', open);
        assert.isFalse(result.ok);
        assert.equals('task-already-assigned', (result as { reason: string }).reason);
    });

    suite.test('同一任務已結算後可再次委任', () => {
        const settled: HallAutoAssignRecord[] = [
            { taskId: 't1', generalId: 'guan-yu', assignedAt: 'T1', outcome: 'success', settledAt: 'T1b' },
        ];
        const result = autoAssignHallTask(ENABLED, CANDIDATES, 'T2', settled);
        assert.isTrue(result.ok);
    });

    suite.test('選將排除已在其他未結算委任上的武將', () => {
        const open: HallAutoAssignRecord[] = [{ taskId: 't9', generalId: 'zhang-fei', assignedAt: 'T1' }];
        const result = autoAssignHallTask(ENABLED, CANDIDATES, 'T2', open);
        assert.isTrue(result.ok);
        if (!result.ok) return;
        assert.equals('zhao-yun', result.record.generalId);
    });

    suite.test('候選全部忙碌時回傳沒有候選，不產生紀錄', () => {
        const open: HallAutoAssignRecord[] = CANDIDATES.map((c, i) => ({ taskId: `o${i}`, generalId: c.generalId, assignedAt: 'T1' }));
        const result = autoAssignHallTask(ENABLED, CANDIDATES, 'T2', open);
        assert.isFalse(result.ok);
        assert.equals('no-candidate', (result as { reason: string }).reason);
    });

    suite.test('已結算的委任不佔用武將', () => {
        const settled: HallAutoAssignRecord[] = [
            { taskId: 't9', generalId: 'zhang-fei', assignedAt: 'T1', outcome: 'failure', settledAt: 'T1b' },
        ];
        const result = autoAssignHallTask(ENABLED, CANDIDATES, 'T2', settled);
        assert.isTrue(result.ok);
        if (!result.ok) return;
        assert.equals('zhang-fei', result.record.generalId);
    });

    suite.test('委任不改動任務的情報度，情報與委任分開判斷', () => {
        const task = { ...ENABLED };
        autoAssignHallTask(task, CANDIDATES, '2026-10-14T20:00:00Z');
        assert.equals(40, task.Intel_Reveal_Percent);
    });

    suite.test('追加紀錄不改動原陣列；回看依任務篩選且新到舊', () => {
        const first: HallAutoAssignRecord = { taskId: 't1', generalId: 'a', assignedAt: 'T1' };
        const second: HallAutoAssignRecord = { taskId: 't2', generalId: 'b', assignedAt: 'T2' };
        const third: HallAutoAssignRecord = { taskId: 't1', generalId: 'c', assignedAt: 'T3' };
        const log0: HallAutoAssignRecord[] = [];
        const log1 = appendAssignRecord(log0, first);
        const log2 = appendAssignRecord(log1, second);
        const log3 = appendAssignRecord(log2, third);
        assert.equals(0, log0.length);
        assert.equals(1, log1.length);
        assert.equals(3, log3.length);
        assert.equals('T3,T1', listAssignRecords(log3, 't1').map(r => r.assignedAt).join(','));
        assert.equals('T3,T2,T1', listAssignRecords(log3).map(r => r.assignedAt).join(','));
    });

    suite.test('結算只套用在同任務最新一筆未結算紀錄，較舊的仍保持未結算', () => {
        const log0: HallAutoAssignRecord[] = [
            { taskId: 't1', generalId: 'a', assignedAt: 'T1' },
            { taskId: 't1', generalId: 'b', assignedAt: 'T2' },
        ];
        const result = settleLatestAssign(log0, 't1', 'success', 'S1');
        assert.isTrue(result.ok);
        if (!result.ok) return;
        assert.equals(undefined, result.log[0].outcome);
        assert.equals('success', result.log[1].outcome ?? '');
        assert.equals('S1', result.log[1].settledAt ?? '');
        assert.equals(undefined, log0[1].outcome);
    });

    suite.test('已結算或沒有該任務的紀錄時拒絕結算', () => {
        const settled: HallAutoAssignRecord[] = [
            { taskId: 't1', generalId: 'a', assignedAt: 'T1', outcome: 'failure', settledAt: 'S0' },
        ];
        const again = settleLatestAssign(settled, 't1', 'success', 'S1');
        assert.isFalse(again.ok);
        assert.equals('no-open-record', (again as { reason: string }).reason);
        const missing = settleLatestAssign([], 't9', 'success', 'S1');
        assert.isFalse(missing.ok);
    });

    suite.test('回看時能看到結算結果與結算時間', () => {
        const log0: HallAutoAssignRecord[] = [{ taskId: 't1', generalId: 'a', assignedAt: 'T1' }];
        const result = settleLatestAssign(log0, 't1', 'failure', 'S1');
        if (!result.ok) return;
        const [record] = listAssignRecords(result.log, 't1');
        assert.equals('failure', record.outcome ?? '');
        assert.equals('S1', record.settledAt ?? '');
    });

    suite.test('季結自動結算：未結的委任依戰力與難度判定，已結算的紀錄不變', () => {
        const log: HallAutoAssignRecord[] = [
            { taskId: 'EASY-1', generalId: 'g-strong', assignedAt: '第1年春', difficulty: 'EASY', board: 'Military' },
            { taskId: 'HELL-1', generalId: 'g-weak', assignedAt: '第1年春', difficulty: 'HELL', board: 'Military' },
            { taskId: 'OLD-1', generalId: 'g-done', assignedAt: '第1年春', outcome: 'failure', settledAt: '第1年春' },
            { taskId: 'NODIFF', generalId: 'g-gone', assignedAt: '第1年春' },
        ];
        const power: Record<string, number> = { 'g-strong': 300, 'g-weak': 50, 'g-done': 999, 'g-gone': 0 };
        const result = settleOpenAssignsForSeason(log, (id) => power[id] ?? 0, '第1年夏');
        assert.equals('success', result.log[0].outcome ?? '');
        assert.equals('第1年夏', result.log[0].settledAt ?? '');
        assert.equals('failure', result.log[1].outcome ?? '');
        assert.equals('failure', result.log[2].outcome ?? '', '已結算的紀錄不被覆寫');
        assert.equals('failure', result.log[3].outcome ?? '', '未知難度視為失敗');
        assert.equals(3, result.settled.length);
        assert.equals(undefined, log[0].outcome, '輸入不改動');
    });

    suite.test('委任時記下難度與任務牆；季結不會結算已忙碌之外的武將', () => {
        const assigned = autoAssignHallTask({ taskId: 'EASY-1', AI_Assign_Enabled: true, Difficulty: 'EASY', board: 'Military' },
            [{ generalId: 'g-a', power: 10 }], '第1年春');
        assert.isTrue(assigned.ok);
        if (!assigned.ok) return;
        assert.equals('EASY', assigned.record.difficulty ?? '');
        assert.equals('Military', assigned.record.board ?? '');
        const settled = settleOpenAssignsForSeason([assigned.record], () => 500, '第1年夏');
        assert.equals('success', settled.log[0].outcome ?? '');
        const next = autoAssignHallTask({ taskId: 'EASY-2', AI_Assign_Enabled: true }, [{ generalId: 'g-a', power: 10 }], '第1年秋', settled.log);
        assert.isTrue(next.ok, '季結後武將已釋放，可再委任');
    });

    return suite;
}
