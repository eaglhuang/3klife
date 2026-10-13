// @spec-source → MVP遊戲驗證規格書 §E #12（基礎內政 5 大任務產出）；名詞定義文件 內政任務 Gov_Task；經濟系統 資源表；WBS v3 MVP-10
/**
 * DomesticTasks — 基礎內政 5 大任務（每季選一項，產出資源）純邏輯，不依賴 cc。
 *
 * 產出數值為暫定值（規格只定義「每季選一任務產出資源」，未給數量）。
 * 尚未接到大廳內政牆、MilitaryReserve 或存檔；由後續工單接線。
 *
 * Unity 對照：像 ScriptableObject 表 DomesticTaskConfig 加上一個 [Serializable]
 * 的「本季已選」欄位，每季結算時呼叫一次純函式算出新的資源。
 */

export const DOMESTIC_TASK_IDS = ['farming', 'commerce', 'diplomacy', 'arms', 'scouting'] as const;
export type DomesticTaskId = typeof DOMESTIC_TASK_IDS[number];

export type DomesticResource = 'food' | 'gold' | 'fame' | 'cityTroops';

export interface DomesticOutput {
    resource: DomesticResource;
    amount: number;
}

/** 5 大任務 → 產出（暫定）。農耕=糧草、商業=黃金、外交=名聲、軍備=城市兵源、偵查=黃金（搜刮情報的小額收入）。 */
export const DOMESTIC_TASK_OUTPUT: Readonly<Record<DomesticTaskId, DomesticOutput>> = Object.freeze({
    farming: { resource: 'food', amount: 120 },
    commerce: { resource: 'gold', amount: 100 },
    diplomacy: { resource: 'fame', amount: 40 },
    arms: { resource: 'cityTroops', amount: 80 },
    scouting: { resource: 'gold', amount: 30 },
});

export interface DomesticStock {
    food: number;
    gold: number;
    fame: number;
    cityTroops: number;
}

export type DomesticCaps = Readonly<DomesticStock>;

/** 每季內政的紀錄：記住上一次選任務的季數，避免同季重複結算。 */
export interface DomesticSeasonLog {
    lastSeason: number | null;
    lastTask: DomesticTaskId | null;
}

export type DomesticRejectReason = 'already-chosen-this-season' | 'unknown-task';

export interface DomesticTaskResult {
    stock: DomesticStock;
    log: DomesticSeasonLog;
    ok: boolean;
    reason?: DomesticRejectReason;
    /** 規格產出量；實際入帳量見 granted（可能被上限截斷）。 */
    output?: DomesticOutput;
    granted: number;
}

export const EMPTY_DOMESTIC_LOG: Readonly<DomesticSeasonLog> = Object.freeze({ lastSeason: null, lastTask: null });

export function isDomesticTaskId(value: string): value is DomesticTaskId {
    return (DOMESTIC_TASK_IDS as readonly string[]).indexOf(value) >= 0;
}

/**
 * 同一季只能選一項內政任務；成功時把產出加到對應資源並夾到上限。
 * 回傳新狀態，不改輸入、不用亂數、不寫存檔。
 */
export function runDomesticTask(
    source: DomesticStock,
    log: DomesticSeasonLog,
    season: number,
    taskId: string,
    caps: DomesticCaps,
): DomesticTaskResult {
    const stock = { ...source };
    const result: DomesticTaskResult = { stock, log: { ...log }, ok: false, granted: 0 };
    if (!isDomesticTaskId(taskId)) {
        result.reason = 'unknown-task';
        return result;
    }
    if (log.lastSeason === season) {
        result.reason = 'already-chosen-this-season';
        return result;
    }
    const output = DOMESTIC_TASK_OUTPUT[taskId];
    const before = stock[output.resource];
    // 已超過上限時只會不增加，不會被強制砍回上限。
    const after = Math.max(before, Math.min(caps[output.resource], before + output.amount));
    stock[output.resource] = after;
    result.granted = Math.max(0, after - before);
    result.output = output;
    result.log = { lastSeason: season, lastTask: taskId };
    result.ok = true;
    return result;
}
