// @spec-source → 武將壽命系統.md §精力區間（<10%：撤退風險提高）；加成數值為暫定（PM 2026-10-14，待定案）
/**
 * RetreatRisk — 精力狀態對撤退風險的影響（純邏輯，不依賴 cc）
 *
 * 規格只寫「撤退風險提高」，沒有給數值與撤退後果；加成值沿用 VitalityBattleGate 的暫定 0.1。
 * 撤退行動本身的結果（成功、失敗或被俘）規格未定，本模組不決定。
 *
 * Unity 對照：像一個計算函式的 Utility 類，輸入基礎機率與狀態，輸出最後機率，
 * 不碰場景物件，也不擲骰。
 */
import { retreatRiskBonus, type VitalityBand } from './VitalityBattleGate';

/**
 * 撤退風險 = 基礎風險 + 精力段加成，夾在 0~1。
 * 基礎風險由呼叫端給（規格未定）；無效輸入視為 0。
 */
export function retreatRiskOf(baseRisk: number, band: VitalityBand): number {
    const base = Number.isFinite(baseRisk) ? Math.max(0, baseRisk) : 0;
    return Math.min(1, base + retreatRiskBonus(band));
}
