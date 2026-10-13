// @spec-source → 因子解鎖系統.md (doc_spec_0009) §E §F §H、因子爆發系統.md (FBR-07)
/**
 * FactorMask — 因子視覺遮罩與發現等級（純邏輯，不依賴 cc）
 *
 * 兩個旗標分開看：
 *   - revealed（看得到）：玩家等級 ≥ 因子的 Discovery_Level 門檻；看不到時顯示「??? (Lv N 解鎖)」
 *   - active（生效）：Is_Locked 為 false；看得到但仍鎖住的因子不會生效，要靠覺醒事件點亮
 *
 * 門檻沿用 FactorInheritance 的 FACTOR_DISCOVERY_LEVEL（藍粉 1、綠白 20、紫紅 45）。
 * 規格 config/gameplay.json 的 DiscoveryThresholds 鍵名（Phase1: 20 / Phase2: 45）與階段表語義不一致，
 * 本檔先不讀設定檔，等設計確認鍵名後再接。
 *
 * Unity 對照：像一個 Sprite 遮罩元件，只回傳「要顯示的文字與狀態」，不碰 Label 節點；畫面層自己套用。
 */
import { ALL_FACTOR_COLORS, FACTOR_DISCOVERY_LEVEL, FactorColor, normalizeFactorColor } from './FactorInheritance';
import type { GeneralGeneConfig } from '../models/GeneralUnit';

export interface FactorMaskView {
    /** 玩家等級是否已達門檻，可看見因子名稱 */
    revealed: boolean;
    /** Is_Locked 為 false 時因子生效 */
    active: boolean;
    /** 看見所需的發現等級 */
    requiredLevel: number;
    /** 畫面文字：已看見為因子名稱，否則為「??? (Lv N 解鎖)」 */
    label: string;
}

/** 因子的發現門檻：先看出生時寫入的 discoveryLevel，沒有則用色系預設 */
export function factorRequiredLevel(gene: GeneralGeneConfig): number {
    const color = normalizeFactorColor(gene.type);
    return gene.discoveryLevel ?? (color ? FACTOR_DISCOVERY_LEVEL[color] : 1);
}

/** 單一因子在指定玩家等級下的遮罩狀態；不改輸入 */
export function factorMaskView(gene: GeneralGeneConfig, playerLevel: number): FactorMaskView {
    const requiredLevel = factorRequiredLevel(gene);
    const revealed = playerLevel >= requiredLevel;
    const label = revealed ? gene.displayName ?? gene.id ?? '' : `??? (Lv${requiredLevel} 解鎖)`;
    return { revealed, active: gene.isLocked === false, requiredLevel, label };
}

/** 玩家等級已開放的因子色系，依 ALL_FACTOR_COLORS 順序（Lv1 只有藍粉） */
export function visibleFactorColors(playerLevel: number): FactorColor[] {
    return ALL_FACTOR_COLORS.filter((color) => playerLevel >= FACTOR_DISCOVERY_LEVEL[color]);
}
