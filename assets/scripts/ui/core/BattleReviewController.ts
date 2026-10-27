// @spec-source → 武將日誌與離線互動系統.md (doc_spec_0015) §E-5、§F-4；PROG-2-1187（JRN-05 回看）
/**
 * BattleReviewController — 戰報彈窗：離線戰鬥快照回看（純邏輯，不依賴 cc）。
 *
 * 職責：
 *   - 新到舊列出快照，每頁 BATTLE_REVIEW_PAGE_SIZE 筆；每列帶對應日誌的季節與摘要、結果等級
 *   - 顯示保留段的鏈驗證結果
 *   - 輸出扁平 FlowView，key 與 battle-review-main 版面節點 id 一一對應
 *
 * 暫定：每頁筆數、結果中文名稱、空狀態字串待企劃定版。
 * Unity 對照：Presenter。
 */
import type { JournalEntry } from '../../core/systems/JournalLog';
import {
    verifyRetainedOfflineBattleChain, type OfflineBattleResultDigest, type OfflineBattleSnapshot,
} from '../../core/systems/OfflineBattleSnapshot';
import { formatJournalSeason } from './GeneralJournalController';

export const BATTLE_REVIEW_PAGE_SIZE = 6;

export const BATTLE_RESULT_LABEL: Record<OfflineBattleResultDigest, string> = {
    WIN_MAJOR: '大勝',
    WIN_MINOR: '小勝',
    LOSE_MINOR: '小敗',
    LOSE_MAJOR: '大敗',
};

export interface BattleReviewDeps {
    snapshots: () => readonly OfflineBattleSnapshot[];
    /** 帶 snapshotRef 的日誌，用來取季節與摘要 */
    journal: () => readonly JournalEntry[];
}

export interface BattleReviewFlowView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

export class BattleReviewController {
    private _page = 0;

    constructor(private readonly _deps: BattleReviewDeps) {}

    public pageCount(): number {
        return Math.max(1, Math.ceil(this._deps.snapshots().length / BATTLE_REVIEW_PAGE_SIZE));
    }

    /** 打開時回到第一頁（最新） */
    public reset(): void {
        this._page = 0;
    }

    public nextPage(): void {
        this._page = Math.min(this._page + 1, this.pageCount() - 1);
    }

    public prevPage(): void {
        this._page = Math.max(this._page - 1, 0);
    }

    /** 本頁各列文字，新到舊 */
    public lines(): string[] {
        const page = Math.min(this._page, this.pageCount() - 1);
        const entries = new Map(this._deps.journal().filter((e) => e.snapshotRef).map((e) => [e.snapshotRef as string, e]));
        return this._deps.snapshots().slice().reverse()
            .slice(page * BATTLE_REVIEW_PAGE_SIZE, (page + 1) * BATTLE_REVIEW_PAGE_SIZE)
            .map((s) => {
                const entry = entries.get(s.snapshotId);
                const head = entry ? `${formatJournalSeason(entry.timestamp)}　${entry.summary}` : s.snapshotId;
                return `${head}｜${BATTLE_RESULT_LABEL[s.resultDigest]}`;
            });
    }

    public chainLabel(): string {
        const snapshots = this._deps.snapshots();
        if (snapshots.length === 0) return '';
        const bad = verifyRetainedOfflineBattleChain(snapshots);
        return bad < 0 ? '鏈驗證：完整' : `鏈驗證：第 ${bad + 1} 筆不符`;
    }

    public getFlowView(): BattleReviewFlowView {
        const lines = this.lines();
        const total = this._deps.snapshots().length;
        const page = Math.min(this._page, this.pageCount() - 1);
        const texts: Record<string, string> = {
            reviewTitle: '戰報',
            reviewPageLabel: `第 ${page + 1}／${this.pageCount()} 頁・共 ${total} 筆`,
            reviewChainLabel: this.chainLabel(),
            reviewEmptyLabel: total === 0 ? '尚無自動結算的戰報' : '',
            btnCloseLabel: '關閉',
        };
        const actives: Record<string, boolean> = { reviewEmptyLabel: total === 0 };
        for (let i = 0; i < BATTLE_REVIEW_PAGE_SIZE; i++) {
            texts[`reviewLine${i}`] = lines[i] ?? '';
            actives[`reviewLine${i}`] = lines[i] !== undefined;
        }
        return {
            texts,
            actives,
            enabled: { btnPrevPage: page > 0, btnNextPage: page < this.pageCount() - 1, btnClose: true },
        };
    }
}
