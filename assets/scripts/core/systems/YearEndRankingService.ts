import rankingConfig from '../../../resources/data/master/year-end-ranking-config.json';

export interface RankingCandidateInput {
    id: string;
    name: string;
    /** i18n key（NPC 名門用）；有值時畫面以翻譯結果為準，name 只當後備文字 */
    nameKey?: string;
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

/** 玩家榜單分數的原料；欄位來源見 GameSession.yearEndScoreInputs，缺的欄位呼叫端以 0 帶入 */
export interface YearEndScoreInput {
    /** 本年家族銀兩入帳合計 */
    annualIncome: number;
    /** 家族聲望 clanPrestige */
    prestige: number;
    childCount: number;
    spouseCount: number;
    /** 學府成績分（見 academyScoreOfGrades） */
    academyScore: number;
}

export interface SurpriseInput {
    score: number;
    /** 去年榜單分數；第 1 年或沒紀錄為 null（不發黑馬） */
    lastYearScore: number | null;
    /** 當年子嗣互動次數 */
    childInteractions: number;
}

function nonNegative(value: number): number {
    return Number.isFinite(value) && value > 0 ? value : 0;
}

/** 玩家榜單分數：係數全在 year-end-ranking-config.json 的 scoreFormula */
export function computeYearEndScore(input: YearEndScoreInput): number {
    const f = rankingConfig.scoreFormula;
    return Math.round(
        f.base
        + Math.round(nonNegative(input.annualIncome) * f.incomeRate)
        + nonNegative(input.prestige) * f.prestigeWeight
        + nonNegative(input.childCount) * f.childWeight
        + nonNegative(input.spouseCount) * f.spouseWeight
        + nonNegative(input.academyScore),
    );
}

/** 學府成績分：本年結業子嗣中最高評級的分數；沒人結業或評級不認得為 0 */
export function academyScoreOfGrades(grades: readonly string[]): number {
    const table = rankingConfig.academyGradePoints as unknown as Record<string, number>;
    return grades.reduce((best, grade) => Math.max(best, typeof table[grade] === 'number' ? table[grade] : 0), 0);
}

/**
 * 驚喜獎判定：黑馬（總分較去年成長達門檻）優先於撒嬌（子嗣互動達門檻），每年至多回 1 個標籤。
 * 去年分數為 null／0 視為沒有比較基準，不發黑馬。
 */
export function judgeSurpriseTags(input: SurpriseInput): string[] {
    const rules = rankingConfig.surpriseRules;
    const last = input.lastYearScore;
    if (last !== null && last > 0 && (input.score - last) / last >= rules.darkHorseMinGrowth) return ['dark_horse'];
    if (input.childInteractions >= rules.spoiledMinInteractions) return ['spoiled'];
    return [];
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

    /** NPC 名門的分數基準：只看年份，與玩家分數無關（第 5 年之後沿用第 5 年） */
    public static getNpcBaseScore(year: number): number {
        const table = rankingConfig.npcBaseScoreByYear as unknown as Record<string, number>;
        const clamped = Math.max(1, Math.min(5, Math.floor(year) || 1));
        return table[String(clamped)] ?? table['1'];
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

        const baseScore = this.getNpcBaseScore(year);

        let fillIndex = 0;
        const pool = rankingConfig.npcFillPool;
        while (list.length < rankingConfig.minRosterSize && fillIndex < pool.length) {
            const npc = pool[fillIndex];
            const ratio = npcRatioProvider
                ? Math.max(rankingConfig.npcFillMinRatio, Math.min(rankingConfig.npcFillMaxRatio, npcRatioProvider(fillIndex)))
                : rankingConfig.npcFillDefaultRatios[fillIndex % rankingConfig.npcFillDefaultRatios.length];
            list.push({
                id: `${npc.id}_y${year}`,
                name: npc.name,
                nameKey: npc.nameKey,
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
