// @spec-source → PROG-2-10070 子嗣成長事件彈窗；PROG-2-10059 待決成長事件與 family.resolveGrowthEvent
/**
 * ChildGrowthPopupController — 換年後的「孩子的成長小事」彈窗（純邏輯，不依賴 cc）
 *
 * 待決事件由權威端排進佇列（family.growthEvents）；這裡負責顯示孩子名／年齡、事件標題與描述、A／B 兩個選項（選項文字內含效果摘要），
 * 玩家點選就經 family.resolveGrowthEvent 結算，成功後 Toast 顯示結果；還有下一件就接著顯示，沒有就收起。
 * 「稍後再說」只收起、不丟事件（待決留在存檔，下次開窗再問）。
 * 沿用季報彈窗的做法：UCUF 畫面由宿主掛載，開窗守衛 canOpen 不允許時合併成一筆待開請求。
 */
import type { FamilyGrowthEventView } from '../../shared/api/ApiCommands';
import type { MentorHoldingsButtonBinding, MentorHoldingsHostLike } from './MentorHoldingsController';

export type GrowthPopupTranslate = (key: string, ...args: string[]) => string;

export interface ChildGrowthPopupView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

export const GROWTH_OPTION_BUTTON_IDS = { A: 'btnGrowthA', B: 'btnGrowthB' } as const;

export interface ChildGrowthChildInfo {
    name: string;
    /** 整歲 */
    age: number;
}

/** 彈窗畫面文字：選項文字直接用事件資料的 label（含效果摘要），其餘走 i18n */
export function childGrowthPopupView(
    event: FamilyGrowthEventView,
    child: ChildGrowthChildInfo,
    remainingAfter: number,
    t: GrowthPopupTranslate,
): ChildGrowthPopupView {
    const labelOf = (id: 'A' | 'B'): string => {
        const option = event.options.find((o) => o.id === id);
        return option ? t(option.labelKey) : '';
    };
    return {
        texts: {
            cgTitle: t(event.titleKey),
            cgChild: t('ui.child.growth.child', child.name, String(child.age)),
            cgDesc: t(event.descKey),
            cgHint: t('ui.child.growth.hint'),
            btnGrowthALabel: labelOf('A'),
            btnGrowthBLabel: labelOf('B'),
            cgMore: remainingAfter > 0 ? t('ui.child.growth.more', String(remainingAfter)) : '',
            btnGrowthCloseLabel: t('ui.child.growth.close'),
        },
        actives: {},
        enabled: { [GROWTH_OPTION_BUTTON_IDS.A]: true, [GROWTH_OPTION_BUTTON_IDS.B]: true },
    };
}

export type ChildGrowthResolveOutcome =
    | { ok: true; resultKey: string }
    | { ok: false; reason: 'silver-low' | 'gone' | 'error' };

export interface ChildGrowthPopupDeps<H extends MentorHoldingsHostLike> {
    mountHost(bindings: MentorHoldingsButtonBinding[]): Promise<H>;
    apply(host: H, view: ChildGrowthPopupView): void;
    /** 目前待決的成長事件（family.growthEvents） */
    pending(): Promise<FamilyGrowthEventView[]>;
    /** 孩子顯示資料；查不到回 null（用 id 代替名字） */
    childInfo(childId: string): ChildGrowthChildInfo | null;
    /** 玩家選擇（family.resolveGrowthEvent） */
    resolve(childId: string, eventId: string, optionId: 'A' | 'B'): Promise<ChildGrowthResolveOutcome>;
    t: GrowthPopupTranslate;
    toast(message: string): void;
    /** 所有開窗入口共用的守衛（開場、季報、典禮進行中不開）；不允許時合併為一筆待開請求 */
    canOpen?: () => boolean;
    /** 開窗後讓宿主拉到最上層 */
    onOpened?: (host: H) => void;
}

export class ChildGrowthPopupController<H extends MentorHoldingsHostLike> {
    private _host: H | null = null;
    private _queue: FamilyGrowthEventView[] = [];
    private _busy = false;
    private _pendingOpen = false;

    constructor(private readonly _deps: ChildGrowthPopupDeps<H>) {}

    public async mount(): Promise<void> {
        this._host = await this._deps.mountHost([
            { buttonId: GROWTH_OPTION_BUTTON_IDS.A, handler: () => { void this.choose('A'); } },
            { buttonId: GROWTH_OPTION_BUTTON_IDS.B, handler: () => { void this.choose('B'); } },
            { buttonId: 'btnGrowthClose', handler: () => { this.close(); } },
        ]);
        if (this._host) this._host.node.active = false;
    }

    public get host(): H | null {
        return this._host;
    }

    public get isOpen(): boolean {
        return this._host?.node.active === true;
    }

    /** 目前顯示的事件（沒開窗為 null） */
    public get current(): FamilyGrowthEventView | null {
        return this.isOpen ? this._queue[0] ?? null : null;
    }

    /** 有待決事件就開窗；回傳是否真的開了。守衛不允許時記一筆待開請求，等 refreshAvailability 補開 */
    public async open(): Promise<boolean> {
        if (!this._host) return false;
        if (this.isOpen) return true;
        if (this._deps.canOpen?.() === false) {
            this._pendingOpen = true;
            return false;
        }
        this._pendingOpen = false;
        this._queue = await this._deps.pending();
        if (this._queue.length === 0) return false;
        this._render();
        this._host.node.active = true;
        this._deps.onOpened?.(this._host);
        return true;
    }

    /** 開場／季報／典禮等遮擋解除後重查；有待開請求就補開一次 */
    public async refreshAvailability(): Promise<boolean> {
        if (!this._pendingOpen) return false;
        return this.open();
    }

    /** 稍後再說：只收起，事件仍在待決佇列 */
    public close(): void {
        if (this._host) this._host.node.active = false;
    }

    public async choose(optionId: 'A' | 'B'): Promise<void> {
        const event = this.current;
        if (this._busy || !event) return;
        this._busy = true;
        try {
            const out = await this._deps.resolve(event.childId, event.eventId, optionId);
            if (!out.ok) {
                if (out.reason === 'silver-low') {
                    this._deps.toast(this._deps.t('ui.child.growth.silver_low'));
                    return;
                }
                if (out.reason === 'gone') this._deps.toast(this._deps.t('ui.child.growth.gone'));
                await this._advance();
                return;
            }
            this._deps.toast(this._deps.t(out.resultKey));
            await this._advance();
        } finally {
            this._busy = false;
        }
    }

    /** 結算後重讀待決佇列：還有就顯示下一件，沒有就收起 */
    private async _advance(): Promise<void> {
        this._queue = await this._deps.pending();
        if (this._queue.length === 0) {
            this.close();
            return;
        }
        this._render();
    }

    private _render(): void {
        const event = this._queue[0];
        if (!this._host || !event) return;
        const info = this._deps.childInfo(event.childId) ?? { name: event.childId, age: 0 };
        this._deps.apply(this._host, childGrowthPopupView(event, info, this._queue.length - 1, this._deps.t));
    }
}
