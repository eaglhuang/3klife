// @spec-source → 主戰場UI規格書.md §6.3 環境加成百分點摘要（doc_ui_0001，PROG-2-1893）
/**
 * EnvironmentBonus — 戰場 HUD 的環境加成摘要（純邏輯，不依賴 cc）
 *
 * 規格 §6.3：地形／天氣／適性應在 HUD 以「百分點摘要」呈現，例如「地形 +10%、夜戰 -5%」，
 * 避免玩家誤以為每項都是獨立乘區。
 *
 * 百分點取主將在該天氣、該地形的適性攻擊修正（APTITUDE_MODIFIERS.atk，與戰鬥判定同一張表）。
 * 適性 B（0%）不列；同名項目只列一次；全部為 0 時回傳空字串。
 *
 * Unity 對照：像 HUD Presenter 把一串修正值格式化成一行 Label 文字。
 */
import { APTITUDE_MODIFIERS, type AptitudeGrade } from './BattleAptitude';

export interface EnvironmentFactor {
    /** 顯示名稱，如「雨天」「山地」 */
    label: string;
    /** 主將對該環境的適性等級 */
    grade: AptitudeGrade;
}

/** 適性等級 → 攻擊百分點（S +20、A +10、B 0、C -10、D -25） */
export function aptitudeAtkPct(grade: AptitudeGrade): number {
    return Math.round((APTITUDE_MODIFIERS[grade]?.atk ?? 0) * 100);
}

/** 「雨天 -10%、山地 +20%」；沒有任何非 0 項目時回傳空字串 */
export function environmentBonusText(factors: readonly EnvironmentFactor[]): string {
    const seen = new Set<string>();
    const parts: string[] = [];
    for (const f of factors) {
        if (!f.label || seen.has(f.label)) continue;
        seen.add(f.label);
        const pct = aptitudeAtkPct(f.grade);
        if (pct !== 0) parts.push(`${f.label} ${pct > 0 ? '+' : ''}${pct}%`);
    }
    return parts.join('、');
}
