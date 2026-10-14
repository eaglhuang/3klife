// @spec-source → 轉蛋系統.md §入池機率表（三國名將池：SSR 3% / SR 10% / R 87%，SSR 中 70%、SR 中 80% 為 Up）、§保底計算（小保底每 50 抽必出 SR+，大保底 200 抽）；PROG-2-0335（WBS GCH-02）
/**
 * GachaDraw — 轉蛋抽取引擎：依規格稀有度機率抽一位武將（純邏輯，不依賴 cc）
 *
 * 規則：
 *   - 稀有度：SSR 3%、SR 10%、R 87%（三國名將池）。
 *   - Up：SSR 的 70%、SR 的 80% 從 Up 名單抽；其餘從常設名單抽。
 *   - 小保底：第 50 抽的倍數必出 SR+（抽到 R 時改為 SR）。
 *   - 大保底：累計 200 抽解鎖天命商店（本引擎只記計數，不發商店）。
 *   - 各池保底計數獨立（由呼叫端以 poolId 分開保存）。
 *   - 某稀有度沒有可抽的武將時，往下一階取（SSR → SR → R）。
 *
 * 隨機來源以參數注入（rng: () => [0,1)），測試可用固定 seed 重現分佈。
 *
 * Unity 對照：類似 ScriptableObject 的抽獎表（LootTable）加上一個計數器，
 * 抽一次只查表與擲骰，不碰場景。
 */

export type GachaRarity = 'SSR' | 'SR' | 'R';

export const GACHA_RARITY_RATES: Readonly<Record<GachaRarity, number>> = Object.freeze({ SSR: 0.03, SR: 0.10, R: 0.87 });
/** Up 占比：SSR 70%、SR 80%（規格 §入池機率表） */
export const GACHA_UP_SHARE: Readonly<Record<'SSR' | 'SR', number>> = Object.freeze({ SSR: 0.7, SR: 0.8 });
export const GACHA_SMALL_PITY_INTERVAL = 50;
export const GACHA_LARGE_PITY_COUNT = 200;

export interface GachaPityState {
    /** 本池累計抽數（小保底與大保底都由它推算） */
    pullCount: number;
}

/** 缺欄位或不合法的舊資料一律從 0 開始 */
export function normalizeGachaPity(value: unknown): GachaPityState {
    const raw = (value as { pullCount?: unknown } | null | undefined)?.pullCount;
    return { pullCount: typeof raw === 'number' && Number.isInteger(raw) && raw >= 0 ? raw : 0 };
}

/** 各池保底計數（poolId → 狀態）；存檔欄位 gachaPity 的形狀 */
export type GachaPityBook = Record<string, GachaPityState>;

/** 讀取保底表：存檔有資料就用存檔；存檔空、舊 localStorage 有資料則一次性遷移（PROG-2-0337） */
export function resolveGachaPityBook(saved: unknown, legacy: unknown): { book: GachaPityBook; migrateLegacy: boolean } {
    const savedBook = normalizeGachaPityBook(saved);
    if (Object.keys(savedBook).length > 0) return { book: savedBook, migrateLegacy: false };
    const legacyBook = normalizeGachaPityBook(legacy);
    return { book: legacyBook, migrateLegacy: Object.keys(legacyBook).length > 0 };
}

/** 保底表：壞掉的 poolId 丟棄，計數不合法的池從 0 開始 */
export function normalizeGachaPityBook(value: unknown): GachaPityBook {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const result: GachaPityBook = {};
    for (const [poolId, entry] of Object.entries(value as Record<string, unknown>)) {
        if (poolId.length === 0) continue;
        result[poolId] = normalizeGachaPity(entry);
    }
    return result;
}

/** 武將分桶：稀有度 × 是否 Up；桶內是武將 id 以外的任意項目 */
export interface GachaPool<T> {
    ssrUp: readonly T[];
    ssrOther: readonly T[];
    srUp: readonly T[];
    srOther: readonly T[];
    rOther: readonly T[];
}

export interface GachaDrawResult<T> {
    item: T;
    rarity: GachaRarity;
    /** 這一抽是否因小保底被提升為 SR */
    pityApplied: boolean;
    /** 抽完後的保底狀態（呼叫端寫回） */
    nextPity: GachaPityState;
}

function pickFrom<T>(list: readonly T[], rng: () => number): T {
    const index = Math.min(list.length - 1, Math.floor(rng() * list.length));
    return list[index];
}

/** 依稀有度從高到低找第一個有項目的桶（Up 與常設視為同一稀有度） */
function firstAvailable<T>(pool: GachaPool<T>, rarity: GachaRarity): { rarity: GachaRarity; lists: Array<readonly T[]> } | null {
    const order: GachaRarity[] = rarity === 'SSR' ? ['SSR', 'SR', 'R'] : rarity === 'SR' ? ['SR', 'R'] : ['R'];
    for (const next of order) {
        const lists = next === 'SSR' ? [pool.ssrUp, pool.ssrOther]
            : next === 'SR' ? [pool.srUp, pool.srOther]
                : [pool.rOther];
        if (lists.some((list) => list.length > 0)) return { rarity: next, lists };
    }
    return null;
}

function rollRarity(rng: () => number): GachaRarity {
    const roll = rng();
    if (roll < GACHA_RARITY_RATES.SSR) return 'SSR';
    if (roll < GACHA_RARITY_RATES.SSR + GACHA_RARITY_RATES.SR) return 'SR';
    return 'R';
}

/**
 * 抽一次。池內完全沒有武將時拋錯（呼叫端應先擋住）。
 * 順序：累計抽數 +1 → 擲稀有度 → 小保底檢查 → 擲 Up → 從對應桶抽人。
 */
export function drawGeneralOnce<T>(pool: GachaPool<T>, pity: GachaPityState, rng: () => number = Math.random): GachaDrawResult<T> {
    const nextPity: GachaPityState = { pullCount: normalizeGachaPity(pity).pullCount + 1 };
    let rarity = rollRarity(rng);
    let pityApplied = false;
    if (rarity === 'R' && nextPity.pullCount % GACHA_SMALL_PITY_INTERVAL === 0) {
        rarity = 'SR';
        pityApplied = true;
    }

    const available = firstAvailable(pool, rarity);
    if (!available) {
        throw new Error('[GachaDraw] 池內沒有可抽的武將');
    }
    const finalRarity = available.rarity;
    let item: T;
    if (finalRarity === 'R') {
        item = pickFrom(pool.rOther, rng);
    } else {
        const [up, other] = finalRarity === 'SSR' ? [pool.ssrUp, pool.ssrOther] : [pool.srUp, pool.srOther];
        const share = GACHA_UP_SHARE[finalRarity];
        const wantUp = rng() < share;
        if (wantUp && up.length > 0) item = pickFrom(up, rng);
        else if (other.length > 0) item = pickFrom(other, rng);
        else item = pickFrom(up, rng);
    }
    return { item, rarity: finalRarity, pityApplied, nextPity };
}
