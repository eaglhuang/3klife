// @spec-source → 主戰場UI規格書.md (doc_ui_0001)；PROG-2-9427 勝敗結算演出打磨
/**
 * BattleResultBeat.ts — 分出勝負那一拍：橫幅文字配色、停頓時間，以及要不要延後開結算窗（純邏輯）
 *
 * 以前敵將一倒，結算窗就直接蓋上，玩家感受不到「贏了」的那一下。
 * 現在先打全畫面勝敗橫幅（沿用回合橫幅元件）停一拍，再開結算窗；停頓期間順便預載主將頭像。
 * 玩家自己按撤退時已經知道結果，結算窗照舊立即開。
 *
 * Unity 對照：static class 回傳顯示資料與 Coroutine 等待秒數，View 層照著播。
 */

export interface BattleResultBannerSpec {
    text: string;
    rgba: readonly [number, number, number, number];
}

const WIN_BANNER: BattleResultBannerSpec = { text: '勝利', rgba: [255, 217, 102, 255] };
const LOSE_BANNER: BattleResultBannerSpec = { text: '敗北', rgba: [235, 86, 70, 255] };
const RETREAT_BANNER: BattleResultBannerSpec = { text: '撤退', rgba: [200, 150, 140, 255] };
const DRAW_BANNER: BattleResultBannerSpec = { text: '平手', rgba: [215, 215, 215, 255] };

/** 勝敗橫幅：勝金、敗紅、平手灰；回合用盡判敗（retreated=true 但非主動撤退）也顯示撤退 */
export function battleResultBannerOf(result: string, retreated = false): BattleResultBannerSpec | null {
    if (result === 'player-win') return WIN_BANNER;
    if (result === 'enemy-win') return retreated ? RETREAT_BANNER : LOSE_BANNER;
    if (result === 'draw') return DRAW_BANNER;
    return null;
}

export const BATTLE_RESULT_BEAT = Object.freeze({
    /** 橫幅總長（含淡入淡出），比開窗延遲略長，結算窗淡入時橫幅剛好淡出 */
    bannerSec: 1.6,
    /** 分出勝負到開結算窗的停頓 */
    popupDelayMs: 1300,
});

/** 這次結束要不要先停一拍再開結算窗：玩家主動撤退不用停（他已經知道結果） */
export function shouldHoldBeforeResult(data: { retreated?: boolean; timeUp?: boolean; cause?: string }): boolean {
    const playerRetreat = data.retreated === true && data.timeUp !== true && data.cause !== 'time-up';
    return !playerRetreat;
}
