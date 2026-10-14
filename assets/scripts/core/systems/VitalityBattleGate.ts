// @spec-source → 武將壽命系統.md (doc_spec_0018) §戰場中的精力軟懲罰、精力系統優化建議.md
/**
 * VitalityBattleGate — 戰場精力軟懲罰判定（LIFE-10，純邏輯，不依賴 cc）
 *
 * 規格重點：
 * - >50%：可正常發動主動戰法與高耗能行為
 * - 10%~50%：禁止高耗能終極戰法，仍可用基本技能 / 普攻 / 移動
 * - <10%：仍可移動與普攻，但不得發動任何主動戰法，且撤退風險提高
 * - 原則是「效率下降」而不是「禁止遊玩」
 *
 * 邊界：恰好 50% 屬於中段（>50 才是高段）；恰好 10% 屬於中段（<10 才是耗盡段）。
 *
 * Unity 對照：像一個只回傳 bool 的 Rule 類別，
 * 由 Controller 在按下按鈕前呼叫，UI 只負責把結果畫成灰階。
 */

export const VITALITY_HIGH_THRESHOLD_PCT = 50;
export const VITALITY_EXHAUSTED_THRESHOLD_PCT = 10;

/** 暫定值：規格只寫「撤退風險提高」，數值待 PM 裁定 */
export const EXHAUSTED_RETREAT_RISK_BONUS = 0.1;

export type VitalityBand = 'high' | 'mid' | 'exhausted';

/** 行動種類：基本行為（普攻/移動/基本技能）、主動戰法、終極戰法 */
export type BattleActionKind = 'basic' | 'active-tactic' | 'ultimate-tactic';

/** 依目前精力與上限計算區間；上限無效時視為耗盡（不猜測） */
export function vitalityBandOf(current: number, max: number): VitalityBand {
    if (!Number.isFinite(current) || !Number.isFinite(max) || max <= 0) {
        return 'exhausted';
    }
    const pct = (Math.max(0, current) / max) * 100;
    if (pct > VITALITY_HIGH_THRESHOLD_PCT) {
        return 'high';
    }
    if (pct >= VITALITY_EXHAUSTED_THRESHOLD_PCT) {
        return 'mid';
    }
    return 'exhausted';
}

/** 軟懲罰閘門：只擋戰法，基本行為永遠允許 */
export function canPerformAction(band: VitalityBand, action: BattleActionKind): boolean {
    if (action === 'basic') {
        return true;
    }
    if (band === 'high') {
        return true;
    }
    if (band === 'mid') {
        return action === 'active-tactic';
    }
    return false;
}

/** 撤退風險加成：只有耗盡段會提高，其餘為 0 */
export function retreatRiskBonus(band: VitalityBand): number {
    return band === 'exhausted' ? EXHAUSTED_RETREAT_RISK_BONUS : 0;
}
