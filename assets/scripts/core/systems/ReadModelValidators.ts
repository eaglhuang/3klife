// @spec-source → Data Schema文件（本機端與Server端）.md §2-1 / §2-1a 虎符、英靈卡、出征編制、戰場最小 read model（DS-06，WBS）
/**
 * ReadModelValidators — 虎符 / 英靈卡 / 出征編制 / 戰場狀態的最小 read model 型別與唯一性驗證（純邏輯，不依賴 cc）
 *
 * 只做「形狀與約束」檢查：欄位名沿用規格的 Data Schema 寫法，不改存檔格式。
 * 持久化與 projection 的組裝留給後續卡。
 *
 * Unity 對照：像 ScriptableObject 的 OnValidate，資料放進來時先檢查唯一鍵與範圍，不合格就列出原因。
 */

export type TalismanSourceType = 'DeathSettlement' | 'Recruitment' | 'WarConquest';
export type TalismanQuality = 'R' | 'SR' | 'SSR' | 'UR';

export interface TalismanInventoryEntry {
    Tally_ID: string;
    Quality: TalismanQuality;
    TigerTallyScore: number;
    Star: number;
    Star_Exp: number;
    Source_Template_ID: string;
    Source_General_UID: string;
    Source_Type: TalismanSourceType;
    Linked_Troop_ID?: string;
    /** 一將一符：null 表示君主持有 */
    Equipped_General_UID: string | null;
    Acquired_Season: number;
    Is_Displayed: boolean;
}

export interface SpiritCardEntry {
    Spirit_ID: string;
    General_Template_ID: string;
    Spirit_Family_Key: string;
    LineageScore: number;
    Card_Role: 'MAIN' | 'BACKUP';
    Family_Primary_Flag: boolean;
    /** 一將一命：同一武將只能掛一張，null 表示未裝配 */
    Equipped_General_UID: string | null;
    Slot_Type: 'DESTINY';
    Display_Bucket: 'DESTINY_SLOT' | 'CLAN_RELIC';
    DualEquip_Allowed: boolean;
}

export interface SortieLoadoutReadModel {
    Commander_UID: string;
    Strategist_UID: string | null;
    Deputy_UID: string | null;
}

export interface BattleStateReadModel {
    Current_Food: number;
    Max_Food: number;
    Current_Tactic_Points: number;
    Max_Tactic_Points: number;
    Elite_Deploy_Cap: number;
    Active_Elite_Count: number;
    Strategist_UID: string | null;
    Deputy_UID: string | null;
}

export type ReadModelIssue =
    | 'DUPLICATE_KEY'
    | 'ID_MISMATCH'
    | 'BAD_SOURCE_TYPE'
    | 'BAD_CARD_ROLE'
    | 'GENERAL_HAS_TALLY'
    | 'GENERAL_HAS_SPIRIT'
    | 'ROLE_DUPLICATE'
    | 'MISSING_COMMANDER'
    | 'FOOD_OVER_MAX'
    | 'TACTIC_OVER_MAX'
    | 'ELITE_OVER_CAP';

export interface ReadModelCheck {
    ok: boolean;
    issues: ReadModelIssue[];
}

function result(issues: ReadModelIssue[]): ReadModelCheck {
    const unique = Array.from(new Set(issues));
    return { ok: unique.length === 0, issues: unique };
}

/** 虎符表：鍵與 Tally_ID 一致、來源只允許三種、一將一符（同一武將最多一張） */
export function validateTalismanInventory(table: Readonly<Record<string, TalismanInventoryEntry>>): ReadModelCheck {
    const issues: ReadModelIssue[] = [];
    const sourceTypes: TalismanSourceType[] = ['DeathSettlement', 'Recruitment', 'WarConquest'];
    const holders = new Set<string>();
    for (const [key, entry] of Object.entries(table)) {
        if (entry.Tally_ID !== key) issues.push('ID_MISMATCH');
        if (!sourceTypes.includes(entry.Source_Type)) issues.push('BAD_SOURCE_TYPE');
        if (entry.Equipped_General_UID !== null) {
            if (holders.has(entry.Equipped_General_UID)) issues.push('GENERAL_HAS_TALLY');
            holders.add(entry.Equipped_General_UID);
        }
    }
    return result(issues);
}

/** 英靈卡表：鍵與 Spirit_ID 一致、Card_Role 只允許 MAIN / BACKUP、一將一命 */
export function validateSpiritCards(table: Readonly<Record<string, SpiritCardEntry>>): ReadModelCheck {
    const issues: ReadModelIssue[] = [];
    const holders = new Set<string>();
    for (const [key, entry] of Object.entries(table)) {
        if (entry.Spirit_ID !== key) issues.push('ID_MISMATCH');
        if (entry.Card_Role !== 'MAIN' && entry.Card_Role !== 'BACKUP') issues.push('BAD_CARD_ROLE');
        if (entry.Equipped_General_UID !== null) {
            if (holders.has(entry.Equipped_General_UID)) issues.push('GENERAL_HAS_SPIRIT');
            holders.add(entry.Equipped_General_UID);
        }
    }
    return result(issues);
}

/** 出征編制：主將必填，參謀與後勤不得與主將或彼此重覆（三角色不重覆） */
export function validateSortieLoadoutReadModel(loadout: SortieLoadoutReadModel): ReadModelCheck {
    const issues: ReadModelIssue[] = [];
    if (!loadout.Commander_UID) issues.push('MISSING_COMMANDER');
    const ids = [loadout.Commander_UID, loadout.Strategist_UID, loadout.Deputy_UID].filter((id): id is string => Boolean(id));
    if (new Set(ids).size !== ids.length) issues.push('ROLE_DUPLICATE');
    return result(issues);
}

/** 戰場狀態：糧草與計謀點不超過上限、精銳不超過部署上限、參謀與後勤不重覆 */
export function validateBattleStateReadModel(state: BattleStateReadModel): ReadModelCheck {
    const issues: ReadModelIssue[] = [];
    if (state.Current_Food > state.Max_Food) issues.push('FOOD_OVER_MAX');
    if (state.Current_Tactic_Points > state.Max_Tactic_Points) issues.push('TACTIC_OVER_MAX');
    if (state.Active_Elite_Count > state.Elite_Deploy_Cap) issues.push('ELITE_OVER_CAP');
    if (state.Strategist_UID && state.Strategist_UID === state.Deputy_UID) issues.push('ROLE_DUPLICATE');
    return result(issues);
}
