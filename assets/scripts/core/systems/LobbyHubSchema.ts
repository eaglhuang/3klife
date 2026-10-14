// @spec-source → WBS v3 HALL-01（大廳資料模型與 Lobby_Hub schema）；系統規格書：大廳系統 §I Data Schema
/**
 * LobbyHubSchema — 大廳資料（Lobby_Hub）的型別與結構驗證，純邏輯，不依賴 cc。
 *
 * - validateLobbyHub 不改輸入，回傳所有錯誤的路徑與原因，不在第一個錯誤就停。
 * - 規格的難度為五級：簡易、一般、菁英、高級、地獄；英文代碼 EASY / ADVANCED / HELL 為暫定，規格只寫了 NORMAL、ELITE。
 * Unity 對照：像 ScriptableObject 的 OnValidate，把所有欄位問題一次列出，不讓壞資料進場景。
 */

export const HALL_DIFFICULTIES = ['EASY', 'NORMAL', 'ELITE', 'ADVANCED', 'HELL'] as const;
export const HALL_TASK_ACTIONS = ['RECON', 'EXECUTE', 'WAIT', 'ASSIGN'] as const;
export const HALL_DAY_NIGHT_MODES = ['DAY', 'NIGHT'] as const;
export const HALL_REWARD_TYPES = ['GRAIN', 'SILVER', 'GENERAL_EXP', 'OFFICER_EXP'] as const;
export const HALL_BOARD_KEYS = ['Military', 'Domestic'] as const;

export type HallDifficulty = (typeof HALL_DIFFICULTIES)[number];
export type HallTaskAction = (typeof HALL_TASK_ACTIONS)[number];

export interface HallReward {
    Type: string;
    Amount: number;
}

export interface HallTask {
    Task_ID: string;
    Task_Title: string;
    Task_Brief: string;
    Task_Detail: string;
    Difficulty: HallDifficulty;
    Required_Rank: number;
    Required_Intel?: number;
    Intel_Reveal_Percent: number;
    Selected_General_UID: string | null;
    Is_Accepted: boolean;
    Suggested_General_UID: string | null;
    Volunteer_General_UIDs: string[];
    AI_Assign_Enabled: boolean;
    Available_Actions: HallTaskAction[];
    Rewards: { Base: HallReward[]; Perfect_Bonus: HallReward[] };
    Costs: { GRAIN: number; TROOPS: number; SILVER: number; TIME_MINUTES: number };
}

export interface HallBoard {
    Tasks: HallTask[];
    Last_Refresh_At: string;
}

export interface LobbyHub {
    Current_Theme: {
        Theme_ID: string;
        Day_Night_Mode: (typeof HALL_DAY_NIGHT_MODES)[number];
        Festival_Theme_ID: string;
        Background_ID: string;
        Overlay_Tint: string;
    };
    Mission_Boards: Record<(typeof HALL_BOARD_KEYS)[number], HallBoard>;
}

export interface LobbyHubIssue {
    path: string;
    message: string;
}

export interface LobbyHubValidation {
    ok: boolean;
    issues: LobbyHubIssue[];
}

type Rec = Record<string, unknown>;

