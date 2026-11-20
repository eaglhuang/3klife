// @spec-source → 共用框架總綱規格書 (doc_spec_1182) §5.3 封包格式、§5.4 冪等；PROG-2-9201
/**
 * ApiProtocol — 共通 API 封包型別（零依賴，不 import cc，伺服器可直接 import）。
 *
 * 單機由本機伺服器 adapter 實作、連線由網路 adapter 實作，封包長相一致。
 * Unity 對照：像一組 Request／Response DTO，與傳輸方式（函式呼叫或 HTTP）無關。
 */

/** 協定版本；伺服器拒絕過舊版本回 E005 SCHEMA_TOO_OLD。v=0 視為舊協定，只允許存檔命令 */
export const API_PROTOCOL_VERSION = 1;

/** 請求（命令）封包 */
export interface ApiRequest<A = unknown> {
    v: number;
    /** 每次請求唯一 */
    reqId: string;
    /** 同一個玩家意圖的重送必須帶同一個值；會改狀態的命令必填 */
    idemKey?: string;
    cmd: string;
    /** 客戶端目前看到的存檔版本戳（單調遞增整數） */
    saveRev?: number;
    clientTime: number;
    args: A;
}

/** 增量補丁項目（RFC 6902 子集，沿用既有 /sync/delta 的 op） */
export interface ApiDeltaOp {
    path: string;
    op: 'add' | 'replace' | 'remove';
    value?: unknown;
}

/** 推送事件；以 rev 去重，可重複套用 */
export interface ApiEvent {
    evt: string;
    rev: number;
    data?: unknown;
}

/** 成功回應 */
export interface ApiOk<T = unknown> {
    v: number;
    reqId: string;
    ok: true;
    saveRev: number;
    serverTime: number;
    result: T;
    delta?: ApiDeltaOp[];
    events?: ApiEvent[];
    /** 冪等命中：原樣回傳先前結果，不再執行（總綱 §5.4：ok:true 並帶 E101 標記） */
    replayed?: boolean;
    errorCode?: 'E101';
}

/** 失敗回應 */
export interface ApiFail {
    v: number;
    reqId: string;
    ok: false;
    errorCode: string;
    /** 既有字串碼（例如 INSUFFICIENT_BALANCE），畫面可依它顯示 */
    reason: string;
    message: string;
    retryable: boolean;
    saveRev?: number;
    serverTime: number;
}

export type ApiResult<T = unknown> = ApiOk<T> | ApiFail;

export function isApiFail<T>(res: ApiResult<T>): res is ApiFail {
    return res.ok === false;
}

/** 命令選項 */
export interface ApiCmdOptions {
    /** 斷線重送沿用同一個；沒給時由客戶端依「命令名＋對象＋saveRev＋單調序號」自動產生 */
    idemKey?: string;
    /** 只允許低風險命令（開關、排序、已讀）；涉及貨幣、庫存、獎勵的命令一律忽略 */
    optimistic?: boolean;
}

export type Unsubscribe = () => void;

/** 檢視快取（唯讀）：由 API 回應與推送事件更新，玩法程式不可自行改寫 */
export interface ApiReadModel {
    /** 最近一次回應帶回的存檔版本戳 */
    readonly saveRev: number;
    /** 最近一次回應的伺服器時間 */
    readonly serverTime: number;
}
