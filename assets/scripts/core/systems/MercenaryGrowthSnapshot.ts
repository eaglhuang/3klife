// @spec-source → 傭兵出戰戰績隔離不俘與結義數值快照凍結規格書 §3（MERC-12：等級、經驗、戰法於結義時凍結並 100% 繼承）；PROG-2-10207
/**
 * MercenaryGrowthSnapshot — 結義時凍結傭兵試用期成長，並繼承到永久武將（純邏輯，不依賴 cc）。
 *
 * 成長資料放在 MercenaryState.growth（選填；試用期的升級與學戰法的寫入來源另卡，沒有就視為未成長，不覆寫模板）。
 * 快照是不可變複本，之後傭兵資料再變也不影響永久武將。
 */
import type { GeneralConfig } from '../models/GeneralUnit';

export interface MercenaryGrowth {
    level: number;
    exp: number;
    learnedTactics: string[];
}

export interface MercenaryStatsSnapshot {
    readonly generalId: string;
    readonly level: number;
    readonly exp: number;
    readonly learnedTactics: readonly string[];
    readonly frozenSeason: number;
}

/** 傭兵沒有成長資料（growth 缺或等級不合法）回傳 null。 */
export function freezeGrowthSnapshot(growth: Readonly<MercenaryGrowth> | undefined, generalId: string, season: number): MercenaryStatsSnapshot | null {
    if (!growth || !Number.isFinite(growth.level) || growth.level < 1) return null;
    const tactics = Array.isArray(growth.learnedTactics) ? growth.learnedTactics : [];
    return Object.freeze({
        generalId,
        level: Math.trunc(growth.level),
        exp: Math.max(0, Math.trunc(Number.isFinite(growth.exp) ? growth.exp : 0)),
        learnedTactics: Object.freeze(Array.from(new Set(tactics.filter((t) => typeof t === 'string' && t)))),
        frozenSeason: season,
    });
}

/**
 * 把快照繼承到永久武將：戰法與模板已學合併去重；沒有快照原樣回傳。
 * GeneralConfig 目前沒有等級／經驗欄位（武將成長走五維與戰法熟練），等級與經驗只留在快照供日後接線，不寫入武將。
 */
export function applyGrowthSnapshot(general: GeneralConfig, snapshot: MercenaryStatsSnapshot | null): GeneralConfig {
    if (!snapshot) return general;
    const tactics = Array.from(new Set([...(general.learnedTactics ?? []), ...snapshot.learnedTactics]));
    return { ...general, learnedTactics: tactics };
}
