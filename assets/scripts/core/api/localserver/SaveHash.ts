// @spec-source → 共用框架總綱規格書 (doc_spec_1182) §5.7 存檔 baseHash（SHA-256）；PROG-2-9201
/**
 * SaveHash — 存檔快照的 SHA-256 雜湊（鍵排序的穩定序列化），供 baseHash 衝突偵測與 save.rev 對帳。
 * 純邏輯，沿用 SyncHash 的同步 SHA-256（不用 WebCrypto，因為它只有 Promise 版本）。
 */
import { stableStringify } from '../../../shared/api/ApiPatch';
import { sha256, utf8Encode } from '../../systems/SyncHash';

export function hashSnapshot(snapshot: unknown): string {
    const bytes = sha256(utf8Encode(stableStringify(snapshot)));
    let hex = '';
    for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
    return hex;
}
