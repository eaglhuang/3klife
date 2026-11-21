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
import type {
    RewardAmount, RewardBundleDef, RewardDrawSlotDef, RewardEffectDef, RewardEntryDef, RewardPityDef, RewardPitySoftDef, RewardPoolDef,
} from './RewardConfig';

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

/** 機率路徑的亂數解析度：把 [0,1) 切成這麼多格，一次 nextInt 決定落點（與整數權重路徑一樣一抽一步） */
const PROB_RESOLUTION = 1_000_000_000;

/**
 * 保底階梯第 k 抽（k = 已連續未出 + 1）的「該階以上」總機率（規格 §12.3）：
 *   k < S 或無軟保底：p0；S <= k < H：p0 + (1 − p0) × ((k − S + 1)/(H − S + 1))^γ；k >= H：1。
 */
export function pityRate(p0: number, k: number, hardCount: number, soft: RewardPitySoftDef | null): number {
    if (k >= hardCount) return 1;
    if (!soft || k < soft.startAt) return p0;
    return p0 + (1 - p0) * Math.pow((k - soft.startAt + 1) / (hardCount - soft.startAt + 1), soft.curveExp);
}

/** 階梯目前所處區段：base（基礎機率）、soft（漸升中）、hard（硬保底必出） */
export type PityZone = 'base' | 'soft' | 'hard';

export interface PityLadderState {
    ladder: RewardPityDef;
    /** 已連續未出該階以上的抽數 */
    counter: number;
    /** 本抽是第 k 抽（counter + 1） */
    k: number;
    /** 該階以上的基礎機率（由可抽項目權重算出，不手寫） */
    baseRate: number;
    /** 套用軟／硬保底後本抽的該階以上機率（尚未與其他階梯疊合） */
    rate: number;
    zone: PityZone;
}

export interface EntryProbability {
    entry: RewardEntryDef;
    /** 本抽命中此項目的機率（可抽項目總和為 1） */
    probability: number;
}

export interface TierDistribution {
    tier: string;
    /** 不計保底的等階機率（權重比） */
    baseRate: number;
    /** 計入保底階梯後本抽的等階機率 */
    effectiveRate: number;
}

export interface PoolDistribution {
    entries: EntryProbability[];
    tiers: TierDistribution[];
    ladders: PityLadderState[];
}

function ladderZone(ladder: RewardPityDef, k: number): PityZone {
    if (k >= ladder.hardCount) return 'hard';
    return ladder.soft && k >= ladder.soft.startAt ? 'soft' : 'base';
}

/**
 * 本抽的完整機率分布（reward.pools 公開用與 rollPool 抽樣用同一份，規格 §12.4）。
 * 步驟：等階質量＝可抽項目權重比 → 保底階梯由高階往低階把「該階以上」抬到 p(k)（只抬不降，範圍內外各按比例縮放，總和維持 1）
 * → 等階內：有 tierGroups 的等階先按群組佔比再按權重，沒有的直接按權重。
 * @param exclude 不重複抽樣時已抽中的項目（機率分布在剩餘項目上重算）
 * @param applyLadders false＝不套保底（一輪裡第一個項目以外的抽取）
 */
