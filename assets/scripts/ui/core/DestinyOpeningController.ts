// @spec-source → 新手開場規格書.md §6（宿命轉蛋：六位初始名將，選誰誰當核心）；WBS OPEN-05；PROG-2-0645
/**
 * DestinyOpeningController — 新局宿命轉蛋畫面的流程（純邏輯，不依賴 cc）。
 *
 * 職責：
 *   - 持有 DestinyGachaState，轉蛋（roll）、重置（reset）、選定（select）、確認（confirm）
 *   - 鎖定後呼叫 startNewGameFromDestiny 開新局，並把結果交給呼叫端存檔
 *   - 輸出扁平的 FlowView，key 與 destiny-opening-main.json 的節點 id 一一對應
 *
 * Unity 對照：Presenter。按鈕 onClick 只呼叫這裡的方法，畫面層拿 getFlowView() 一次刷新。
 */
import type { GachaConfig } from '../../core/models/GachaConfig';
import type { GeneralConfig } from '../../core/models/GeneralUnit';
import {
    confirmDestinyGacha, createDestinyGachaState, resetDestinyGacha, selectDestinyGacha,
    type DestinyGachaResult, type DestinyGachaState,
} from '../../core/systems/DestinyGacha';
import {
    DESTINY_POOL_IDS, destinyOptionsFromConfig, rollDestinyPool, startNewGameFromDestiny,
    type DestinyNewGameTarget,
} from '../../core/systems/DestinyPool';
import type { StarterGeneralId } from '../../core/services/StarterRosterService';

/** 候選列最多六格（宿命池就是六位）。 */
export const DESTINY_OPENING_MAX_ROWS = DESTINY_POOL_IDS.length;

export interface DestinyOpeningFlowView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

export interface DestinyOpeningDeps {
    /** 宿命轉蛋規則（gacha-config.json 的 hero-pool），抽數會封頂在六。 */
    config: () => Readonly<GachaConfig>;
    /** 武將資料（generals.json），開新局與顯示名字用。 */
    generals: () => readonly GeneralConfig[];
    /** 開新局的目標（GameSession）。 */
    session: DestinyNewGameTarget;
    /** 抽卡亂數（services().session.randomSource，Q25）。 */
    random: () => number;
    /** 新局種子。 */
    seed: () => number;
    /** 鎖定並開局後呼叫，通常是存檔。 */
    onStarted: (coreId: StarterGeneralId) => Promise<void> | void;
}

export class DestinyOpeningController {
    private _state: DestinyGachaState = createDestinyGachaState();
    private _lastMessage = '';
    private _busy = false;

    constructor(private readonly _deps: DestinyOpeningDeps) {}

    public get state(): Readonly<DestinyGachaState> { return this._state; }
    /** 已鎖定並開完新局。 */
    public get started(): boolean { return this._state.phase === 'locked' && !this._busy && this._startedId !== null; }
    private _startedId: StarterGeneralId | null = null;

    private _options() { return destinyOptionsFromConfig(this._deps.config()); }

    private _apply(result: DestinyGachaResult): boolean {
        this._lastMessage = result.ok ? '' : `無法操作（${result.reason}）`;
        if (result.ok) this._state = result.state;
        return result.ok;
    }

    private _nameOf(id: string): string {
        return this._deps.generals().find(general => general.id === id)?.name ?? id;
    }

    /** 轉蛋：抽出本輪候選。 */
    public roll(): boolean {
        if (this._busy) return false;
        return this._apply(rollDestinyPool(this._state, this._options(), this._deps.random));
    }

    /** 重置：免費、不限次數，回到未抽狀態。 */
    public reset(): boolean {
        if (this._busy) return false;
        return this._apply(resetDestinyGacha(this._state, this._options()));
    }

    /**
     * 點候選列。confirmRequired 為 false 時選定即鎖定並開新局；
     * 為 true 時只標記選中，等 confirm()。
     */
    public async select(index: number): Promise<boolean> {
        if (this._busy) return false;
        const id = this._state.rolled[index];
        if (id === undefined) return false;
        if (!this._apply(selectDestinyGacha(this._state, id, this._options()))) return false;
        return this._state.phase === 'locked' ? this._startGame() : true;
    }

    /** 確認目前選中的那一位並開新局。 */
    public async confirm(): Promise<boolean> {
        if (this._busy) return false;
        if (!this._apply(confirmDestinyGacha(this._state))) return false;
        return this._startGame();
    }

    private async _startGame(): Promise<boolean> {
        this._busy = true;
        try {
            const coreId = await startNewGameFromDestiny(this._deps.session, this._deps.seed(), this._deps.generals(), this._state);
            this._startedId = coreId;
            await this._deps.onStarted(coreId);
            return true;
        } catch (error) {
            // 開局失敗：退回「已抽未鎖」，讓玩家能重選或重置，不卡死在鎖定終態
            this._state = { ...this._state, phase: 'rolled', locked: null, selected: null };
            this._lastMessage = `開局失敗：${error instanceof Error ? error.message : String(error)}`;
            return false;
        } finally {
            this._busy = false;
        }
    }

    /** 扁平 FlowView：key 與 destiny-opening-main.json 的節點 id 對應。 */
    public getFlowView(): DestinyOpeningFlowView {
        const s = this._state;
        const idle = s.phase === 'idle';
        const rolled = s.phase === 'rolled';
        const texts: Record<string, string> = {
            destinyTitle: '宿命轉蛋',
            destinyHint: idle ? '抽出你的初始名將，選中的人就是核心主將' : rolled ? '點選一位名將作為核心主將' : '',
            destinyMessage: this._lastMessage,
            destinyResetCount: `重置 ${s.resets} 次`,
            btnDestinyRollLabel: '轉蛋',
            btnDestinyResetLabel: '重置',
            btnDestinyConfirmLabel: '確認',
        };
        const actives: Record<string, boolean> = {};
        const enabled: Record<string, boolean> = {
            btnDestinyRoll: idle && !this._busy,
            btnDestinyReset: rolled && !this._busy,
            btnDestinyConfirm: rolled && s.selected !== null && !this._busy,
        };
        for (let i = 0; i < DESTINY_OPENING_MAX_ROWS; i++) {
            const id = s.rolled[i];
            actives[`destinyRow${i}`] = id !== undefined;
            texts[`destinyRow${i}Name`] = id !== undefined ? this._nameOf(id) : '';
            texts[`btnDestinyRow${i}Label`] = id !== undefined && id === s.selected ? '已選' : '選擇';
            enabled[`btnDestinyRow${i}`] = id !== undefined && rolled && !this._busy;
        }
        return { texts, actives, enabled };
    }
}
