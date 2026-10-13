// @spec-source → WBS v3 MVP-10 與 MVP 內政 5 大任務 UI 顯示；DomesticTasks.ts 的產出表（暫定）
/**
 * DomesticPresenter — 內政 5 大任務面板的顯示資料，純 TS，不依賴 cc。
 *
 * View 只把列資料套到按鈕與文字。能否選擇沿用 runDomesticTask 的規則：同一季只能選一項。
 * 任務名稱與資源名稱是暫定的繁中字串，正式字串表定案後改 key。
 */
import { DOMESTIC_TASK_IDS, DOMESTIC_TASK_OUTPUT, DomesticResource, DomesticSeasonLog, DomesticTaskId } from './DomesticTasks';

export interface DomesticTaskRow {
    taskId: DomesticTaskId;
    label: string;
    outputText: string;
    /** 同季已選過任一項時全部關閉。 */
    canChoose: boolean;
    /** 本季已選的那一項。 */
    chosenThisSeason: boolean;
}

const TASK_LABEL: Readonly<Record<DomesticTaskId, string>> = Object.freeze({
    farming: '農耕',
    commerce: '商業',
    diplomacy: '外交',
    arms: '軍備',
    scouting: '偵查',
});

const RESOURCE_LABEL: Readonly<Record<DomesticResource, string>> = Object.freeze({
    food: '糧草',
    gold: '黃金',
    fame: '名聲',
    cityTroops: '城市兵源',
});

/** 依季數與季紀錄產生 5 列；season 與紀錄相同即表示本季已選。 */
export function buildDomesticRows(log: Readonly<DomesticSeasonLog>, season: number): DomesticTaskRow[] {
    const chosenThisSeason = log.lastSeason === season;
    return DOMESTIC_TASK_IDS.map(taskId => {
        const output = DOMESTIC_TASK_OUTPUT[taskId];
        return {
            taskId,
            label: TASK_LABEL[taskId],
            outputText: `${RESOURCE_LABEL[output.resource]} +${output.amount}`,
            canChoose: !chosenThisSeason,
            chosenThisSeason: chosenThisSeason && log.lastTask === taskId,
        };
    });
}
