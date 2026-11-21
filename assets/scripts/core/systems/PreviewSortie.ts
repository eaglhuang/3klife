/**
 * QA 預覽／直進戰場的模擬出征帳本（PROG-2-9711）。
 *
 * 委任（自動代打）只能部署出征軍勢；預覽戰場（LoadingScene previewTarget=5）與 ?qaBattle=1 直進戰場
 * 沒有大廳出征帳本，委任 AI 永遠不出兵，試玩腳本測不到「自動」這條路。
 * 這裡用預設編成（主將統率算軍勢，城市兵源與糧草取固定值）補一份帳本，只供戰場內部署與委任使用；
 * 戰後結算不把它寫回存檔（見 BattleController.isPreviewSortie）。
 */
import type { CreateSortieInput } from './SortieDeploy';
import { computeCommandCapacity } from './SortieDeploy';

export type BattleEntrySourceLike = 'lobby' | 'preview' | 'replay' | 'qa' | undefined | null;

/** 模擬帳本的城市兵源與糧草：取新玩家第一年中段的量級（一年份試玩快照約兵 2900、糧 1400） */
export const PREVIEW_SORTIE_DEFAULTS = Object.freeze({
    cityTroops: 3000,
    food: 1500,
});

/** 只有 QA 預覽與直進戰場才補模擬帳本；正式大廳入口與再戰一次不補 */
export function wantsPreviewSortie(entrySource: BattleEntrySourceLike): boolean {
    return entrySource === 'preview' || entrySource === 'qa';
}

/** 用主將統率與名聲算出征軍勢，兵源糧草用預設值 */
export function buildPreviewSortieInput(general: { lea?: number; generalRank?: number; generalFame?: number }): CreateSortieInput {
    return {
        commandCapacity: computeCommandCapacity({ lea: general.lea ?? 0, generalRank: general.generalRank, fameBonus: general.generalFame }),
        cityTroops: PREVIEW_SORTIE_DEFAULTS.cityTroops,
        food: PREVIEW_SORTIE_DEFAULTS.food,
    };
}
