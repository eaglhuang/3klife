// @spec-source → 領地治理系統 §F 產出公式；MVP遊戲驗證規格書 §E #12（基礎內政 5 大任務產出）；名詞定義文件 內政任務 Gov_Task；經濟系統 資源表；WBS v3 MVP-10
/**
 * DomesticTasks — 基礎內政 5 大任務（每季選一項，產出資源）純邏輯，不依賴 cc。
 *
 * 有指派武將時依領地治理系統 §F 公式計算（PROG-2-1159）；未指派時沿用固定表（暫定）。
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

/** 計算內政產出用的武將屬性（領地治理系統 §F）。 */
export interface DomesticStats {
    str: number;
    int: number;
    pol: number;
    cha: number;
}

/**
 * 領地治理系統 §F：有指派武將時的產出公式 = base + 屬性加權。
 * 偵查規格產「情報」，目前沒有情報資源，暫定沿用黃金（與固定表一致）。
 */
const DOMESTIC_STAT_FORMULA: Readonly<Record<DomesticTaskId, { base: number; weights: Partial<DomesticStats> }>> = Object.freeze({
    farming: { base: 100, weights: { pol: 2 } },
    commerce: { base: 50, weights: { cha: 3 } },
    diplomacy: { base: 20, weights: { int: 1, cha: 1 } },
    arms: { base: 80, weights: { str: 2 } },
    scouting: { base: 30, weights: { int: 2 } },
});

/**
 * 該任務的產出：有武將屬性時套 §F 公式，未指派時沿用固定表（暫定）。
 * goldBonus：黃金產出的加成比例（子嗣郡城縣令，PROG-2-1162），只作用在產黃金的任務。
 */
export function domesticOutputFor(taskId: DomesticTaskId, stats?: Readonly<DomesticStats> | null, goldBonus = 0): DomesticOutput {
    const fixed = DOMESTIC_TASK_OUTPUT[taskId];
    let amount = fixed.amount;
    if (stats) {
        const { base, weights } = DOMESTIC_STAT_FORMULA[taskId];
        amount = base;
        for (const key of Object.keys(weights) as (keyof DomesticStats)[]) {
            amount += Math.max(0, Math.floor(stats[key] || 0)) * (weights[key] ?? 0);
        }
    }
    // 加 1e-9 吸收浮點誤差（100 × 1.3 不應變成 129）
    if (fixed.resource === 'gold' && goldBonus > 0) amount = Math.floor(amount * (1 + goldBonus) + 1e-9);
    return { resource: fixed.resource, amount };
}

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

/** 舊存檔沒有內政紀錄時補空紀錄；壞掉的欄位也視為空，不猜測。 */
export function normalizeDomesticLog(raw: unknown): DomesticSeasonLog {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...EMPTY_DOMESTIC_LOG };
    const r = raw as Record<string, unknown>;
    const lastSeason = typeof r.lastSeason === 'number' && Number.isInteger(r.lastSeason) ? r.lastSeason : null;
    const lastTask = typeof r.lastTask === 'string' && isDomesticTaskId(r.lastTask) ? r.lastTask : null;
    return { lastSeason, lastTask };
}

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
    stats?: Readonly<DomesticStats> | null,
    goldBonus = 0,
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
    const output = domesticOutputFor(taskId, stats, goldBonus);
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
