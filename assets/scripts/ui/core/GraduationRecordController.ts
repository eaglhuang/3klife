// @spec-source → 見 docs/cross-reference-index.md
/**
 * GraduationRecordController — 畢業紀錄畫面（PROG-2-1633 自 LobbyScene 拆出；原 PROG-2-0746）
 *
 * 固定 5 列加分頁；每次打開都從第一頁、向宿主重取列資料。
 */
import { pageSliceOf } from './FixedSlotPager';
import type { NurtureGraduationRow } from './NurtureGraduationView';
import type { MentorHoldingsButtonBinding, MentorHoldingsHostLike } from './MentorHoldingsController';

const ROW_COUNT = 5;

export interface GraduationRecordDeps<H extends MentorHoldingsHostLike> {
    mountHost(bindings: MentorHoldingsButtonBinding[]): Promise<H>;
    rows(): NurtureGraduationRow[];
}

export class GraduationRecordController<H extends MentorHoldingsHostLike> {
    private _host: H | null = null;
    private _page = 0;

    constructor(private readonly _deps: GraduationRecordDeps<H>) {}

    public async mount(): Promise<void> {
        this._host = await this._deps.mountHost([
            { buttonId: 'btnGradClose', handler: () => this.setOpen(false) },
            { buttonId: 'btnGradPrev', handler: () => this.turnPage(-1) },
            { buttonId: 'btnGradNext', handler: () => this.turnPage(1) },
        ]);
        this.setOpen(false);
    }

    public setOpen(open: boolean): void {
        if (open) {
            this._page = 0;
            this.refresh();
        }
        if (this._host) this._host.node.active = open;
    }

    public turnPage(delta: number): void {
        this._page += delta;
        this.refresh();
    }

    public refresh(): void {
        const slice = pageSliceOf(this._deps.rows(), this._page);
        this._page = slice.page;
        const texts: Record<string, string> = { graduationPage: `${slice.page + 1} / ${slice.pageCount}` };
        const actives: Record<string, boolean> = {};
        for (let i = 0; i < ROW_COUNT; i++) {
            const row = slice.items[i];
            actives[`graduationRow${i}Box`] = row !== undefined;
            texts[`graduationRow${i}`] = row ? `${row.periodText}　${row.ratingText}\n${row.tagsText}　${row.tpText}　${row.revelationText}` : '';
        }
        this._host?.binder?.setTexts(texts);
        this._host?.binder?.setActives(actives);
    }
}
