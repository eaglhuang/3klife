// @spec-source → 可結緣女性來源系統.md §A 第 9 項（血統模擬器預覽）；EP 規格見 BreedingSystem.ts；FEM-09（PROG-2-0567）
/**
 * BreedingPreviewPresenter — 結緣介面的 EP 預覽文字（純邏輯，不依賴 cc）
 *
 * 把 BreedingService.previewEp 的結果轉成三行文字：EP 與評級、拆解、共鳴標籤。
 * 只產生字串，不碰節點；節點由結緣介面綁定。
 *
 * Unity 對照：Presenter 把計算結果轉成 Label 字串，View 只負責 SetText。
 */
import type { EpBreakdown } from '../../core/systems/BreedingSystem';

export interface BreedingPreviewLines {
    /** 「預計爆發力 EP 128 · 優良」 */
    epLine: string;
    /** 「共鳴 +20　異脈 +8　契合 +10」；天命不為 0 時才附加「天命 ±N」 */
    breakdownLine: string;
    /** 「最多共鳴標籤：勇 ×4」或「無共鳴標籤」 */
    tagLine: string;
}

export function buildBreedingPreviewLines(ep: EpBreakdown): BreedingPreviewLines {
    const breakdownParts = [
        `共鳴 ${signed(ep.resonance)}`,
        `異脈 ${signed(ep.outcross)}`,
        `契合 ${signed(ep.affinity)}`,
    ];
    if (ep.fate !== 0) breakdownParts.push(`天命 ${signed(ep.fate)}`);

    return {
        epLine: `預計爆發力 EP ${ep.ep} · ${ep.rating}`,
        breakdownLine: breakdownParts.join('　'),
        tagLine: ep.topTag ? `最多共鳴標籤：${ep.topTag} ×${ep.topTagCount}` : '無共鳴標籤',
    };
}

function signed(value: number): string {
    return value > 0 ? `+${value}` : `${value}`;
}
