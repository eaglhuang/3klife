// @spec-source → 培育系統.md (doc_spec_0026) §子嗣資訊分層揭露；Data Schema 文件 §Child_Preview.Revelation_Level
/**
 * StatRevelation — 子嗣屬性的分層揭露（純邏輯，不依賴 cc）
 *
 * 規格：Revelation_Level 依序為 HIDDEN（完全隱藏）→ TENDENCY（傾向）→ RANGE（區間）→ EXACT（精確值）。
 * 每項屬性各自有揭露層級，層級越高看得越準。
 *
 * 暫定（規格只有層級名，沒有切分數值）：
 *   - TENDENCY：0~39 低、40~69 中、70~100 高。
 *   - RANGE：以 10 為一格，回傳所在區間 [下限, 下限+9]。
 *   - 數值必須是非負有限數；Schema 範例的 Max_Potential 可超過 100，故不設上限。
 *
 * Unity 對照：像一個 static 格式器，吃一個數值與揭露層級，回傳 UI 要顯示的內容；不改武將資料。
 */

export const REVELATION_LEVELS = ['HIDDEN', 'TENDENCY', 'RANGE', 'EXACT'] as const;
export type RevelationLevel = typeof REVELATION_LEVELS[number];

export const REVELATION_RANGE_WIDTH = 10;
export const REVELATION_TENDENCY_LOW_MAX = 39;
export const REVELATION_TENDENCY_MID_MAX = 69;

export type TendencyBand = '低' | '中' | '高';

export type RevealedStat =
    | { level: 'HIDDEN' }
    | { level: 'TENDENCY'; tendency: TendencyBand }
    | { level: 'RANGE'; low: number; high: number }
    | { level: 'EXACT'; value: number };

export function isRevelationLevel(value: unknown): value is RevelationLevel {
    return typeof value === 'string' && (REVELATION_LEVELS as readonly string[]).includes(value);
}

/** 依揭露層級回傳該屬性對玩家可見的內容；數值非法時拋 RangeError */
export function revealStat(value: number, level: RevelationLevel): RevealedStat {
    if (!Number.isFinite(value) || value < 0) {
        throw new RangeError('屬性數值必須是非負有限數');
    }
    switch (level) {
        case 'HIDDEN':
            return { level };
        case 'TENDENCY': {
            const tendency: TendencyBand = value <= REVELATION_TENDENCY_LOW_MAX ? '低' : value <= REVELATION_TENDENCY_MID_MAX ? '中' : '高';
            return { level, tendency };
        }
        case 'RANGE': {
            const low = Math.floor(value / REVELATION_RANGE_WIDTH) * REVELATION_RANGE_WIDTH;
            return { level, low, high: low + REVELATION_RANGE_WIDTH - 1 };
        }
        case 'EXACT':
            return { level, value };
        default:
            throw new RangeError(`未知的揭露層級：${String(level)}`);
    }
}