export function poolDistribution(
    pool: RewardPoolDef, counters: Readonly<Record<string, number>>, options: { exclude?: ReadonlySet<string>; applyLadders?: boolean } = {},
): PoolDistribution {
    const excluded = options.exclude ?? new Set<string>();
    const avail = pool.entries.filter((e) => !excluded.has(e.id) && e.weight > 0);
    const total = avail.reduce((t, e) => t + e.weight, 0);
    const tierWeight = new Map<string, number>();
    for (const tier of pool.tiers) tierWeight.set(tier, 0);
    for (const e of avail) tierWeight.set(e.tier, (tierWeight.get(e.tier) ?? 0) + e.weight);
    const base = new Map<string, number>();
    const mass = new Map<string, number>();
    // tierRates 只在「有可抽項目」的等階間分配（某階抽光或沒人時，其機率由其餘等階按比例吃下）
    const rateSum = pool.tierRates ? pool.tiers.reduce((t, tier) => t + ((tierWeight.get(tier) ?? 0) > 0 ? (pool.tierRates?.[tier] ?? 0) : 0), 0) : 0;
    for (const tier of pool.tiers) {
        const w = tierWeight.get(tier) ?? 0;
        const m = pool.tierRates && rateSum > 0
            ? (w > 0 ? (pool.tierRates[tier] ?? 0) / rateSum : 0)
            : (total > 0 ? w / total : 0);
        base.set(tier, m);
        mass.set(tier, m);
    }
    const ladders: PityLadderState[] = [];
    if (options.applyLadders !== false) {
        for (const ladder of pool.pity) {
            const rank = tierRank(pool, ladder.tier);
            const above = pool.tiers.filter((t) => tierRank(pool, t) >= rank);
            const baseRate = above.reduce((t, x) => t + (base.get(x) ?? 0), 0);
            const counter = counters[ladder.counterKey] ?? 0;
            const k = counter + 1;
            const rate = baseRate > 0 ? pityRate(baseRate, k, ladder.hardCount, ladder.soft) : baseRate;
            ladders.push({ ladder, counter, k, baseRate, rate, zone: ladderZone(ladder, k) });
            // 疊合：目前機率已高於目標就不動（只抬不降）
            const current = above.reduce((t, x) => t + (mass.get(x) ?? 0), 0);
            if (rate > current && current > 0) {
                const up = rate / current;
                const down = current < 1 ? (1 - rate) / (1 - current) : 0;
                for (const t of pool.tiers) mass.set(t, (mass.get(t) ?? 0) * (above.indexOf(t) >= 0 ? up : down));
            }
        }
    }
    const entries: EntryProbability[] = pool.entries.map((entry) => ({ entry, probability: 0 }));
    const byId = new Map(entries.map((x) => [x.entry.id, x]));
    for (const tier of pool.tiers) {
        const tierMass = mass.get(tier) ?? 0;
        const members = avail.filter((e) => e.tier === tier);
        if (tierMass <= 0 || members.length === 0) continue;
        const shares = pool.tierGroups[tier];
        let weights = members.map((e) => e.weight);
        if (shares) {
            // 只算「有可抽項目」的群組，缺席群組的佔比由其餘群組按比例吃下；沒列在群組內的項目不會被抽到
            const live = shares.filter((g) => members.some((e) => e.group === g.group));
            const sum = live.reduce((t, g) => t + g.share, 0);
            if (sum > 0) {
                weights = members.map((e) => {
                    const g = live.find((x) => x.group === e.group);
                    if (!g) return 0;
                    const groupWeight = members.filter((m) => m.group === g.group).reduce((t, m) => t + m.weight, 0);
                    return (g.share / sum) * (e.weight / groupWeight);
                });
            }
        }
        const wsum = weights.reduce((t, w) => t + w, 0);
        members.forEach((e, i) => {
            const slot = byId.get(e.id);
            if (slot && wsum > 0) slot.probability = tierMass * (weights[i] / wsum);
        });
    }
    const tiers: TierDistribution[] = pool.tiers.map((tier) => ({ tier, baseRate: base.get(tier) ?? 0, effectiveRate: mass.get(tier) ?? 0 }));
    return { entries, tiers, ladders };
}

/** 依機率分布落點抽一個項目；一次 nextInt，落點由累積機率決定（機率為 0 的項目永遠抽不到） */
function pickByProbability(dist: readonly EntryProbability[], rng: RandomSource, salt: string): RewardEntryDef {
    const live = dist.filter((x) => x.probability > 0);
    if (live.length === 0) throw new Error('RewardRules: 沒有可抽取的項目（機率分布為空）');
    const roll = rng.nextInt(PROB_RESOLUTION, salt);
    let acc = 0;
    for (const x of live) {
        acc += x.probability * PROB_RESOLUTION;
        if (roll < acc) return x.entry;
    }
    return live[live.length - 1].entry;
}

function slotMatches(slot: RewardDrawSlotDef, entry: RewardEntryDef): boolean {
    return (slot.tier === null || entry.tier === slot.tier) && (slot.group === null || entry.group === slot.group);
}

/** 每個抽取位置對應的名額篩選（沒有 slots 時全是 null＝整池） */
function slotFilters(pool: RewardPoolDef): Array<RewardDrawSlotDef | null> {
    if (pool.slots.length === 0) return Array.from({ length: pool.picks }, () => null);
    const out: Array<RewardDrawSlotDef | null> = [];
    for (const slot of pool.slots) for (let i = 0; i < slot.count; i += 1) out.push(slot);
    return out;
}

export interface RollOutcome {
    items: RewardPlanItem[];
    /** 更新後的保底計數（只含本池用到的 key） */
    pity: Record<string, number>;
}

