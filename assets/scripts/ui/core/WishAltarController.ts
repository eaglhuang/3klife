// @spec-source → 大廳系統.md (doc_spec_0002) §E-7 許願祭壇、§F-4 顯示層公式；經濟系統.md (doc_spec_0032) §E-6；PROG-2-1199
/**
 * WishAltarController — 大廳許願祭壇彈窗（純邏輯，不依賴 cc）。
 *
 * 職責：
 *   - 顯示目前巡次（UI_WISH_ROUND）、本巡剩餘可許願數、進行中數、加速卡持有數
 *   - 5 個插槽三態：空位／進行中（倒數，點擊用 1 張加速卡）／完成待領取（點擊領取）
 *   - 商品選擇（上一個／下一個）與許願（UI_WISH_START）；領取（UI_WISH_DONE）
 *   - 輸出扁平 FlowView，key 與 wish-altar-main 版面節點 id 一一對應
 *
 * 數值與時間以經濟系統（WishPool）為權威，本控制器只做映射。
 * 暫定：拒絕原因文案待企劃定版。
 * Unity 對照：Presenter。
 */
import {
    isWishReady, wishAmountOf, wishesLeftThisRound, wishItemName, wishRoundOf, SPEED_CARD_HOURS, WISH_ITEMS, WISH_POOL_CONFIG,
    type ActiveWish, type WishPoolState, type WishStartReason,
} from '../../core/systems/WishPool';

/** 插槽數 = 同時進行上限 */
export const WISH_ALTAR_SLOTS = WISH_POOL_CONFIG.maxConcurrentWishes;

export const WISH_START_REASON_LABEL: Record<WishStartReason, string> = {
    'unknown-item': '此商品無法許願。',
    'round-full': '本巡許願次數已用完，請等下一巡。',
    'concurrent-full': '進行中的許願已滿，請先領取。',
};

export interface WishAltarDeps {
    now: () => number;
    pool: () => WishPoolState;
    speedCards: () => number;
    startWish: (itemId: string, nowMs: number) => { ok: boolean; reason?: WishStartReason; wish?: ActiveWish };
    speedUp: (wishId: string, cards: number, nowMs: number) => number;
    claim: (nowMs: number) => ActiveWish[];
}

export interface WishAltarFlowView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

export class WishAltarController {
    private _message = '';
    private _pick = 0;

    constructor(private readonly _deps: WishAltarDeps) {}

    /** 打開時清掉上次訊息 */
    public reset(): void {
        this._message = '';
    }

    public prevItem(): void {
        this._pick = (this._pick + WISH_ITEMS.length - 1) % WISH_ITEMS.length;
    }

    public nextItem(): void {
        this._pick = (this._pick + 1) % WISH_ITEMS.length;
    }

    public get pickedItemId(): string {
        return WISH_ITEMS[this._pick].itemId;
    }

    public wish(): boolean {
        const def = WISH_ITEMS[this._pick];
        const result = this._deps.startWish(def.itemId, this._deps.now());
        this._message = result.ok ? `開始許願——預計 ${def.redemptionHours}h 後實現` : WISH_START_REASON_LABEL[result.reason ?? 'unknown-item'];
        return result.ok;
    }

    /** 點插槽：完成者領取全部，進行中者用 1 張加速卡；有變動回 true */
    public tapSlot(index: number): boolean {
        const nowMs = this._deps.now();
        const wish = this._deps.pool().activeWishes[index];
        if (!wish) return false;
        if (isWishReady(wish, nowMs)) return this.claim();
        const used = this._deps.speedUp(wish.wishId, 1, nowMs);
        this._message = used > 0 ? `使用加速卡，${wishItemName(wish.itemId)} 縮短 ${SPEED_CARD_HOURS} 小時。` : '沒有加速卡。';
        return used > 0;
    }

    public claim(): boolean {
        const claimed = this._deps.claim(this._deps.now());
        this._message = claimed.length > 0
            ? claimed.map((w) => `許願實現！獲得 ${wishItemName(w.itemId)} ×${w.amount}`).join('、')
            : '沒有已實現的許願。';
        return claimed.length > 0;
    }

    public get message(): string {
        return this._message;
    }

    public getFlowView(): WishAltarFlowView {
        const nowMs = this._deps.now();
        const pool = this._deps.pool();
        const cards = this._deps.speedCards();
        const { round } = wishRoundOf(nowMs);
        const left = wishesLeftThisRound(pool, nowMs);
        const startHour = WISH_POOL_CONFIG.roundStartHours[round - 1];
        const active = pool.activeWishes.length;
        const ready = pool.activeWishes.some((w) => isWishReady(w, nowMs));
        const def = WISH_ITEMS[this._pick];
        const texts: Record<string, string> = {
            waTitle: '許願祭壇',
            waRoundLabel: `許願池——第 ${round} 巡（${String(startHour).padStart(2, '0')}:00）｜本巡剩 ${left} 項`,
            waStatusLabel: `進行中 ${active}/${WISH_ALTAR_SLOTS}｜加速卡 ×${cards}（每張 -${SPEED_CARD_HOURS} 小時）`,
            waPickLabel: `${wishItemName(def.itemId)} ×${wishAmountOf(def)}｜${def.redemptionHours} 小時`,
            waResultLabel: this._message,
            btnPrevItemLabel: '◀',
            btnNextItemLabel: '▶',
            btnWishLabel: '許願',
            btnClaimLabel: '領取',
            btnCloseLabel: '關閉',
        };
        const enabled: Record<string, boolean> = {
            btnPrevItem: true,
            btnNextItem: true,
            btnWish: left > 0 && active < WISH_ALTAR_SLOTS,
            btnClaim: ready,
            btnClose: true,
        };
        for (let i = 0; i < WISH_ALTAR_SLOTS; i++) {
            const wish = pool.activeWishes[i];
            texts[`waSlotLabel${i}`] = wish ? slotText(wish, nowMs) : '空位';
            enabled[`waSlot${i}`] = !!wish && (isWishReady(wish, nowMs) || cards > 0);
        }
        return { texts, actives: { waResultLabel: this._message !== '' }, enabled };
    }
}

/** 插槽文字：進行中顯示剩餘時間（不低於 0），完成顯示可領取 */
export function slotText(wish: ActiveWish, nowMs: number): string {
    const head = `${wishItemName(wish.itemId)} ×${wish.amount}`;
    if (isWishReady(wish, nowMs)) return `${head}｜已實現，點擊領取`;
    return `${head}｜剩 ${remainingText(wish.endMs - nowMs)}｜點擊加速`;
}

/** 剩餘時間：無條件進位到分鐘，「XhYYm」 */
export function remainingText(ms: number): string {
    const minutes = Math.max(0, Math.ceil(ms / 60_000));
    return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}m`;
}
