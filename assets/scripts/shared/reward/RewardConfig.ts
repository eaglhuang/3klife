// @spec-source → 獎勵系統 Base 框架規格書 (doc_spec_1186) §3 reward-pool.v1／reward-bundle.v1；共用框架總綱 (doc_spec_1182) §12 RWD-M；PROG-2-9205
/**
 * RewardConfig — 獎勵內容層的設定型別與正規化（零依賴）。
 *
 * 「給什麼」只在這裡：獎池（權重、等階、保底）與固定獎勵套件（獎或罰）。
 * 「怎麼給」（寶箱、轉盤…）只放一個演出綁定 presentation，播放不在本層。
 * 設定壞掉不丟錯：略過壞的獎池／套件／項目，剩下的照常運作（資料檔可由企劃手改）。
 *
 * Unity 對照：像一組 ScriptableObject（LootTable／RewardBundle），讀進來就是唯讀資料。
 */
import type { Condition } from '../foundation/Condition';

/** 數量：固定值，或 [min,max] 區間（由權威端擲骰決定） */
export type RewardAmount = number | { min: number; max: number };

/**
 * 效果：kind 決定由哪個宿主 handler 套用。內建 currency／item；其餘（fame、tacticLearn、story…）
 * 由宿主註冊 handler，框架不認識欄位，只負責帶著走並縮放 amount／qty。
 */
export interface RewardEffectDef {
    kind: string;
    [field: string]: unknown;
}

export interface RewardPresentationDef {
    type: string;
    args: Record<string, unknown>;
    skippable: boolean;
}

export interface RewardEntryDef {
    id: string;
    weight: number;
    tier: string;
    effect: RewardEffectDef;
    /** 等階內群組（例：up／normal）；配合池的 tierGroups 決定群組佔比，沒填＝不屬於任何群組 */
    group: string | null;
    /** 機率表顯示用名稱鍵（i18n）；沒填由 UI 退回 id */
    nameKey: string | null;
}

/** 軟保底（規格 §12.3）：第 startAt 抽起機率漸升，曲線指數 curveExp；到硬保底前一抽為止 */
export interface RewardPitySoftDef {
    startAt: number;
    curveExp: number;
}

/** 一條保底階梯：針對 tier（含以上）計數；soft 為 null 表示只有硬保底（舊單一設定） */
export interface RewardPityDef {
    /** 計數器 key；不同獎池填同一個 key 就共用計數（規格 Q3 預設各池自己的 key） */
    counterKey: string;
    /** 階梯針對的等階（含以上）；與 guaranteeTier 同值 */
    tier: string;
    /** 連續這麼多抽沒出保底等階以上，下一抽必出（含第 count 抽本身） */
    hardCount: number;
    guaranteeTier: string;
    soft: RewardPitySoftDef | null;
}

/** 等階內的群組佔比：該階中獎後，落在 group 的機率為 share（載入時正規化到總和 1） */
export interface RewardTierGroupShare {
    group: string;
    share: number;
}

/** 固定名額（draw.slots）：一輪抽 count 個，只從符合 tier／group 篩選的項目裡抽；篩選沒有可抽項目時退回整池 */
export interface RewardDrawSlotDef {
    count: number;
    tier: string | null;
    group: string | null;
}

export interface RewardPoolDef {
    id: string;
    enabled: boolean;
    condition: Condition | null;
    /** 單次呼叫可抽的上限 */
    maxCount: number;
    /** 每一抽取幾個項目；replacement=false 表示同一抽內不重複 */
    picks: number;
    replacement: boolean;
    /** 等階由低到高 */
    tiers: string[];
    entries: RewardEntryDef[];
    /** 保底階梯，由高階往低階排序；空陣列＝無保底 */
    pity: RewardPityDef[];
    /** 等階 → 群組佔比；沒列的等階依項目權重直接抽 */
    tierGroups: Record<string, RewardTierGroupShare[]>;
    /** 固定名額；空陣列＝一般抽（picks 個）。有名額時 picks 為名額總和，且不套用保底 */
    slots: RewardDrawSlotDef[];
    /** 機率公開（reward.pools）用的中繼資料 */
    nameKey: string | null;
    disclosureVersion: string | null;
    currency: string[];
    rules: string[];
    /** 允許的來源種類；空陣列＝不限（憑證核對由來源種類白名單做，規格 §11.2） */
    sources: string[];
    presentation: RewardPresentationDef;
}

/** 懲罰上限（規格 §4 規則 5）：每種貨幣單次最多扣多少；截斷記入 trace */
export interface RewardCapDef {
    maxLoss: Record<string, number>;
}

export interface RewardBundleDef {
    id: string;
    kind: 'reward' | 'penalty';
    effects: RewardEffectDef[];
    cap: RewardCapDef | null;
    sources: string[];
    presentation: RewardPresentationDef;
}

export interface RewardConfigV1 {
    schema: 'reward-config.v1';
    pools: RewardPoolDef[];
    bundles: RewardBundleDef[];
}

