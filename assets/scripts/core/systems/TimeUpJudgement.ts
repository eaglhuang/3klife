// @spec-source → 關卡設計系統（四主題關卡）；PROG-2-9423 瓦口隘 15 回合時限
/**
 * TimeUpJudgement — 回合用盡時「依戰果判勝負」（純資料與純函式，不依賴 cc，可直接單元測試）。
 *
 * 使用者 11/20 裁決：瓦口隘加 15 回合時限，時限到依戰果判定。戰果定義先採戰場專家建議 A：
 *   雙方各自的戰果 = 對手城寨失血比例 × fortressWeight + 對手主將失血比例 × generalWeight
 *   分數高的一方勝；相同時判 tieWinner（預設敵方，也就是「沒打出差距就算攻方失敗」）。
 * 權重與平手歸屬放在 data/time-up-judgement.json，之後若改成其他定義只需調設定。
 *
 * Unity 對照：比賽時間到時的判定規則，資料放 ScriptableObject。
 */

export type TimeUpWinner = 'player-win' | 'enemy-win';

/** 關卡回合用盡時的判定方式：固定某方勝，或依戰果判 */
export type TimeUpRule = TimeUpWinner | 'by-damage';

export interface TimeUpJudgementConfig {
    fortressWeight: number;
    generalWeight: number;
    tieWinner: TimeUpWinner;
}

export const DEFAULT_TIME_UP_JUDGEMENT: Readonly<TimeUpJudgementConfig> = {
    fortressWeight: 1,
    generalWeight: 1,
    tieWinner: 'enemy-win',
};

/** 計算戰果需要的雙方血量快照 */
export interface TimeUpSnapshot {
    playerFortressHp: number;
    enemyFortressHp: number;
    fortressMaxHp: number;
    playerGeneralHp: number;
    playerGeneralMaxHp: number;
    enemyGeneralHp: number;
    enemyGeneralMaxHp: number;
}

export interface TimeUpVerdict {
    winner: TimeUpWinner;
    /** 我方打出的戰果（敵方失血），0 ~ 權重總和 */
    playerScore: number;
    /** 敵方打出的戰果（我方失血） */
    enemyScore: number;
}

function nonNegative(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

export function isTimeUpRule(value: unknown): value is TimeUpRule {
    return value === 'player-win' || value === 'enemy-win' || value === 'by-damage';
}

/** 解析設定；缺欄位或不合法用預設。兩個權重都是 0 時退回預設（否則永遠平手） */
export function parseTimeUpJudgementConfig(raw: unknown): TimeUpJudgementConfig {
    const src = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {};
    let fortressWeight = nonNegative(src.fortressWeight) ?? DEFAULT_TIME_UP_JUDGEMENT.fortressWeight;
    let generalWeight = nonNegative(src.generalWeight) ?? DEFAULT_TIME_UP_JUDGEMENT.generalWeight;
    if (fortressWeight + generalWeight <= 0) {
        fortressWeight = DEFAULT_TIME_UP_JUDGEMENT.fortressWeight;
        generalWeight = DEFAULT_TIME_UP_JUDGEMENT.generalWeight;
    }
    const tieWinner = src.tieWinner === 'player-win' || src.tieWinner === 'enemy-win'
        ? src.tieWinner
        : DEFAULT_TIME_UP_JUDGEMENT.tieWinner;
    return { fortressWeight, generalWeight, tieWinner };
}

/** 失血比例 0~1；上限不合法時視為沒有失血 */
export function lostRatio(current: number, max: number): number {
    if (!Number.isFinite(max) || max <= 0 || !Number.isFinite(current)) return 0;
    return Math.min(1, Math.max(0, 1 - current / max));
}

/** 浮點誤差內視為相同，避免 0.1+0.2 這類誤差決定勝負 */
const SCORE_EPSILON = 1e-9;

export function judgeTimeUp(snap: TimeUpSnapshot, config: TimeUpJudgementConfig = DEFAULT_TIME_UP_JUDGEMENT): TimeUpVerdict {
    const playerScore = config.fortressWeight * lostRatio(snap.enemyFortressHp, snap.fortressMaxHp)
        + config.generalWeight * lostRatio(snap.enemyGeneralHp, snap.enemyGeneralMaxHp);
    const enemyScore = config.fortressWeight * lostRatio(snap.playerFortressHp, snap.fortressMaxHp)
        + config.generalWeight * lostRatio(snap.playerGeneralHp, snap.playerGeneralMaxHp);
    let winner: TimeUpWinner = config.tieWinner;
    if (playerScore - enemyScore > SCORE_EPSILON) winner = 'player-win';
    else if (enemyScore - playerScore > SCORE_EPSILON) winner = 'enemy-win';
    return { winner, playerScore, enemyScore };
}

/** 結算說明：「時限到：我軍戰果 42%，敵軍戰果 30%。」百分比以權重總和為 100% */
export function timeUpVerdictLine(verdict: TimeUpVerdict, config: TimeUpJudgementConfig = DEFAULT_TIME_UP_JUDGEMENT): string {
    const total = config.fortressWeight + config.generalWeight;
    const pct = (score: number): number => Math.round((total > 0 ? score / total : 0) * 100);
    const p = pct(verdict.playerScore);
    const e = pct(verdict.enemyScore);
    const tie = Math.abs(verdict.playerScore - verdict.enemyScore) <= SCORE_EPSILON;
    const tail = tie
        ? `雙方不分軒輊，判${verdict.winner === 'player-win' ? '我方' : '敵方'}勝。`
        : (verdict.winner === 'player-win' ? '我軍戰果較優。' : '敵軍戰果較優。');
    return `時限到：我軍戰果 ${p}%，敵軍戰果 ${e}%，${tail}`;
}

/** HUD 回合顯示：關卡自訂時限時顯示分母「第 3/15 回合」，否則「第 3 回合」 */
export function turnLabelText(turn: number, limit: number | null): string {
    // 時限到的結算回合會比上限多 1，HUD 只顯示到上限，避免出現「第 16/15 回合」
    return limit && limit > 0 ? `第 ${Math.min(turn, limit)}/${limit} 回合` : `第 ${turn} 回合`;
}

/** 開戰戰報的時限說明；沒有關卡時限時回傳 null */
export function turnLimitIntroLine(limit: number | undefined, rule: TimeUpRule | undefined): string | null {
    if (!limit || limit <= 0) return null;
    if (rule === 'by-damage') return `本關限 ${limit} 回合；時限到時比較雙方戰果（城寨與主將失血），打得重的一方獲勝。`;
    if (rule === 'player-win') return `本關限 ${limit} 回合；守到最後算我方獲勝。`;
    return `本關限 ${limit} 回合；時限到仍未破敵即判撤兵。`;
}
