// @spec-source → 主戰場UI規格補充_v3.md (doc_ui_0003)「主將屬性戰法快覽 — 敵方版本差異」；PROG-2-1756
/**
 * QuickViewSkillLines — 主將快覽的戰法列文字（純邏輯，不依賴 cc）
 *
 * - 戰法以顯示名稱列出（查 BattleSkillPresentation），不顯示內部 id。
 * - 敵方戰法「已知則顯示，未知顯示 🔒 未知戰法」；本檔把「已知」定義為本場已發動過（PROG-2-1756 暫定）。
 *
 * Unity 對照：Presenter 的小工具函式，Panel 只負責 SetText。
 */
import { getBattleSkillPresentation } from './BattleSkillPresentation';

export const QUICK_VIEW_UNKNOWN_TACTIC = '🔒 未知戰法';

export function quickViewSkillLines(
    skillIds: readonly string[],
    isEnemy: boolean,
    revealed: ReadonlySet<string>,
    nameOf: (skillId: string) => string = (skillId) => getBattleSkillPresentation(skillId).name,
): string[] {
    return skillIds.map((id) => (isEnemy && !revealed.has(id) ? QUICK_VIEW_UNKNOWN_TACTIC : nameOf(id)));
}
