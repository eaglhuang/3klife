// @spec-source → 使用者裁定 2026-11-12（doc_spec_0471 文首：十連全收、單鍵確定、無選擇框）；轉蛋系統.md §L；PROG-2-2243
/**
 * DestinyOpeningController — 新手開場「宿命池」的流程（純邏輯，不依賴 cc）。
 *
 * 宿命池是轉蛋系統的一池：畫面用轉蛋十連結果畫面，只有「重轉」與「確定」。
 *   - roll／reroll：免費無限重轉，每輪恰一位六大宿命名將＋一般武將（規則在 gacha-config.json 的 destiny-pool）
 *   - confirm：十位全收，本輪的宿命名將當核心主將，開新局後交給呼叫端存檔
 *
 * Unity 對照：Presenter。結果畫面的按鈕只呼叫這裡的方法，畫面層拿 view 重畫。
 */
import type { GachaConfig } from '../../core/models/GachaConfig';
import type { GeneralConfig } from '../../core/models/GeneralUnit';
import {
    createDestinyGachaState, resetDestinyGacha, selectDestinyGacha,
    type DestinyGachaResult, type DestinyGachaState,
} from '../../core/systems/DestinyGacha';
import {
    destinyCoreOf, destinyOptionsFromConfig, rollDestinyPool, startNewGameFromDestiny,
    type DestinyNewGameTarget,
} from '../../core/systems/DestinyPool';
import type { StarterGeneralId } from '../../core/services/StarterRosterService';

/** 六位初始名將的稱號與登場台詞（新手開場規格書 §6 建議稱號、§5.2 登場台詞） */
export const DESTINY_INTRO: Readonly<Record<StarterGeneralId, { title: string; quote: string }>> = {
    'zhang-fei': { title: '萬人敵', quote: '主公！俺老張等這封信等得嗓子都乾了！' },
    'wei-yan': { title: '漢中鎮守', quote: '他們都說我有反骨，只有你願意給我這封信。' },
    'xiahou-dun': { title: '魏武元勳', quote: '雙眼尚在，戰魂未冷。' },
    'zhang-he': { title: '巧變之將', quote: '在這渾沌的亂世中，唯有主公的選擇，才配得上我這華麗的謝幕。' },
    'sun-ce': { title: '江東小霸王', quote: '江東的風吹到了現代，還是這麼燙人。' },
    'gan-ning': { title: '錦帆賊', quote: '這長江水，往後就歸主公管，我負責開路！' },
};

/** 結果畫面要的資料 */
export interface DestinyPoolView {
    rolledIds: readonly string[];
    /** 本輪核心（宿命名將） */
    coreId: string | null;
    /** 本輪核心的登場台詞 */
    quote: string;
    resets: number;
    message: string;
    busy: boolean;
}

export interface DestinyOpeningDeps {
    /** 宿命池設定（gacha-config.json 的 destiny-pool）。 */
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
    private _startedId: StarterGeneralId | null = null;
    private _beautyId: string | null = null;

    constructor(private readonly _deps: DestinyOpeningDeps) {}

    public get state(): Readonly<DestinyGachaState> { return this._state; }
    /** 已鎖定並開完新局。 */
    public get started(): boolean { return this._state.phase === 'locked' && !this._busy && this._startedId !== null; }
    /** 開局抽到的紅顏武將 id（未開局或沒有時為 null）。 */
    public get beautyId(): string | null { return this._beautyId; }

    private _rules() {
        return { ...destinyOptionsFromConfig(this._deps.config()), confirmRequired: false };
    }

    private _apply(result: DestinyGachaResult): boolean {
        this._lastMessage = result.ok ? '' : `無法操作（${result.reason}）`;
        if (result.ok) this._state = result.state;
        return result.ok;
    }

    private _nameOf(id: string): string {
        return this._deps.generals().find(general => general.id === id)?.name ?? id;
    }

    /** 轉蛋：抽出本輪十位。 */
    public roll(): boolean {
        if (this._busy) return false;
        return this._apply(rollDestinyPool(this._state, this._rules(), this._deps.generals(), this._deps.random));
    }

    /** 重轉：免費、不限次數，直接抽新的一輪。 */
    public reroll(): boolean {
        if (this._busy || this._state.phase !== 'rolled') return false;
        if (!this._apply(resetDestinyGacha(this._state, this._rules()))) return false;
        return this.roll();
    }

    /** 確定：十位全收，本輪的宿命名將當核心並開新局。 */
    public async confirm(): Promise<boolean> {
        if (this._busy) return false;
        const core = destinyCoreOf(this._state);
        if (this._state.phase !== 'rolled' || !core) { this._lastMessage = '請先轉蛋'; return false; }
        if (!this._apply(selectDestinyGacha(this._state, core, this._rules()))) return false;
        return this._startGame();
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
            // 開局失敗：退回「已抽未鎖」，讓玩家能再按確定或重轉，不卡死在鎖定終態
            this._state = { ...this._state, phase: 'rolled', locked: null, selected: null };
            this._startedId = null;
            this._lastMessage = `開局失敗：${error instanceof Error ? error.message : String(error)}`;
            return false;
        } finally {
            this._busy = false;
        }
    }

    /** 結果畫面資料 */
    public getView(): DestinyPoolView {
        const coreId = destinyCoreOf(this._state);
        const intro = coreId ? DESTINY_INTRO[coreId] : undefined;
        return {
            rolledIds: [...this._state.rolled],
            coreId,
            quote: intro ? intro.quote : '',
            resets: this._state.resets,
            message: this._lastMessage,
            busy: this._busy,
        };
    }
}
