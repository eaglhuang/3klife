// @spec-source → 關係親密度每季衰退維護與家風傳承規格書 (doc_spec_0326) §2~§3（KIN-11，PROG-2-2003）
/**
 * ClanHeritage — 宗族四大家風傳承的觸發判定、啟用上限與全族被動數值（純邏輯，不依賴 cc）。
 *
 * 規格定案：
 * - 直系 14 人祖譜中，對應兩類標籤合計達 5 個以上即點亮該家風。
 * - 文治盛世（智謀/內政）：策論手牌 +1、稅收 +10%；尚武將門（統率/武力）：開局士氣 +15、近戰傷害 +8%；
 *   忠義傳家（仁德/忠勇）：忠誠下限 60、合攻機率 +10%；巨賈豪紳（經商/理財）：裝備丹藥 8 折、季糧 +15%。
 * - 同時最多啟用 2 個家風，由玩家自選；點亮即取得稱號。
 *
 * 親密度衰退與歸零保留沿用 KinDynamicRelations（KIN-10）。
 * 暫定：祖先超過 14 人只計前 14 人；同一位祖先的多個標籤各自計數；祠堂 UI 與 Buff 接線另卡。
 * Unity 對照：像 ScriptableObject 定義家風表，Manager 依祖譜算出可用清單，玩家選的存進存檔。
 */

export type ClanHeritageId = 'scholarly' | 'martial' | 'loyal' | 'merchant';

export interface ClanHeritageBuff {
    strategyHandSize: number;
    taxGoldRate: number;
    sortieMorale: number;
    meleeDamageRate: number;
    loyaltyFloor: number;
    comboChanceBonus: number;
    shopPriceRate: number;
    seasonFoodRate: number;
}

export interface ClanHeritageDef {
    id: ClanHeritageId;
    name: string;
    title: string;
    tags: readonly string[];
    buff: Partial<ClanHeritageBuff>;
}

export const CLAN_HERITAGE_TAG_THRESHOLD = 5;
export const CLAN_HERITAGE_MAX_ACTIVE = 2;
export const CLAN_HERITAGE_ANCESTOR_SLOTS = 14;

export const CLAN_HERITAGES: readonly ClanHeritageDef[] = [
    { id: 'scholarly', name: '文治盛世', title: '海內文宗', tags: ['智謀', '內政'], buff: { strategyHandSize: 1, taxGoldRate: 0.1 } },
    { id: 'martial', name: '尚武將門', title: '百戰世家', tags: ['統率', '武力'], buff: { sortieMorale: 15, meleeDamageRate: 0.08 } },
    { id: 'loyal', name: '忠義傳家', title: '義薄雲天', tags: ['仁德', '忠勇'], buff: { loyaltyFloor: 60, comboChanceBonus: 0.1 } },
    { id: 'merchant', name: '巨賈豪紳', title: '富甲一方', tags: ['經商', '理財'], buff: { shopPriceRate: 0.8, seasonFoodRate: 0.15 } },
];

export interface ClanHeritageState {
    activeHeritages: ClanHeritageId[];
    unlockedTitles: string[];
}

/** 依祖先標籤列表（每人一組標籤）回傳已點亮的家風。 */
export function eligibleClanHeritages(ancestorTags: readonly (readonly string[])[]): ClanHeritageId[] {
    const counted = ancestorTags.slice(0, CLAN_HERITAGE_ANCESTOR_SLOTS);
    return CLAN_HERITAGES.filter((h) => {
        let n = 0;
        for (const tags of counted) for (const t of tags) if (h.tags.includes(t)) n++;
        return n >= CLAN_HERITAGE_TAG_THRESHOLD;
    }).map((h) => h.id);
}

/** 玩家選擇生效的家風：只收已點亮者、去重、最多 2 個；稱號隨點亮全數取得。 */
export function selectClanHeritages(eligible: readonly ClanHeritageId[], chosen: readonly ClanHeritageId[]): ClanHeritageState {
    const active: ClanHeritageId[] = [];
    for (const id of chosen) {
        if (eligible.includes(id) && !active.includes(id) && active.length < CLAN_HERITAGE_MAX_ACTIVE) active.push(id);
    }
    const unlockedTitles = CLAN_HERITAGES.filter((h) => eligible.includes(h.id)).map((h) => h.title);
    return { activeHeritages: active, unlockedTitles };
}

const NEUTRAL_BUFF: ClanHeritageBuff = {
    strategyHandSize: 0, taxGoldRate: 0, sortieMorale: 0, meleeDamageRate: 0,
    loyaltyFloor: 0, comboChanceBonus: 0, shopPriceRate: 1, seasonFoodRate: 0,
};

/** 合併已啟用家風的全族被動。 */
export function clanHeritageBuff(active: readonly ClanHeritageId[]): ClanHeritageBuff {
    const out = { ...NEUTRAL_BUFF };
    for (const h of CLAN_HERITAGES) {
        if (!active.includes(h.id)) continue;
        for (const [k, v] of Object.entries(h.buff) as [keyof ClanHeritageBuff, number][]) {
            if (k === 'shopPriceRate') out[k] = Math.round(out[k] * v * 1e6) / 1e6;
            else if (k === 'loyaltyFloor') out[k] = Math.max(out[k], v);
            else out[k] = Math.round((out[k] + v) * 1e6) / 1e6;
        }
    }
    return out;
}
