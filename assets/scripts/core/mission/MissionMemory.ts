/**
 * MissionMemory — 武將記憶 → 任務適合度偏移與提示（純函式，不 import 'cc'，也不依賴 core/mind 的實作）
 *
 * 委任選將（pickDelegate）吃的 executorAffinity 由這裡算：
 *  - 同主題做過幾次、勝幾敗幾（含牆別，權重較低）→ -1～1；樣本越少越保守（分母 +2）。
 *  - 心情 HIGH 微幅加分、LOW 微幅扣分（情緒好的人比較肯拚）。
 * 記憶提示給 UI 顯示，例「曾 3 次勝任巡防」「巡防近來連敗」。
 */
export interface MemoryTagStat { win: number; loss: number; streakLoss?: number }
export interface MemoryLedgerLike { byTag?: Record<string, MemoryTagStat | undefined> }
export type MemoryMood = 'EAGER' | 'HIGH' | 'NORMAL' | 'LOW';

const THEME_WEIGHT = 2;
const WALL_WEIGHT = 1;
const MOOD_SHIFT: Record<MemoryMood, number> = { EAGER: 0.1, HIGH: 0.1, NORMAL: 0, LOW: -0.15 };

function tagScore(stat: MemoryTagStat | undefined): { n: number; score: number } {
    if (!stat) return { n: 0, score: 0 };
    const n = (stat.win || 0) + (stat.loss || 0);
    if (n <= 0) return { n: 0, score: 0 };
    return { n, score: ((stat.win || 0) - (stat.loss || 0)) / (n + 2) };
}

/** executorAffinity：-1～1；沒有記憶時為 0（心情另計） */
export function affinityFromLedger(ledger: MemoryLedgerLike | undefined, theme: string, wall: string | null, mood: MemoryMood = 'NORMAL'): number {
    const t = tagScore(ledger?.byTag?.[theme]);
    const w = wall ? tagScore(ledger?.byTag?.[wall]) : { n: 0, score: 0 };
    let sum = 0, weight = 0;
    if (t.n > 0) { sum += t.score * THEME_WEIGHT; weight += THEME_WEIGHT; }
    if (w.n > 0) { sum += w.score * WALL_WEIGHT; weight += WALL_WEIGHT; }
    const base = weight > 0 ? sum / weight : 0;
    return Math.max(-1, Math.min(1, base + MOOD_SHIFT[mood]));
}

/** 給 UI 的記憶提示；沒有值得說的記憶時回傳空字串 */
export function memoryHintFromLedger(ledger: MemoryLedgerLike | undefined, theme: string, themeLabel: string): string {
    const stat = ledger?.byTag?.[theme];
    if (!stat) return '';
    if ((stat.streakLoss ?? 0) >= 2) return `${themeLabel}近來連敗`;
    if (stat.win >= 2 && stat.win > stat.loss) return `曾 ${stat.win} 次勝任${themeLabel}`;
    if (stat.loss >= 2 && stat.loss > stat.win) return `${themeLabel}屢屢失利`;
    return '';
}
