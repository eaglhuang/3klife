/**
 * LifeClock.ts — 生活時鐘與確定性亂數（QLIFE-01 3.1～3.3、2.3 第 5 點）
 *
 * 純函式。亂數先用本檔自帶的小型確定性亂數，日後可換共通底層（只要符合 LifeRng）。
 */
import type { LifeSeason, LifeSlot } from './types';

export const SLOTS_PER_DAY = 7;
/** 玩家待在生活層時，每個時段真實時間 90 秒（規格 3.2）。 */
export const SLOT_REAL_SECONDS = 90;

const SEASONS: LifeSeason[] = ['spring', 'summer', 'autumn', 'winter'];

/** 季度序號（1 起算）→ 季節：1 春 2 夏 3 秋 4 冬，之後循環。 */
export function seasonOfQuarter(quarter: number): LifeSeason {
    const idx = (((Math.floor(quarter) - 1) % 4) + 4) % 4;
    return SEASONS[idx];
}

/** 時段序號（本季內從 0 累計）→ 時段 1～7。 */
export function slotOfSeq(slotSeq: number): LifeSlot {
    const s = Math.floor(slotSeq);
    return ((((s % SLOTS_PER_DAY) + SLOTS_PER_DAY) % SLOTS_PER_DAY) + 1) as LifeSlot;
}

/** 時段序號 → 本季第幾個生活日（從 0 起；每 7 個時段一日）。 */
export function dayOfSeq(slotSeq: number): number {
    return Math.floor(Math.floor(slotSeq) / SLOTS_PER_DAY);
}

/** 進入生活層後經過的真實秒數 → 時段序號增量。 */
export function slotAdvanceFromSeconds(elapsedSeconds: number): number {
    return Math.max(0, Math.floor(elapsedSeconds / SLOT_REAL_SECONDS));
}

/** 手動切到指定時段（1～7）：回傳「同一生活日內」對應的時段序號。 */
export function seqForManualSlot(currentSeq: number, targetSlot: number): number {
    const t = Math.min(SLOTS_PER_DAY, Math.max(1, Math.floor(targetSlot)));
    return dayOfSeq(currentSeq) * SLOTS_PER_DAY + (t - 1);
}

/** 24 小時制整點 → 時段（規格 3.1：晨 05～08、上午 08～11、午 11～14、下午 14～17、傍晚 17～20、夜 20～24、深夜 00～05）。 */
export function slotFromHour(hour: number): LifeSlot {
    const h = ((hour % 24) + 24) % 24;
    if (h >= 5 && h < 8) return 1;
    if (h >= 8 && h < 11) return 2;
    if (h >= 11 && h < 14) return 3;
    if (h >= 14 && h < 17) return 4;
    if (h >= 17 && h < 20) return 5;
    if (h >= 20) return 6;
    return 7;
}

// ───────────────────────── 確定性亂數 ─────────────────────────

/** 回傳 [0,1) 的亂數函式。 */
export type LifeRng = () => number;

/** FNV-1a 32 位元雜湊。 */
function fnv1a(text: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
}

/** seed＝(generalId, 季度序號, 時段序號)；salt 用來在同一 seed 下切出獨立的亂數流（例如「中途換場景」）。 */
export function lifeSeed(generalId: string, quarter: number, slotSeq: number, salt: string = ''): number {
    return fnv1a(`${generalId}|${Math.floor(quarter)}|${Math.floor(slotSeq)}|${salt}`);
}

/** mulberry32：小型確定性亂數。 */
export function createLifeRng(seed: number): LifeRng {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function createLifeRngFor(generalId: string, quarter: number, slotSeq: number, salt: string = ''): LifeRng {
    return createLifeRng(lifeSeed(generalId, quarter, slotSeq, salt));
}
