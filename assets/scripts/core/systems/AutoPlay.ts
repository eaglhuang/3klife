// @spec-source → 戰場部署系統.md (doc_spec_0040)／極速決戰規格 doc_spec_1170；PROG-2-9707（使用者 2026-11-21 裁決）
/**
 * AutoPlay — 戰場「自動」鈕的自動代打判斷（純邏輯，不依賴 cc，可直接單元測試）。
 *
 * 第一次按自動＝開啟自動代打（AI 部署、每回合自動結束回合，玩家看得到過程）；
 * 自動代打中再按一次＝跳過演出，直接極速決戰結算（cause 'auto'）；
 * 按「委任」關閉（或沒有出征軍勢時按委任）＝同時關閉自動代打，交還指揮權。
 *
 * Unity 對照：像一個 AutoPilot 的狀態旗標＋輸入判斷，MonoBehaviour 只負責呼叫與排程。
 */

export const AUTO_PLAY_ON_LINE = '自動代打：由 AI 部署並逐回合交戰，再按一次自動可跳過演出';
export const AUTO_PLAY_OFF_LINE = '自動代打已停止，交還指揮權';
export const AUTO_PLAY_SKIP_LINE = '跳過演出，極速決戰結算';
/** 沒有出征軍勢（無法委任部署）時的補充說明：仍會自動結束回合 */
export const AUTO_PLAY_NO_SORTIE_LINE = '這場戰鬥沒有出征軍勢，自動代打只會自動結束回合';

/** 自動鈕按下後的結果：未開啟 → 開啟；已開啟 → 跳過演出 */
export type AutoPlayPress = 'start' | 'skip';

export class AutoPlayState {
    private _active = false;

    public get active(): boolean { return this._active; }

    /** 按下自動鈕：回傳該做的動作並更新狀態（skip 後自動代打也結束） */
    public press(): AutoPlayPress {
        if (!this._active) { this._active = true; return 'start'; }
        this._active = false;
        return 'skip';
    }

    /** 停止自動代打；原本開著回 true（呼叫端據此決定要不要提示） */
    public stop(): boolean {
        const was = this._active;
        this._active = false;
        return was;
    }
}

/**
 * 委任鈕被按下時是否要一併停掉自動代打：
 * 自動代打中，關閉委任固然要停；沒有出征軍勢而按委任（只會得到「無法委任」）也視為想拿回控制權。
 */
export function delegateToggleStopsAutoPlay(autoActive: boolean, delegateOn: boolean, canDelegate: boolean): boolean {
    return autoActive && (!delegateOn || !canDelegate);
}

export interface AutoPlayEndTurnState {
    active: boolean;
    battleEnded: boolean;
    isAdvancingTurn: boolean;
    waitingDuelPlacement: boolean;
    duelPanelActive: boolean;
}

/** 現在是否該替玩家按結束回合：自動代打中、戰鬥沒結束、回合沒在推進、沒在等出陣或單挑 */
export function shouldAutoEndTurn(s: AutoPlayEndTurnState): boolean {
    return s.active && !s.battleEnded && !s.isAdvancingTurn && !s.waitingDuelPlacement && !s.duelPanelActive;
}
