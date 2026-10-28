// @spec-source → AI武將強度系統.md (doc_data_0002) E-5、E-6b；PROG-2-1337 暫定
/**
 * AiTallyPool — AI 虎符池與配發（純邏輯，不依賴 cc）
 *
 * 暫定（可逆，PM 授權直接決定，見待辦檔）：
 * - 虎符池 = 現有虎符模板全表（TallyCardCatalog），每個模板視為一張 1★ 虎符。
 * - 配發數量依難度：easy 0、normal 1、hard 2、nightmare 2、hell 3；不分章節。
 * - 候選只留敵將「有適性紀錄」的兵種模板；敵將沒有任何適性紀錄時退回全表。
 * - 挑選沿用 aiSelectTally（共鳴優先，否則評分最高），不重複配發同一模板。
 *
 * Unity 對照：像每場戰鬥開始前，從 CardDatabase 抽出一組卡組給 AI，AI 依卡組出兵。
 */
import type { TallyCardData } from '../../shared/TallyCardContract';
import type { TigerTallyCard, TigerTallyQuality } from '../models/TigerTallyCard';
import type { AiDifficulty } from './AiSpCharge';
import { aiSelectTally, type AiTallyGeneral } from './AiTallySelection';

/** 暫定：各難度每場配發的虎符張數 */
export const AI_TALLY_COUNT_BY_DIFFICULTY: Readonly<Record<AiDifficulty, number>> = {
    easy: 0,
    normal: 1,
    hard: 2,
    nightmare: 2,
    hell: 3,
};

/** 卡面稀有度 → 虎符品質（規格稀有度與品質對照暫定） */
const QUALITY_BY_RARITY: Readonly<Record<string, TigerTallyQuality>> = {
    normal: 'R',
    rare: 'SR',
    epic: 'SSR',
    legendary: 'UR',
    mythic: 'UR',
};

/** 把虎符模板目錄轉成 AI 虎符池（每個模板一張 1★ 虎符，uid 以模板 id 為準） */
export function buildAiTallyPool(catalog: ReadonlyMap<string, TallyCardData>): TigerTallyCard[] {
    const pool: TigerTallyCard[] = [];
    catalog.forEach((card, templateId) => {
        if (card.isDisabled) return;
        pool.push({
            uid: `ai-tally:${templateId}`,
            templateId,
            sourceGeneralUid: '',
            quality: QUALITY_BY_RARITY[card.rarity] ?? 'R',
            score: 0,
            source: 'reward',
            producedSeason: 0,
            troopType: card.unitType,
            stars: 1,
            battleExp: 0,
        });
    });
    return pool;
}

/** 候選池：敵將有適性紀錄的兵種優先；沒有任何適性紀錄時退回全表 */
export function aiTallyCandidates(general: AiTallyGeneral, pool: readonly TigerTallyCard[]): TigerTallyCard[] {
    const aptitudeTypes = new Set(Object.keys(general.troopAptitude).map(type => type.trim().toLowerCase()));
    if (aptitudeTypes.size === 0) return [...pool];
    return pool.filter(tally => tally.troopType !== undefined && aptitudeTypes.has(tally.troopType.trim().toLowerCase()));
}

/** 依難度配發虎符：從候選池逐張挑（aiSelectTally），不重複；候選不足時少配 */
export function allocateAiTallies(
    general: AiTallyGeneral,
    pool: readonly TigerTallyCard[],
    difficulty: AiDifficulty,
): TigerTallyCard[] {
    const count = AI_TALLY_COUNT_BY_DIFFICULTY[difficulty] ?? 0;
    const remaining = aiTallyCandidates(general, pool);
    const allocated: TigerTallyCard[] = [];
    while (allocated.length < count) {
        const picked = aiSelectTally(general, remaining);
        if (!picked) break;
        allocated.push(picked);
        remaining.splice(remaining.indexOf(picked), 1);
    }
    return allocated;
}
