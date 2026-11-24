// @spec-source → 史境天下風雲榜系統規格書 (doc_spec_1285) §4~§8；PROG-2-9958
/**
 * LobbyRankingBoardController — 大廳風雲榜看板與歷年史冊重播控制器
 *
 * 遵循總 PM 裁決：
 * 1. 入口放置於大廳右側功能列／公告區（避開右下角推進一季 200x84 與信箱區），不遮擋新手引導錨點。
 * 2. 整合 LobbyRankingBoardView（平時展示各榜前 3 名＋玩家最佳名次）與 AnnualRankingHistoryViewer（歷年風雲史冊）。
 * 3. 提供「歷年風雲史冊」重播典禮入口（不使用獨立重播鈕，完全對齊規格 §8.1）。
 */
import { AnnualRankingManager } from '../../core/systems/annual_ranking/AnnualRankingManager';
import { LobbyRankingBoardView, type DisplayCardItem } from '../../core/systems/annual_ranking/LobbyRankingBoardView';
import { AnnualRankingHistoryViewer, type AnnualHistorySummary } from '../../core/systems/annual_ranking/AnnualRankingHistoryViewer';
import type { RankingContext } from '../../core/systems/annual_ranking/AnnualRankingTypes';

export interface LobbyRankingEntryLayout {
    readonly anchor: 'right-sidebar';
    readonly rightPx: number;
    readonly topPx: number;
    readonly widthPx: number;
    readonly heightPx: number;
}

/** 避開右下角推進一季（right:24, bottom:24, 200x84）與信箱、不擋頂部 resource-row */
export const LOBBY_RANKING_ENTRY_LAYOUT: LobbyRankingEntryLayout = {
    anchor: 'right-sidebar',
    rightPx: 24,
    topPx: 196,
    widthPx: 140,
    heightPx: 52,
};

export interface LobbyRankingBoardPanelState {
    readonly activeBoardId: string;
    readonly titleKey: string;
    readonly isYearEndRevealed: boolean;
    readonly cards: readonly DisplayCardItem[];
    readonly historySummaries: readonly AnnualHistorySummary[];
}

export class LobbyRankingBoardController {
    private readonly _manager: AnnualRankingManager;
    private readonly _boardView: LobbyRankingBoardView;
    private readonly _historyViewer: AnnualRankingHistoryViewer;

    constructor(manager?: AnnualRankingManager) {
        this._manager = manager || AnnualRankingManager.getInstance();
        this._boardView = new LobbyRankingBoardView(this._manager);
        this._historyViewer = new AnnualRankingHistoryViewer(this._manager);
    }

    public buildBoardState(
        boardId: string,
        candidateIds: string[],
        playerGeneralIds: string[],
        context: RankingContext,
    ): LobbyRankingBoardPanelState {
        const preview = this._boardView.getBoardDisplayCards(boardId, candidateIds, playerGeneralIds, context);
        const historySummaries = this._historyViewer.getYearSummaries();
        return {
            activeBoardId: boardId,
            titleKey: preview.titleKey,
            isYearEndRevealed: preview.isYearEndRevealed,
            cards: preview.cards,
            historySummaries,
        };
    }

    public getAvailableBoardIds(): string[] {
        const cfg = this._manager.getConfig();
        return cfg?.boards ? cfg.boards.map((b) => b.id) : [];
    }
}
