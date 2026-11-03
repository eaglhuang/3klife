// @spec-source → 新手開場規格書.md §6（宿命轉蛋：六位初始名將，選誰誰當核心）；WBS OPEN-05；PROG-2-0645
// @spec-source → 新手開場規格書.md §4 分鏡 6、§5.2（六框立繪＋登場台詞）；PROG-2-1147
/**
 * DestinyOpeningController — 新局宿命轉蛋畫面的流程（純邏輯，不依賴 cc）。
 *
 * 職責：
 *   - 持有 DestinyGachaState，轉蛋（roll）、重置（reset）、選定（select）、確認（confirm）
 *   - 鎖定後呼叫 startNewGameFromDestiny 開新局，並把結果交給呼叫端存檔
 *   - 輸出扁平的 FlowView，key 與 destiny-opening-main.json 的節點 id 一一對應
 *   - 六框立繪（與招賢館同一套 btnFrame{i}／frame{i}* 節點，PROG-2-1147）：未轉蛋也列出六位，點選只選中，確認才開局
 *   - 盲盒揭曉（PROG-2-1621）：未看過的人只露綽號；轉蛋後點選才逐字浮現名字與台詞，看過一次就一直留著
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

/** 六位初始名將的稱號與登場台詞（新手開場規格書 §6 建議稱號、§5.2 登場台詞） */
export const DESTINY_INTRO: Readonly<Record<StarterGeneralId, { title: string; quote: string }>> = {
    'zhang-fei': { title: '萬人敵', quote: '主公！俺老張等這封信等得嗓子都乾了！' },
    'wei-yan': { title: '漢中鎮守', quote: '他們都說我有反骨，只有你願意給我這封信。' },
    'xiahou-dun': { title: '魏武元勳', quote: '雙眼尚在，戰魂未冷。' },
    'zhang-he': { title: '巧變之將', quote: '在這渾沌的亂世中，唯有主公的選擇，才配得上我這華麗的謝幕。' },
    'sun-ce': { title: '江東小霸王', quote: '江東的風吹到了現代，還是這麼燙人。' },
    'gan-ning': { title: '錦帆賊', quote: '這長江水，往後就歸主公管，我負責開路！' },
};

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
    /** 開局紅顏（紅顏池抽 1 位的武將 id）；沒有時回 null。 */
    beauty?: () => string | null;
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
    private _beautyId: string | null = null;
    /** 已揭曉的武將（看過名字與台詞），重置後仍保留 */
    private readonly _revealed = new Set<string>();
    /** 正在逐字浮現的武將與已露出的字數 */
    private _typing: { id: string; chars: number } | null = null;
    /** 正在逐字浮現時為 true，畫面層據此每格呼叫 tickReveal */
    public get revealing(): boolean { return this._typing !== null; }
    /** 開局抽到的紅顏武將 id（未開局或沒有時為 null）。 */
    public get beautyId(): string | null { return this._beautyId; }

    /** 六框立繪先選中、看完台詞再按確認（PROG-2-1147），不論設定都要確認 */
    private _options() { return { ...destinyOptionsFromConfig(this._deps.config()), confirmRequired: true }; }

    /** 目前畫面上的六位：未轉蛋依宿命池順序，轉蛋後依抽出順序 */
    private _shown(): readonly string[] { return this._state.phase === 'idle' ? DESTINY_POOL_IDS : this._state.rolled; }

    /** 六框立繪 key（與畫面順序一致），給畫面層載立繪 */
    public framePortraitKeys(): string[] { return [...this._shown()]; }

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

    /** 點第 index 框：只標記選中，等 confirm() 才開新局。 */
    public async select(index: number): Promise<boolean> {
        if (this._busy) return false;
        const id = this._state.rolled[index];
        if (id === undefined) return false;
        if (!this._apply(selectDestinyGacha(this._state, id, this._options()))) return false;
        if (!this._revealed.has(id) && this._typing?.id !== id) {
            this._finishTyping();
            this._typing = { id, chars: 0 };
        }
        return this._state.phase === 'locked' ? this._startGame() : true;
    }

    /** 確認目前選中的那一位並開新局。 */
    public async confirm(): Promise<boolean> {
        if (this._busy) return false;
        if (!this._apply(confirmDestinyGacha(this._state))) return false;
        return this._startGame();
    }

    /** 逐字浮現往前推 count 個字；全部露出後記為已揭曉 */
    public tickReveal(count = 1): void {
        if (!this._typing) return;
        this._typing.chars += count;
        if (this._typing.chars >= this._revealText(this._typing.id).length) this._finishTyping();
    }

    private _finishTyping(): void {
        if (this._typing) this._revealed.add(this._typing.id);
        this._typing = null;
    }

    /** 逐字浮現的完整內容：先名字再台詞 */
    private _revealText(id: string): string {
        const intro = DESTINY_INTRO[id as StarterGeneralId];
        return this._nameOf(id) + (intro ? `「${intro.quote}」` : '');
    }

    private async _startGame(): Promise<boolean> {
        this._busy = true;
        try {
            const beautyId = this._deps.beauty?.() ?? null;
            const coreId = await startNewGameFromDestiny(this._deps.session, this._deps.seed(), this._deps.generals(), this._state, beautyId);
            this._startedId = coreId;
            this._beautyId = beautyId;
            this._lastMessage = beautyId ? `紅顏 ${this._nameOf(beautyId)} 前來相會，已加入名冊，可到「結緣」配對` : '';
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
            destinyHint: idle ? '六位名將等你召喚：轉蛋決定登場順序，選中的人就是核心主將' : rolled ? (s.selected ? '確認後，這位名將就是你的核心主將' : '點選一位名將，聽完台詞再按確認') : '',
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
        const shown = this._shown();
        for (let i = 0; i < DESTINY_OPENING_MAX_ROWS; i++) {
            const id = shown[i];
            const intro = id !== undefined ? DESTINY_INTRO[id as StarterGeneralId] : undefined;
            actives[`btnFrame${i}`] = id !== undefined;
            const name = id !== undefined ? this._nameOf(id) : '';
            const quote = intro ? `「${intro.quote}」` : '';
            const shownChars = id === undefined ? 0
                : this._revealed.has(id) ? Infinity
                : this._typing?.id === id ? this._typing.chars : 0;
            if (shownChars === 0) {
                // 盲盒：只露綽號，放在名字欄當大字
                texts[`frame${i}Name`] = intro?.title ?? '';
                texts[`frame${i}Sub`] = '';
                texts[`frame${i}Quote`] = '';
            } else {
                texts[`frame${i}Name`] = name.slice(0, shownChars);
                texts[`frame${i}Sub`] = intro?.title ?? '';
                texts[`frame${i}Quote`] = quote.slice(0, Math.max(0, shownChars - name.length));
            }
            actives[`frame${i}Sel`] = id !== undefined && id === s.selected;
            enabled[`btnFrame${i}`] = id !== undefined && rolled && !this._busy;
        }
        return { texts, actives, enabled };
    }
}
