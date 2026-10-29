// @spec-source → 名將挑戰賽系統.md (doc_spec_0007)「月度場景賽（特別賽制）」與 K 段「月度場景賽積分公式」（PROG-2-1609）
/**
 * MonthlyScenarioCup — 月度場景賽純邏輯（不依賴 cc）
 *
 * 每月一場指定地形／天氣條件的場景賽；不計入主賽 rank points，成績另存 Monthly_Scenario_History。
 * 積分公式與競技場相同（ArenaScore），場景克制係數由後台每月設定，預設 1.0。
 * 規格只列 1~4 月，其餘月份「…」未定，查不到時回 null（不開賽）。
 */
import { arenaScoreOfTeam, type ArenaMember } from './ArenaScore';

export type MonthlyScenarioRule =
    | { kind: 'ban-tactic-tag'; tag: string }
    | { kind: 'require-aptitude'; aptitudes: readonly string[] }
    | { kind: 'tactic-power'; stat: string; multiplier: number }
    | { kind: 'aptitude-bonus'; troop: string; rank: string; multiplier: number };

export interface MonthlyScenario {
    month: number;
    name: string;
    rule: MonthlyScenarioRule;
}

/** 規格表（1~4 月）；資料欄位依規格文字轉成規則碼 */
export const MONTHLY_SCENARIOS: readonly MonthlyScenario[] = [
    { month: 1, name: '冰天雪地', rule: { kind: 'ban-tactic-tag', tag: 'cavalry' } },
    { month: 2, name: '赤壁水戰', rule: { kind: 'require-aptitude', aptitudes: ['water', 'archer'] } },
    { month: 3, name: '春耕奇謀', rule: { kind: 'tactic-power', stat: 'int', multiplier: 1.5 } },
    { month: 4, name: '山地奇兵', rule: { kind: 'aptitude-bonus', troop: 'infantry', rank: 'S', multiplier: 2 } },
];

/** 月份（1~12）對應的場景賽；規格未定的月份回 null */
export function monthlyScenarioOf(month: number): MonthlyScenario | null {
    return MONTHLY_SCENARIOS.find((s) => s.month === month) ?? null;
}

/** 場景克制係數預設值（後台每月設定） */
export const DEFAULT_SCENE_COUNTER = 1.0;

/** Monthly_Score = Σ[(屬性總和 × 地形倍率) + (戰法點數 × 場景克制係數)] × 存活係數 */
export function monthlyScenarioScore(members: readonly ArenaMember[], sceneCounter = DEFAULT_SCENE_COUNTER): number {
    return arenaScoreOfTeam(members.map((m) => ({ ...m, counter: sceneCounter })));
}

export interface MonthlyScenarioHistoryEntry {
    /** YYYY-MM */
    monthKey: string;
    scenarioName: string;
    score: number;
}

/** 寫入 Monthly_Scenario_History：同月只留最高分；不影響主賽積分 */
export function recordMonthlyScenario(history: readonly MonthlyScenarioHistoryEntry[], entry: MonthlyScenarioHistoryEntry): MonthlyScenarioHistoryEntry[] {
    const existing = history.find((h) => h.monthKey === entry.monthKey);
    if (existing && existing.score >= entry.score) return [...history];
    return [...history.filter((h) => h.monthKey !== entry.monthKey), entry];
}
