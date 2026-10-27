// @spec-source → 血統樹14人UI規格書 §2.3 底部主角與詳細屬性區（MainTargetPanel）；因子解鎖系統（沿用 FactorMask 遮罩）（PROG-2-0949，BUI-05）
/**
 * MainTargetPanelView — 血統樹底部主角區的資料整理（純邏輯，不依賴 cc）
 *
 * 規格 §2.3 的節點：TargetPortrait（立繪）、TargetRarity（稀有度）、SkillDetails（覺醒 / 未解鎖因子）。
 * 因子狀態沿用 FactorMask 的遮罩結果（buildFactorMaskViews）：
 *   - 已可見（未 locked）的因子列為 awakenTraits。
 *   - 尚未可見（locked）的因子列為 lockedTraits，標籤已由遮罩處理，這裡不另外遮。
 *
 * Unity 對照：像一個 Presenter 把子代的 SO 資料整理成面板要綁的欄位，Prefab 只負責顯示。
 */
import type { GeneralGeneConfig } from '../models/GeneralUnit';
import { buildFactorMaskViews, type FactorMaskStateView } from './FactorMaskState';

export interface MainTargetChild {
    portraitPath?: string | null;
    rarityTier: string;
}

export interface MainTargetPanelView {
    /** TargetPortrait：子代立繪路徑；沒有則 null */
    portraitPath: string | null;
    /** TargetRarity：稀有度 */
    rarityTier: string;
    /** SkillDetails：已覺醒（可見）因子的標籤 */
    awakenTraits: string[];
    /** SkillDetails：未解鎖（尚不可見）因子的標籤 */
    lockedTraits: string[];
    /** 因子狀態原始 view，給動畫判斷（playAnimation）使用 */
    factorViews: FactorMaskStateView[];
}

export function buildMainTargetPanelView(
    child: MainTargetChild,
    genes: readonly GeneralGeneConfig[],
    playerDiscoveryLevel: number,
    previous?: readonly FactorMaskStateView[],
): MainTargetPanelView {
    const factorViews = buildFactorMaskViews(genes, playerDiscoveryLevel, previous);
    return {
        portraitPath: child.portraitPath ?? null,
        rarityTier: child.rarityTier,
        awakenTraits: factorViews.filter((view) => !view.locked).map((view) => view.label),
        lockedTraits: factorViews.filter((view) => view.locked).map((view) => view.label),
        factorViews,
    };
}
