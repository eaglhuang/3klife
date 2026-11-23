// @spec-source → 戰法系統-shards/g5.md Step 6 AI 規則層；FormulaSystem.calculateDamage（PROG-2-0915）
/**
 * TacticDamageEstimate — 戰法預估傷害（純邏輯，不依賴 cc）
 *
 * 給敵方選技做斬殺判斷用：沿用 FormulaSystem.calculateDamage 的同一套公式算單次命中基礎傷害，再乘戰法倍率。
 * 不含蓄力、首回合、天氣與階段倍率；這些由呼叫端視需要另外乘上。
 *
 * Unity 對照：像 Damage Calculator 的 Preview 模式，只算數字、不扣血。
 */
import { BattleSkillTargetMode } from '../../shared/SkillRuntimeContract';
import { FormulaSystem, type DamageContext } from '../../core/systems/FormulaSystem';

export function estimateTacticDamage(
    context: DamageContext,
    multiplier = 1,
    formula = new FormulaSystem(),
): number {
    const base = formula.calculateDamage(context);
    return Math.max(1, Math.floor(base * multiplier));
}

/**
 * 戰法預估命中單位數（群傷評分用，PROG-2-9852）：
 * 全體取 min(人數, maxTargets)；範圍取「以任一我方單位為圓心、半徑內」最多人數；其餘（單體、直線、扇形等）保守算 1。
 */
export function estimateTacticHitCount(
    targetMode: BattleSkillTargetMode,
    cells: readonly { lane: number; depth: number }[],
    options: { maxTargets?: number; areaRadius?: number } = {},
): number {
    if (cells.length === 0) return 1;
    const cap = options.maxTargets && options.maxTargets > 0 ? options.maxTargets : Infinity;
    if (targetMode === BattleSkillTargetMode.EnemyAll) return Math.max(1, Math.min(cells.length, cap));
    if (targetMode === BattleSkillTargetMode.Area) {
        const radius = Math.max(0, options.areaRadius ?? 0);
        let best = 1;
        for (const center of cells) {
            const hit = cells.filter(c => Math.max(Math.abs(c.lane - center.lane), Math.abs(c.depth - center.depth)) <= radius).length;
            if (hit > best) best = hit;
        }
        return Math.max(1, Math.min(best, cap));
    }
    return 1;
}
