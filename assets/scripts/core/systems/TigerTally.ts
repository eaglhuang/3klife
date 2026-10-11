// @spec-source → 兵種（虎符）系統.md：虎符產出條件、虎符品質主分數
import type { TigerTallyCard, TigerTallyQuality } from '../models/TigerTallyCard';

/** 與 GeneralArchiver 的最小武將資料相容，不依賴 Cocos 或存檔格式。 */
export interface TigerTallyGeneral {
    id: string;
    uid?: string;
    templateId?: string;
    isHistorical?: boolean;
    characterCategory?: string;
    gender?: string;
    troopType?: string;
}

const QUALITY_RANK: Record<TigerTallyQuality, number> = { R: 0, SR: 1, SSR: 2, UR: 3 };

function clampScore(score: number): number {
    // 無有效分數時保守以 0 計；正負無限大依上下界夾住。
    return Number.isNaN(score) ? 0 : Math.min(100, Math.max(0, score));
}

export function getTigerTallyScore(deathBattleScore: number, legacyQualityScore: number): number {
    return Math.round(0.7 * clampScore(deathBattleScore) + 0.3 * clampScore(legacyQualityScore));
}

export function resolveTallyQuality(score: number): TigerTallyQuality {
    const bounded = clampScore(score);
    if (bounded >= 85) return 'UR';
    if (bounded >= 65) return 'SSR';
    if (bounded >= 40) return 'SR';
    return 'R';
}

/**
 * 正式名將保守門檻：明確 isHistorical === true 的武將，或性別為女、具非空
 * 正式 templateId 且 category 為 general/famed/mythical/titled 的女性名將。
 * templateId 由呼叫端保證來自正式模板登錄；此純函式不查詢外部人物資料表。
 * 正式 true 旗標優先於分類；無正式旗標時 civilian 維持舊有排除規則。
 * 稀有度、EP、父母與 category 單獨存在均不代表正式名將。
 * 欄位不足或 category 未知時不推定女性名將；一般子嗣預設不產卡。
 * 生前退役不呼叫死亡產卡；已退役名將真正死亡時仍符合本門檻。
 */
export function isTallyEligible(general: TigerTallyGeneral): boolean {
    if (!general.id.trim()) return false;
    if (general.isHistorical === true) return true;
    if (general.characterCategory === 'civilian') return false;
    const gender = general.gender?.trim().toLowerCase();
    const female = gender === '女' || gender === 'female';
    const namedCategory = ['general', 'famed', 'mythical', 'titled'].includes(general.characterCategory ?? '');
    return female && Boolean(general.templateId?.trim()) && namedCategory;
}

export function produceDeathTally(
    general: TigerTallyGeneral,
    deathBattleScore: number,
    legacyQualityScore: number,
    season: number,
): TigerTallyCard | null {
    if (!isTallyEligible(general)) return null;
    const sourceGeneralUid = general.uid?.trim() || general.id;
    const score = getTigerTallyScore(deathBattleScore, legacyQualityScore);
    return {
        // 同武將、同季死亡重試得到同一 uid；不同季復出死亡可辨識為另一產物。
        uid: `tally-death-${sourceGeneralUid}-${season}`,
        templateId: general.templateId?.trim() || general.id,
        sourceGeneralUid,
        quality: resolveTallyQuality(score),
        score,
        source: 'death',
        producedSeason: season,
        ...(general.troopType === undefined ? {} : { troopType: general.troopType }),
    };
}

export function transferSurrenderTally(
    card: TigerTallyCard,
    recruitedSeason: number,
    currentSeason: number,
): TigerTallyCard | null {
    if (!(currentSeason >= recruitedSeason + 1)) return null;
    return { ...card, source: 'surrender' };
}

export function awardTopTally(
    tallies: readonly TigerTallyCard[],
    hasNoRetreat: boolean,
    victory: boolean,
): TigerTallyCard | null {
    if (!hasNoRetreat || !victory) return null;
    let best: TigerTallyCard | null = null;
    for (const card of tallies) {
        if (!best || QUALITY_RANK[card.quality] > QUALITY_RANK[best.quality]
            || (card.quality === best.quality && card.score > best.score)) {
            best = card;
        }
    }
    // 不排序、不改原卡；完全同分時保持輸入順序。
    return best ? { ...best, source: 'reward' } : null;
}
