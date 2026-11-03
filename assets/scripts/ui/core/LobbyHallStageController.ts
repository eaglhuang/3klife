// @spec-source → 大廳系統規格書 doc_spec_0002 E-5（每 60 秒輪換在場武將）；UI-2-0142（UI-2-0123 子項）
/**
 * LobbyHallStageController — 幕府大廳 Q 版武將的畫面流程（純邏輯，不依賴 cc）。
 *
 * 職責：
 *   - open：重置導演並立刻排一次站位
 *   - tick：請 GameSession 刷新點位（60 秒內沿用舊點位），取在場名單，交給 HallStageDirector；
 *     名單有變才通知畫面重建，沒變不動，idle 動畫不中斷
 *   - close：清空畫面並重置，下次 open 必定重排
 *
 * 依賴全由呼叫端注入：LobbyScene 接 GameSession.refreshHallSpots / hallStageCast 與 HallStageCrowd。
 * Unity 對照：Presenter。Update() 裡呼叫 tick(Time.time)，View 只負責 Instantiate。
 */
import { HallStageCast, HallStageDirector } from '../../core/systems/HallStageDirector';
import type { HallStageLayout, HallStagePlacement } from '../../core/systems/HallStagePlanner';

export interface LobbyHallStageView {
    show(placements: readonly HallStagePlacement[]): void;
    clear(): void;
}

export interface LobbyHallStageDeps {
    /** 刷新點位；60 秒內重複呼叫應沿用舊點位（GameSession.refreshHallSpots）。 */
    refreshSpots(nowSec: number): void;
    /** 目前點位上的在場名單與任務標記（GameSession.hallStageCast）。 */
    cast(): HallStageCast;
    view: LobbyHallStageView;
}

export class LobbyHallStageController {
    private readonly _director: HallStageDirector;
    private _open = false;

    constructor(layout: Readonly<HallStageLayout>, private readonly _deps: LobbyHallStageDeps) {
        this._director = new HallStageDirector(layout);
    }

    public get isOpen(): boolean {
        return this._open;
    }

    public open(nowSec: number): void {
        this._open = true;
        this._director.reset();
        this.tick(nowSec);
    }

    /** 回傳這次是否重建了畫面；未開啟時不做事。 */
    public tick(nowSec: number): boolean {
        if (!this._open) return false;
        this._deps.refreshSpots(nowSec);
        const placements = this._director.update(this._deps.cast());
        if (!placements) return false;
        this._deps.view.show(placements);
        return true;
    }

    public close(): void {
        if (!this._open) return;
        this._open = false;
        this._deps.view.clear();
        this._director.reset();
    }
}
