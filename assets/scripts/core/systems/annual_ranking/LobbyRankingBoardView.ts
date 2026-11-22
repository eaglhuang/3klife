/**
 * 史境天下風雲榜平時大廳即時看板視圖控制器（PROG-2-9601 PR2）
 * 遵循使用者 11/22 最新裁決：
 * 1. 平時在大廳隨時可點開預覽
 * 2. 僅展示各榜前 3 名 ＋ 玩家自家武將的最佳名次
 * 3. 完整 4~10 名與分數留待年終揭曉，未揭曉項目對外遮蔽（顯示「年終揭曉」）
 */

import { AnnualRankingManager } from './AnnualRankingManager';
import { LobbyBoardPreview, LobbyPreviewEntry, RankingContext } from './AnnualRankingTypes';

export interface DisplayCardItem {
  rankText: string;
  generalId: string;
  name: string;
  scoreText: string;
  trendText: string; // ▲+N, ▼-N, —, NEW
  evidenceText: string;
  isPlayer: boolean;
  isMasked: boolean;
}

export class LobbyRankingBoardView {
  private _manager: AnnualRankingManager;

  constructor(manager?: AnnualRankingManager) {
    this._manager = manager || AnnualRankingManager.getInstance();
  }

  /**
   * 取得指定榜單的大廳展示卡片清單（至多 4 張：前 3 名 ＋ 玩家自已名次）
   */
  public getBoardDisplayCards(
    boardId: string,
    candidateIds: string[],
    playerGeneralIds: string[],
    context: RankingContext
  ): {
    titleKey: string;
    cards: DisplayCardItem[];
    isYearEndRevealed: boolean;
  } {
    const previews = this._manager.getLobbyPreviews(candidateIds, playerGeneralIds, context);
    const targetBoard = previews.find((b) => b.boardId === boardId);

    if (!targetBoard) {
      return {
        titleKey: '',
        cards: [],
        isYearEndRevealed: false
      };
    }

    const cards: DisplayCardItem[] = [];

    // 1. 前 3 名展示
    targetBoard.topThree.forEach((entry) => {
      cards.push(this.formatCard(entry, targetBoard.isYearEndRevealed));
    });

    // 2. 玩家武將若不在前 3 名，追加其名次卡片（展示其名次，但 4~6 等非玩家武將不洩漏）
    if (targetBoard.playerSelf && targetBoard.playerSelf.rank > 3) {
      cards.push(this.formatCard(targetBoard.playerSelf, targetBoard.isYearEndRevealed));
    }

    return {
      titleKey: targetBoard.titleKey,
      cards,
      isYearEndRevealed: targetBoard.isYearEndRevealed
    };
  }

  /**
   * 格式化單一卡片資料
   */
  private formatCard(entry: LobbyPreviewEntry, isYearEnd: boolean): DisplayCardItem {
    let trendStr = '—';
    if (entry.trend === 'NEW') {
      trendStr = 'NEW';
    } else if (entry.trend === 'UP') {
      trendStr = `▲+${entry.trendDelta || 0}`;
    } else if (entry.trend === 'DOWN') {
      trendStr = `▼-${entry.trendDelta || 0}`;
    }

    const rankText = `第 ${entry.rank} 名`;
    // 平時第 4 名之後若非玩家或未揭曉，分數遮蔽
    const scoreText = (entry.rank <= 3 || isYearEnd)
      ? `${entry.score !== undefined ? entry.score : 0} 分`
      : '【年終揭曉】';

    return {
      rankText,
      generalId: entry.generalId,
      name: entry.generalId,
      scoreText,
      trendText: trendStr,
      evidenceText: entry.evidenceSummary || '',
      isPlayer: entry.isPlayerOwned,
      isMasked: entry.rank > 3 && !isYearEnd && !entry.isPlayerOwned
    };
  }
}
