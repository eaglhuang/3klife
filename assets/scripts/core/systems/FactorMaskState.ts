// @spec-source → 因子解鎖系統.md；PROG-2-0103 PM 薄包裝裁定
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
