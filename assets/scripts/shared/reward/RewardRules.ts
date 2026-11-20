// @spec-source → 獎勵系統 Base 框架規格書 (doc_spec_1186) §2 保底、§3.5 加權與確定性亂數、§4 規則 2／5；共用框架總綱 (doc_spec_1182) §12 RWD-M；PROG-2-9205
/**
 * RewardRules — 獎勵內容層的純規則（零依賴，不碰錢包／庫存／存檔）。
 *
 * 抽取：呼叫端傳入 RandomSource（伺服器持有的 DeterministicRngSession），同一組 (種子, 步數, 保底計數) 必得同一結果。
 * 保底：計數器存在 RewardMeta，由權威端持久化；本檔只做「給計數、回新計數」。
 * 縮放與懲罰上限：純函式，截斷與縮放都寫進 trace，方便稽核。
 */
import { weightedPick, weightedTotal, type WeightedEntry } from '../foundation/WeightedTable';
import type { RandomSource, RngSessionState } from '../foundation/DeterministicRng';
import type { RewardAmount, RewardBundleDef, RewardEffectDef, RewardEntryDef, RewardPoolDef } from './RewardConfig';

/** 帳本保留的發放紀錄上限；超過丟最舊的（冪等只保證這個視窗內） */
export const REWARD_GRANT_LIMIT = 200;

/** 已套用的一行（效果＋實際入帳量＋稽核說明） */
export interface RewardPlanItem {
    entryId: string;
    tier: string;
    /** 抽到或套件原定的效果（數量已擲定，尚未縮放／截斷） */
    effect: RewardEffectDef;
    /** 實際入帳的效果；縮放、截斷後可能與 effect 不同 */
    applied: RewardEffectDef;
    trace: string[];
}

/** 持久化的發放紀錄（重送同 grantKey 時原樣回傳） */
export interface StoredGrant {
    key: string;
    kind: 'pool' | 'bundle';
    refId: string;
    result: Record<string, unknown>;
}

export interface RewardMeta {
    v: 1;
    seq: number;
    /** 伺服器私有亂數會話狀態；永遠不進回應 */
    rng: RngSessionState | null;
    /** 保底計數器：counterKey → 距離上次保底等階已連續幾抽 */
    pity: Record<string, number>;
    grants: StoredGrant[];
}

