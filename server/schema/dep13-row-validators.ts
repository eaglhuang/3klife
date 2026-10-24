// @spec-source → 戰場部署系統.md §I「Server 端」、§33-34 出征編制規則；DEP-13（PROG-2-0977）
/**
 * dep13-row-validators — 戰場部署紀錄的 Server 列驗證（純 TS，不連資料庫）
 *
 * 本檔只負責列驗證，不寫入、不讀取資料庫。
 * 規格：主將／參謀官／後勤官三者不得重覆；支援角色不在場時，對應加成必為 0。
 *
 * 暫定（規格缺，可逆）：
 * - 軍勢守恆：戰損兵力 + 返還兵力 ≤ 出征軍勢上限。
 * - 精銳部署次數 ≤ 精銳部署上限。
 *
 * Unity 對照：像戰後結算面板在寫入 Result 前先檢查數字是否合理，不合理就不讓它進存檔。
 */

export interface BattleDeployRecordRow {
    battle_id: string;
    player_id: string;
    commander_uid: string;
    strategist_uid: string | null;
    deputy_uid: string | null;
    food_spent: number;
    sortie_troops_max: number;
    troops_lost: number;
    troops_returned: number;
    food_cap_bonus: number;
    tactic_cap_bonus: number;
    tactic_start_bonus: number;
    elite_cap: number;
    militia_count: number;
    elite_count: number;
    scene_preset_id: string;
    delegate_used: boolean;
}

export type DeployRecordIssue = { path: string; message: string };

const ID_MAX = 32;
const TINYINT_MAX = 255;
const INT_MAX = 2147483647;

const NON_NEGATIVE_INT_FIELDS = [
    'food_spent',
    'sortie_troops_max',
    'troops_lost',
    'troops_returned',
    'food_cap_bonus',
    'tactic_cap_bonus',
    'tactic_start_bonus',
    'militia_count',
    'elite_count',
] as const;

function isIdString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0 && value.length <= ID_MAX;
}

function isNonNegativeInt(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= INT_MAX;
}

/** 列驗證：ID 長度、非負整數、三個出征角色不重覆、支援角色不在場時加成為 0、軍勢守恆。 */
export function validateBattleDeployRecordRow(row: BattleDeployRecordRow): DeployRecordIssue[] {
    const issues: DeployRecordIssue[] = [];

    for (const key of ['battle_id', 'player_id', 'commander_uid', 'scene_preset_id'] as const) {
        if (!isIdString(row[key])) issues.push({ path: key, message: `必須為 1~${ID_MAX} 字元` });
    }

    const roles: Array<[string, string | null]> = [
        ['commander_uid', row.commander_uid],
        ['strategist_uid', row.strategist_uid],
        ['deputy_uid', row.deputy_uid],
    ];
    const seen = new Set<string>();
    for (const [path, uid] of roles) {
        if (uid === null) continue;
        if (!isIdString(uid)) {
            issues.push({ path, message: `必須為 1~${ID_MAX} 字元或 NULL` });
        } else if (seen.has(uid)) {
            issues.push({ path, message: '主將／參謀官／後勤官不得重覆' });
        } else {
            seen.add(uid);
        }
    }

    for (const key of NON_NEGATIVE_INT_FIELDS) {
        if (!isNonNegativeInt(row[key])) issues.push({ path: key, message: '必須為非負整數' });
    }
    if (!Number.isInteger(row.elite_cap) || row.elite_cap < 0 || row.elite_cap > TINYINT_MAX) {
        issues.push({ path: 'elite_cap', message: `必須為 0~${TINYINT_MAX} 的整數` });
    }

    if (row.strategist_uid === null) {
        if (row.tactic_cap_bonus !== 0) issues.push({ path: 'tactic_cap_bonus', message: '無參謀官時必須為 0' });
        if (row.tactic_start_bonus !== 0) issues.push({ path: 'tactic_start_bonus', message: '無參謀官時必須為 0' });
    }
    if (row.deputy_uid === null && row.food_cap_bonus !== 0) {
        issues.push({ path: 'food_cap_bonus', message: '無後勤官時必須為 0' });
    }

    if (isNonNegativeInt(row.troops_lost) && isNonNegativeInt(row.troops_returned) && isNonNegativeInt(row.sortie_troops_max)) {
        if (row.troops_lost + row.troops_returned > row.sortie_troops_max) {
            issues.push({ path: 'troops_lost', message: '戰損加返還不得超過出征軍勢上限' });
        }
    }
    if (isNonNegativeInt(row.elite_count) && Number.isInteger(row.elite_cap) && row.elite_count > row.elite_cap) {
        issues.push({ path: 'elite_count', message: '精銳部署次數不得超過精銳部署上限' });
    }

    if (typeof row.delegate_used !== 'boolean') issues.push({ path: 'delegate_used', message: '必須為布林值' });

    return issues;
}
