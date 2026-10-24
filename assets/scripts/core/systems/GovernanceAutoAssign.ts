// @spec-source → 領地治理系統.md §F「自動治理分配」與「內政任務產出」主屬性表；WBS v16.2 GOV-06（PROG-2-0978）
/**
 * GovernanceAutoAssign — 自動治理分配（純邏輯，不依賴 cc）。
 *
 * 規格式：
 *   for each General in Idle_Pool:
 *       Best_Task = argmax(Task_Affinity(General, task) for task in Available_Tasks)
 *       assign(General, Best_Task)
 *   Task_Affinity(General, task) = General[task.Primary_Stat] × task.Weight
 *
 * 暫定：Weight 規格未給數值，全部取 1；外交主屬性為 INT+CHR（規格寫 CHR，武將欄位為 cha）。
 * 平手時取任務表順序較前者，結果可重現。
 *
 * Unity 對照：像一個 AI 排程器，依武將屬性替空位挑最適合的工作；只回傳新的指派表，不改輸入。
 */
import { GeneralConfig } from '../models/GeneralUnit';
import { DOMESTIC_TASK_IDS, DomesticTaskId } from './DomesticTasks';
import { assignGovernanceGeneral, DEFAULT_MAX_TASK_SLOTS, GovernanceAssignment } from './GovernanceAssignment';

type AffinityStat = 'str' | 'int' | 'lea' | 'luk' | 'pol' | 'cha';

interface TaskAffinityRule {
    stats: readonly AffinityStat[];
    weight: number;
}

/** 各內政任務的主屬性（對應 §F 產出表）；Weight 暫定為 1。 */
export const TASK_AFFINITY_RULES: Readonly<Record<DomesticTaskId, TaskAffinityRule>> = Object.freeze({
    farming: { stats: ['pol'], weight: 1 },
    commerce: { stats: ['cha'], weight: 1 },
    diplomacy: { stats: ['int', 'cha'], weight: 1 },
    arms: { stats: ['str'], weight: 1 },
    scouting: { stats: ['int'], weight: 1 },
});

function statOf(general: Readonly<GeneralConfig>, stat: AffinityStat): number {
    return general[stat] ?? general.stats?.[stat] ?? 0;
}

/** 武將對某任務的親和度：主屬性加總後乘權重。 */
export function taskAffinity(general: Readonly<GeneralConfig>, task: DomesticTaskId): number {
    const rule = TASK_AFFINITY_RULES[task];
    const primary = rule.stats.reduce((sum, stat) => sum + statOf(general, stat), 0);
    return primary * rule.weight;
}

export interface AutoAssignResult {
    assignments: GovernanceAssignment[];
    /** 本次新分配的 (武將, 任務)，依武將在名冊中的順序排列。 */
    added: GovernanceAssignment[];
}

/**
 * 把閒置武將（名冊中沒有在任何任務格的）依親和度分配到未佔用的任務格。
 * 格數已滿時停止；已指派的武將與任務不受影響。
 */
export function autoAssignIdle(
    current: readonly GovernanceAssignment[],
    roster: readonly GeneralConfig[],
    maxSlots: number = DEFAULT_MAX_TASK_SLOTS,
): AutoAssignResult {
    let assignments: GovernanceAssignment[] = current.map(a => ({ ...a }));
    const added: GovernanceAssignment[] = [];
    for (const general of roster) {
        const open = DOMESTIC_TASK_IDS.filter(task => !assignments.some(a => a.task === task));
        if (open.length === 0) break;
        if (assignments.some(a => a.generalUid === general.id)) continue;
        const best = open.reduce((pick, task) => (taskAffinity(general, task) > taskAffinity(general, pick) ? task : pick), open[0]);
        const result = assignGovernanceGeneral(assignments, best, general.id, maxSlots);
        if (!result.ok) continue;
        assignments = result.assignments;
        added.push({ task: best, generalUid: general.id });
    }
    return { assignments, added };
}
