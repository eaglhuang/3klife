// @spec-source → 見 docs/cross-reference-index.md
/**
 * MentorHoldingsController — 大廳「支援」的持有教官卡清單（PROG-2-1633 自 LobbyScene 拆出）
 *
 * 共用 mentor-borrow-screen 版面：固定 5 列加分頁，點列開教官卡詳情。
 * 掛載、載卡、提示與置頂都由宿主注入，控制器只管列表狀態與畫面文字。
 */
import type { MentorCard } from '../../core/models/MentorCard';
import type { MentorCardData } from '../../core/systems/MentorCardTabs';
import type { BreedTextLookup } from './BreedingTexts';
import { pageSliceOf } from './FixedSlotPager';
import { mentorHoldingRows, type MentorHoldingRow } from './MentorHoldingRows';

const ROW_COUNT = 5;

export interface MentorHoldingsButtonBinding {
    buttonId: string;
    handler: () => void;
}

/** 控制器需要的畫面宿主介面（UIScreenPreviewHost 即符合） */
export interface MentorHoldingsHostLike {
    node: { active: boolean };
    binder: { setTexts(texts: Record<string, string>): void; setActives(actives: Record<string, boolean>): void } | null;
}

export interface MentorHoldingsDeps<H extends MentorHoldingsHostLike> {
    mountHost(bindings: MentorHoldingsButtonBinding[]): Promise<H>;
    /** 已附上支援卡資料的持有教官卡 */
    loadCards(): Promise<MentorCard[]>;
    breedText(): BreedTextLookup;
    openDetail(card: MentorCardData, title: string): void;
    bringToFront(host: H): void;
    toast(message: string): void;
}

export class MentorHoldingsController<H extends MentorHoldingsHostLike> {
    private _host: H | null = null;
    private _rows: MentorHoldingRow[] = [];
    private _page = 0;

    constructor(private readonly _deps: MentorHoldingsDeps<H>) {}

    public get host(): H | null {
        return this._host;
    }

    public async mount(): Promise<void> {
        const rowBindings = Array.from({ length: ROW_COUNT }, (_, i) => ({
            buttonId: `btnBorrowRow${i}`,
            handler: () => {
                const row = pageSliceOf(this._rows, this._page).items[i];
                if (row) this._deps.openDetail(row.card, row.name);
            },
        }));
        this._host = await this._deps.mountHost([
            { buttonId: 'btnBorrowClose', handler: () => this.close() },
            { buttonId: 'btnBorrowPrev', handler: () => this.turnPage(-1) },
            { buttonId: 'btnBorrowNext', handler: () => this.turnPage(1) },
            ...rowBindings,
        ]);
        this._host.node.active = false;
    }

    /** 列出持有教官卡；沒有卡時提示去支援卡池抽 */
    public async open(): Promise<void> {
        const host = this._host;
        if (!host) return;
        this._rows = mentorHoldingRows(await this._deps.loadCards(), this._deps.breedText());
        if (this._rows.length === 0) {
            this._deps.toast('尚無教官卡：可在轉蛋的支援卡池抽取，或由武將退役轉為教官');
            return;
        }
        this._page = 0;
        host.node.active = true;
        this._deps.bringToFront(host);
        this.refresh();
    }

    public close(): void {
        if (this._host) this._host.node.active = false;
    }

    public turnPage(delta: number): void {
        this._page += delta;
        this.refresh();
    }

    public refresh(): void {
        const slice = pageSliceOf(this._rows, this._page);
        this._page = slice.page;
        const texts: Record<string, string> = {
            borrowTitle: `我的教官卡（${this._rows.length} 張）`,
            borrowPage: `${slice.page + 1} / ${slice.pageCount}`,
        };
        const actives: Record<string, boolean> = { btnBorrowRecord: false };
        for (let i = 0; i < ROW_COUNT; i++) {
            const row = slice.items[i];
            actives[`borrowRow${i}Box`] = row !== undefined;
            texts[`borrowRow${i}`] = row ? row.text : '';
            texts[`borrowRow${i}Btn`] = row ? '詳情' : '';
        }
        this._host?.binder?.setTexts(texts);
        this._host?.binder?.setActives(actives);
    }
}
