// @spec-source → 傳世名酒宴飲結義與割袍斷義狀態機規格書 doc_spec_0743 §2～§4；六日傭兵結義規格 doc_spec_0583 §4.1／§5.1；PM 裁定 2026-10-13（好感門檻一律 60）；PROG-2-10207
/**
 * OathConfig — 結義系統的可調參數（純邏輯，不依賴 cc）。
 *
 * 數值全部來自 assets/resources/data/oath-config.json；這裡的 DEFAULT_OATH_CONFIG 只是 JSON 缺檔或壞檔時的後備。
 * - affinityThreshold：結義盟約好感門檻（一律 60，PM 裁定）
 * - wine.mode：Q42 尚未裁決，'dual' ＝點數與名酒雙軌並行（預設）；'wine-required' ＝高稀有度（highRarities）結義只能用名酒
 * - parting.tiers：離隊留念禮物依好感分級，bundleId 對應 reward-config.json 的獎勵套件
 *
 * Unity 對照：像一份 ScriptableObject 設定檔，程式只讀它，不寫死數字。
 */

export type WineId = 'DUKANG_WINE' | 'GREEN_PLUM' | 'TUSU_WINE' | 'JIUYUN_WINE';
export const WINE_IDS: readonly WineId[] = ['DUKANG_WINE', 'GREEN_PLUM', 'TUSU_WINE', 'JIUYUN_WINE'];
export type WineMode = 'dual' | 'wine-required';

export interface WineDef {
    itemId: string;
    /** 宴飲好感變動（規格 +15～+35） */
    affinityGain: number;
}

export interface BondWineCost {
    wineId: WineId;
    qty: number;
}

export interface PartingTier {
    minAffection: number;
    bundleId: string;
}

export interface OathConfig {
    affinityThreshold: number;
    pact: { minMembers: number; maxMembers: number };
    severance: { lockedAffinity: number };
    wine: {
        mode: WineMode;
        highRarities: string[];
        wines: Record<WineId, WineDef>;
        bondWine: Record<string, BondWineCost>;
    };
    parting: { tiers: PartingTier[] };
}

export const DEFAULT_OATH_CONFIG: OathConfig = Object.freeze({
    affinityThreshold: 60,
    pact: { minMembers: 2, maxMembers: 3 },
    severance: { lockedAffinity: -100 },
    wine: {
        mode: 'dual' as WineMode,
        highRarities: ['SSR', 'UR'],
        wines: {
            DUKANG_WINE: { itemId: 'ITEM_WINE_DUKANG', affinityGain: 35 },
            GREEN_PLUM: { itemId: 'ITEM_WINE_GREEN_PLUM', affinityGain: 25 },
            TUSU_WINE: { itemId: 'ITEM_WINE_TUSU', affinityGain: 15 },
            JIUYUN_WINE: { itemId: 'ITEM_WINE_JIUYUN', affinityGain: 30 },
        },
        bondWine: { SSR: { wineId: 'DUKANG_WINE', qty: 2 }, UR: { wineId: 'JIUYUN_WINE', qty: 3 } },
    },
    parting: {
        tiers: [
            { minAffection: 0, bundleId: 'BUNDLE_MERC_PARTING_1' },
            { minAffection: 20, bundleId: 'BUNDLE_MERC_PARTING_2' },
            { minAffection: 40, bundleId: 'BUNDLE_MERC_PARTING_3' },
            { minAffection: 60, bundleId: 'BUNDLE_MERC_PARTING_4' },
        ],
    },
}) as OathConfig;

function num(value: unknown, fallback: number, min: number, max: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, Math.trunc(value))) : fallback;
}

function rec(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/** 把原始 JSON 正規化成設定；任何欄位缺漏或型別不對都退回預設，不拋例外。 */
export function normalizeOathConfig(raw: unknown): OathConfig {
    const src = rec(raw);
    const d = DEFAULT_OATH_CONFIG;
    const pact = rec(src.pact);
    const minMembers = num(pact.minMembers, d.pact.minMembers, 2, 3);
    const maxMembers = Math.max(minMembers, num(pact.maxMembers, d.pact.maxMembers, 2, 3));
    const wineSrc = rec(src.wine);
    const winesSrc = rec(wineSrc.wines);
    const wines = {} as Record<WineId, WineDef>;
    for (const id of WINE_IDS) {
        const w = rec(winesSrc[id]);
        wines[id] = {
            itemId: typeof w.itemId === 'string' && w.itemId ? w.itemId : d.wine.wines[id].itemId,
            affinityGain: num(w.affinityGain, d.wine.wines[id].affinityGain, 1, 100),
        };
    }
    const bondWine: Record<string, BondWineCost> = {};
    const bondSrc = rec(wineSrc.bondWine);
    const bondKeys = Object.keys(bondSrc).length > 0 ? Object.keys(bondSrc) : Object.keys(d.wine.bondWine);
    for (const rarity of bondKeys) {
        const entry = rec(bondSrc[rarity]);
        const fallback = d.wine.bondWine[rarity];
        const wineId = WINE_IDS.find((id) => id === entry.wineId) ?? fallback?.wineId;
        if (!wineId) continue;
        bondWine[rarity] = { wineId, qty: num(entry.qty, fallback?.qty ?? 1, 1, 99) };
    }
    const tiersSrc = Array.isArray(rec(src.parting).tiers) ? (rec(src.parting).tiers as unknown[]) : [];
    const tiers = tiersSrc
        .map((t) => rec(t))
        .filter((t) => typeof t.bundleId === 'string' && t.bundleId)
        .map((t) => ({ minAffection: num(t.minAffection, 0, 0, 100), bundleId: String(t.bundleId) }))
        .sort((a, b) => a.minAffection - b.minAffection);
    return {
        affinityThreshold: num(src.affinityThreshold, d.affinityThreshold, 0, 100),
        pact: { minMembers, maxMembers },
        severance: { lockedAffinity: num(rec(src.severance).lockedAffinity, d.severance.lockedAffinity, -100, 0) },
        wine: {
            mode: wineSrc.mode === 'wine-required' ? 'wine-required' : 'dual',
            highRarities: Array.isArray(wineSrc.highRarities) ? wineSrc.highRarities.filter((r): r is string => typeof r === 'string') : [...d.wine.highRarities],
            wines,
            bondWine,
        },
        parting: { tiers: tiers.length > 0 ? tiers : d.parting.tiers.map((t) => ({ ...t })) },
    };
}
