// @spec-source → 虎符卡面UI佈局與部隊卡圖備援渲染規格書.md（doc_spec_0355）；PROG-2-2041
/**
 * TallyCardFace — 虎符卡面四欄資訊與卡圖備援鏈（純邏輯，不依賴 cc）
 *
 * - §1 卡面 287×142；四欄：投入兵力 1,500、糧耗（斛）、星級共鳴倍率、全場限調 1 隊。
 * - §2 卡圖：troops_{campId} → 通用 troops → 純色底板金屬框；缺圖只記警告，不拋例外。
 * 存在性由呼叫端注入（UI 層用 resources 快取），本檔不碰引擎。
 */

export const TALLY_CARD_WIDTH = 287;
export const TALLY_CARD_HEIGHT = 142;
export const TALLY_CARD_TROOP_COMMIT = 1500;
export const TALLY_CARD_FIELD_LIMIT = 1;
export const TALLY_CARD_ART_DIR = 'ui/tiger-tally/card-art/';
export const TALLY_CARD_ART_FALLBACK = `${TALLY_CARD_ART_DIR}troops`;
/** 每升一星 +25%（1 星 0%、3 星 50%、5 星 100%） */
export const TALLY_RESONANCE_PER_STAR = 25;

export type TallyCardArtSource = 'specific' | 'fallback' | 'solid';

export interface TallyCardArtResolution {
    source: TallyCardArtSource;
    /** solid 時為 null：改畫純色底板搭配金屬邊框 */
    path: string | null;
    warning: string | null;
}

export function tallyCardArtPathOf(campId: string): string {
    return `${TALLY_CARD_ART_DIR}troops_${campId.trim().toLowerCase()}`;
}

export function resolveTallyCardArt(campId: string, exists: (path: string) => boolean): TallyCardArtResolution {
    const specific = tallyCardArtPathOf(campId);
    if (campId.trim() && exists(specific)) return { source: 'specific', path: specific, warning: null };
    if (exists(TALLY_CARD_ART_FALLBACK)) {
        return { source: 'fallback', path: TALLY_CARD_ART_FALLBACK, warning: `[TallyCardArt] Missing art for ${campId}, fallback to default.` };
    }
    return { source: 'solid', path: null, warning: `[TallyCardArt] Missing art for ${campId} and default troops; render solid plate.` };
}

export function tallyResonancePercent(star: number): number {
    const s = Math.max(1, Math.min(5, Math.floor(star)));
    return (s - 1) * TALLY_RESONANCE_PER_STAR;
}

export interface TallyCardFaceInput {
    campId: string;
    campName: string;
    star: number;
    grainCost: number;
    tacticName: string;
}

export interface TallyCardFace {
    campName: string;
    star: number;
    troopLabel: string;
    grainLabel: string;
    resonanceLabel: string;
    limitLabel: string;
    tacticName: string;
}

export function buildTallyCardFace(input: TallyCardFaceInput): TallyCardFace {
    const star = Math.max(1, Math.min(5, Math.floor(input.star)));
    return {
        campName: input.campName,
        star,
        troopLabel: `投入兵力 ${TALLY_CARD_TROOP_COMMIT.toLocaleString('en-US')}`,
        grainLabel: `糧耗 ${Math.max(0, Math.floor(input.grainCost))} 斛/次`,
        resonanceLabel: `共鳴倍率 +${tallyResonancePercent(star)}%`,
        limitLabel: `全場限調遣 ${TALLY_CARD_FIELD_LIMIT} 隊`,
        tacticName: input.tacticName,
    };
}

/** §4-3 卡面設定檢查：回傳缺欄位的營別 id */
export function findIncompleteTallyCardConfigs(configs: readonly Partial<TallyCardFaceInput>[]): string[] {
    return configs
        .filter((c) => !c.campId || !c.campName || typeof c.star !== 'number' || typeof c.grainCost !== 'number')
        .map((c) => c.campId ?? '(unknown)');
}
