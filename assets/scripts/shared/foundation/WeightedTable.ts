// @spec-source → 共用框架總綱規格書 (doc_spec_1182) 第 11.1 節 WeightedTable；獎勵系統 Base 規格書 §3.5；PROG-2-9202
/**
 * WeightedTable — 加權抽取純函式（零依賴）。
 *
 * 「抽一個」的需求（獎池、命名建議、心願、商店輪替、機緣格…）一律呼叫這裡，不要各寫一套。
 *   - 權重一律是非負整數（整數累積，避免浮點誤差與跨平台差異）；
 *   - 隨機源由呼叫端傳入（RandomSource），因此同一份表可接伺服器會話、戰場種子或測試假隨機；
 *   - 正式結果必須用伺服器持有的 DeterministicRngSession（見 DeterministicRng.ts 的權威說明）。
 *
 * 保底（Pity）屬獎勵系統（RWD）：由 RWD 在 weightedPick 之外判斷計數並指定結果，本檔不含保底。
 */
import type { RandomSource } from './DeterministicRng';

/** 加權表的一個項目；需要附帶資料時用泛型擴充（例如 `WeightedEntry & { itemId: string }`） */
export interface WeightedEntry {
    /** 項目唯一 id（去重、排除、保底指定時用） */
    id: string;
    /** 非負整數權重；0 代表保留在表內但不會被抽到 */
    weight: number;
}

/** 抽取選項 */
export interface WeightedPickOptions {
    /** 要排除的項目 id（去重、已持有、已抽過） */
    exclude?: ReadonlySet<string> | readonly string[];
}

function toExcludeSet(exclude: WeightedPickOptions['exclude']): ReadonlySet<string> {
    if (!exclude) return new Set<string>();
    return exclude instanceof Set ? exclude : new Set(exclude);
}

/** 驗證權重並回傳（排除後的）總權重；表內有負數、小數、重複 id 一律丟錯 */
export function weightedTotal(entries: readonly WeightedEntry[], options: WeightedPickOptions = {}): number {
    const excluded = toExcludeSet(options.exclude);
    const seen = new Set<string>();
    let total = 0;
    for (const entry of entries) {
        if (!Number.isInteger(entry.weight) || entry.weight < 0) {
            throw new Error(`WeightedTable: 項目 "${entry.id}" 權重必須是非負整數，收到 ${entry.weight}`);
        }
        if (seen.has(entry.id)) {
            throw new Error(`WeightedTable: 項目 id 重複 "${entry.id}"`);
        }
        seen.add(entry.id);
        if (!excluded.has(entry.id)) total += entry.weight;
    }
    return total;
}

/**
 * 依權重抽一個項目。
 * @param salt 傳給 rng 的標籤（不同用途請用不同標籤，利於除錯與重播稽核）
 * @throws 排除後總權重為 0（沒有可抽項目）
 */
export function weightedPick<T extends WeightedEntry>(
    entries: readonly T[], rng: RandomSource, salt: string, options: WeightedPickOptions = {},
): T {
    const total = weightedTotal(entries, options);
    if (total <= 0) {
        throw new Error('WeightedTable: 沒有可抽取的項目（總權重為 0）');
    }
    const excluded = toExcludeSet(options.exclude);
    let roll = rng.nextInt(total, salt);
    for (const entry of entries) {
        if (excluded.has(entry.id)) continue;
        if (roll < entry.weight) return entry;
        roll -= entry.weight;
    }
    // 理論上不會到這裡（roll < total）；防禦性回傳最後一個可抽項目
    for (let i = entries.length - 1; i >= 0; i--) {
        if (!excluded.has(entries[i].id) && entries[i].weight > 0) return entries[i];
    }
    throw new Error('WeightedTable: 內部錯誤，無法定位抽取結果');
}

/**
 * 連續抽 count 個。unique=true 時不放回（抽過的從表中移除，可抽項目不足就提早結束，不丟錯）。
 * 每一抽都用獨立的 salt（`${salt}:${n}`）。
 */
export function weightedPickMany<T extends WeightedEntry>(
    entries: readonly T[], rng: RandomSource, salt: string, count: number,
    options: WeightedPickOptions & { unique?: boolean } = {},
): T[] {
    if (!Number.isInteger(count) || count < 0) {
        throw new Error(`WeightedTable.weightedPickMany: count 必須是非負整數，收到 ${count}`);
    }
    const picked: T[] = [];
    const excluded = new Set<string>(toExcludeSet(options.exclude));
    for (let n = 0; n < count; n++) {
        if (weightedTotal(entries, { exclude: excluded }) <= 0) break;
        const hit = weightedPick(entries, rng, `${salt}:${n}`, { exclude: excluded });
        picked.push(hit);
        if (options.unique) excluded.add(hit.id);
    }
    return picked;
}

/** 各項目命中機率（0～1，供機率說明 UI 顯示；不使用亂數，客戶端可安全呼叫） */
export function weightedProbabilities(
    entries: readonly WeightedEntry[], options: WeightedPickOptions = {},
): { id: string; probability: number }[] {
    const total = weightedTotal(entries, options);
    const excluded = toExcludeSet(options.exclude);
    return entries
        .filter((entry) => !excluded.has(entry.id))
        .map((entry) => ({ id: entry.id, probability: total > 0 ? entry.weight / total : 0 }));
}
