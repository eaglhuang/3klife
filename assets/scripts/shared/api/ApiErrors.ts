// @spec-source → 共用框架總綱規格書 (doc_spec_1182) §5.3 錯誤碼分段；同步 API 契約 (doc_spec_0655) E001～E099；PROG-2-9201
/**
 * ApiErrors — 共通錯誤碼表（零依賴）。
 *
 * E001～E099 沿用同步 API 契約；E1xx 為共通命令層；E2xx 以上依框架分段，由各框架卡補充。
 * 既有字串碼保留為 reason，errorCode 由本表映射。
 */
import { API_PROTOCOL_VERSION, type ApiFail } from './ApiProtocol';

export interface ApiErrorDef {
    code: string;
    reason: string;
    retryable: boolean;
}

function def(code: string, reason: string, retryable = false): ApiErrorDef {
    return { code, reason, retryable };
}

export const API_ERRORS = Object.freeze({
    // 傳輸、驗證、同步（既有，原樣沿用）
    INVALID_SCHEMA: def('E001', 'INVALID_SCHEMA'),
    PATCH_PATH_FORBIDDEN: def('E002', 'PATCH_PATH_FORBIDDEN'),
    SCHEMA_TOO_OLD: def('E005', 'SCHEMA_TOO_OLD'),
    PAYLOAD_TOO_LARGE: def('E007', 'PAYLOAD_TOO_LARGE'),
    RATE_LIMITED: def('E008', 'RATE_LIMITED', true),
    BASE_HASH_MISMATCH: def('E011', 'BASE_HASH_MISMATCH'),
    // 共通命令層
    DUPLICATE_REQUEST: def('E101', 'DUPLICATE_REQUEST'),
    REV_CONFLICT: def('E102', 'REV_CONFLICT'),
    FORBIDDEN_FIELD: def('E103', 'FORBIDDEN_FIELD'),
    MAINTENANCE: def('E104', 'MAINTENANCE', true),
    COMMAND_UNKNOWN: def('E105', 'COMMAND_UNKNOWN'),
    BATCH_PARTIAL_REJECT: def('E106', 'BATCH_PARTIAL_REJECT'),
    // 偵錯入口（本機 adapter 專用；宿主沒綁定時）
    DEBUG_UNAVAILABLE: def('E107', 'DEBUG_UNAVAILABLE'),
    // 物品庫存／錢包（E3xx）；貨幣併入錢包命令（庫存規格 Q2）
    INSUFFICIENT_BALANCE: def('E301', 'INSUFFICIENT_BALANCE'),
    CURRENCY_UNKNOWN: def('E302', 'CURRENCY_UNKNOWN'),
    WALLET_UNAVAILABLE: def('E303', 'WALLET_UNAVAILABLE', true),
    // 物品庫存（E31x；E301～E303 已被錢包使用，規格 doc_spec_1184 §11.4 的 E301～E309 因此順延，待總 PM 裁決）
    ITEM_HOLDER_UNKNOWN: def('E310', 'HOLDER_UNKNOWN'),
    ITEM_NOT_ACCEPTED: def('E311', 'NOT_ACCEPTED'),
    ITEM_BOUND: def('E312', 'BOUND'),
    ITEM_FULL: def('E313', 'FULL'),
    ITEM_INSUFFICIENT: def('E314', 'INSUFFICIENT'),
    ITEM_SOURCE_INVALID: def('E315', 'SOURCE_INVALID'),
    ITEM_RULE_UNKNOWN: def('E316', 'RULE_UNKNOWN'),
    // item.use：材料沒有使用效果、目標不是可升級的實例、目標未持有（E317）；目標已在等級上限，請先傳承（E318）
    ITEM_USE_INVALID: def('E317', 'USE_INVALID'),
    ITEM_AT_CAP: def('E318', 'AT_CAP'),
    // 獎勵（E32x；規格 doc_spec_1186 §11.4 寫 E5xx，改用 E32x 以免與其他框架分段衝突，待總 PM 裁決）
    REWARD_POOL_NOT_FOUND: def('E320', 'POOL_NOT_FOUND'),
    REWARD_BUNDLE_NOT_FOUND: def('E321', 'BUNDLE_NOT_FOUND'),
    REWARD_POOL_CLOSED: def('E322', 'POOL_CLOSED'),
    REWARD_NO_TICKET: def('E323', 'NO_TICKET'),
    REWARD_INVALID_COUNT: def('E324', 'INVALID_COUNT'),
    REWARD_SETTLE_ROLLBACK: def('E325', 'SETTLE_ROLLBACK'),
    REWARD_EFFECT_UNSUPPORTED: def('E326', 'EFFECT_UNSUPPORTED'),
    REWARD_GRANT_KEY_CONFLICT: def('E327', 'GRANT_KEY_CONFLICT'),
    REWARD_UNAVAILABLE: def('E328', 'REWARD_UNAVAILABLE', true),
    // 劇情（E34x；總 PM 裁決分段：E31x 物品、E32x 獎勵、E33x 占用、E34x 劇情；規格 doc_spec_1188 §11.4 原寫 E7xx）
    STORY_NOT_FOUND: def('E340', 'STORY_NOT_FOUND'),
    STORY_NOT_TRIGGERABLE: def('E341', 'NOT_TRIGGERABLE'),
    STORY_NOT_STARTED: def('E342', 'NOT_STARTED'),
    STORY_INVALID_OPTION: def('E343', 'INVALID_OPTION'),
    STORY_CHOICE_ALREADY_MADE: def('E344', 'CHOICE_ALREADY_MADE'),
    STORY_QUEUE_CONFLICT: def('E345', 'QUEUE_CONFLICT'),
    STORY_EFFECT_UNSUPPORTED: def('E346', 'EFFECT_UNSUPPORTED'),
    STORY_EFFECT_FAILED: def('E347', 'EFFECT_FAILED'),
    STORY_UNAVAILABLE: def('E348', 'STORY_UNAVAILABLE', true),
    // 技能（E6xx，技能 Base 規格 §11.4）
    INVALID_SKILL: def('E601', 'INVALID_SKILL'),
    ALREADY_LEARNED: def('E602', 'ALREADY_LEARNED'),
    TP_SHORT: def('E603', 'TP_SHORT'),
    NO_SLOT: def('E604', 'NO_SLOT'),
    APTITUDE_UNMET: def('E605', 'APTITUDE_UNMET'),
    NOT_INSPIRED: def('E606', 'NOT_INSPIRED'),
    LOADOUT_FULL: def('E607', 'LOADOUT_FULL'),
    USES_EXHAUSTED: def('E608', 'USES_EXHAUSTED'),
    CAST_BLOCKED: def('E609', 'CAST_BLOCKED'),
    SKILL_MAX_LEVEL: def('E610', 'MAX_LEVEL'),
    SKILL_UNAVAILABLE: def('E611', 'SKILL_UNAVAILABLE', true),
    SKILL_HOLDER_NOT_FOUND: def('E612', 'HOLDER_NOT_FOUND'),
    SKILL_NOT_LEARNED: def('E613', 'NOT_LEARNED'),
    // 人員占用（E33x；OCC-M 中立版，分段待總 PM 裁決是否獨立成框架）
    OCC_CONFLICT: def('E330', 'OCC_CONFLICT'),
    OCC_KIND_UNKNOWN: def('E331', 'OCC_KIND_UNKNOWN'),
    OCC_REF_MISMATCH: def('E332', 'OCC_REF_MISMATCH'),
    OCC_READONLY_KIND: def('E333', 'OCC_READONLY_KIND'),
    OCC_UNAVAILABLE: def('E334', 'OCC_UNAVAILABLE', true),
    // 任務（E35x；規格 doc_spec_1185 §11.4 寫 E4xx，改用 E35x 以免與其他框架分段衝突；PROG-2-9209）
    QST_DEF_NOT_FOUND: def('E350', 'DEF_NOT_FOUND'),
    QST_NOT_FOUND: def('E351', 'NOT_FOUND'),
    QST_BAD_STATE: def('E352', 'BAD_STATE'),
    QST_GATE_PENDING: def('E353', 'GATE_PENDING'),
    QST_NOT_READY: def('E354', 'NOT_READY'),
    QST_STEP_MISMATCH: def('E355', 'STEP_MISMATCH'),
    QST_ACTOR_INVALID: def('E356', 'ACTOR_INVALID'),
    QST_CONDITION_UNMET: def('E357', 'CONDITION_UNMET'),
    QST_UNAVAILABLE: def('E358', 'QUEST_UNAVAILABLE', true),
    QST_KEY_CONFLICT: def('E359', 'KEY_CONFLICT'),
    // 家族（E36x；配偶納入名冊，PROG-2-9582）
    FAMILY_UNAVAILABLE: def('E360', 'FAMILY_UNAVAILABLE', true),
    FAMILY_NO_CONFIG: def('E361', 'FAMILY_NO_CONFIG'),
    FAMILY_CAP_REACHED: def('E362', 'FAMILY_CAP_REACHED'),
    FAMILY_SOURCE_UNKNOWN: def('E363', 'FAMILY_SOURCE_UNKNOWN'),
    FAMILY_SPOUSE_NOT_ELIGIBLE: def('E364', 'FAMILY_SPOUSE_NOT_ELIGIBLE'),
    FAMILY_AFFINITY_LOW: def('E365', 'FAMILY_AFFINITY_LOW'),
    FAMILY_RELATION_LOW: def('E366', 'FAMILY_RELATION_LOW'),
    FAMILY_NATION_LIMIT: def('E367', 'FAMILY_NATION_LIMIT'),
    FAMILY_MATCHMAKER_NOT_OPEN: def('E368', 'FAMILY_MATCHMAKER_NOT_OPEN'),
    FAMILY_MATCHMAKER_YEAR_LIMIT: def('E369', 'FAMILY_MATCHMAKER_YEAR_LIMIT'),
    // 子嗣成長事件（PROG-2-10059）
    FAMILY_GROWTH_NOT_PENDING: def('E370', 'FAMILY_GROWTH_NOT_PENDING'),
    FAMILY_GROWTH_OPTION_UNKNOWN: def('E371', 'FAMILY_GROWTH_OPTION_UNKNOWN'),
    // 存檔（沿用 E0xx 之外的本機存檔失敗）
    SAVE_FAILED: def('E190', 'SAVE_FAILED', true),
    SAVE_NOT_FOUND: def('E191', 'SAVE_NOT_FOUND'),
} satisfies Record<string, ApiErrorDef>);

export type ApiErrorKey = keyof typeof API_ERRORS;

/** 命令處理器丟出此例外即回對應失敗封包 */
export class ApiError extends Error {
    public readonly def: ApiErrorDef;

    public constructor(key: ApiErrorKey, message?: string) {
        super(message ?? API_ERRORS[key].reason);
        this.def = API_ERRORS[key];
    }
}

export function buildFail(reqId: string, err: ApiErrorDef, message: string, serverTime: number, saveRev?: number): ApiFail {
    return {
        v: API_PROTOCOL_VERSION,
        reqId,
        ok: false,
        errorCode: err.code,
        reason: err.reason,
        message,
        retryable: err.retryable,
        serverTime,
        ...(saveRev !== undefined ? { saveRev } : {}),
    };
}
