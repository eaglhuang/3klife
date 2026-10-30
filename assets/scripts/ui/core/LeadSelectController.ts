// @spec-source → 見 docs/cross-reference-index.md
/**
 * LeadSelectController — 大廳選主將（PROG-2-1633 自 LobbyScene 拆出）
 *
 * 列出可出戰武將（每頁 LEAD_SELECT_PAGE_SIZE 位），點選指定、再點取消；換頁鈕循環翻頁。
 * 名冊、主將讀寫、出征編制入口與事件訂閱由宿主注入。
 */
import type { GeneralConfig } from '../../core/models/GeneralUnit';
import { buildLeadSelectView, LEAD_SELECT_PAGE_SIZE, nextLeadId, type LeadSelectView } from '../../core/services/LeadGeneralSelectRules';
import type { MentorHoldingsButtonBinding, MentorHoldingsHostLike } from './MentorHoldingsController';

export interface LeadSelectDeps<H extends MentorHoldingsHostLike> {
    mountHost(bindings: MentorHoldingsButtonBinding[]): Promise<H>;
    deployable(): readonly GeneralConfig[];
    leadId(): string | null;
    setLead(id: string | null): Promise<unknown>;
    openSortie(): void;
    toast(message: string, duration: number): void;
    warn(message: string, error: unknown): void;
}

export class LeadSelectController<H extends MentorHoldingsHostLike> {
    private _host: H | null = null;
    private _page = 0;

    constructor(private readonly _deps: LeadSelectDeps<H>) {}

    public get host(): H | null {
        return this._host;
    }

    public async mount(): Promise<void> {
        this._host = await this._deps.mountHost([
            ...Array.from({ length: LEAD_SELECT_PAGE_SIZE }, (_, slot) => ({
                buttonId: `btnLeadGeneral${slot}`,
                handler: () => { void this.clickGeneral(slot); },
            })),
            { buttonId: 'btnLeadPage', handler: () => { this._page += 1; this.refresh(); } },
            { buttonId: 'btnOpenSortie', handler: () => this._deps.openSortie() },
        ]);
        this.refresh();
    }

    private _view(): LeadSelectView {
        return buildLeadSelectView(this._deps.deployable(), this._deps.leadId(), this._page);
    }

    public refresh(): void {
        const binder = this._host?.binder;
        if (!binder) return;
        const view = this._view();
        this._page = view.page;
        const leadName = view.leadLabel === undefined ? '（不可出戰）' : (view.leadLabel ?? '預設');
        const texts: Record<string, string> = {
            leadTitleLabel: `出戰主將：${leadName}`,
            leadPageLabel: `換頁 ▶ ${view.page + 1}/${view.pageCount}`,
        };
        const actives: Record<string, boolean> = { btnLeadPage: view.pageCount > 1 };
        for (let slot = 0; slot < LEAD_SELECT_PAGE_SIZE; slot++) {
            const row = view.rows[slot];
            texts[`leadGeneralLabel${slot}`] = row ? `${row.selected ? '✓' : '　'} ${row.label}` : '－';
            actives[`btnLeadGeneral${slot}`] = row !== undefined;
        }
        binder.setTexts(texts);
        binder.setActives(actives);
    }

    public async clickGeneral(slot: number): Promise<void> {
        const row = this._view().rows[slot];
        if (!row) return;
        try {
            await this._deps.setLead(nextLeadId(this._deps.leadId(), row.id));
        } catch (error) {
            this._deps.warn('[LobbyScene] 主將存檔失敗', error);
            this._deps.toast('主將存檔失敗，請稍後再試', 2);
        }
    }
}
