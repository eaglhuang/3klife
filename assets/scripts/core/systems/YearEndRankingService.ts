export interface RankingCandidateInput {
    id: string;
    name: string;
    score: number;
    isPlayer: boolean;
    /** 額外標籤，用於驚喜獎判定（例如 'dark_horse', 'diligent', 'versatile'） */
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
    bonusJade: number;
    recipientId: string;
    reason: string;
}

export interface YearEndRankingResult {
    year: number;
    yearCurveMultiplier: number;
    standings: RankedCandidate[];
    playerRank: number;
    playerReward: RankReward;
    surpriseAward: SurpriseAward | null;
    roastMessage: string | null;
    nextYearHint: string;
}

const NPC_FILL_POOL = [
    { id: 'npc_fill_1', name: '陳登' },
    { id: 'npc_fill_2', name: '張昭' },
    { id: 'npc_fill_3', name: '審配' },
    { id: 'npc_fill_4', name: '沮授' },
];

const YEAR_CURVE_MULTIPLIERS: Record<number, number> = {
    1: 1.0,
    2: 1.25,
    3: 1.55,
    4: 1.9,
    5: 2.3,
};

/**
 * 年末排行榜與頒獎典禮純邏輯服務（PROG-2-10027）
 * - NPC 補位至 4 人（85% ~ 110%）
 * - 名次獎勵（第 2 名 1,200+100 玉璧、第 3 名 1,000+80 玉璧）
 * - 驚喜獎（每年至多 1 個）
 * - 第 2~5 年曲線倍率
 * - 落榜吐槽與明年提示
 */
export class YearEndRankingService {
    public static getYearCurveMultiplier(year: number): number {
        if (year <= 1) return YEAR_CURVE_MULTIPLIERS[1];
        if (year >= 5) return YEAR_CURVE_MULTIPLIERS[5];
        return YEAR_CURVE_MULTIPLIERS[year] ?? 1.0;
    }

    public static getRankReward(rank: number): RankReward {
        switch (rank) {
            case 1:
                return { gold: 2000, jade: 200, title: '金榜魁首' };
            case 2:
                return { gold: 1200, jade: 100, title: '榜眼英才' };
            case 3:
                return { gold: 1000, jade: 80, title: '探花俊彥' };
            default:
                return { gold: 300, jade: 0 };
        }
    }

    /**
     * 計算年末榜單與頒獎結果
     * @param year 當前遊戲年份（1 起算）
     * @param candidates 真實候選人列表
     * @param npcRatioProvider 可選的確定性比例產生器（預設為固定階梯 0.85~1.10，方便測試與重現）
     */
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
        while (list.length < 4 && fillIndex < NPC_FILL_POOL.length) {
            const npc = NPC_FILL_POOL[fillIndex];
            const ratio = npcRatioProvider
                ? Math.max(0.85, Math.min(1.1, npcRatioProvider(fillIndex)))
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
        const playerReward = this.getRankReward(playerRank);

        // 驚喜獎（每年至多 1 個）
        let surpriseAward: SurpriseAward | null = null;
        if (playerEntry && playerEntry.tags?.includes('dark_horse')) {
            surpriseAward = {
                id: 'surprise_dark_horse',
                title: '黑馬逆襲獎',
                bonusJade: 50,
                recipientId: playerEntry.id,
                reason: '年度表現大幅超越預期，獲頒黑馬逆襲獎！',
            };
        } else if (playerEntry && playerEntry.tags?.includes('diligent')) {
            surpriseAward = {
                id: 'surprise_diligent',
                title: '勤勉不懈獎',
                bonusJade: 40,
                recipientId: playerEntry.id,
                reason: '全年勤政不輟，獲頒勤勉不懈獎！',
            };
        }

        const isEliminated = playerRank > 3;
        const roastMessage = isEliminated
            ? `今年名列第 ${playerRank} 名，評審團搖頭嘆道：「尚差臨門一腳，明年再來！」`
            : null;
        const nextYearHint = isEliminated
            ? `第 ${year + 1} 年門檻倍率將提升至 ${this.getYearCurveMultiplier(year + 1)}x，建議多培養子嗣與累積戰功衝榜！`
            : `表現亮眼！第 ${year + 1} 年門檻倍率為 ${this.getYearCurveMultiplier(year + 1)}x，持續保持領先優勢！`;

        return {
            year,
            yearCurveMultiplier: this.getYearCurveMultiplier(year),
            standings: list,
            playerRank,
            playerReward,
            surpriseAward,
            roastMessage,
            nextYearHint,
        };
    }
}