function isRecord(value: unknown): value is Rec {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isInt(value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0;
}

function checkEnum(issues: LobbyHubIssue[], path: string, value: unknown, allowed: readonly string[]): void {
    if (typeof value !== 'string' || !allowed.includes(value)) {
        issues.push({ path, message: `必須為 ${allowed.join(' / ')}` });
    }
}

function checkRewards(issues: LobbyHubIssue[], path: string, value: unknown): void {
    if (!isRecord(value)) {
        issues.push({ path, message: '必須為物件' });
        return;
    }
    for (const key of ['Base', 'Perfect_Bonus']) {
        const list = value[key];
        if (!Array.isArray(list)) {
            issues.push({ path: `${path}.${key}`, message: '必須為陣列' });
            continue;
        }
        list.forEach((entry, index) => {
            const entryPath = `${path}.${key}[${index}]`;
            if (!isRecord(entry)) return issues.push({ path: entryPath, message: '必須為物件' });
            checkEnum(issues, `${entryPath}.Type`, entry.Type, HALL_REWARD_TYPES);
            if (!isInt(entry.Amount, 0)) issues.push({ path: `${entryPath}.Amount`, message: '必須為非負整數' });
        });
    }
}

function checkTask(issues: LobbyHubIssue[], path: string, value: unknown): void {
    if (!isRecord(value)) {
        issues.push({ path, message: '必須為物件' });
        return;
    }
    if (!isNonEmptyString(value.Task_ID)) issues.push({ path: `${path}.Task_ID`, message: '必須為非空字串' });
    for (const key of ['Task_Title', 'Task_Brief', 'Task_Detail']) {
        if (typeof value[key] !== 'string') issues.push({ path: `${path}.${key}`, message: '必須為字串' });
    }
    checkEnum(issues, `${path}.Difficulty`, value.Difficulty, HALL_DIFFICULTIES);
    if (!isInt(value.Required_Rank, 0)) issues.push({ path: `${path}.Required_Rank`, message: '必須為非負整數' });
    if (value.Required_Intel !== undefined && !isInt(value.Required_Intel, 0, 100)) {
        issues.push({ path: `${path}.Required_Intel`, message: '必須為 0~100 的整數' });
    }
    if (!isInt(value.Intel_Reveal_Percent, 0, 100)) {
        issues.push({ path: `${path}.Intel_Reveal_Percent`, message: '必須為 0~100 的整數' });
    }
    if (value.Selected_General_UID !== null && !isNonEmptyString(value.Selected_General_UID)) {
        issues.push({ path: `${path}.Selected_General_UID`, message: '必須為 null 或非空字串' });
    }
    if (value.Suggested_General_UID !== null && !isNonEmptyString(value.Suggested_General_UID)) {
        issues.push({ path: `${path}.Suggested_General_UID`, message: '必須為 null 或非空字串' });
    }
    if (typeof value.Is_Accepted !== 'boolean') issues.push({ path: `${path}.Is_Accepted`, message: '必須為布林值' });
    if (typeof value.AI_Assign_Enabled !== 'boolean') issues.push({ path: `${path}.AI_Assign_Enabled`, message: '必須為布林值' });
    if (!Array.isArray(value.Volunteer_General_UIDs) || !value.Volunteer_General_UIDs.every(isNonEmptyString)) {
        issues.push({ path: `${path}.Volunteer_General_UIDs`, message: '必須為非空字串陣列' });
    }
    if (!Array.isArray(value.Available_Actions)) {
        issues.push({ path: `${path}.Available_Actions`, message: '必須為陣列' });
    } else {
        value.Available_Actions.forEach((action, index) => checkEnum(issues, `${path}.Available_Actions[${index}]`, action, HALL_TASK_ACTIONS));
    }
    checkRewards(issues, `${path}.Rewards`, value.Rewards);
    if (!isRecord(value.Costs)) {
        issues.push({ path: `${path}.Costs`, message: '必須為物件' });
    } else {
        for (const key of ['GRAIN', 'TROOPS', 'SILVER', 'TIME_MINUTES']) {
            if (!isInt(value.Costs[key], 0)) issues.push({ path: `${path}.Costs.${key}`, message: '必須為非負整數' });
        }
    }
}

function checkBoard(issues: LobbyHubIssue[], path: string, value: unknown): void {
    if (!isRecord(value)) {
        issues.push({ path, message: '必須為物件' });
        return;
    }
    if (!Array.isArray(value.Tasks)) {
        issues.push({ path: `${path}.Tasks`, message: '必須為陣列' });
    } else {
        value.Tasks.forEach((task, index) => checkTask(issues, `${path}.Tasks[${index}]`, task));
    }
    if (typeof value.Last_Refresh_At !== 'string') issues.push({ path: `${path}.Last_Refresh_At`, message: '必須為字串' });
}

/** 驗證大廳資料；回傳所有問題，不改輸入。 */
export function validateLobbyHub(raw: unknown): LobbyHubValidation {
    const issues: LobbyHubIssue[] = [];
    if (!isRecord(raw) || !isRecord(raw.Lobby_Hub)) {
        return { ok: false, issues: [{ path: 'Lobby_Hub', message: '缺少 Lobby_Hub 物件' }] };
    }
    const hub = raw.Lobby_Hub;

    if (!isRecord(hub.Current_Theme)) {
        issues.push({ path: 'Lobby_Hub.Current_Theme', message: '必須為物件' });
    } else {
        const theme = hub.Current_Theme;
        if (!isNonEmptyString(theme.Theme_ID)) issues.push({ path: 'Lobby_Hub.Current_Theme.Theme_ID', message: '必須為非空字串' });
        checkEnum(issues, 'Lobby_Hub.Current_Theme.Day_Night_Mode', theme.Day_Night_Mode, HALL_DAY_NIGHT_MODES);
        if (typeof theme.Festival_Theme_ID !== 'string') issues.push({ path: 'Lobby_Hub.Current_Theme.Festival_Theme_ID', message: '必須為字串' });
        if (typeof theme.Background_ID !== 'string') issues.push({ path: 'Lobby_Hub.Current_Theme.Background_ID', message: '必須為字串' });
        if (typeof theme.Overlay_Tint !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(theme.Overlay_Tint)) {
            issues.push({ path: 'Lobby_Hub.Current_Theme.Overlay_Tint', message: '必須為 #RRGGBB' });
        }
    }

    if (!isRecord(hub.Mission_Boards)) {
        issues.push({ path: 'Lobby_Hub.Mission_Boards', message: '必須為物件' });
    } else {
        for (const key of HALL_BOARD_KEYS) {
            if (!(key in hub.Mission_Boards)) issues.push({ path: `Lobby_Hub.Mission_Boards.${key}`, message: '缺少此任務牆' });
            else checkBoard(issues, `Lobby_Hub.Mission_Boards.${key}`, hub.Mission_Boards[key]);
        }
    }
    return { ok: issues.length === 0, issues };
}
