// @spec-source → 資源循環系統.md §F 第 7 點（大器晚成偵測：精力極低時觸發線索）與 §G「大器線索」文案；WBS v4 VIT-07；PROG-2-0316
/**
 * LateBloomClue — 大器晚成線索（純邏輯，不依賴 cc）
 *
 * 培育中精力極低時，給玩家一句「雖然虛弱，但眼中似有異光…」的線索，暗示此子可能大器晚成。
 * 只產生文案，不改任何數值。
 *
 * 暫定：「極低」取精力上限的 20%，與 武將系統.md UI_VITALITY_LOW（<20%）一致；規格未給數字。
 *
 * Unity 對照：類似 Animator 的條件觸發器，數值跨過門檻時才顯示提示 UI，不回寫狀態。
 */

export const LATE_BLOOM_CLUE_RATIO = 0.2;

export const LATE_BLOOM_CLUE_TEXT = '雖然虛弱，但眼中似有異光…';

/** 精力低於上限的 20% 時回傳線索文案，否則回傳 null。上限不合法時不給線索。 */
export function lateBloomClueText(vigor: number, vigorMax: number): string | null {
    if (!Number.isFinite(vigor) || !Number.isFinite(vigorMax) || vigorMax <= 0) return null;
    return vigor < vigorMax * LATE_BLOOM_CLUE_RATIO ? LATE_BLOOM_CLUE_TEXT : null;
}
