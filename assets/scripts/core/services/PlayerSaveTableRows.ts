/**
 * PlayerSaveTableRows — 存檔快照 → 六表列的映射與驗證（MVP-12，PROG-2-0880，純 TS，不連線）
 *
 * 規格：Server 最小六表只寫定義與驗證，不部署、不連外部服務。這裡在存檔時把快照映射成列，
 * 並用與 001_minimal_six_tables.sql 的 CHECK 對齊的規則檢查；結果只回報，不阻擋存檔。
 *
 * 範圍（暫定）：
 * - generals、mercenaries、player_resources 有存檔來源，會映射。
 * - nurture_sessions 未映射：引擎的回合數是 0~36，表的 current_round 是 1~36，口徑待定。
 * - gene_dictionary 是靜態設定，不在存檔內；gacha_history 存檔沒有逐抽紀錄。兩者都回傳空陣列。
 * - 存檔沒有玩家 id，先用 LOCAL_PLAYER_ID（暫定）。
 *
 * Unity 對照：像存檔前先把 ScriptableObject 轉成 DB 行，欄位不合 Constraint 就列出錯誤，但不阻止本機存檔。
 */
import type { PlayerSaveSnapshot } from './PlayerSaveService';

export const LOCAL_PLAYER_ID = 'local-player';

const GENERAL_STATUSES = ['Active', 'Training', 'Retired', 'Dead'];
/** 暫定：Mystery、Unveiled（子嗣開獎後）與沒有 status 的開局武將都不在表的 CHECK 內，先映射為 Active */
const GENERAL_STATUS_FALLBACK: Readonly<Record<string, string>> = { '': 'Active', Mystery: 'Active', Unveiled: 'Active' };
/** 暫定：存檔沒有血統來源時的占位值；bloodline_id 為 NOT NULL，不能用 null */
export const UNKNOWN_BLOODLINE_ID = 'none';
const BOND_STATUSES = ['Trial', 'Bonded', 'Expired'];
const UPKEEP_STATUSES = ['Active', 'Frozen', 'Departed'];

export interface GeneralTableRow {
    id: string;
    template_id: string;
    bloodline_id: string;
    vitality: number;
    vitality_max: number;
    role: string;
    status: string;
}

export interface MercenaryTableRow {
    id: string;
    player_id: string;
    bond_status: string;
    days_left: number;
    upkeep_status: string;
}

export interface PlayerResourcesTableRow {
    player_id: string;
    food: number;
    gold: number;
    troop_source: number;
    fame: number;
    essence: number;
    bond_points: number;
}

export interface SixTableRows {
    generals: GeneralTableRow[];
    mercenaries: MercenaryTableRow[];
    player_resources: PlayerResourcesTableRow;
    nurture_sessions: [];
    gene_dictionary: [];
    gacha_history: [];
}

export interface SixTableMapResult {
    rows: SixTableRows;
    /** 每筆錯誤格式為「表名[列 id].欄位: 原因」；沒有錯誤時為空陣列 */
    errors: string[];
}

const nonEmpty = (value: unknown): boolean => typeof value === 'string' && value.length > 0;
const isInt = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value);
const isOneOf = (list: readonly string[], value: unknown): boolean => typeof value === 'string' && list.includes(value);

/**
 * 武將列：對應 generals。PM 裁定（暫定）：
 * - templateId 缺則用武將 id；bloodlineId 缺則用 UNKNOWN_BLOODLINE_ID；
 * - status 依 GENERAL_STATUS_FALLBACK 轉換（Mystery → Active）。
 * 其餘缺值保留原樣，由規則回報。
 */
export function mapGeneralRows(snapshot: PlayerSaveSnapshot): GeneralTableRow[] {
    return snapshot.roster.map((general) => {
        const status = general.status ?? '';
        return {
            id: general.id,
            template_id: general.templateId || general.id,
            bloodline_id: general.bloodlineId || UNKNOWN_BLOODLINE_ID,
            vitality: general.vitality ?? 0,
            vitality_max: general.maxVitality ?? 0,
            role: general.role ?? '',
            status: GENERAL_STATUS_FALLBACK[status] ?? status,
        };
    });
}

/** 傭兵列：upkeep 找不到時視為 Active（暫定：沒有欠款紀錄即正常） */
export function mapMercenaryRows(snapshot: PlayerSaveSnapshot, playerId: string): MercenaryTableRow[] {
    const bundle = snapshot.mercenaries;
    if (!bundle) return [];
    return bundle.mercenaries.map((merc) => ({
        id: merc.uid,
        player_id: playerId,
        bond_status: merc.status,
        days_left: merc.daysLeft,
        upkeep_status: bundle.upkeep.find((entry) => entry.uid === merc.uid)?.status ?? 'Active',
    }));
}