export function emptyRewardMeta(): RewardMeta {
    return { v: 1, seq: 0, rng: null, pity: {}, grants: [] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeRewardMeta(raw: unknown): RewardMeta {
    if (!isRecord(raw)) return emptyRewardMeta();
    const pity: Record<string, number> = {};
    if (isRecord(raw.pity)) {
        for (const [k, v] of Object.entries(raw.pity)) {
            if (typeof v === 'number' && Number.isInteger(v) && v >= 0) pity[k] = v;
        }
    }
    const grants: StoredGrant[] = [];
    for (const g of Array.isArray(raw.grants) ? raw.grants : []) {
        if (!isRecord(g) || typeof g.key !== 'string' || typeof g.refId !== 'string' || !isRecord(g.result)) continue;
        grants.push({ key: g.key, kind: g.kind === 'bundle' ? 'bundle' : 'pool', refId: g.refId, result: g.result });
    }
    let rng: RngSessionState | null = null;
    if (isRecord(raw.rng) && typeof raw.rng.seedHex === 'string' && /^[0-9a-f]{64}$/.test(raw.rng.seedHex)
        && typeof raw.rng.stepIndex === 'number' && Number.isInteger(raw.rng.stepIndex) && raw.rng.stepIndex >= 0) {
        rng = { seedHex: raw.rng.seedHex, stepIndex: raw.rng.stepIndex };
    }
    const seq = typeof raw.seq === 'number' && Number.isInteger(raw.seq) && raw.seq >= 0 ? raw.seq : grants.length;
    return { v: 1, seq, rng, pity, grants: grants.slice(-REWARD_GRANT_LIMIT) };
}

/** 空白中繼資料不必寫進存檔（舊檔相容、存檔瘦身） */
export function isEmptyRewardMeta(meta: RewardMeta): boolean {
    return meta.seq === 0 && meta.rng === null && meta.grants.length === 0 && Object.keys(meta.pity).length === 0;
}

/** 效果裡「數量」欄位的名稱；內建 currency 用 amount、item 用 qty，宿主自訂種類兩者擇一 */
export function amountFieldOf(effect: RewardEffectDef): 'amount' | 'qty' | null {
    if (effect.kind === 'currency') return 'amount';
    if (effect.kind === 'item') return 'qty';
    if (effect.amount !== undefined) return 'amount';
    if (effect.qty !== undefined) return 'qty';
    return null;
}

/** 擲定數量：固定值原樣回傳；區間用 rng 取一個整數（含兩端） */
export function resolveAmount(amount: RewardAmount, rng: RandomSource, salt: string): number {
    if (typeof amount === 'number') return amount;
    return amount.min + rng.nextInt(amount.max - amount.min + 1, salt);
}

/** 把效果裡的區間擲成定值；其他欄位原樣複製 */
export function resolveEffect(effect: RewardEffectDef, rng: RandomSource, salt: string): RewardEffectDef {
    const field = amountFieldOf(effect);
    if (!field) return { ...effect };
    const raw = effect[field];
    if (typeof raw === 'number' || !isRecord(raw)) return { ...effect };
    return { ...effect, [field]: resolveAmount(raw as { min: number; max: number }, rng, `${salt}:${field}`) };
}

function numberOf(effect: RewardEffectDef): number {
    const field = amountFieldOf(effect);
    const value = field ? effect[field] : undefined;
    return typeof value === 'number' ? value : 0;
}

function withNumber(effect: RewardEffectDef, value: number): RewardEffectDef {
    const field = amountFieldOf(effect);
    return field ? { ...effect, [field]: value } : { ...effect };
}

/**
 * 等階與倍率縮放（規格 §4 `scale`）：正向數量乘 reward、負向（懲罰）乘 risk，四捨五入；
 * 倍率大於 0 時非零數量至少保留 1，避免縮放把效果吞成 0。倍率由宿主（特質、道具、難度）提供，客戶端不可傳。
 */
export function scaleEffect(effect: RewardEffectDef, mul: { reward?: number; risk?: number }): { effect: RewardEffectDef; trace: string | null } {
    const base = numberOf(effect);
    if (base === 0) return { effect, trace: null };
    const factor = base > 0 ? mul.reward : mul.risk;
    if (factor === undefined || factor === 1 || !Number.isFinite(factor) || factor < 0) return { effect, trace: null };
    const scaled = Math.round(base * factor);
    const next = factor === 0 ? 0 : (scaled === 0 ? Math.sign(base) : scaled);
    return { effect: withNumber(effect, next), trace: `SCALED ${base}x${factor}=>${next}` };
}

/** 套件的貨幣損失上限（規格 §4 規則 5）：把單筆負向貨幣效果截到上限，回傳截斷說明 */
export function capLoss(effect: RewardEffectDef, bundle: Pick<RewardBundleDef, 'cap'>): { effect: RewardEffectDef; trace: string | null } {
    if (effect.kind !== 'currency' || !bundle.cap) return { effect, trace: null };
    const amount = numberOf(effect);
    const limit = bundle.cap.maxLoss[String(effect.id)];
    if (amount >= 0 || limit === undefined || -amount <= limit) return { effect, trace: null };
    return { effect: withNumber(effect, -limit), trace: `CAPPED ${amount}=>${-limit}` };
}

function tierRank(pool: Pick<RewardPoolDef, 'tiers'>, tier: string): number {
    return pool.tiers.indexOf(tier);
}

export interface RollOutcome {
    items: RewardPlanItem[];
    /** 更新後的保底計數（只含本池用到的 key） */
    pity: Record<string, number>;
}

/**
 * 對一個獎池連抽 count 次（每次 pool.picks 個項目）。
 * 保底：第 hardCount 抽起若前面都沒出保底等階以上，本抽第一個項目從保底等階以上的項目裡抽；
 * 抽到保底等階以上就歸零。保底等階以上沒有任何可抽項目時退回普通抽（設定錯誤不卡住玩家）。
 */
export function rollPool(pool: RewardPoolDef, count: number, rng: RandomSource, pity: Readonly<Record<string, number>>): RollOutcome {
    const items: RewardPlanItem[] = [];
    const nextPity: Record<string, number> = { ...pity };
    const weighted: Array<RewardEntryDef & WeightedEntry> = pool.entries;
    for (let pull = 0; pull < count; pull += 1) {
        const picked = new Set<string>();
        const guarantee = pool.pity ? tierRank(pool, pool.pity.guaranteeTier) : -1;
        const counter = pool.pity ? (nextPity[pool.pity.counterKey] ?? 0) : 0;
        let hitGuarantee = false;
        for (let k = 0; k < pool.picks; k += 1) {
            const salt = `reward:${pool.id}:${pull}:${k}`;
            const exclude = pool.replacement ? undefined : picked;
            let entry: RewardEntryDef;
            const forced = k === 0 && pool.pity !== null && counter + 1 >= pool.pity.hardCount;
            const eligible = forced ? weighted.filter((e) => tierRank(pool, e.tier) >= guarantee) : null;
            const trace: string[] = [];
            if (eligible && weightedTotal(eligible, { exclude }) > 0) {
                entry = weightedPick(eligible, rng, `${salt}:pity`, { exclude });
                trace.push(`PITY ${pool.pity?.counterKey}=${counter + 1}`);
            } else {
                entry = weightedPick(weighted, rng, salt, { exclude });
            }
            picked.add(entry.id);
            if (pool.pity && tierRank(pool, entry.tier) >= guarantee) hitGuarantee = true;
            const effect = resolveEffect(entry.effect, rng, `${salt}:fx`);
            items.push({ entryId: entry.id, tier: entry.tier, effect, applied: effect, trace });
        }
        if (pool.pity) nextPity[pool.pity.counterKey] = hitGuarantee ? 0 : counter + 1;
    }
    return { items, pity: nextPity };
}

/** 固定套件：不用亂數；區間數量不允許用在套件（套件是確定的），遇到區間取下限當保守值 */
export function planBundle(bundle: RewardBundleDef): RewardPlanItem[] {
    return bundle.effects.map((raw, index) => {
        const field = amountFieldOf(raw);
        const value = field ? raw[field] : undefined;
        const effect = field && isRecord(value) ? { ...raw, [field]: (value as { min: number }).min } : { ...raw };
        return { entryId: `${bundle.id}#${index}`, tier: bundle.kind, effect, applied: effect, trace: [] };
    });
}

/** 機率公開用：各等階命中機率（不用亂數，客戶端可呼叫） */
export function tierProbabilities(pool: RewardPoolDef): Array<{ tier: string; probability: number }> {
    const total = weightedTotal(pool.entries);
    return pool.tiers.map((tier) => ({
        tier,
        probability: total > 0 ? pool.entries.filter((e) => e.tier === tier).reduce((sum, e) => sum + e.weight, 0) / total : 0,
    }));
}
