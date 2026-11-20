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
    // 物品庫存／錢包（E3xx）；貨幣併入錢包命令（庫存規格 Q2）
    INSUFFICIENT_BALANCE: def('E301', 'INSUFFICIENT_BALANCE'),
    CURRENCY_UNKNOWN: def('E302', 'CURRENCY_UNKNOWN'),
    WALLET_UNAVAILABLE: def('E303', 'WALLET_UNAVAILABLE', true),
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
