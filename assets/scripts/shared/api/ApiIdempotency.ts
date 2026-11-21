// @spec-source → 共用框架總綱規格書 (doc_spec_1182) §5.4 冪等與防重送；PROG-2-9201
/**
 * ApiIdempotency — 冪等鍵產生與「冪等鍵 → 結果」保存（零依賴）。
 *
 * 預設保存最近 500 筆或 24 小時；重送回傳原結果且不再執行。
 */
import type { ApiResult } from './ApiProtocol';

export const IDEM_MAX_ENTRIES = 500;
export const IDEM_TTL_MS = 24 * 60 * 60 * 1000;

/** 冪等鍵：命令名＋對象＋存檔版本＋本機單調序號；斷線重送沿用同一個 */
export function buildIdemKey(cmd: string, target: string, saveRev: number, seq: number): string {
    return `${cmd}:${target}:s${saveRev}:n${seq}`;
}

interface IdemEntry {
    at: number;
    result: ApiResult;
}

export class IdempotencyStore {
    private readonly _entries = new Map<string, IdemEntry>();

    public constructor(
        private readonly _maxEntries = IDEM_MAX_ENTRIES,
        private readonly _ttlMs = IDEM_TTL_MS,
    ) {}

    public get size(): number {
        return this._entries.size;
    }

    public get(key: string, nowMs: number): ApiResult | null {
        const hit = this._entries.get(key);
        if (!hit) return null;
        if (nowMs - hit.at > this._ttlMs) {
            this._entries.delete(key);
            return null;
        }
        return hit.result;
    }

    public put(key: string, result: ApiResult, nowMs: number): void {
        this._entries.delete(key);
        this._entries.set(key, { at: nowMs, result });
        while (this._entries.size > this._maxEntries) {
            const oldest = this._entries.keys().next().value as string;
            this._entries.delete(oldest);
        }
    }
}
