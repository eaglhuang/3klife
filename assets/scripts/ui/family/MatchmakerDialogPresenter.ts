// @spec-source → 家族子嗣與血統總規格書 (doc_spec_1241) 3.1、3.2；PROG-2-9613
/**
 * MatchmakerDialogPresenter — 媒人說親對話框 Presenter（純邏輯，不依賴 cc）。
 *
 * 職責：
 * 1. 封裝 3 位民間女子候選人卡片展示（固定種子生成、EP、特質家世提示）。
 * 2. 禮金費用檢核（預設 100 銀兩）：
 *    - 餘額充足：可點擊納入，確認後扣除銀兩，配偶入家譜與名冊，扣除說親次數。
 *    - 餘額不足：按鈕反灰提示「家族銀兩不足，媒婆說她不賒帳」，提供前往商業任務之導流。
 * 3. 稍後再議：點擊或關閉視窗，不扣除任何說親次數與銀兩。
 */

import type { MatchmakerCandidate } from '../../core/systems/SpouseSources';
import {
    MATCHMAKER_FIRST_VISIT_TITLE,
    MATCHMAKER_SPRING_VISIT_TITLE,
    type MatchmakerPromptType,
} from '../../core/systems/MatchmakerGuideManager';

export interface MatchmakerDialogPresenterOptions {
    promptType: MatchmakerPromptType;
    candidates: readonly MatchmakerCandidate[];
    price: number;
    silverBalance: number;
    remainingOffers: number;
    onEnroll: (pickIndex: number) => Promise<{ ok: boolean; reason?: string; generalId?: string }>;
    onGotoCommerce?: () => void;
    onClose?: () => void;
}

export class MatchmakerDialogPresenter {
    private readonly _promptType: MatchmakerPromptType;
    private readonly _candidates: readonly MatchmakerCandidate[];
    private readonly _price: number;
    private _silverBalance: number;
    private _remainingOffers: number;
    private _selectedPick: number | null = null;
    private _isSubmitting = false;

    private readonly _onEnroll: (pickIndex: number) => Promise<{ ok: boolean; reason?: string; generalId?: string }>;
    private readonly _onGotoCommerce?: () => void;
    private readonly _onClose?: () => void;

    constructor(options: MatchmakerDialogPresenterOptions) {
        this._promptType = options.promptType;
        this._candidates = [...options.candidates];
        this._price = options.price;
        this._silverBalance = options.silverBalance;
        this._remainingOffers = options.remainingOffers;
        this._onEnroll = options.onEnroll;
        this._onGotoCommerce = options.onGotoCommerce;
        this._onClose = options.onClose;
        if (this._candidates.length > 0) {
            this._selectedPick = 0; // 預設選第一位
        }
    }

    public get promptType(): MatchmakerPromptType {
        return this._promptType;
    }

    public get title(): string {
        return this._promptType === 'first-visit' ? MATCHMAKER_FIRST_VISIT_TITLE : MATCHMAKER_SPRING_VISIT_TITLE;
    }

    public get candidates(): readonly MatchmakerCandidate[] {
        return this._candidates;
    }

    public get selectedPick(): number | null {
        return this._selectedPick;
    }

    public get price(): number {
        return this._price;
    }

    public get silverBalance(): number {
        return this._silverBalance;
    }

    public get remainingOffers(): number {
        return this._remainingOffers;
    }

    public get canAfford(): boolean {
        return this._silverBalance >= this._price;
    }

    public get canSubmit(): boolean {
        return (
            !this._isSubmitting &&
            this._selectedPick !== null &&
            this.canAfford &&
            this._remainingOffers > 0
        );
    }

    /** 當前封鎖原因文案（若無法納入） */
    public get blockNotice(): string | null {
        if (!this.canAfford) {
            return '家族銀兩不足，媒婆說她不賒帳';
        }
        if (this._remainingOffers <= 0) {
            return '今年的說親名額已用完，明年請早';
        }
        return null;
    }

    public selectCandidate(index: number): void {
        if (index >= 0 && index < this._candidates.length) {
            this._selectedPick = index;
        }
    }

    /** 提交納入配偶 */
    public async confirmEnroll(): Promise<{ ok: boolean; reason?: string; generalId?: string }> {
        if (!this.canSubmit || this._selectedPick === null) {
            return { ok: false, reason: this.blockNotice ?? 'not-eligible' };
        }
        this._isSubmitting = true;
        try {
            const res = await this._onEnroll(this._selectedPick);
            if (res.ok) {
                this._silverBalance = Math.max(0, this._silverBalance - this._price);
                this._remainingOffers = Math.max(0, this._remainingOffers - 1);
            }
            return res;
        } finally {
            this._isSubmitting = false;
        }
    }

    /** 導流至任務大廳商業任務 */
    public gotoCommerceTask(): void {
        this._onGotoCommerce?.();
    }

    /** 關閉對話框或點擊稍後再議（不扣除次數） */
    public close(): void {
        this._onClose?.();
    }
}