export const REWARD_CONFIG_JSON = 'data/reward-config';
export const DEFAULT_PRESENTATION_TYPE = 'instant';

export const INSTANT_PRESENTATION: RewardPresentationDef = Object.freeze({ type: DEFAULT_PRESENTATION_TYPE, args: {}, skippable: true });

export const DEFAULT_REWARD_CONFIG: RewardConfigV1 = Object.freeze({ schema: 'reward-config.v1', pools: [], bundles: [] });

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
}

function strList(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v.length > 0) : [];
}

/** 數量合法：非零整數，或 min<=max 的非零區間（懲罰用負數） */
export function isValidAmount(value: unknown): value is RewardAmount {
    if (typeof value === 'number') return Number.isInteger(value) && value !== 0;
    if (!isRecord(value)) return false;
    const { min, max } = value;
    return typeof min === 'number' && typeof max === 'number' && Number.isInteger(min) && Number.isInteger(max) && min <= max && !(min === 0 && max === 0);
}

function normalizeEffect(raw: unknown): RewardEffectDef | null {
    if (!isRecord(raw)) return null;
    const kind = str(raw.kind);
    if (!kind) return null;
    // 內建兩種先驗欄位，壞了整個效果丟掉，避免入帳到一半才發現
    if (kind === 'currency' && (!str(raw.id) || !isValidAmount(raw.amount))) return null;
    if (kind === 'item' && (!str(raw.itemId) || !isValidAmount(raw.qty))) return null;
    return { ...raw, kind };
}

function normalizePresentation(raw: unknown): RewardPresentationDef {
    if (!isRecord(raw)) return INSTANT_PRESENTATION;
    const type = str(raw.type);
    if (!type) return INSTANT_PRESENTATION;
    return { type, args: isRecord(raw.args) ? { ...raw.args } : {}, skippable: raw.skippable !== false };
}

function normalizeSoft(raw: unknown, hardCount: number): RewardPitySoftDef | null {
    if (!isRecord(raw)) return null;
    const { startAt, curveExp } = raw;
    if (typeof startAt !== 'number' || !Number.isInteger(startAt) || startAt < 1 || startAt >= hardCount) return null;
    if (typeof curveExp !== 'number' || !Number.isFinite(curveExp) || curveExp <= 0) return null;
    return { startAt, curveExp };
}

function normalizeOnePity(raw: unknown, tiers: readonly string[]): RewardPityDef | null {
    if (!isRecord(raw)) return null;
    const hard = isRecord(raw.hard) ? raw.hard : null;
    const counterKey = str(raw.counterKey);
    const guaranteeTier = hard ? str(hard.guaranteeTier) : null;
    if (!counterKey || !hard || !guaranteeTier || tiers.indexOf(guaranteeTier) < 0) return null;
    // tier 可省略（舊設定）；填了就必須與 guaranteeTier 相同
    const tier = str(raw.tier) ?? guaranteeTier;
    if (tier !== guaranteeTier) return null;
    const count = hard.count;
    if (typeof count !== 'number' || !Number.isInteger(count) || count < 1) return null;
    return { counterKey, tier, hardCount: count, guaranteeTier, soft: normalizeSoft(raw.soft, count) };
}

/** 單一物件（舊設定）或陣列都收；壞的階梯略過、counterKey 重複略過，結果由高階往低階排 */
function normalizePity(raw: unknown, tiers: readonly string[]): RewardPityDef[] {
    const list = Array.isArray(raw) ? raw : [raw];
    const out: RewardPityDef[] = [];
    for (const item of list) {
        const pity = normalizeOnePity(item, tiers);
        if (pity && !out.some((p) => p.counterKey === pity.counterKey)) out.push(pity);
    }
    return out.sort((a, b) => tiers.indexOf(b.tier) - tiers.indexOf(a.tier));
}

function normalizeTierGroups(raw: unknown, tiers: readonly string[]): Record<string, RewardTierGroupShare[]> {
    const out: Record<string, RewardTierGroupShare[]> = {};
    if (!isRecord(raw)) return out;
    for (const [tier, list] of Object.entries(raw)) {
        if (tiers.indexOf(tier) < 0 || !Array.isArray(list)) continue;
        const shares: RewardTierGroupShare[] = [];
        for (const g of list) {
            if (!isRecord(g)) continue;
            const group = str(g.group);
            if (!group || shares.some((x) => x.group === group)) continue;
            if (typeof g.share !== 'number' || !Number.isFinite(g.share) || g.share <= 0) continue;
            shares.push({ group, share: g.share });
        }
        const sum = shares.reduce((t, x) => t + x.share, 0);
        if (sum > 0) out[tier] = shares.map((x) => ({ group: x.group, share: x.share / sum }));
    }
    return out;
}

function normalizeSlots(raw: unknown, tiers: readonly string[]): RewardDrawSlotDef[] {
    const out: RewardDrawSlotDef[] = [];
    for (const s of Array.isArray(raw) ? raw : []) {
        if (!isRecord(s)) continue;
        const count = s.count === undefined ? 1 : s.count;
        if (typeof count !== 'number' || !Number.isInteger(count) || count < 1) continue;
        const tier = str(s.tier);
        if (tier && tiers.indexOf(tier) < 0) continue;
        out.push({ count, tier, group: str(s.group) });
    }
    return out;
}

