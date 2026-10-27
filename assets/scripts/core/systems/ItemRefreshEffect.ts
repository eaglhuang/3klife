// @spec-source → 道具系統（付費免費道具）.md §F 道具完整清單 ITEM_REFRESH 刷新券（手動刷新傭兵池/地下城）；ITM-04b；PROG-2-1033
/**
 * ItemRefreshEffect — 刷新券的效果（純邏輯，不依賴 cc）。
 *
 * - 效果類型 REFRESH：一張刷新券讓傭兵池與地下城救美任務的冷卻立即到期。
 * - 做法是把兩者的「上次刷新時間」往前推到剛好滿一個冷卻週期，
 *   下次進入時既有的 isFemalePoolRefreshDue／isRescueRefreshDue 會判定為到期並重新抽取。
 * - 只算新的時間戳，不扣道具、不直接重抽；扣道具與實際重抽的呼叫點由道具使用流程負責（另卡）。
 * - 效果值未通過派發器驗證（非正數）時不改任何時間戳。
 *
 * Unity 對照：像把兩個 Cooldown Timer 的 lastTime 往前撥一個週期，
 * 讓下一次 Update 的 if (Time >= next) 立即成立，不去直接呼叫 Spawn()。
 */
import { createItemEffectDispatcher, ItemEffectResult } from './ItemEffectDispatcher';
import { FEMALE_POOL_REFRESH_HOURS } from './FemalePoolRefresh';
import { RESCUE_REFRESH_HOURS } from './DungeonRescue';

const MS_PER_HOUR = 60 * 60 * 1000;

export interface RefreshItemContext {
    /** 現在時間（毫秒），由呼叫端提供 */
    nowMs: number;
}

export interface RefreshItemResult {
    /** 寫回傭兵池的上次刷新時間；到期判斷為真 */
    femalePoolLastRefreshMs: number;
    /** 寫回救美任務的上次刷新時間；到期判斷為真 */
    dungeonRescueLastRefreshMs: number;
}

const refreshEffects = createItemEffectDispatcher<RefreshItemContext, RefreshItemResult>({
    REFRESH: (_value, ctx) => ({
        femalePoolLastRefreshMs: ctx.nowMs - FEMALE_POOL_REFRESH_HOURS * MS_PER_HOUR,
        dungeonRescueLastRefreshMs: ctx.nowMs - RESCUE_REFRESH_HOURS * MS_PER_HOUR,
    }),
});

/**
 * 使用一張刷新券（效果值由道具定義帶入，一張為 1）。
 * 回傳派發結果；失敗時呼叫端不應寫回任何時間戳。
 */
export function applyRefreshItem(value: number, ctx: RefreshItemContext): ItemEffectResult<RefreshItemResult> {
    return refreshEffects.apply('REFRESH', value, ctx);
}
