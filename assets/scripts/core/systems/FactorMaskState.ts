// @spec-source → 因子解鎖系統.md；PROG-2-0103 PM 薄包裝裁定；PROG-2-0513 PM 裁定：FUL-02 差異函式與詳情 Presenter
import { factorMaskView } from './FactorMask';
import { ALL_FACTOR_COLORS, normalizeFactorColor } from './FactorInheritance';
import { factorTagColorOf } from './FactorTagTokens';
import type { GeneralGeneConfig } from '../models/GeneralUnit';

export interface FactorMaskStateView {
    label: string;
    locked: boolean;
    playAnimation: boolean;
}

/**
 * locked 是尚不可見，並非覺醒旗標。沿用 FactorMask 的文字與未知色系規則。
 * 呼叫端傳同一因子的上一個 view；首次載入已可見因子不亮起。
 * 只回傳動畫建議，不存狀態、不發事件、不修改輸入。
 */
export function buildFactorMaskView(factor: GeneralGeneConfig, playerDiscoveryLevel: number, previousView?: FactorMaskStateView): FactorMaskStateView {
    const view = factorMaskView(factor, playerDiscoveryLevel);
    return { label: view.label, locked: !view.revealed, playAnimation: previousView?.locked === true && view.revealed };
}

/** 看不見的因子列字色（灰鎖） */
export const FACTOR_LOCKED_TINT = '#8A8A8A';

/**
 * 因子列字色：看不見時灰色，看得見時用因子色；沒有因子或色系不明回 null，由畫面保留原字色。
 */
export function factorLabelTint(factor: GeneralGeneConfig | null | undefined, playerDiscoveryLevel: number): string | null {
    if (!factor) return null;
    if (!factorMaskView(factor, playerDiscoveryLevel).revealed) return FACTOR_LOCKED_TINT;
    const color = normalizeFactorColor(factor.type);
    return color && ALL_FACTOR_COLORS.includes(color) ? factorTagColorOf(color) : null;
}

/** 一組因子的 view，順序與輸入相同；previous 依槽位對應。 */
export function buildFactorMaskViews(
    genes: readonly GeneralGeneConfig[],
    playerDiscoveryLevel: number,
    previous?: readonly FactorMaskStateView[],
): FactorMaskStateView[] {
    return genes.map((gene, slot) => buildFactorMaskView(gene, playerDiscoveryLevel, previous?.[slot]));
}

/**
 * 差異：比較前一次與這一次的 view，回傳「剛解鎖」的槽位索引（前一次鎖住、這次看見）。
 * 沒有前一次資料（首次載入）時不回報任何槽位，與 playAnimation 規則一致。
 * 純函式，不修改輸入。
 */
export function newlyUnlockedSlots(
    previous: readonly FactorMaskStateView[] | undefined,
    next: readonly FactorMaskStateView[],
): number[] {
    if (!previous) return [];
    const slots: number[] = [];
    next.forEach((view, slot) => {
        if (previous[slot]?.locked === true && !view.locked) slots.push(slot);
    });
    return slots;
}

/**
 * 詳情畫面的 Presenter：保存上一次的 view，輸出「剛解鎖」槽位。
 * 依武將 id 分開保存，來回切換武將不會弄丟狀態，也不會把別人的舊狀態當成剛解鎖。
 * 第一次看到的武將沒有舊狀態，不回報（與 playAnimation 規則一致）。
 * 動畫由 View 依 justRevealed 播放，這裡不處理畫面。
 */
export class FactorMaskPresenter {
    private readonly _viewsByGeneral = new Map<string, FactorMaskStateView[]>();

    update(
        generalId: string,
        genes: readonly GeneralGeneConfig[],
        playerDiscoveryLevel: number,
    ): { views: FactorMaskStateView[]; justRevealed: number[] } {
        const previous = this._viewsByGeneral.get(generalId);
        const views = buildFactorMaskViews(genes, playerDiscoveryLevel, previous);
        const justRevealed = newlyUnlockedSlots(previous, views);
        this._viewsByGeneral.set(generalId, views);
        return { views, justRevealed };
    }

    reset(): void {
        this._viewsByGeneral.clear();
    }
}
