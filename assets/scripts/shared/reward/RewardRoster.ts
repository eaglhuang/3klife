// @spec-source → 獎勵系統 Base 框架規格書 (doc_spec_1186) §12.4 名單展開（rosterQuery）、§12.2 三池分工；GCH-R3（PROG-2-9462）
/**
 * RewardRoster — 卡池設定的「名冊查詢」展開（純函式，零依賴 cc）。
 *
 * 卡池 JSON（reward-pool.v1）的項目可以寫 rosterQuery 而不手寫每位角色；載入時依武將名冊展開成逐角色項目，
 * 再交給 normalizeRewardConfig。池的所有規則（等階機率、UP、保底、名額）都在 JSON，這裡只有查詢與展開機制。
 *
 * 查詢欄位（全部選填，同時填就是交集）：
 *   ref          名單別名（檔內 rosterRefs 的鍵，例：UP 名單）
 *   ids          直接列 id
 *   rarity       'SSR'｜'SR'｜'R'（或陣列）：legendary／mythic＝SSR、epic＝SR、其餘＝R（與舊抽取引擎同一個對照）
 *   rarityTier   名冊原始稀有度字串（或陣列），例 common、rare
 *   gender       'male'｜'female'（或名冊原值）
 *   excludeGender 排除的性別
 *   excludeRefs／excludeIds 排除的名單別名／id
 *   weight       展開後每位角色的權重（預設 1）
 * 展開後的項目：id＝角色 id、nameKey＝`general.<id>`、effect＝範本效果加上 generalId；同一池內重複 id 以先出現者為準。
 */
import { normalizeRewardConfig, type RewardPoolDef } from './RewardConfig';

/** 名冊成員的最小欄位（GeneralConfig 滿足） */
export interface RosterMember {
    id: string;
    gender?: string;
    rarityTier?: string;
    characterCategory?: string;
}

export type RosterRarity = 'SSR' | 'SR' | 'R';

export interface RosterQuery {
    ref?: string;
    ids?: string[];
    rarity?: RosterRarity | RosterRarity[];
    rarityTier?: string | string[];
    gender?: string;
    excludeGender?: string;
    excludeRefs?: string[];
    excludeIds?: string[];
    weight?: number;
}

/** 名單檔：rosterRefs 是別名表，pools 是 reward-pool.v1 陣列（項目可帶 rosterQuery） */
export interface RewardPoolFile {
    schema: 'reward-pool-file.v1';
    rosterRefs?: Record<string, string[]>;
    /** 舊轉蛋池 id → 獎池 id（GCH-R4：轉蛋畫面沿用的池 id 對到 reward-pool） */
    legacyPoolIds?: Record<string, string>;
    pools: unknown[];
}

const GENDER_ALIAS: Readonly<Record<string, string>> = Object.freeze({ male: '男', female: '女' });

function isRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function textList(v: unknown): string[] {
    if (typeof v === 'string') return [v];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

/** 名冊成員的稀有度桶：沒有 rarityTier 時由 characterCategory 推得（與 LocalGachaService.inferRarityTier 同一個對照） */
export function rosterRarityOf(member: RosterMember): RosterRarity {
    let tier = member.rarityTier;
    if (!tier) {
        switch (member.characterCategory) {
            case 'mythical': tier = 'mythic'; break;
            case 'titled': tier = 'legendary'; break;
            case 'famed': tier = 'epic'; break;
            case 'general': tier = 'rare'; break;
            default: tier = 'common';
        }
    }
    if (tier === 'legendary' || tier === 'mythic') return 'SSR';
    return tier === 'epic' ? 'SR' : 'R';
}

function genderOf(value: string): string {
    return GENDER_ALIAS[value] ?? value;
}

/** 依查詢從名冊挑人（保持名冊順序）；沒有任何條件的查詢回傳空（避免誤把整個名冊塞進池） */
export function queryRoster(roster: readonly RosterMember[], query: RosterQuery, refs: Readonly<Record<string, string[]>>): RosterMember[] {
    const hasCondition = query.ref !== undefined || query.ids !== undefined || query.rarity !== undefined
        || query.rarityTier !== undefined || query.gender !== undefined;
    if (!hasCondition) return [];
    const allowIds = new Set<string>();
    let restrictIds = false;
    if (query.ref !== undefined) { restrictIds = true; for (const id of refs[query.ref] ?? []) allowIds.add(id); }
    if (query.ids !== undefined) {
        const ids = new Set(textList(query.ids));
        if (restrictIds) { for (const id of [...allowIds]) if (!ids.has(id)) allowIds.delete(id); } else { for (const id of ids) allowIds.add(id); }
        restrictIds = true;
    }
    const banned = new Set<string>(textList(query.excludeIds));
    for (const r of textList(query.excludeRefs)) for (const id of refs[r] ?? []) banned.add(id);
    const rarities = textList(query.rarity);
    const tiers = textList(query.rarityTier);
    const gender = query.gender !== undefined ? genderOf(query.gender) : null;
    const noGender = query.excludeGender !== undefined ? genderOf(query.excludeGender) : null;
    return roster.filter((m) => {
        if (banned.has(m.id)) return false;
        if (restrictIds && !allowIds.has(m.id)) return false;
        if (rarities.length > 0 && rarities.indexOf(rosterRarityOf(m)) < 0) return false;
        if (tiers.length > 0 && tiers.indexOf(String(m.rarityTier)) < 0) return false;
        if (gender !== null && m.gender !== gender) return false;
        if (noGender !== null && m.gender === noGender) return false;
        return true;
    });
}

/** 把一個池的 rosterQuery 項目展開成逐角色項目；沒有 rosterQuery 的項目原樣保留 */
function expandPool(rawPool: unknown, roster: readonly RosterMember[], refs: Readonly<Record<string, string[]>>): unknown {
    if (!isRecord(rawPool) || !Array.isArray(rawPool.entries)) return rawPool;
    const seen = new Set<string>();
    const out: unknown[] = [];
    for (const e of rawPool.entries) {
        if (!isRecord(e) || !isRecord(e.rosterQuery)) { out.push(e); continue; }
        const query = e.rosterQuery as RosterQuery;
        const weight = typeof query.weight === 'number' ? query.weight : 1;
        const template = isRecord(e.effect) ? e.effect : { kind: 'general' };
        for (const m of queryRoster(roster, query, refs)) {
            if (seen.has(m.id)) continue;
            seen.add(m.id);
            out.push({
                id: m.id, weight, tier: e.tier, ...(e.group !== undefined ? { group: e.group } : {}),
                nameKey: `general.${m.id}`, effect: { ...template, generalId: m.id },
            });
        }
    }
    return { ...rawPool, entries: out };
}

/** 展開名單檔裡所有池的 rosterQuery，回傳可直接餵 normalizeRewardConfig 的原始設定 */
export function expandRewardPoolFile(raw: unknown, roster: readonly RosterMember[]): { schema: 'reward-config.v1'; pools: unknown[]; bundles: unknown[] } {
    const file = isRecord(raw) ? raw : {};
    const refs: Record<string, string[]> = {};
    if (isRecord(file.rosterRefs)) for (const [k, v] of Object.entries(file.rosterRefs)) refs[k] = textList(v);
    const pools = Array.isArray(file.pools) ? file.pools.map((p) => expandPool(p, roster, refs)) : [];
    return { schema: 'reward-config.v1', pools, bundles: [] };
}

/** 載入卡池名單檔：展開名冊查詢後正規化，回傳各池定義（壞的池照 normalizeRewardConfig 規則略過） */
export function buildRewardPools(raw: unknown, roster: readonly RosterMember[]): RewardPoolDef[] {
    return normalizeRewardConfig(expandRewardPoolFile(raw, roster)).pools;
}

/** 名單檔的舊池 id 對照（舊 id → 獎池 id）；格式不對的項目略過 */
export function legacyPoolIdsOf(raw: unknown): Record<string, string> {
    const out: Record<string, string> = {};
    const map = isRecord(raw) && isRecord(raw.legacyPoolIds) ? raw.legacyPoolIds : {};
    for (const [k, v] of Object.entries(map)) if (typeof v === 'string' && v.length > 0) out[k] = v;
    return out;
}
