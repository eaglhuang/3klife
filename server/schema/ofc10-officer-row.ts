// @spec-source → 官職系統規格書 §F-2（階位與經驗門檻）、§F-3（天下大亂保留）、§I「Server 端」（OFC-10，PROG-2-0808）
/**
 * ofc10-officer-row — 官職狀態的 Server 列轉換與驗證（純 TS，不連資料庫）
 *
 * 本檔只負責：本機 OfficerState ↔ player_officer_state 列的互轉、列驗證。
 * 寫入與衝突規則屬於 Server 執行端，本卡不做。
 *
 * Unity 對照：像 ScriptableObject 與 JSON 之間的序列化器加上欄位檢查，
 * 讀檔時先檢查，檢查不過就不讓資料進到遊戲物件。
 */

/** 階位門檻（F-2）：tier1 初始 0、tier2 100、tier3 260、tier4 520、tier5 920 */
export const OFC10_TIER_EXP_THRESHOLDS: readonly number[] = [0, 100, 260, 520, 920];

export interface OfficerStateRow {
    player_id: string;
    officer_tier: string;
    officer_exp: number;
    unlock_history_json: string;
    persist_across_era_shift: boolean;
}

export interface LocalOfficerState {
    currentTier: number;
    officerExp: number;
    unlockHistory: number[];
}

export type OfficerRowIssue = { path: string; message: string };

const TIER_CODE = /^OFFICER_TIER_([1-5])$/;
const PLAYER_ID_MAX = 32;

export function officerTierCode(tier: number): string {
    return `OFFICER_TIER_${tier}`;
}

/** 本機狀態 → 列（unlock_history_json 存為 JSON 字串）。 */
export function officerStateToRow(playerId: string, state: LocalOfficerState): OfficerStateRow {
    return {
        player_id: playerId,
        officer_tier: officerTierCode(state.currentTier),
        officer_exp: state.officerExp,
        unlock_history_json: JSON.stringify(state.unlockHistory),
        persist_across_era_shift: true,
    };
}

/** 列 → 本機狀態；列有問題時回傳 issues，不產生狀態。 */
export function rowToOfficerState(row: OfficerStateRow): { ok: true; state: LocalOfficerState } | { ok: false; issues: OfficerRowIssue[] } {
    const issues = validateOfficerStateRow(row);
    if (issues.length > 0) return { ok: false, issues };
    const match = TIER_CODE.exec(row.officer_tier);
    return {
        ok: true,
        state: {
            currentTier: Number(match![1]),
            officerExp: row.officer_exp,
            unlockHistory: JSON.parse(row.unlock_history_json) as number[],
        },
    };
}

/** 列驗證：代碼、經驗門檻、解鎖歷史、天下大亂保留旗標。 */
export function validateOfficerStateRow(row: OfficerStateRow): OfficerRowIssue[] {
    const issues: OfficerRowIssue[] = [];
    if (typeof row.player_id !== 'string' || row.player_id.length === 0 || row.player_id.length > PLAYER_ID_MAX) {
        issues.push({ path: 'player_id', message: `必須為 1~${PLAYER_ID_MAX} 字元` });
    }
    const match = typeof row.officer_tier === 'string' ? TIER_CODE.exec(row.officer_tier) : null;
    if (!match) {
        issues.push({ path: 'officer_tier', message: '必須為 OFFICER_TIER_1~5' });
        return issues;
    }
    const tier = Number(match[1]);
    if (!Number.isInteger(row.officer_exp) || row.officer_exp < 0) {
        issues.push({ path: 'officer_exp', message: '必須為非負整數' });
    } else if (row.officer_exp < OFC10_TIER_EXP_THRESHOLDS[tier - 1]) {
        issues.push({ path: 'officer_exp', message: `階位 ${tier} 需要至少 ${OFC10_TIER_EXP_THRESHOLDS[tier - 1]} 經驗` });
    }
    let history: unknown;
    try {
        history = JSON.parse(row.unlock_history_json);
    } catch {
        issues.push({ path: 'unlock_history_json', message: '不是合法 JSON' });
        history = null;
    }
    if (history !== null) {
        if (!Array.isArray(history) || !history.every((t) => Number.isInteger(t) && t >= 1 && t <= 5)) {
            issues.push({ path: 'unlock_history_json', message: '必須為 1~5 的整數陣列' });
        } else {
            const ascending = history.every((t, i) => i === 0 || t > (history[i - 1] as number));
            if (!ascending) issues.push({ path: 'unlock_history_json', message: '必須由低到高且不重複' });
            if (!history.includes(tier)) issues.push({ path: 'unlock_history_json', message: '必須包含目前階位' });
        }
    }
    if (row.persist_across_era_shift !== true) {
        issues.push({ path: 'persist_across_era_shift', message: '天下大亂後必須保留（F-3）' });
    }
    return issues;
}
