// @spec-source → WBS v3 MVP-10 與 MVP 內政 5 大任務 UI 顯示；DomesticTasks.ts 的產出表（暫定）
/**
 * DomesticPresenter — 內政 5 大任務面板的顯示資料，純 TS，不依賴 cc。
 *
 * View 只把列資料套到按鈕與文字。能否選擇沿用 runDomesticTask 的規則：同一季只能選一項。
 * 產出依指派武將屬性（§F）計算。任務名稱與資源名稱是暫定的繁中字串，正式字串表定案後改 key。
 */
import { DOMESTIC_TASK_IDS, domesticOutputFor, DomesticOutput, DomesticResource, DomesticSeasonLog, DomesticStats, DomesticTaskId } from './DomesticTasks';

/** 任務格目前指派的武將（GOV-04）；產出依其屬性計算。 */
export interface DomesticGovernor {
    id?: string;
    name: string;
    stats: DomesticStats;
}

export interface DomesticTaskRow {
    taskId: DomesticTaskId;
    label: string;
    outputText: string;
    /** 同季已選過任一項時全部關閉。 */
    canChoose: boolean;
    /** 本季已選的那一項。 */
    chosenThisSeason: boolean;
    /** 指派武將名稱；未指派為 null（產出走固定表）。 */
    governorName: string | null;
    /** 指派武將 id（名稱旁小頭像用）；未指派為 null。 */
    governorId: string | null;
}

export const TASK_LABEL: Readonly<Record<DomesticTaskId, string>> = Object.freeze({
    farming: '農耕',
    commerce: '商業',
    diplomacy: '外交',
    arms: '軍備',
    scouting: '偵查',
});

export const RESOURCE_LABEL: Readonly<Record<DomesticResource, string>> = Object.freeze({
    food: '糧草',
    gold: '黃金',
    fame: '名聲',
    cityTroops: '城市兵源',
});

/** 依季數與季紀錄產生 5 列；season 與紀錄相同即表示本季已選。 */
export function buildDomesticRows(
    log: Readonly<DomesticSeasonLog>,
    season: number,
    governorOf: (taskId: DomesticTaskId) => DomesticGovernor | null = () => null,
    goldBonus = 0,
    multiplierOf: (taskId: DomesticTaskId) => number = () => 1,
): DomesticTaskRow[] {
    const chosenThisSeason = log.lastSeason === season;
    return DOMESTIC_TASK_IDS.map(taskId => {
        const governor = governorOf(taskId);
        const output = domesticOutputFor(taskId, governor?.stats, goldBonus, multiplierOf(taskId));
        return {
            taskId,
            label: TASK_LABEL[taskId],
            outputText: `${RESOURCE_LABEL[output.resource]} +${output.amount}`,
            canChoose: !chosenThisSeason,
            chosenThisSeason: chosenThisSeason && log.lastTask === taskId,
            governorName: governor?.name ?? null,
            governorId: governor?.id ?? null,
        };
    });
}

/**
 * 選完內政任務後的提示：顯示「實際入帳」而不是預覽毛額（PROG-2-9126）。
 * 入帳量被資源上限夾住時，註明原產出與上限，玩家才看得懂為何頂欄增加得比預覽少。
 */
export function domesticChosenNotice(label: string, output: Readonly<DomesticOutput>, granted: number): string {
    const name = RESOURCE_LABEL[output.resource];
    const base = `本季已選「${label}」：${name} +${granted}`;
    return granted < output.amount ? `${base}（已達${name}上限，原產出 +${output.amount}）` : base;
}
