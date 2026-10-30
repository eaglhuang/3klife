// @spec-source → 見 docs/cross-reference-index.md
/**
 * OfficerPanelsController — 大廳官職三畫面（PROG-2-1633 自 LobbyScene 拆出；原 OFC-08 / PROG-2-1424）
 *
 * 官職區塊（HUD）→ 官職詳情頁 → 階位總覽，三個 UCUF 畫面共用同一份官職狀態。
 * 掛載與資料來源由宿主注入；晉升獎勵與事件訂閱留在宿主。
 */
import type { OfficerState } from '../../core/systems/OfficerState';
import type { OfficerTierRow } from '../../core/systems/OfficerTierTable';
import { officerDisplayOf } from '../../core/systems/OfficerDisplay';
import { officerPermissionsOf } from '../../core/systems/OfficerPermissions';
import type { BreedTextLookup } from './BreedingTexts';
import { officerPageTitleText, officerPermissionLinesOf } from './OfficerPermissionText';
import { RANK_PROGRESS_ROW_COUNT, rankProgressOpenLabel, rankProgressViewOf } from './RankProgressText';
import type { MentorHoldingsButtonBinding, MentorHoldingsHostLike } from './MentorHoldingsController';

export interface OfficerPanelsDeps<H extends MentorHoldingsHostLike> {
    mountHost(hostName: string, screenId: string, bindings: MentorHoldingsButtonBinding[]): Promise<H>;
    officerState(): OfficerState;
    /** 資料表載入的階位列；未載入時為 null，沿用內建門檻 */
    tierRows(): OfficerTierRow[] | null;
    lookup: BreedTextLookup;
}

export class OfficerPanelsController<H extends MentorHoldingsHostLike> {
    private _hudHost: H | null = null;
    private _pageHost: H | null = null;
    private _rankHost: H | null = null;

    constructor(private readonly _deps: OfficerPanelsDeps<H>) {}

    public async mount(): Promise<void> {
        this._pageHost = await this._deps.mountHost('OfficerPageHost', 'lobby-officer-page-screen', [
            { buttonId: 'btnCloseOfficerPage', handler: () => this.setPageOpen(false) },
            { buttonId: 'btnOpenRankProgress', handler: () => this.setRankProgressOpen(true) },
        ]);
        this._rankHost = await this._deps.mountHost('RankProgressHost', 'rank-progress-screen', [
            { buttonId: 'btnCloseRankProgress', handler: () => this.setRankProgressOpen(false) },
        ]);
        this._hudHost = await this._deps.mountHost('OfficerHudHost', 'lobby-officer-hud-screen', [
            { buttonId: 'btnOpenOfficerPage', handler: () => this.setPageOpen(true) },
        ]);
        this.refresh();
    }

    /** HUD 與詳情頁文字依最新官職狀態重算 */
    public refresh(): void {
        const state = this._deps.officerState();
        const display = officerDisplayOf(state);
        this._hudHost?.binder?.setTexts({
            officerTitle: display.sectionTitle,
            officerRank: display.rankName,
            officerExp: display.expLabel,
        });
        const lookup = this._deps.lookup;
        this._pageHost?.binder?.setTexts({
            officerPageTitle: officerPageTitleText(lookup, display.rankName),
            officerPermissionText: officerPermissionLinesOf(officerPermissionsOf(state), lookup).join('\n'),
            openRankProgressLabel: rankProgressOpenLabel(lookup),
        });
    }

    /** 官職詳情頁：打開前重算；關閉時一併收起階位總覽 */
    public setPageOpen(open: boolean): void {
        if (open) this.refresh();
        if (this._pageHost) this._pageHost.node.active = open;
        if (!open) this.setRankProgressOpen(false);
    }

    /** 階位總覽：五列階位依最新官職狀態重算 */
    public setRankProgressOpen(open: boolean): void {
        if (open) this._refreshRankProgress();
        if (this._rankHost) this._rankHost.node.active = open;
    }

    private _refreshRankProgress(): void {
        const view = rankProgressViewOf(this._deps.officerState(), this._deps.tierRows(), this._deps.lookup);
        const texts: Record<string, string> = {
            rankTitle: view.title,
            rankExp: view.expLine,
            closeRankProgressLabel: view.closeLabel,
        };
        for (let i = 0; i < RANK_PROGRESS_ROW_COUNT; i++) {
            const row = view.rows[i];
            texts[`rankRow${i}`] = row ? `${row.headline}\n${row.unlockLine}` : '';
        }
        this._rankHost?.binder?.setTexts(texts);
    }
}
