import { NextFunction, Request, RequestHandler, Response } from 'express';

import { SyncEndpointResponse } from '../../shared/protocols';

/**
 * 同步限流與大小限制（同步API規格書 §錯誤碼；WBS SYNC-05，PROG-2-1988）。
 *
 * - E008 / 429：同一玩家每分鐘最多 10 次同步，第 11 次被擋。
 * - E007 / 413：請求 body 超過 5MB（express.json 的 limit）時回統一格式。
 *
 * 限流以 Player_ID 為鍵，沒有 Player_ID 時退回來源 IP（暫定）。視窗為固定 60 秒。
 */

export const SYNC_RATE_LIMIT_PER_MINUTE = 10;
export const SYNC_RATE_WINDOW_MS = 60_000;
export const SYNC_BODY_LIMIT = '5mb';

export interface SyncLimitResponse extends SyncEndpointResponse {
    code: 'E007' | 'E008';
}

/** 固定視窗計數器（純邏輯，可注入時鐘方便測試） */
export class SyncRateLimiter {
    private readonly windows = new Map<string, { startedAt: number; count: number }>();

    constructor(
        private readonly limit = SYNC_RATE_LIMIT_PER_MINUTE,
        private readonly windowMs = SYNC_RATE_WINDOW_MS,
        private readonly now: () => number = Date.now,
    ) {}

    /** 記一次請求；超過上限回 false */
    public hit(key: string): boolean {
        const at = this.now();
        const current = this.windows.get(key);
        if (!current || at - current.startedAt >= this.windowMs) {
            this.windows.set(key, { startedAt: at, count: 1 });
            return true;
        }
        current.count += 1;
        return current.count <= this.limit;
    }
}

function limitBody(code: SyncLimitResponse['code'], message: string): SyncLimitResponse {
    return { success: false, code, message, serverTime: Date.now() };
}

/** 掛在 /sync 路由前：超過次數回 429 / E008 */
export function syncRateLimitMiddleware(limiter = new SyncRateLimiter()): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.path.startsWith('/sync')) return next();
        const playerId = typeof req.body?.Player_ID === 'string' ? req.body.Player_ID : '';
        const key = playerId || req.ip || 'unknown';
        if (limiter.hit(key)) return next();
        res.status(429).json(limitBody('E008', 'Rate limit exceeded（每分鐘最多 10 次同步）'));
    };
}

/** 掛在路由後的錯誤處理：body 超過大小回 413 / E007，其他錯誤往下傳 */
export function syncPayloadTooLargeHandler() {
    return (err: { type?: string; status?: number } | undefined, _req: Request, res: Response, next: NextFunction) => {
        if (err && (err.type === 'entity.too.large' || err.status === 413)) {
            res.status(413).json(limitBody('E007', '存檔超過大小限制（5MB）'));
            return;
        }
        next(err);
    };
}
