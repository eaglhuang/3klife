// @spec-source → 見 docs/cross-reference-index.md
/**
 * MentorBorrowController — 入學前的好友借將清單（PROG-2-1633 自 LobbyScene 拆出；原 PROG-2-0726 / 1138）
 *
 * 固定 5 列加分頁；每次刷新都向宿主重取列資料，避免打開後狀態過期。
 * 選列後交給宿主設定第 6 位教官，成功才關閉清單。
 */
import { pageSliceOf } from './FixedSlotPager';
import type { MentorBorrowRow } from './MentorBorrowView';
import type { MentorHoldingsButtonBinding, MentorHoldingsHostLike } from './MentorHoldingsController';

const ROW_COUNT = 5;

export interface MentorBorrowDeps<H extends MentorHoldingsHostLike> {
    mountHost(bindings: MentorHoldingsButtonBinding[]): Promise<H>;
    /** 目前的借將列表（全部好友，依借用檢查結果標示） */
    rows(): MentorBorrowRow[];
    /** 選定可借的列；回傳 true 表示已設定，清單關閉 */
    select(row: MentorBorrowRow): Promise<boolean>;
    /** 「借用紀錄」按鈕：清單關閉後開結業紀錄 */
    openRecord(): void;
}

export class MentorBorrowController<H extends MentorHoldingsHostLike> {
    private _host: H | null = null;
    private _page = 0;

    constructor(private readonly _deps: MentorBorrowDeps<H>) {}

    public async mount(): Promise<void> {
        const rowBindings = Array.from({ length: ROW_COUNT }, (_, i) => ({
            buttonId: `btnBorrowRow${i}`,
            handler: () => { void this.selectRow(i); },
        }));
        this._host = await this._deps.mountHost([
            { buttonId: 'btnBorrowClose', handler: () => this.setOpen(false) },
            { buttonId: 'btnBorrowPrev', handler: () => this.turnPage(-1) },
            { buttonId: 'btnBorrowNext', handler: () => this.turnPage(1) },
            { buttonId: 'btnBorrowRecord', handler: () => { this.setOpen(false); this._deps.openRecord(); } },
            ...rowBindings,
        ]);
        this.setOpen(false);
    }

    /** 從第一頁打開 */
    public open(): void {
        this._page = 0;
        this.setOpen(true);
    }

    public setOpen(open: boolean): void {
        if (open) this.refresh();
        if (this._host) this._host.node.active = open;
    }

    public turnPage(delta: number): void {
        this._page += delta;
        this.refresh();
    }

    public refresh(): void {
        const slice = pageSliceOf(this._deps.rows(), this._page);
        this._page = slice.page;
        const texts: Record<string, string> = { borrowPage: `${slice.page + 1} / ${slice.pageCount}` };
        const actives: Record<string, boolean> = {};
        for (let i = 0; i < ROW_COUNT; i++) {
            const row = slice.items[i];
            actives[`borrowRow${i}Box`] = row !== undefined;
            texts[`borrowRow${i}`] = row ? `${row.name}　${row.rankText}\n${row.statusText}` : '';
            texts[`borrowRow${i}Btn`] = row?.enabled ? '借用' : '—';
        }
        this._host?.binder?.setTexts(texts);
        this._host?.binder?.setActives(actives);
    }

    public async selectRow(index: number): Promise<void> {
        const row = pageSliceOf(this._deps.rows(), this._page).items[index];
        if (!row || !row.enabled) return;
        if (await this._deps.select(row)) this.setOpen(false);
    }
}
