import { NextFunction, Request, RequestHandler, Response } from 'express';

import { ActionRecord, SyncEndpointResponse } from '../../shared/protocols';

/**
 * 同步安全規範（同步API規格書 §7；WBS SYNC-09，PROG-2-1989）。
 *
 * - 所有請求強制 HTTPS（dev 環境例外）：requireHttps 開啟時，非 HTTPS 回 403。
 *   反向代理後以 x-forwarded-proto 判定。
 * - Action_Records payload 不得包含 PII：找到 PII 欄位名或像 email／手機號碼的字串就整批拒絕。
 *
 * 暫定：PII 欄位清單與兩條字串規則（規格未列舉），見 PII_FIELD_NAMES、PII_VALUE_PATTERNS。
 */

/** 暫定：視為 PII 的欄位名（比對時忽略大小寫與底線、連字號） */
export const PII_FIELD_NAMES: readonly string[] = [
    'email', 'phone', 'phonenumber', 'mobile', 'realname', 'fullname', 'address',
    'idnumber', 'nationalid', 'passport', 'birthday', 'password', 'creditcard',
];

/** 暫定：含 email，或整串就是電話號碼（9 碼以上數字，可含 +、空白、連字號）；裝置 id 這類混字串不算 */
export const PII_VALUE_PATTERNS: readonly RegExp[] = [
    /[^\s@]+@[^\s@]+\.[^\s@]+/,
    /^\+?\d[\d -]{7,}\d$/,
];

const normalizeKey = (key: string) => key.toLowerCase().replace(/[_-]/g, '');

/** 回傳第一個找到 PII 的路徑；沒有回 null */
export function findPii(value: unknown, path = 'Payload'): string | null {
    if (typeof value === 'string') return PII_VALUE_PATTERNS.some((re) => re.test(value)) ? path : null;
    if (!value || typeof value !== 'object') return null;
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        const childPath = `${path}.${key}`;
        if (PII_FIELD_NAMES.includes(normalizeKey(key))) return childPath;
        const found = findPii(child, childPath);
        if (found) return found;
    }
    return null;
}

/** 檢查整批行動紀錄；回傳 { seq, path } 或 null */
export function findPiiInRecords(records: readonly ActionRecord[]): { seq: number; path: string } | null {
    for (const record of records) {
        const path = findPii(record.Payload);
        if (path) return { seq: record.Seq, path };
    }
    return null;
}

function isHttps(req: Request): boolean {
    if (req.secure) return true;
    const forwarded = req.headers['x-forwarded-proto'];
    const proto = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return typeof proto === 'string' && proto.split(',')[0].trim().toLowerCase() === 'https';
}

/** requireHttps 為 false（dev）時直接放行 */
export function requireHttpsMiddleware(requireHttps: boolean): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!requireHttps || isHttps(req)) return next();
        const body: SyncEndpointResponse = { success: false, message: 'HTTPS required.', serverTime: Date.now() };
        res.status(403).json(body);
    };
}
