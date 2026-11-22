// @spec-source → 同步API規格書.md (doc_tech_0010)；PROG-2-1429 依建檔紀錄補標出處
/**
 * SyncHash.ts
 *
 * 同步契約的雜湊算法（客戶端版本）。雜湊本體已搬到 shared/foundation/Sha256.ts（PROG-2-9202），
 * 本檔轉出同名函式以保持舊 import 路徑可用，並保留同步契約專用的 computeSyncTxHash。
 *
 * 契約（必須與 server/src/sync.ts 的 computeTxHash 完全一致）：
 *   Tx_Hash = HMAC-SHA256(key = secret, message = Action + JSON.stringify(Payload) + secret + previousHash)
 */
import { hmacSha256Hex } from '../../shared/foundation/Sha256';

export { utf8Encode, sha256, toHex, hmacSha256Hex } from '../../shared/foundation/Sha256';

/**
 * 計算單筆行動紀錄的鏈式雜湊（同步契約）。
 * @param action       行動代碼，例如 'BATTLE_WIN'
 * @param payload      行動資料；以 JSON.stringify 序列化（undefined 視為 'undefined' 字串，與伺服器相同）
 * @param secret       當前同步金鑰（Session_Secret）
 * @param previousHash 上一筆紀錄的 Tx_Hash，或同步錨點
 */
export function computeSyncTxHash(action: string, payload: unknown, secret: string, previousHash: string): string {
    const payloadStr = JSON.stringify(payload);
    return hmacSha256Hex(`${action}${payloadStr}${secret}${previousHash}`, secret);
}
