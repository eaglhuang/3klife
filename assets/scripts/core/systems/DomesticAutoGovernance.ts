// @spec-source → 領地治理系統 §E #4 自動治理、§F 自動治理分配；PROG-2-1160
/**
 * DomesticAutoGovernance — 內政任務格的自動指派（純邏輯，不依賴 cc）
 *
 * 規格：閒置武將依 Task_Affinity = 主屬性 × 權重，分配到最優的空任務格。
 * 只補空格、只用尚未指派的武將，已手動指派的格子不動。
 * 暫定：規格是逐將 argmax 但沒定武將順序；改成每次取全體（武將, 任務）中親和度最高的一組，
 * 結果不受名冊排序影響。親和度 = §F 產出公式扣掉 Base 的屬性部分。
 *
 * Unity 對照：像一個靜態 Utility，給 Inspector 的「Auto Assign」按鈕呼叫，回傳新的指派表。
 */
import { DOMESTIC_TASK_IDS, domesticOutputFor, DomesticStats, DomesticTaskId } from './DomesticTasks';

export interface AutoGovernanceCandidate {
    id: string;
    stats: DomesticStats;
}

export interface AutoGovernancePick {
    task: DomesticTaskId;
    generalUid: string;
}

/** 武將對該任務的親和度（§F 主屬性 × 權重） */
export function domesticAffinity(taskId: DomesticTaskId, stats: Readonly<DomesticStats>): number {
    const zero = { str: 0, int: 0, pol: 0, cha: 0 };
    return domesticOutputFor(taskId, stats).amount - domesticOutputFor(taskId, zero).amount;
}

/**
 * 回傳要新增的指派（不含原有的）。
 * assigned：目前各任務格已指派的武將 id（null 表示空格）。
 */
export function planAutoGovernance(
    candidates: readonly AutoGovernanceCandidate[],
    assigned: (taskId: DomesticTaskId) => string | null,
): AutoGovernancePick[] {
    const busy = new Set(DOMESTIC_TASK_IDS.map(assigned).filter((uid): uid is string => !!uid));
    let tasks = DOMESTIC_TASK_IDS.filter((t) => !assigned(t));
    let idle = candidates.filter((c) => !busy.has(c.id));
    const picks: AutoGovernancePick[] = [];
    while (tasks.length > 0 && idle.length > 0) {
        let best: { task: DomesticTaskId; general: AutoGovernanceCandidate; score: number } | null = null;
        for (const general of idle) {
            for (const task of tasks) {
                const score = domesticAffinity(task, general.stats);
                if (!best || score > best.score) best = { task, general, score };
            }
        }
        if (!best) break;
        picks.push({ task: best.task, generalUid: best.general.id });
        tasks = tasks.filter((t) => t !== best!.task);
        idle = idle.filter((c) => c !== best!.general);
    }
    return picks;
}
