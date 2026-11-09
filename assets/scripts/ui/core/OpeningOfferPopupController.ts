// @spec-source → 新手開場規格書 §5.4、§10.2、§10.3；OPEN-12；裁決 11/09 第 11 題；PROG-2-2198
/**
 * OpeningOfferPopupController — 開場商品彈窗（本地 Mock）
 *
 * 宿主在適當時機呼叫 tryOpen()：有該出的商品就開窗。按「模擬購買」只寫存檔紀錄，不收款也不發道具；
 * 按「婉拒」照序列換下一個商品（29.99 → 0.99），最後一個再被拒絕後 24 小時不主動彈。
 */
import type { OpeningOffer, OpeningOfferOutcome } from '../../core/systems/OpeningOffer';
import type { MentorHoldingsButtonBinding, MentorHoldingsHostLike } from './MentorHoldingsController';

export interface OpeningOfferView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

export function openingOfferView(offer: OpeningOffer): OpeningOfferView {
    return {
        texts: {
            offerTitle: '紅顏來信',
            offerQuote: `「${offer.quote}」`,
            offerPrice: `售價 ${offer.price}`,
            offerMockNote: 'Mock：尚未接支付，購買只記錄在存檔，不扣款也不發放內容',
            offerDeclineLabel: '婉拒',
            offerBuyLabel: '模擬購買',
        },
        actives: {},
        enabled: { btnOfferDecline: true, btnOfferBuy: true },
    };
}

export interface OpeningOfferPopupDeps<H extends MentorHoldingsHostLike> {
    mountHost(bindings: MentorHoldingsButtonBinding[]): Promise<H>;
    apply(host: H, view: OpeningOfferView): void;
    /** 現在該出的商品；沒有時為 null */
    next(now: number): OpeningOffer | null;
    resolve(offerId: string, outcome: OpeningOfferOutcome, now: number): Promise<boolean>;
    now(): number;
    toast(message: string): void;
}

export class OpeningOfferPopupController<H extends MentorHoldingsHostLike> {
    private _host: H | null = null;
    private _offer: OpeningOffer | null = null;

    constructor(private readonly _deps: OpeningOfferPopupDeps<H>) {}

    public async mount(): Promise<void> {
        this._host = await this._deps.mountHost([
            { buttonId: 'btnOfferBuy', handler: () => { void this.respond('purchased'); } },
            { buttonId: 'btnOfferDecline', handler: () => { void this.respond('declined'); } },
        ]);
        if (this._host) this._host.node.active = false;
    }

    public get host(): H | null {
        return this._host;
    }

    public get offer(): OpeningOffer | null {
        return this._offer;
    }

    /** 有該出的商品就開窗並回傳 true；已開著時不重複開 */
    public tryOpen(): boolean {
        if (!this._host || this._host.node.active) return false;
        return this._show(this._deps.next(this._deps.now()));
    }

    /** 回應目前商品；婉拒後若序列還有下一個商品就直接換上 */
    public async respond(outcome: OpeningOfferOutcome): Promise<void> {
        const offer = this._offer;
        if (!offer) return;
        const now = this._deps.now();
        const ok = await this._deps.resolve(offer.id, outcome, now);
        if (ok && outcome === 'purchased') this._deps.toast(`模擬購買成功（${offer.price}），已記錄在存檔`);
        if (!this._show(outcome === 'declined' && ok ? this._deps.next(now) : null) && this._host) this._host.node.active = false;
    }

    private _show(offer: OpeningOffer | null): boolean {
        this._offer = offer;
        if (!offer || !this._host) return false;
        this._deps.apply(this._host, openingOfferView(offer));
        this._host.node.active = true;
        return true;
    }
}
