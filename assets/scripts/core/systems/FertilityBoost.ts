// @spec-source → 道具系統（付費免費道具）.md §F 道具完整清單 ITEM_FERTILITY 安胎藥（受孕率 ×1.5）；ITM-04b；PROG-2-1032
/**
 * FertilityBoost — 安胎藥的受孕率倍率（純邏輯，不依賴 cc）。
 *
 * - 效果類型 BOOST_CONCEPTION，效果值為受孕率倍率 1.5。
 * - 只算倍率，不扣道具；扣道具與「下一次結緣才生效」的時機由道具使用流程負責（另卡）。
 * - 派發失敗時回傳 1，不拋例外。
 *
 * Unity 對照：像 Buff 的 multiplier，只在計算受孕時讀取一次，不改角色本身的數值。
 */
import { createItemEffectDispatcher } from './ItemEffectDispatcher';

export const FERTILITY_CONCEPTION_MULTIPLIER = 1.5;

const boostEffects = createItemEffectDispatcher<object, number>({
    BOOST_CONCEPTION: (value) => value,
});

/** active 為 true 時回傳安胎藥的受孕率倍率，否則為 1。 */
export function fertilityConceptionMod(active: boolean): number {
    if (!active) return 1;
    const result = boostEffects.apply('BOOST_CONCEPTION', FERTILITY_CONCEPTION_MULTIPLIER, {});
    return result.ok === true ? result.result : 1;
}
