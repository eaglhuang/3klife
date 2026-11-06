// @spec-source → 運氣系統 §商業鉤 天命重置卷（LUK-07，PROG-2-1923）
/**
 * FateReset — 天命重置卷：消耗 1 張，重新擲結緣 EP 的天命波動值（純邏輯，不依賴 cc）。
 *
 * - 重擲沿用 rollFateWave（父母平均 LUK 決定區間），applyFateWave 先扣舊值再套新值，不會疊加。
 * - 先扣道具再重擲；沒有道具時不擲骰、EP 原樣回傳。
 *
 * 暫定：只用在結緣預覽／出生前的 EP；出生後重算子嗣數值另卡。
 * Unity 對照：像花一個消耗品重抽一次 Random.Range，結果覆蓋舊值。
 */
import { applyFateWave, rollFateWave, type EpBreakdown } from './BreedingSystem';
import type { RandomSource } from './GeneralAging';

/** 扣道具介面：成功扣 1 張回 true。 */
export interface FateResetItemSource {
    consume(): boolean;
}

export const FATE_RESET_MESSAGE = '命運重新輪轉…{Name} 的天命波動已重置。';

export function resetFateWave(
    ep: Readonly<EpBreakdown>, parentAvgLuk: number, random: RandomSource, items: FateResetItemSource,
): { ok: boolean; ep: EpBreakdown } {
    if (!items.consume()) return { ok: false, ep: { ...ep } };
    return { ok: true, ep: applyFateWave(ep as EpBreakdown, rollFateWave(parentAvgLuk, random)) };
}
