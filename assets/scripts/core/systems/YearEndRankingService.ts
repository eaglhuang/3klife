import rankingConfig from '../../../resources/data/master/year-end-ranking-config.json';

export interface RankingCandidateInput {
    id: string;
    name: string;
    score: number;
    isPlayer: boolean;
    /** 額外標籤，用於驚喜獎判定（例如 'dark_horse', 'spoiled'） */
    tags?: string[];
}

export interface RankedCandidate extends RankingCandidateInput {
    rank: number;
    isNpcFill: boolean;
}

export interface RankReward {
    gold: number;
    jade: number;
    title?: string;
}

export interface SurpriseAward {
    id: string;
    title: string;
    bonusGold: number;
    recipientId: string;
    reason: string;
}

export interface YearEndRankingResult {
    year: number;
    standings: RankedCandidate[];
    playerRank: number;
    playerReward: RankReward;
    surpriseAward: SurpriseAward | null;
    roastMessage: string | null;
    nextYearHint: string;
}

/**
 * 年末排行榜與頒獎典禮純邏輯服務（PROG-2-10027）
 * 所有獎勵、NPC 補位比例、第 2~5 年冠軍曲線與驚喜獎皆從 year-end-ranking-config.json 讀取。
 */
export class YearEndRankingService {
    public static getRankReward(rank: number, year: number = 1): RankReward {
        if (rank === 1) {
            const clampedYear = Math.max(1, Math.min(5, year));
            const table = rankingConfig.championRewardsByYear as Record<string, RankReward>;
            return table[String(clampedYear)] ?? table['1'];
        }
        if (rank === 2) {
            return rankingConfig.rank2Reward;
        }
        if (rank === 3) {
            return rankingConfig.rank3Reward;
        }
        if (rank >= 4 && rank <= 10) {
            return rankingConfig.rank4To10Reward;
        }
        return { gold: 0, jade: 0 };
    }

    public static evaluateYearEndRanking(
        year: number,
        candidates: RankingCandidateInput[],
        npcRatioProvider?: (index: number) => number,
    ): YearEndRankingResult {
        const list: RankedCandidate[] = candidates.map((c) => ({
            ...c,
            rank: 0,
            isNpcFill: false,
        }));

        const baseScore = list.length > 0
            ? Math.max(100, Math.round(list.reduce((sum, c) => sum + c.score, 0) / list.length))
            : 100;

        let fillIndex = 0;
        const pool = rankingConfig.npcFillPool;
        while (list.length < rankingConfig.minRosterSize && fillIndex < pool.length) {
            const npc = pool[fillIndex];
            const ratio = npcRatioProvider
                ? Math.max(rankingConfig.npcFillMinRatio, Math.min(rankingConfig.npcFillMaxRatio, npcRatioProvider(fillIndex)))
                : [0.85, 0.95, 1.02, 1.1][fillIndex % 4];
            list.push({
                id: `${npc.id}_y${year}`,
                name: npc.name,
                score: Math.round(baseScore * ratio),
                isPlayer: false,
                isNpcFill: true,
                rank: 0,
            });
            fillIndex++;
        }

        list.sort((a, b) => b.score - a.score);
        list.forEach((item, idx) => {
            item.rank = idx + 1;
        });

        const playerEntry = list.find((c) => c.isPlayer);
        const playerRank = playerEntry ? playerEntry.rank : list.length + 1;
        const playerReward = this.getRankReward(playerRank, year);

        // 驚喜獎（每年至多 1 個）
        let surpriseAward: SurpriseAward | null = null;
        if (playerEntry && playerEntry.tags?.includes('dark_horse')) {
            const def = rankingConfig.surpriseAwards.dark_horse;
            surpriseAward = { ...def, recipientId: playerEntry.id };
        } else if (playerEntry && playerEntry.tags?.includes('spoiled')) {
            const def = rankingConfig.surpriseAwards.spoiled;
            surpriseAward = { ...def, recipientId: playerEntry.id };
        }

        const isEliminated = playerRank > 3;
        const nextChampion = this.getRankReward(1, year + 1);
        const roastMessage = isEliminated
            ? `今年名列第 ${playerRank} 名，評審團搖頭嘆道：「尚差臨門一腳，明年再來！」`
            : null;
        const nextYearHint = isEliminated
            ? `第 ${year + 1} 年冠軍獎勵將提升至 ${nextChampion.gold} 銀兩 + ${nextChampion.jade} 玉璧，建議多培養子嗣與累積戰功衝榜！`
            : `表現亮眼！第 ${year + 1} 年冠軍獎勵為 ${nextChampion.gold} 銀兩 + ${nextChampion.jade} 玉璧，持續保持領先優勢！`;

        return {
            year,
            standings: list,
            playerRank,
            playerReward,
            surpriseAward,
            roastMessage,
            nextYearHint,
        };
    }
}