/**
 * 對一個獎池連抽 count 次（每次 pool.picks 個項目）。
 * 保底（規格 §12.3）：每條階梯各自計數；一輪的第一個項目才套用保底。
 *   - 沒有階梯進入軟保底區、也沒有 tierGroups：走整數權重抽樣（硬保底到點時從保底等階以上的項目抽），與舊單一保底的結果逐筆相同；
 *   - 有階梯在軟保底區或池有群組佔比：走機率分布抽樣（poolDistribution），與 reward.pools 公開的機率同一份。
 * 抽到某階以上就把該階梯計數歸零（更高階同時歸零較低階梯）；保底等階以上沒有可抽項目時退回普通抽。
 * 有 draw.slots 的池依名額逐位抽（各名額只從符合篩選的項目抽，篩選無可抽項目退回整池），不套保底。
 */
export function rollPool(pool: RewardPoolDef, count: number, rng: RandomSource, pity: Readonly<Record<string, number>>): RollOutcome {
    const items: RewardPlanItem[] = [];
    const nextPity: Record<string, number> = { ...pity };
    const weighted: Array<RewardEntryDef & WeightedEntry> = pool.entries;
    const filters = slotFilters(pool);
    const hasGroups = Object.keys(pool.tierGroups).length > 0 || pool.tierRates !== null;
    for (let pull = 0; pull < count; pull += 1) {
        const picked = new Set<string>();
        const hit = new Set<string>();
        const first = pool.pity.map((ladder) => ({ ladder, counter: nextPity[ladder.counterKey] ?? 0 }));
        for (let k = 0; k < pool.picks; k += 1) {
            const salt = `reward:${pool.id}:${pull}:${k}`;
            const exclude = pool.replacement ? undefined : picked;
            const trace: string[] = [];
            let entry: RewardEntryDef;
            const slot = filters[k];
            if (slot) {
                const candidates = weighted.filter((e) => slotMatches(slot, e));
                if (weightedTotal(candidates, { exclude }) > 0) {
                    entry = weightedPick(candidates, rng, `${salt}:slot`, { exclude });
                } else {
                    entry = weightedPick(weighted, rng, salt, { exclude });
                    trace.push('SLOT_FALLBACK');
                }
            } else {
                const useLadders = k === 0 && first.length > 0;
                const softActive = useLadders && first.some((f) => ladderZone(f.ladder, f.counter + 1) === 'soft');
                if (hasGroups || softActive) {
                    const dist = poolDistribution(pool, nextPity, { exclude, applyLadders: useLadders });
                    for (const l of dist.ladders) {
                        if (l.zone === 'soft') trace.push(`PITY_SOFT k=${l.k} p=${l.rate.toFixed(4)}`);
                        if (l.zone === 'hard') trace.push(`PITY ${l.ladder.counterKey}=${l.k}`);
                    }
                    entry = pickByProbability(dist.entries, rng, salt);
                } else {
                    // 整數權重路徑：只有硬保底（含舊單一設定）；多條階梯取最高階已到點者
                    const forcedLadder = useLadders ? first.find((f) => f.counter + 1 >= f.ladder.hardCount) : undefined;
                    const guarantee = forcedLadder ? tierRank(pool, forcedLadder.ladder.guaranteeTier) : -1;
                    const eligible = forcedLadder ? weighted.filter((e) => tierRank(pool, e.tier) >= guarantee) : null;
                    if (forcedLadder && eligible && weightedTotal(eligible, { exclude }) > 0) {
                        entry = weightedPick(eligible, rng, `${salt}:pity`, { exclude });
                        trace.push(`PITY ${forcedLadder.ladder.counterKey}=${forcedLadder.counter + 1}`);
                    } else {
                        entry = weightedPick(weighted, rng, salt, { exclude });
                    }
                }
            }
            picked.add(entry.id);
            for (const f of first) if (tierRank(pool, entry.tier) >= tierRank(pool, f.ladder.tier)) hit.add(f.ladder.counterKey);
            const effect = resolveEffect(entry.effect, rng, `${salt}:fx`);
            items.push({ entryId: entry.id, tier: entry.tier, effect, applied: effect, trace });
        }
        for (const f of first) nextPity[f.ladder.counterKey] = hit.has(f.ladder.counterKey) ? 0 : f.counter + 1;
        for (const t of pool.tallies) nextPity[t.counterKey] = (nextPity[t.counterKey] ?? 0) + 1;
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

/** 機率公開用：各等階命中機率（不計保底；不用亂數，客戶端可呼叫） */
export function tierProbabilities(pool: RewardPoolDef): Array<{ tier: string; probability: number }> {
    return poolDistribution(pool, {}, { applyLadders: false }).tiers.map((t) => ({ tier: t.tier, probability: t.baseRate }));
}
