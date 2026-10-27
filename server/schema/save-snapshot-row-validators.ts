// @spec-source → Data Schema文件（本機端與Server端）§一 users／save_snapshots、§三 離線防弊；DS-13（PROG-2-1030）
/**
 * save-snapshot-row-validators — users／save_snapshots 的列驗證（純 TS，不連資料庫）
 *
 * 本檔只負責列驗證，不寫入、不讀取資料庫。
 * Save_Data_JSON 必須是 JSON 物件，且根節點含 `Data` 物件（規格：完整 Data 節點的 JSON 字串）。
 *
 * Unity 對照：像存檔讀取前先檢查 JSON 結構與版號格式，格式不對就不載入，免得壞檔寫進遊戲。
 */

export interface UserRow {
    Player_ID: string;
    Account: string;
    Created_At: string;
}

export interface SaveSnapshotRow {
    Player_ID: string;
    Save_Version: string;
    Save_Data_JSON: string;
    Last_Sync_Hash: string;
    Session_Secret: string;
    Updated_At: string;
}

export type SnapshotRowIssue = { path: string; message: string };

const PLAYER_ID_MAX = 32;
const ACCOUNT_MAX = 64;
const VERSION_MAX = 16;
const SECRET_MAX = 64;
const SAVE_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/i;

export function validateUserRow(row: UserRow): SnapshotRowIssue[] {
    const issues: SnapshotRowIssue[] = [];
    checkRequiredText(issues, 'Player_ID', row.Player_ID, PLAYER_ID_MAX);
    checkRequiredText(issues, 'Account', row.Account, ACCOUNT_MAX);
    checkTimestamp(issues, 'Created_At', row.Created_At);
    return issues;
}

export function validateSaveSnapshotRow(row: SaveSnapshotRow): SnapshotRowIssue[] {
    const issues: SnapshotRowIssue[] = [];
    checkRequiredText(issues, 'Player_ID', row.Player_ID, PLAYER_ID_MAX);
    if (row.Save_Version.length === 0 || row.Save_Version.length > VERSION_MAX || !SAVE_VERSION_PATTERN.test(row.Save_Version)) {
        issues.push({ path: 'Save_Version', message: '存檔版號須為 x.y.z 且不超過 16 字' });
    }
    if (!SHA256_HEX_PATTERN.test(row.Last_Sync_Hash)) {
        issues.push({ path: 'Last_Sync_Hash', message: '須為 64 字元的十六進位雜湊值' });
    }
    checkRequiredText(issues, 'Session_Secret', row.Session_Secret, SECRET_MAX);
    checkTimestamp(issues, 'Updated_At', row.Updated_At);
    checkSaveDataJson(issues, row.Save_Data_JSON);
    return issues;
}

function checkRequiredText(issues: SnapshotRowIssue[], path: string, value: string, max: number): void {
    if (value.trim().length === 0) {
        issues.push({ path, message: '不可為空' });
    } else if (value.length > max) {
        issues.push({ path, message: `長度不可超過 ${max}` });
    }
}

function checkTimestamp(issues: SnapshotRowIssue[], path: string, value: string): void {
    if (Number.isNaN(Date.parse(value))) {
        issues.push({ path, message: '須為可解析的時間字串' });
    }
}

function checkSaveDataJson(issues: SnapshotRowIssue[], json: string): void {
    let parsed: unknown;
    try {
        parsed = JSON.parse(json);
    } catch {
        issues.push({ path: 'Save_Data_JSON', message: '不是合法 JSON' });
        return;
    }
    const isObject = typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
    if (!isObject || typeof (parsed as Record<string, unknown>).Data !== 'object' || (parsed as Record<string, unknown>).Data === null) {
        issues.push({ path: 'Save_Data_JSON', message: '根節點須包含 Data 物件' });
    }
}
