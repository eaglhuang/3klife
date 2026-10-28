// @spec-source → AI武將強度系統.md §I「Server 端」battle_ai_log；WBS AIS-14
/**
 * ai14-row-validators — AI 戰鬥記錄的 Server 列驗證（純 TS，不連資料庫）
 *
 * 本檔只負責列驗證，不寫入、不讀取資料庫。
 * 規格：難度與結果為列舉；自適應縮放倍率來自 AIS-11 的夾限範圍 0.7 ~ 2.5。
 *
 * 暫定（可逆）：戰力評估值與回合數只檢查非負整數與 INT 上限，規格沒寫上限。
 *
 * Unity 對照：像戰後存檔前檢查 Result 欄位，難度與勝負只能是下拉選單上的幾個值。
 */

export const AI_BATTLE_DIFFICULTIES = ['EASY', 'NORMAL', 'HARD', 'NIGHTMARE', 'HELL'] as const;
export const AI_BATTLE_RESULTS = ['WIN', 'LOSE', 'DRAW'] as const;

export interface BattleAiLogRow {
    battle_ai_log_id: string;
    player_id: string;
    chapter_id: number;
    difficulty: string;
    ai_template_id: string;
    ai_power_score: number;
    player_power_score: number;
    result: string;
    adaptive_scale: number;
    turns: number;
    created_at: string;
}

export type BattleAiLogIssue = { path: string; message: string };

const ID_MAX = 32;
const INT_MAX = 2147483647;
export const ADAPTIVE_SCALE_MIN = 0.7;
export const ADAPTIVE_SCALE_MAX = 2.5;

function isIdString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0 && value.length <= ID_MAX;
}

function isNonNegativeInt(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= INT_MAX;
}

export function validateBattleAiLogRow(row: Partial<BattleAiLogRow>): BattleAiLogIssue[] {
    const issues: BattleAiLogIssue[] = [];

    if (!isIdString(row.battle_ai_log_id)) issues.push({ path: 'battle_ai_log_id', message: 'must be a non-empty id of at most 32 chars' });
    if (!isIdString(row.player_id)) issues.push({ path: 'player_id', message: 'must be a non-empty id of at most 32 chars' });
    if (!isIdString(row.ai_template_id)) issues.push({ path: 'ai_template_id', message: 'must be a non-empty id of at most 32 chars' });

    if (!isNonNegativeInt(row.chapter_id)) issues.push({ path: 'chapter_id', message: 'must be a non-negative integer' });
    if (!isNonNegativeInt(row.ai_power_score)) issues.push({ path: 'ai_power_score', message: 'must be a non-negative integer' });
    if (!isNonNegativeInt(row.player_power_score)) issues.push({ path: 'player_power_score', message: 'must be a non-negative integer' });
    if (!isNonNegativeInt(row.turns)) issues.push({ path: 'turns', message: 'must be a non-negative integer' });

    if (!(AI_BATTLE_DIFFICULTIES as readonly string[]).includes(row.difficulty ?? '')) {
        issues.push({ path: 'difficulty', message: `must be one of ${AI_BATTLE_DIFFICULTIES.join(', ')}` });
    }
    if (!(AI_BATTLE_RESULTS as readonly string[]).includes(row.result ?? '')) {
        issues.push({ path: 'result', message: `must be one of ${AI_BATTLE_RESULTS.join(', ')}` });
    }

    const scale = row.adaptive_scale;
    if (typeof scale !== 'number' || !Number.isFinite(scale) || scale < ADAPTIVE_SCALE_MIN || scale > ADAPTIVE_SCALE_MAX) {
        issues.push({ path: 'adaptive_scale', message: `must be between ${ADAPTIVE_SCALE_MIN} and ${ADAPTIVE_SCALE_MAX}` });
    }

    if (typeof row.created_at !== 'string' || Number.isNaN(Date.parse(row.created_at))) {
        issues.push({ path: 'created_at', message: 'must be a parseable timestamp string' });
    }

    return issues;
}
