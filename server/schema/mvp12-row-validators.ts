// @spec-source → 001_minimal_six_tables.sql（MVP-12，PROG-2-0854）；MercenaryBond／MercenaryUpkeep 狀態值
/**
 * mvp12-row-validators — MVP 最小六表的列驗證（純 TS，不連資料庫）
 *
 * 每張表一個 validate 函式，回傳錯誤訊息陣列；空陣列代表通過。
 * 規則與 001_minimal_six_tables.sql 的 CHECK 對齊，修改時兩邊一起改。
 *
 * Unity 對照：像 ScriptableObject 的 OnValidate，寫入前先擋壞資料，不等資料庫報錯。
 */

export const GENERAL_STATUSES = ['Active', 'Training', 'Retired', 'Dead'] as const;
export const MERCENARY_BOND_STATUSES = ['Trial', 'Bonded', 'Expired'] as const;
export const MERCENARY_UPKEEP_STATUSES = ['Active', 'Frozen', 'Departed'] as const;

export interface GeneralRow {
    id: string;
    template_id: string;
    bloodline_id: string;
    vitality: number;
    vitality_max: number;
    role: string;
    status: string;
}

export interface GeneDictionaryRow {
    id: string;
    display_name: string;
    color: string;
    category?: string | null;
    max_level: number;
}

export interface NurtureSessionRow {
    id: string;
    general_id: string;
    mentor_id?: string | null;
    current_round: number;
    tp_accumulated: number;
    status: string;
}

export interface MercenaryRow {
    id: string;
    player_id: string;
    bond_status: string;
    days_left: number;
    upkeep_status: string;
}

export interface PlayerResourcesRow {
    player_id: string;
    food: number;
    gold: number;
    troop_source: number;
    fame: number;
    essence: number;
    bond_points: number;
}

export interface GachaHistoryRow {
    id?: number;
    player_id: string;
    pull_seq: number;
    pool: string;
    result: string;
    created_at?: string;
}

function nonEmpty(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

function isInt(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value);
}

function isOneOf<T extends string>(list: readonly T[], value: unknown): boolean {
    return typeof value === 'string' && (list as readonly string[]).includes(value);
}

export function validateGeneralRow(row: Partial<GeneralRow>): string[] {
    const errors: string[] = [];
    if (!nonEmpty(row.id)) errors.push('id: 缺少');
    if (!nonEmpty(row.template_id)) errors.push('template_id: 缺少');
    if (!nonEmpty(row.bloodline_id)) errors.push('bloodline_id: 缺少');
    if (!isInt(row.vitality) || row.vitality < 0) errors.push('vitality: 必須是非負整數');
    if (!isInt(row.vitality_max) || row.vitality_max <= 0) errors.push('vitality_max: 必須是正整數');
    if (isInt(row.vitality) && isInt(row.vitality_max) && row.vitality > row.vitality_max) {
        errors.push('vitality: 不得超過 vitality_max');
    }
    if (!nonEmpty(row.role)) errors.push('role: 缺少');
    if (!isOneOf(GENERAL_STATUSES, row.status)) errors.push(`status: 必須是 ${GENERAL_STATUSES.join('/')} 之一`);
    return errors;
}

export function validateGeneDictionaryRow(row: Partial<GeneDictionaryRow>): string[] {
    const errors: string[] = [];
    if (!nonEmpty(row.id)) errors.push('id: 缺少');
    if (!nonEmpty(row.display_name)) errors.push('display_name: 缺少');
    if (!nonEmpty(row.color)) errors.push('color: 缺少');
    if (!isInt(row.max_level) || row.max_level <= 0) errors.push('max_level: 必須是正整數');
    return errors;
}

export function validateNurtureSessionRow(row: Partial<NurtureSessionRow>): string[] {
    const errors: string[] = [];
    if (!nonEmpty(row.id)) errors.push('id: 缺少');
    if (!nonEmpty(row.general_id)) errors.push('general_id: 缺少');
    if (!isInt(row.current_round) || row.current_round < 1 || row.current_round > 36) {
        errors.push('current_round: 必須是 1~36 的整數');
    }
    if (!isInt(row.tp_accumulated) || row.tp_accumulated < 0) errors.push('tp_accumulated: 必須是非負整數');
    if (!nonEmpty(row.status)) errors.push('status: 缺少');
    return errors;
}

export function validateMercenaryRow(row: Partial<MercenaryRow>): string[] {
    const errors: string[] = [];
    if (!nonEmpty(row.id)) errors.push('id: 缺少');
    if (!nonEmpty(row.player_id)) errors.push('player_id: 缺少');
    if (!isOneOf(MERCENARY_BOND_STATUSES, row.bond_status)) {
        errors.push(`bond_status: 必須是 ${MERCENARY_BOND_STATUSES.join('/')} 之一`);
    }
    if (!isInt(row.days_left) || row.days_left < 0) errors.push('days_left: 必須是非負整數');
    if (!isOneOf(MERCENARY_UPKEEP_STATUSES, row.upkeep_status)) {
        errors.push(`upkeep_status: 必須是 ${MERCENARY_UPKEEP_STATUSES.join('/')} 之一`);
    }
    return errors;
}

export function validatePlayerResourcesRow(row: Partial<PlayerResourcesRow>): string[] {
    const errors: string[] = [];
    if (!nonEmpty(row.player_id)) errors.push('player_id: 缺少');
    const amounts: Array<keyof PlayerResourcesRow> = ['food', 'gold', 'troop_source', 'fame', 'essence', 'bond_points'];
    for (const key of amounts) {
        const value = row[key];
        if (!isInt(value) || value < 0) errors.push(`${key}: 必須是非負整數`);
    }
    return errors;
}

export function validateGachaHistoryRow(row: Partial<GachaHistoryRow>): string[] {
    const errors: string[] = [];
    if (!nonEmpty(row.player_id)) errors.push('player_id: 缺少');
    if (!isInt(row.pull_seq) || row.pull_seq < 1) errors.push('pull_seq: 必須是正整數');
    if (!nonEmpty(row.pool)) errors.push('pool: 缺少');
    if (!nonEmpty(row.result)) errors.push('result: 缺少');
    return errors;
}
