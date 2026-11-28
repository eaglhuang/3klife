// @spec-source → Q版社會總規格書 QSOC-01 第 4.4.1 節（每季互動次數，使用者 11/28 裁決）；PROG-2-10219
/**
 * InteractionQuota — 生活層每季互動次數計數器（純邏輯，不依賴 cc）
 *
 * 職責：每遊戲一季 freePerSeason 次免費互動；用完可買額外次數（價格遞增、有單價上限、每季最多 extraSeasonMax 次）；換季重置。
 * 不負責：銀兩扣款（商店框架 life_extra_interaction 由呼叫端扣，買成功才呼叫 confirmExtraPurchase）、
 *         友誼框架「每武將每季上限」（被它擋下的互動呼叫端不要呼叫 consume）、換季事件本身（時間發動機呼叫 onSeasonChange）。
 */
import quotaData from '../../../resources/data/life-interaction-quota.json';

export interface InteractionQuotaConfig {
    freePerSeason: number;
    extraPriceBase: number;
    extraPriceStep: number;
    extraPriceCap: number;
    extraSeasonMax: number;
}

export const DEFAULT_INTERACTION_QUOTA: InteractionQuotaConfig = quotaData as unknown as InteractionQuotaConfig;

export interface InteractionQuotaState {
    /** 目前所屬的遊戲季序號（換季事件遞增；單調） */
    seasonIndex: number;
    freeUsed: number;
    /** 本季已買額外次數 */
    extraBought: number;
    /** 本季已用掉的額外次數 */
    extraUsed: number;
}

export type ConsumeResult = 'free' | 'extra' | 'needPurchase' | 'capReached';

export class InteractionQuota {
    private _state: InteractionQuotaState;

    public constructor(
        private readonly _config: InteractionQuotaConfig = DEFAULT_INTERACTION_QUOTA,
        state?: InteractionQuotaState,
    ) {
        this._state = state ? { ...state } : { seasonIndex: 0, freeUsed: 0, extraBought: 0, extraUsed: 0 };
    }

    public get state(): Readonly<InteractionQuotaState> { return this._state; }
    public get freeRemaining(): number { return Math.max(0, this._config.freePerSeason - this._state.freeUsed); }
    public get extraRemaining(): number { return this._state.extraBought - this._state.extraUsed; }
    public get canBuyExtra(): boolean { return this._state.extraBought < this._config.extraSeasonMax; }

    /** 下一次額外購買的銀兩價格（第 1 次買＝base，之後每次 +step，單次不超過 cap）；本季買滿回 -1 */
    public nextExtraPrice(): number {
        if (!this.canBuyExtra) return -1;
        return Math.min(this._config.extraPriceCap, this._config.extraPriceBase + this._config.extraPriceStep * this._state.extraBought);
    }

    /** 做一次互動：先用免費，再用已買的額外次數；都沒有回 needPurchase（本季買滿則 capReached） */
    public consume(): ConsumeResult {
        if (this.freeRemaining > 0) { this._state.freeUsed++; return 'free'; }
        if (this.extraRemaining > 0) { this._state.extraUsed++; return 'extra'; }
        return this.canBuyExtra ? 'needPurchase' : 'capReached';
    }

    /** 呼叫端已扣款成功後登記買了 1 次額外互動；回付出的價格，已買滿回 -1（不應扣款） */
    public confirmExtraPurchase(): number {
        const price = this.nextExtraPrice();
        if (price < 0) return -1;
        this._state.extraBought++;
        return price;
    }

    /** 換季事件：季序號變了就整季重置；同季或倒退不處理（防重複事件） */
    public onSeasonChange(seasonIndex: number): boolean {
        if (seasonIndex <= this._state.seasonIndex) return false;
        this._state = { seasonIndex, freeUsed: 0, extraBought: 0, extraUsed: 0 };
        return true;
    }
}
