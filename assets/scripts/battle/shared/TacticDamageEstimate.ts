// @spec-source → 戰法系統-shards/g5.md Step 6 AI 規則層；FormulaSystem.calculateDamage（PROG-2-0915）
/**
 * TacticDamageEstimate — 戰法預估傷害（純邏輯，不依賴 cc）
 *
 * 給敵方選技做斬殺判斷用：沿用 FormulaSystem.calculateDamage 的同一套公式算單次命中基礎傷害，再乘戰法倍率。
 * 不含蓄力、首回合、天氣與階段倍率；這些由呼叫端視需要另外乘上。
 *
 * Unity 對照：像 Damage Calculator 的 Preview 模式，只算數字、不扣血。
 */
import { FormulaSystem, type DamageContext } from '../../core/systems/FormulaSystem';

export function estimateTacticDamage(
    context: DamageContext,
    multiplier = 1,
    formula = new FormulaSystem(),
): number {
    const base = formula.calculateDamage(context);
    return Math.max(1, Math.floor(base * multiplier));
}
