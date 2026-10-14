// @spec-source → 因子解鎖系統.md；PROG-2-0103 PM 薄包裝裁定；PROG-2-0513 PM 裁定：FUL-02 差異函式與詳情 Presenter
import { factorMaskView } from './FactorMask';
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
 * 依武將 id 分開保存；換人時從頭開始，不會把別人的舊狀態當成剛解鎖。
 * 動畫由 View 依 justRevealed 播放，這裡不處理畫面。
 */
export class FactorMaskPresenter {
    private _generalId: string | null = null;
    private _views: FactorMaskStateView[] | undefined;

    update(
        generalId: string,
        genes: readonly GeneralGeneConfig[],
        playerDiscoveryLevel: number,
    ): { views: FactorMaskStateView[]; justRevealed: number[] } {
        if (generalId !== this._generalId) {
            this._generalId = generalId;
            this._views = undefined;
        }
        const previous = this._views;
        const views = buildFactorMaskViews(genes, playerDiscoveryLevel, previous);
        const justRevealed = newlyUnlockedSlots(previous, views);
        this._views = views;
        return { views, justRevealed };
    }

    reset(): void {
        this._generalId = null;
        this._views = undefined;
    }
}
