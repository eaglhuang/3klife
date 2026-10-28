// @spec-source → AI武將強度系統.md E-3 AI Profile（行為模板）、E-4 路線選擇（PROG-2-1316，WBS AIS-03）
/**
 * AiProfiles — AI Profile 八種行為模板的解析與驗證（純邏輯，不依賴 cc）
 *
 * 資料檔：assets/resources/data/ai-profiles.json。這裡只做解析與檢查，檔案讀取交給呼叫端。
 * 八個 Profile 必須各出現一次；兵種代碼沿用 AI 特殊兵種公式的命名（CAVALRY…NAVY）；
 * 路線策略只能是規格列出的代號，或 null（規格未定義）。
 *
 * 暫定：BALANCED 與 ARCHER_FOCUS 的路線策略為 null；戰法標籤只記傾向，尚未對應戰法 ID。
 *
 * Unity 對照：像一張 AI Behavior ScriptableObject 清單，OnValidate 時檢查每一列的欄位是否合法，
 * 缺列或填錯的代號就不讓戰鬥載入，避免行為在執行中才出錯。
 */

export const AI_PROFILE_IDS = [
    'AGGRESSIVE',
    'DEFENSIVE',
    'STRATEGIC',
    'CAVALRY_RUSH',
    'ARCHER_FOCUS',
    'SWARM',
    'ELITE_FEW',
    'BALANCED',
] as const;
export type AiProfileId = (typeof AI_PROFILE_IDS)[number];

/** 兵種代碼（與 AI 特殊兵種公式的 STAT_MAPPING 同一組） */
export const AI_TROOP_CODES = ['CAVALRY', 'INFANTRY', 'SHIELD', 'PIKE', 'ARCHER', 'SIEGE', 'SMART', 'NAVY'] as const;
export type AiTroopCode = (typeof AI_TROOP_CODES)[number];

/** 路線策略（規格 E-4 路線選擇表） */
export const AI_LANE_STRATEGIES = [
    'FOCUS_2_3',
    'SPREAD_5',
    'SCOUT_WEAK',
    'CAVALRY_CHARGE_1',
    'ALL_5',
    'EMPTIEST_1_2',
] as const;
export type AiLaneStrategy = (typeof AI_LANE_STRATEGIES)[number];

export interface AiDeployTendency {
    preferredTroops: AiTroopCode[];
    /** 是否依玩家兵種剋制選兵（對應 AI_Deploy 的 IQ 分支） */
    preferCounter: boolean;
    preferLowQuality: boolean;
    preferSpecialTroops: boolean;
}

export interface AiProfile {
    profileId: AiProfileId;
    deployTendency: AiDeployTendency;
    /** 戰法傾向標籤（規格文字轉寫，尚未對應戰法 ID） */
    tacticTendency: string[];
    /** 規格未定義的 Profile 為 null */
    laneStrategy: AiLaneStrategy | null;
    historicalExamples: string[];
}

export type AiProfileTable = Readonly<Record<AiProfileId, AiProfile>>;

export interface AiProfileParseResult {
    table: AiProfileTable | null;
    errors: string[];
    /** E-6 武將 → Profile（generalProfiles，PROG-2-1463）；沒有此欄時為空 */
    generalProfiles: Readonly<Record<string, AiProfileId>>;
}

function isProfileId(value: unknown): value is AiProfileId {
    return typeof value === 'string' && (AI_PROFILE_IDS as readonly string[]).includes(value);
}

function isTroopCode(value: unknown): value is AiTroopCode {
    return typeof value === 'string' && (AI_TROOP_CODES as readonly string[]).includes(value);
}

function isLaneStrategy(value: unknown): value is AiLaneStrategy | null {
    return value === null || (typeof value === 'string' && (AI_LANE_STRATEGIES as readonly string[]).includes(value));
}

function checkDeployTendency(profileId: string, tendency: unknown, errors: string[]): void {
    const t = tendency as Partial<AiDeployTendency> | undefined;
    if (!t || !Array.isArray(t.preferredTroops)) {
        errors.push(`${profileId}: deployTendency.preferredTroops 必須是陣列`);
        return;
    }
    for (const troop of t.preferredTroops) {
        if (!isTroopCode(troop)) errors.push(`${profileId}: 未知兵種 "${String(troop)}"`);
    }
}

/** 解析 JSON 物件（ai-profiles.json 的內容）；有任何錯誤時 table 為 null。 */
export function parseAiProfileTable(raw: unknown): AiProfileParseResult {
    const errors: string[] = [];
    const list = (raw as { profiles?: unknown } | null)?.profiles;
    if (!Array.isArray(list)) return { table: null, errors: ['缺少 profiles 陣列'], generalProfiles: {} };

    const found = new Map<string, AiProfile>();
    for (const item of list as Partial<AiProfile>[]) {
        const id = item.profileId as string;
        if (!isProfileId(id)) {
            errors.push(`未知 profileId "${String(id)}"`);
            continue;
        }
        if (found.has(id)) {
            errors.push(`profileId "${id}" 重複`);
            continue;
        }
        checkDeployTendency(id, item.deployTendency, errors);
        if (!Array.isArray(item.tacticTendency) || item.tacticTendency.length === 0) {
            errors.push(`${id}: tacticTendency 不可為空`);
        }
        if (!isLaneStrategy(item.laneStrategy)) {
            errors.push(`${id}: 未知路線策略 "${String(item.laneStrategy)}"`);
        }
        found.set(id, item as AiProfile);
    }

    for (const id of AI_PROFILE_IDS) {
        if (!found.has(id)) errors.push(`缺少 profileId "${id}"`);
    }
    const generalProfiles = parseGeneralProfiles((raw as { generalProfiles?: unknown }).generalProfiles, errors);
    if (errors.length > 0) return { table: null, errors, generalProfiles: {} };

    const table = Object.fromEntries(AI_PROFILE_IDS.map((id) => [id, found.get(id)!])) as AiProfileTable;
    return { table, errors, generalProfiles };
}

function parseGeneralProfiles(raw: unknown, errors: string[]): Record<string, AiProfileId> {
    if (raw === undefined) return {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        errors.push('generalProfiles 必須是物件');
        return {};
    }
    const result: Record<string, AiProfileId> = {};
    for (const [generalId, profileId] of Object.entries(raw as Record<string, unknown>)) {
        if (!isProfileId(profileId)) {
            errors.push(`generalProfiles.${generalId}: 未知 profileId "${String(profileId)}"`);
            continue;
        }
        result[generalId] = profileId;
    }
    return result;
}

/** 武將的路線策略（E-6 → E-4）；未列出的武將或規格未定義路線的 Profile 回傳 null（沿用隨機） */
export function laneStrategyOfGeneral(parsed: AiProfileParseResult, generalId: string): AiLaneStrategy | null {
    const profileId = parsed.generalProfiles[generalId];
    if (!parsed.table || !profileId) return null;
    return parsed.table[profileId].laneStrategy;
}

/** 依 profileId 取出模板；未知代號回傳 null，不拋例外。 */
export function aiProfileOf(table: AiProfileTable, profileId: string): AiProfile | null {
    return isProfileId(profileId) ? table[profileId] : null;
}
