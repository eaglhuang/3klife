// @spec-source → 見 docs/cross-reference-index.md
/**
 * YearReportController — 年報畫面（PROG-2-1633 自 LobbyScene 拆出；原 UI_YEAR_REPORT，TIME-07）
 *
 * 年末 YearEnded 時由宿主呼叫 open；文字走 zh-TW 預設退回。事件訂閱留在宿主。
 */
import { buildYearReportTexts, withYearReportFallback, type YearReport } from '../../core/systems/YearReport';
import type { BreedTextLookup } from './BreedingTexts';
import type { MentorHoldingsButtonBinding, MentorHoldingsHostLike } from './MentorHoldingsController';

export interface YearReportDeps<H extends MentorHoldingsHostLike> {
    mountHost(bindings: MentorHoldingsButtonBinding[]): Promise<H>;
    lookup: BreedTextLookup;
    bringToFront(host: H): void;
}

export class YearReportController<H extends MentorHoldingsHostLike> {
    private _host: H | null = null;

    constructor(private readonly _deps: YearReportDeps<H>) {}

    public async mount(): Promise<void> {
        this._host = await this._deps.mountHost([
            { buttonId: 'btnCloseYearReport', handler: () => this.close() },
        ]);
    }

    public open(report: YearReport | undefined): void {
        const host = this._host;
        if (!host || !report) return;
        host.binder?.setTexts(buildYearReportTexts(report, withYearReportFallback(this._deps.lookup)));
        host.node.active = true;
        this._deps.bringToFront(host);
    }

    public close(): void {
        if (this._host) this._host.node.active = false;
    }
}
