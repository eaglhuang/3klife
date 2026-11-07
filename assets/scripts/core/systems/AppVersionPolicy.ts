/**
 * App 版號策略（PROG-2-1990，HOT-01；熱更新與版本控制規格書 doc_tech_0012 §一）
 *
 * - Major 不同 → 無法熱更，強制中斷並導向商店下載新版
 * - Minor 較舊 → 進 LoadingScene 前下載資料包（顯示進度條）
 * - Patch 較舊 → 無感微熱更（快速驗證）
 * - 其餘 → 不需更新
 *
 * 純邏輯，不碰網路；伺服器版號由呼叫端取得後傳入。
 */
import { parseSemver } from '../storage/SaveVersion';

export type AppUpdateAction = 'force-store-update' | 'hot-update-download' | 'hot-update-quick' | 'up-to-date';

export interface AppUpdateDecision {
    action: AppUpdateAction;
    /** 是否阻擋進入遊戲 */
    blocking: boolean;
}

/** 規格 §一 Major 行為的提示文字 */
export const FORCE_STORE_UPDATE_MESSAGE = '請前往 Google Play / App Store 下載最新版本';

export function decideAppUpdate(localVersion: string, serverVersion: string): AppUpdateDecision {
    const local = parseSemver(localVersion);
    const server = parseSemver(serverVersion);
    if (!local || !server) throw new Error(`[AppVersionPolicy] 不是合法的 semver：${localVersion} / ${serverVersion}`);
    if (local.major !== server.major) return { action: 'force-store-update', blocking: true };
    if (local.minor < server.minor) return { action: 'hot-update-download', blocking: false };
    if (local.minor === server.minor && local.patch < server.patch) return { action: 'hot-update-quick', blocking: false };
    return { action: 'up-to-date', blocking: false };
}
