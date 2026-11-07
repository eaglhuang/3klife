// @spec-source → 伺服端存檔快照與靜態配置同步規格書.md (doc_spec_0334) §2 CDN MD5 增量比對、§3 Tx_Seq 與雜湊鏈校驗（PROG-2-2020）
/**
 * CloudSyncGuard — 啟動時設定檔清單比對，以及雲端快照同步的防篡改判定。純函式。
 */

export interface ConfigManifestFile {
    md5: string;
    sizeBytes: number;
}

export interface ConfigManifest {
    manifestVersion: string;
    files: Record<string, ConfigManifestFile>;
}

export interface ManifestDiff {
    /** 遠端新增或 MD5 不同，需要下載的檔案（依路徑排序）。 */
    download: string[];
    /** MD5 一致，直接讀本地快取。 */
    unchanged: string[];
    /** 本地有、遠端清單已移除。 */
    removed: string[];
    /** 需下載的總位元組數。 */
    downloadBytes: number;
}

/** §2：逐檔比對 MD5（不分大小寫）；本地清單缺席時視為全部要下載。 */
export function diffConfigManifest(local: Readonly<ConfigManifest> | null, remote: Readonly<ConfigManifest>): ManifestDiff {
    const localFiles = local?.files ?? {};
    const download: string[] = [];
    const unchanged: string[] = [];
    let downloadBytes = 0;
    for (const path of Object.keys(remote.files).sort()) {
        const r = remote.files[path];
        const l = localFiles[path];
        if (l && l.md5.toLowerCase() === r.md5.toLowerCase()) {
            unchanged.push(path);
        } else {
            download.push(path);
            downloadBytes += Math.max(0, r.sizeBytes || 0);
        }
    }
    const removed = Object.keys(localFiles).filter((p) => !(p in remote.files)).sort();
    return { download, unchanged, removed, downloadBytes };
}

export interface SnapshotSyncState {
    txSeq: number;
    lastSyncHash: string;
}

export interface SnapshotSyncRequest {
    txSeq: number;
    /** 客戶端這批動作的起始 Hash，必須等於伺服端前次確認的 last_sync_hash。 */
    baseHash: string;
}

export type SnapshotSyncRejectReason = 'tx-seq-not-increasing' | 'hash-forked' | 'invalid-request';

export type SnapshotSyncVerdict =
    | { accepted: true }
    | { accepted: false; status: 409 | 400; reason: SnapshotSyncRejectReason };

/**
 * §3：序號必須嚴格大於伺服端紀錄、起始 Hash 必須與 last_sync_hash 吻合；
 * 違規回 409，呼叫端應下發雲端權威快照覆蓋。伺服端尚無快照（首次同步）時只檢查序號格式。
 */
export function evaluateSnapshotSync(server: Readonly<SnapshotSyncState> | null, req: Readonly<SnapshotSyncRequest>): SnapshotSyncVerdict {
    if (!Number.isSafeInteger(req.txSeq) || req.txSeq < 0 || typeof req.baseHash !== 'string') {
        return { accepted: false, status: 400, reason: 'invalid-request' };
    }
    if (!server) return { accepted: true };
    if (req.txSeq <= server.txSeq) return { accepted: false, status: 409, reason: 'tx-seq-not-increasing' };
    if (req.baseHash.toLowerCase() !== server.lastSyncHash.toLowerCase()) return { accepted: false, status: 409, reason: 'hash-forked' };
    return { accepted: true };
}
