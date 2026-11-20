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
}

export interface RewardPityDef {
    /** 計數器 key；不同獎池填同一個 key 就共用計數（規格 Q3 預設各池自己的 key） */
    counterKey: string;
    /** 連續這麼多抽沒出保底等階以上，下一抽必出（含第 count 抽本身） */
    hardCount: number;
    guaranteeTier: string;
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
    pity: RewardPityDef | null;
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

function normalizePity(raw: unknown, tiers: readonly string[]): RewardPityDef | null {
    if (!isRecord(raw)) return null;
    const hard = isRecord(raw.hard) ? raw.hard : null;
    const counterKey = str(raw.counterKey);
    const guaranteeTier = hard ? str(hard.guaranteeTier) : null;
    if (!counterKey || !hard || !guaranteeTier || tiers.indexOf(guaranteeTier) < 0) return null;
    const count = hard.count;
    if (typeof count !== 'number' || !Number.isInteger(count) || count < 1) return null;
    return { counterKey, hardCount: count, guaranteeTier };
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
        entries.push({ id: entryId, weight, tier, effect });
    }
    if (entries.length === 0) return null;
    const picks = typeof draw.picks === 'number' && Number.isInteger(draw.picks) && draw.picks >= 1 ? draw.picks : 1;
    const maxCount = typeof raw.maxCount === 'number' && Number.isInteger(raw.maxCount) && raw.maxCount >= 1 ? raw.maxCount : 10;
    return {
        id,
        enabled: raw.enabled !== false,
        condition: isRecord(raw.condition) ? (raw.condition as unknown as Condition) : null,
        maxCount,
        picks,
        replacement: draw.replacement !== false,
        tiers: tiers.length > 0 ? tiers : Array.from(new Set(entries.map((e) => e.tier))),
        entries,
        pity: normalizePity(raw.pity, tiers.length > 0 ? tiers : Array.from(new Set(entries.map((e) => e.tier)))),
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