function normalizePool(raw: unknown): RewardPoolDef | null {
    if (!isRecord(raw)) return null;
    const id = str(raw.id);
    if (!id) return null;
    const tiers = strList(raw.tiers);
    const draw = isRecord(raw.draw) ? raw.draw : {};
    const seen = new Set<string>();
    const entries: RewardEntryDef[] = [];
    for (const e of Array.isArray(raw.entries) ? raw.entries : []) {
        if (!isRecord(e)) continue;
        const entryId = str(e.id);
        const effect = normalizeEffect(e.effect);
        const weight = e.weight;
        if (!entryId || seen.has(entryId) || !effect || typeof weight !== 'number' || !Number.isInteger(weight) || weight < 0) continue;
        const tier = str(e.tier) ?? tiers[0] ?? 'N';
        if (tiers.length > 0 && tiers.indexOf(tier) < 0) continue;
        seen.add(entryId);
        entries.push({ id: entryId, weight, tier, effect, group: str(e.group), nameKey: str(e.nameKey) });
    }
    if (entries.length === 0) return null;
    const poolTiers = tiers.length > 0 ? tiers : Array.from(new Set(entries.map((e) => e.tier)));
    const slots = normalizeSlots(draw.slots, poolTiers);
    const slotTotal = slots.reduce((t, x) => t + x.count, 0);
    const picks = slotTotal > 0 ? slotTotal : (typeof draw.picks === 'number' && Number.isInteger(draw.picks) && draw.picks >= 1 ? draw.picks : 1);
    const disclosure = isRecord(raw.disclosure) ? raw.disclosure : {};
    const maxCount = typeof raw.maxCount === 'number' && Number.isInteger(raw.maxCount) && raw.maxCount >= 1 ? raw.maxCount : 10;
    return {
        id,
        enabled: raw.enabled !== false,
        condition: isRecord(raw.condition) ? (raw.condition as unknown as Condition) : null,
        maxCount,
        picks,
        replacement: draw.replacement !== false,
        tiers: poolTiers,
        entries,
        pity: slotTotal > 0 ? [] : normalizePity(raw.pity, poolTiers),
        tierGroups: normalizeTierGroups(raw.tierGroups, poolTiers),
        slots,
        nameKey: str(raw.nameKey),
        disclosureVersion: str(disclosure.version) ?? str(raw.disclosureVersion),
        currency: strList(raw.currency),
        rules: strList(raw.rules),
        sources: strList(raw.sources),
        presentation: normalizePresentation(raw.presentation),
    };
}

function normalizeBundle(raw: unknown): RewardBundleDef | null {
    if (!isRecord(raw)) return null;
    const id = str(raw.id);
    if (!id) return null;
    const effects: RewardEffectDef[] = [];
    for (const e of Array.isArray(raw.effects) ? raw.effects : []) {
        const effect = normalizeEffect(e);
        if (effect) effects.push(effect);
    }
    if (effects.length === 0) return null;
    let cap: RewardCapDef | null = null;
    if (isRecord(raw.cap) && isRecord(raw.cap.maxLoss)) {
        const maxLoss: Record<string, number> = {};
        for (const [k, v] of Object.entries(raw.cap.maxLoss)) {
            if (typeof v === 'number' && Number.isInteger(v) && v >= 0) maxLoss[k] = v;
        }
        cap = { maxLoss };
    }
    return {
        id,
        kind: raw.kind === 'penalty' ? 'penalty' : 'reward',
        effects,
        cap,
        sources: strList(raw.sources),
        presentation: normalizePresentation(raw.presentation),
    };
}

/** 讀入 JSON；任何形狀不對都回傳可用的（可能是空的）設定，不丟錯 */
export function normalizeRewardConfig(raw: unknown): RewardConfigV1 {
    if (!isRecord(raw)) return DEFAULT_REWARD_CONFIG;
    const pools: RewardPoolDef[] = [];
    const bundles: RewardBundleDef[] = [];
    const poolIds = new Set<string>();
    const bundleIds = new Set<string>();
    for (const p of Array.isArray(raw.pools) ? raw.pools : []) {
        const pool = normalizePool(p);
        if (pool && !poolIds.has(pool.id)) { poolIds.add(pool.id); pools.push(pool); }
    }
    for (const b of Array.isArray(raw.bundles) ? raw.bundles : []) {
        const bundle = normalizeBundle(b);
        if (bundle && !bundleIds.has(bundle.id)) { bundleIds.add(bundle.id); bundles.push(bundle); }
    }
    return { schema: 'reward-config.v1', pools, bundles };
}

export function findPool(config: RewardConfigV1, id: string): RewardPoolDef | undefined {
    return config.pools.find((p) => p.id === id);
}

export function findBundle(config: RewardConfigV1, id: string): RewardBundleDef | undefined {
    return config.bundles.find((b) => b.id === id);
}