/** 資源列：essence 存檔沒有來源，暫定 0 */
export function mapPlayerResourcesRow(snapshot: PlayerSaveSnapshot, playerId: string): PlayerResourcesTableRow {
    return {
        player_id: playerId,
        food: snapshot.military?.food ?? 0,
        gold: snapshot.gachaWallet?.gold ?? 0,
        troop_source: snapshot.military?.cityTroops ?? 0,
        fame: snapshot.resources?.fame ?? 0,
        essence: 0,
        bond_points: snapshot.bondPoints ?? 0,
    };
}

/** 與 001_minimal_six_tables.sql 的 CHECK 對齊的列驗證（core 不可引用 server，規則在此鏡像） */
function validateGeneral(row: GeneralTableRow): string[] {
    const errors: string[] = [];
    if (!nonEmpty(row.id)) errors.push('id: 缺少');
    if (!nonEmpty(row.template_id)) errors.push('template_id: 缺少');
    if (!nonEmpty(row.bloodline_id)) errors.push('bloodline_id: 缺少');
    if (!isInt(row.vitality) || row.vitality < 0) errors.push('vitality: 必須是非負整數');
    if (!isInt(row.vitality_max) || row.vitality_max <= 0) errors.push('vitality_max: 必須是正整數');
    if (isInt(row.vitality) && isInt(row.vitality_max) && row.vitality > row.vitality_max) errors.push('vitality: 不得超過 vitality_max');
    if (!nonEmpty(row.role)) errors.push('role: 缺少');
    if (!isOneOf(GENERAL_STATUSES, row.status)) errors.push(`status: 必須是 ${GENERAL_STATUSES.join('/')} 之一`);
    return errors;
}

function validateMercenary(row: MercenaryTableRow): string[] {
    const errors: string[] = [];
    if (!nonEmpty(row.id)) errors.push('id: 缺少');
    if (!nonEmpty(row.player_id)) errors.push('player_id: 缺少');
    if (!isOneOf(BOND_STATUSES, row.bond_status)) errors.push(`bond_status: 必須是 ${BOND_STATUSES.join('/')} 之一`);
    if (!isInt(row.days_left) || row.days_left < 0) errors.push('days_left: 必須是非負整數');
    if (!isOneOf(UPKEEP_STATUSES, row.upkeep_status)) errors.push(`upkeep_status: 必須是 ${UPKEEP_STATUSES.join('/')} 之一`);
    return errors;
}

function validateResources(row: PlayerResourcesTableRow): string[] {
    const errors: string[] = [];
    if (!nonEmpty(row.player_id)) errors.push('player_id: 缺少');
    const amounts: Array<keyof PlayerResourcesTableRow> = ['food', 'gold', 'troop_source', 'fame', 'essence', 'bond_points'];
    for (const key of amounts) {
        const value = row[key];
        if (!isInt(value) || value < 0) errors.push(`${key}: 必須是非負整數`);
    }
    return errors;
}

/** 把存檔快照映射成六表列並驗證；只回報錯誤，不改動快照 */
export function mapSnapshotToSixTables(snapshot: PlayerSaveSnapshot, playerId: string = LOCAL_PLAYER_ID): SixTableMapResult {
    const generals = mapGeneralRows(snapshot);
    const mercenaries = mapMercenaryRows(snapshot, playerId);
    const playerResources = mapPlayerResourcesRow(snapshot, playerId);
    const errors: string[] = [];
    for (const row of generals) {
        for (const message of validateGeneral(row)) errors.push(`generals[${row.id}].${message}`);
    }
    for (const row of mercenaries) {
        for (const message of validateMercenary(row)) errors.push(`mercenaries[${row.id}].${message}`);
    }
    for (const message of validateResources(playerResources)) errors.push(`player_resources[${playerId}].${message}`);
    return {
        rows: { generals, mercenaries, player_resources: playerResources, nurture_sessions: [], gene_dictionary: [], gacha_history: [] },
        errors,
    };
}

/** 從資源列還原存檔欄位（往返檢查用）；沒有對應來源的欄位不在這裡 */
export function resourceFieldsFromRow(row: PlayerResourcesTableRow): {
    military: { food: number; cityTroops: number };
    gold: number;
    fame: number;
    bondPoints: number;
} {
    return {
        military: { food: row.food, cityTroops: row.troop_source },
        gold: row.gold,
        fame: row.fame,
        bondPoints: row.bond_points,
    };
}
