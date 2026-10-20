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

/** 武職退役產卡（PROG-2-0739，PM 2026-10-20 裁定照規格發虎符）：品質算法與陣亡產卡相同，uid 另開前綴，與陣亡不衝突 */
export function produceRetireTally(
    general: TigerTallyGeneral,
    retireBattleScore: number,
    legacyQualityScore: number,
    season: number,
): TigerTallyCard | null {
    const card = produceDeathTally(general, retireBattleScore, legacyQualityScore, season);
    if (!card) return null;
    return { ...card, uid: `tally-retire-${card.sourceGeneralUid}-${season}`, source: 'retire' };
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

/** 適性等級由高到低（與 BattleAptitude 的 APTITUDE_GRADES 相同） */
const TROOP_APTITUDE_RANK = ['S', 'A', 'B', 'C', 'D'];
/** 兵種代碼的定義順序（同等級時取前面的） */
const TROOP_TYPE_ORDER: readonly string[] = ['cavalry', 'infantry', 'shield', 'archer', 'pikeman', 'engineer', 'medic', 'navy'];

/**
 * 武將主兵種 = 適性等級最高的兵種（S>A>B>C>D），同等級取 TroopType 定義順序較前者。
 * 規格沒有定義主兵種，這是 PM 暫定規則（PROG-2-0582）。沒有可用適性時回 undefined。
 * troopAptitude 的 key 是大寫兵種代碼（如 CAVALRY），回傳的是 TroopType 的小寫值。
 */
export function mainTroopTypeOf(troopAptitude: Readonly<Record<string, string>> | undefined): string | undefined {
    if (!troopAptitude) return undefined;
    let best: { type: string; rank: number; order: number } | null = null;
    for (const [key, grade] of Object.entries(troopAptitude)) {
        const type = key.toLowerCase();
        const order = TROOP_TYPE_ORDER.indexOf(type);
        const rank = TROOP_APTITUDE_RANK.indexOf(String(grade).toUpperCase());
        if (order < 0 || rank < 0) continue;
        if (!best || rank < best.rank || (rank === best.rank && order < best.order)) best = { type, rank, order };
    }
    return best?.type;
}

/**
 * 讀檔回填（PROG-2-0582）：缺 troopType 的虎符卡，依來源武將的主兵種補上。
 * 已有 troopType、或找不到來源武將時維持原樣；不改動傳入的物件。
 */
export function backfillTallyTroopTypes(
    cards: Readonly<Record<string, TigerTallyCard>>,
    generals: readonly { id: string; uid?: string; troopAptitude?: Readonly<Record<string, string>> }[],
): Record<string, TigerTallyCard> {
    const bySource = new Map<string, string | undefined>();
    for (const general of generals) {
        const key = general.uid?.trim() || general.id;
        if (!bySource.has(key)) bySource.set(key, mainTroopTypeOf(general.troopAptitude));
    }
    const out: Record<string, TigerTallyCard> = {};
    for (const [uid, card] of Object.entries(cards)) {
        const troopType = card.troopType ?? bySource.get(card.sourceGeneralUid);
        out[uid] = troopType && troopType !== card.troopType ? { ...card, troopType } : card;
    }
    return out;
}
