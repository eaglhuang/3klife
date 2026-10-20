// @spec-source → 武將人物介面規格書.md §6.6（五階血脈傳承奧義）；PROG-2-0738（五階三步之二）
/**
 * UltimateProgress — 五階奧義的名聲與事蹟讀取（純邏輯，不依賴 cc）
 *
 * 暫定選擇（可逆，待 PM 指定正式來源）：
 *   - 名聲與事蹟的正式來源尚未定案，這版讀武將上的同名可選欄位；缺欄位或不合法時一律當 0。
 *   - 讀取只做防呆，不累計計數；計數由呼叫端寫入。
 */
import type { UltimateProgressInput } from './BloodlineTransmissionUltimate';

/** 可讀取進度的來源欄位（都是可選） */
export interface UltimateProgressSource {
    fame?: number;
    incidents?: number;
    epicIncidents?: number;
}

/** 非負整數防呆：缺值、NaN、負數一律回 0 */
function nonNegativeCount(value: number | undefined): number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

/** 讀出五階奧義階段判定所需的名聲與事蹟次數 */
export function ultimateProgressOf(source: UltimateProgressSource | undefined): UltimateProgressInput {
    return {
        fame: nonNegativeCount(source?.fame),
        incidents: nonNegativeCount(source?.incidents),
        epicIncidents: nonNegativeCount(source?.epicIncidents),
    };
}
