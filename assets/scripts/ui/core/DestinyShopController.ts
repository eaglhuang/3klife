// @spec-source → 轉蛋系統 §E #7 天命商店（Destiny_Shop）、UI_PITY_BIG；PROG-2-1157 邏輯、PROG-2-1158 畫面
/**
 * DestinyShopController — 天命商店兌換畫面的流程（純邏輯，不依賴 cc）
 *
 * 職責：
 *   - 列出本池可兌換的 SSR，上一位 / 下一位切換
 *   - 顯示天命值（本輪累計抽數 / 200）與可兌換次數
 *   - 兌換要按兩次：第一次只標記，第二次才真的扣資格（避免誤觸用掉 200 抽的保底）
 *
 * 所有 texts / actives / enabled 的 key 都等於 destiny-shop-main.json 的節點 id。
 *
 * Unity 對照：MVP 的 Presenter。按鈕 onClick 只呼叫 Cycle / Exchange，畫面層拿 GetView() 一次刷新。
 */
import { DESTINY_SHOP_PULLS_PER_EXCHANGE, type DestinyShopBlockReason } from '../../core/systems/DestinyShop';

export interface DestinyShopCandidate {
    id: string;
    name: string;
}

export interface DestinyShopView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

export interface DestinyShopDeps {
    credits(poolId: string): number;
    pullsToNext(poolId: string): number;
    /** 兌換成功回傳 reason = null */
    exchange(poolId: string, targetId: string): { reason: DestinyShopBlockReason | null };
}

const BLOCK_TEXT: Record<DestinyShopBlockReason, string> = {
    'no-credit': `天命值未滿 ${DESTINY_SHOP_PULLS_PER_EXCHANGE}，尚無兌換資格`,
    'not-in-pool': '這位不在本池，無法兌換',
    'not-ssr': '天命商店只能兌換 SSR',
};

/** 天命值（本輪已累計抽數）＝ 每輪抽數 − 距下次資格的抽數 */
export function destinyValue(pullsToNext: number): number {
    return DESTINY_SHOP_PULLS_PER_EXCHANGE - pullsToNext;
}

/** 轉蛋頁左上角入口的兩行字；hasShop = false 表示該池沒有天命商店（紅顏池） */
export function destinyBriefTexts(credits: number, pullsToNext: number, hasShop: boolean): { tag: string; line: string } {
    if (!hasShop) return { tag: '▸ 天命商店', line: '此池不累計天命值' };
    const value = `天命值：${destinyValue(pullsToNext)}/${DESTINY_SHOP_PULLS_PER_EXCHANGE}`;
    return credits > 0
        ? { tag: '▸ 天命商店（可兌換）', line: `${value} · 可換 ${credits} 次` }
        : { tag: '▸ 天命商店', line: value };
}

export class DestinyShopController {
    private _poolId = '';
    private _title = '';
    private _candidates: DestinyShopCandidate[] = [];
    private _targetId: string | null = null;
    private _armedId: string | null = null;
    private _notice = '';

    constructor(private readonly _deps: DestinyShopDeps) {}

    get poolId(): string {
        return this._poolId;
    }

    get targetId(): string | null {
        return this._resolve()?.id ?? null;
    }

    open(poolId: string, title: string, candidates: DestinyShopCandidate[]): void {
        this._poolId = poolId;
        this._title = title;
        this._candidates = candidates;
        this._targetId = null;
        this._armedId = null;
        this._notice = '';
    }

    cycle(step = 1): void {
        const list = this._candidates;
        if (list.length === 0) return;
        const current = list.findIndex((c) => c.id === this.targetId);
        const base = current < 0 ? 0 : current;
        this._targetId = list[(((base + step) % list.length) + list.length) % list.length].id;
        this._armedId = null;
        this._notice = '';
    }

    /** 第一次按只標記待確認；同一位再按一次才兌換。回傳是否真的兌換成功 */
    exchange(): boolean {
        const current = this._resolve();
        if (!current) return false;
        if (this._armedId !== current.id) {
            this._armedId = current.id;
            this._notice = `命運之輪已轉至盡頭——再按一次確認兌換「${current.name}」。`;
            return false;
        }
        this._armedId = null;
        const { reason } = this._deps.exchange(this._poolId, current.id);
        this._notice = reason ? BLOCK_TEXT[reason] : `已兌換「${current.name}」。`;
        return reason === null;
    }

    getView(): DestinyShopView {
        const current = this._resolve();
        const credits = this._deps.credits(this._poolId);
        const pullsToNext = this._deps.pullsToNext(this._poolId);
        const list = this._candidates;

        const texts: Record<string, string> = {
            dshopTitle: `天命商店 · ${this._title}`,
            dshopPager: current ? `${list.indexOf(current) + 1} / ${list.length}` : '0 / 0',
            dshopCredits: `天命值：${destinyValue(pullsToNext)}/${DESTINY_SHOP_PULLS_PER_EXCHANGE} · 可兌換 ${credits} 次 · 再抽 ${pullsToNext} 抽得下一次`,
            dshopEmptyHint: '本池目前沒有可兌換的 SSR。',
            dshopTarget: current ? `兌換對象：${current.name}（SSR）` : '兌換對象：－',
            dshopRule: `每在本池累計 ${DESTINY_SHOP_PULLS_PER_EXCHANGE} 抽，可任選一位本池 SSR 兌換；兌換不算抽數，資格不會過期。`,
            exchangeDestinyLabel: current && this._armedId === current.id ? '確認兌換' : '兌換',
            dshopNotice: this._notice,
        };
        const actives: Record<string, boolean> = {
            dshopPanel: current !== null,
            dshopEmptyHint: current === null,
        };
        const enabled: Record<string, boolean> = {
            btnCloseDestiny: true,
            btnPrevDestiny: list.length > 1,
            btnNextDestiny: list.length > 1,
            btnExchangeDestiny: current !== null && credits > 0,
        };
        return { texts, actives, enabled };
    }

    private _resolve(): DestinyShopCandidate | null {
        const list = this._candidates;
        if (list.length === 0) return null;
        const found = list.find((c) => c.id === this._targetId);
        if (found) return found;
        this._targetId = list[0].id;
        return list[0];
    }
}
