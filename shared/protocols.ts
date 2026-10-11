/**
 * 全局共享的行動紀錄接口 (用於 Event Sourcing / 事件溯源)
 * 確保 Client 與 Server 計算 HMAC 雜湊時使用相同的資料結構
 */
export interface ActionRecord {
    Seq: number;       // 行動編號
    Timestamp: number; // 發生時間
    Action: string;    // 行動代碼 (如: 'GACHA_PULL', 'UNIT_UPGRADE')
    Payload: any;      // 該行動的具體數據 (如: { unitId: 'G001', itemId: 'ITEM_01' })
    Tx_Hash: string;   // 鏈式 HMAC 雜湊簽章 (防篡改簽章)
}

/**
 * 同步請求數據結構
 */
export interface SyncRequest {
    Player_ID: string;
    Session_Secret: string;    // 當前有效的同步金鑰 (Server 回推驗證用)
    Action_Records: ActionRecord[]; // 離線操作日誌
    Previous_Hash: string;     // 同步起始點的雜湊錨點
}

/**
 * 同步結果回傳
 */
export interface SyncResponse {
    Success: boolean;
    New_Session_Secret?: string; // 更新後的同步金鑰
    New_Hash?: string;           // 最新的雜湊錨點
    Message?: string;
    Server_Time: number;
}

// ========== 存檔同步端點（/sync/delta、/sync/full、/sync/actions）==========
// 共同欄位：playerId + sessionToken（= Session_Secret）做身分驗證；
// 雜湊鏈規則與 /sync 相同（見 assets/scripts/core/systems/SyncHash.ts）。

/** JSON Patch（RFC 6902）操作，僅使用 add / remove / replace */
export interface SyncJsonPatch {
    op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
    path: string;
    value?: unknown;
    from?: string;
}

interface SyncEndpointRequestBase {
    playerId: string;
    deviceId: string;
    sessionToken: string;
    clientTimestamp: number;
}

/** POST /sync/delta：以存檔差異 + 行動紀錄同步；baseHash 與伺服器錨點不符時回 409 */
export interface DeltaSyncRequest extends SyncEndpointRequestBase {
    baseHash: string;
    patches: SyncJsonPatch[];
    actionRecords: ActionRecord[];
}

/** POST /sync/full：以完整存檔覆蓋伺服器快照（delta 衝突時的 fallback） */
export interface FullSyncRequest extends SyncEndpointRequestBase {
    saveData: unknown;
}

/** POST /sync/actions：gzip + Base64 壓縮後的 ActionRecord[] 批次上傳 */
export interface CompressedActionsSyncRequest extends SyncEndpointRequestBase {
    baseHash: string;
    actionRecordsCompressed: string;
    count: number;
}

/** 三個存檔同步端點共用的回應 */
export interface SyncEndpointResponse {
    success: boolean;
    newHash?: string;
    newSessionSecret?: string;
    message?: string;
    serverTime: number;
}
