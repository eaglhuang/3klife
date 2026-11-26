// @spec-source → PROG-2-10050 年終典禮賞賜入帳（Antigravity 11/26 規格第 2 點）；獎勵框架 doc_spec_1186 §4 結算層
/**
 * YearEndCeremonyReward — 「收下賞賜」入帳（純邏輯，不依賴 cc）
 *
 * 銀兩與玉璧一律經 reward.claim 套件入帳（銀兩走 SilverRoutedWallet、玉璧走轉蛋錢包 gems），
 * 不直接改存檔欄位。防重複領取靠 grantKey：同一年同一部分只會入帳一次，
 * grantKey 記在存檔的 rewardMeta.grants，重開遊戲也不會重領。
 * 套件金額在 reward-config.json（BUNDLE_YEAR_END_*），與 year-end-ranking-config.json 的獎勵表由單元測試對齊。
 */
import type { IApiClient } from '../../shared/api/IApiClient';
import { isApiFail } from '../../shared/api/ApiProtocol';
import type { RewardGrantResult } from '../../shared/api/ApiCommands';
import type { YearEndRankingResult } from './YearEndRankingService';

export const YEAR_END_SURPRISE_BUNDLE_ID = 'BUNDLE_YEAR_END_SURPRISE';
/** 冠軍獎勵表只到第 5 年，之後沿用第 5 年（與 YearEndRankingService.getRankReward 一致） */
const MAX_CHAMPION_YEAR = 5;

/** 名次對應的套件；第 11 名以後沒有賞賜（回 null） */
export function yearEndRankBundleId(rank: number, year: number): string | null {
    if (rank === 1) return `BUNDLE_YEAR_END_RANK_1_Y${Math.max(1, Math.min(MAX_CHAMPION_YEAR, year))}`;
    if (rank === 2) return 'BUNDLE_YEAR_END_RANK_2';
    if (rank === 3) return 'BUNDLE_YEAR_END_RANK_3';
    if (rank >= 4 && rank <= 10) return 'BUNDLE_YEAR_END_RANK_4_10';
    return null;
}

export function yearEndGrantKey(year: number, part: 'rank' | 'surprise'): string {
    return `yearEnd:${year}:${part}`;
}

export interface YearEndClaimOutcome {
    /** 所有該領的部分都已入帳（含先前已領的重送）；false 代表至少一部分失敗，可再按一次重試 */
    ok: boolean;
    /** 全部部分都是先前已領過（本次沒有新入帳） */
    alreadyClaimed: boolean;
    /** 本次新入帳的銀兩與玉璧 */
    silver: number;
    gems: number;
    /** 入帳後的銀兩餘額；查不到為 null */
    silverBalance: number | null;
}

function creditedOf(result: RewardGrantResult, currency: string): number {
    if (result.replayed) return 0;
    return result.plan.reduce((sum, line) => {
        const applied = line.applied;
        return applied.kind === 'currency' && applied.id === currency && typeof applied.amount === 'number' ? sum + applied.amount : sum;
    }, 0);
}

/** 領本年賞賜：名次套件＋（有的話）驚喜獎套件，各自帶 grantKey，重按不會重領 */
export async function claimYearEndRewards(
    api: Pick<IApiClient, 'cmd' | 'query'>,
    result: YearEndRankingResult,
): Promise<YearEndClaimOutcome> {
    const parts: Array<{ bundleId: string; part: 'rank' | 'surprise' }> = [];
    const rankBundle = yearEndRankBundleId(result.playerRank, result.year);
    if (rankBundle) parts.push({ bundleId: rankBundle, part: 'rank' });
    if (result.surpriseAward) parts.push({ bundleId: YEAR_END_SURPRISE_BUNDLE_ID, part: 'surprise' });

    let ok = true;
    let silver = 0;
    let gems = 0;
    let replays = 0;
    for (const { bundleId, part } of parts) {
        try {
            const res = await api.cmd<RewardGrantResult>('reward.claim', {
                bundleId,
                grantKey: yearEndGrantKey(result.year, part),
                source: { kind: 'yearEnd', ref: String(result.year) },
            });
            if (isApiFail(res)) { ok = false; continue; }
            if (res.result.replayed) replays++;
            silver += creditedOf(res.result, 'silver');
            gems += creditedOf(res.result, 'gems');
        } catch {
            ok = false;
        }
    }

    let silverBalance: number | null = null;
    try {
        const bal = await api.query<Record<string, number>>('wallet.balance', { currency: 'silver' });
        if (!isApiFail(bal) && typeof bal.result.silver === 'number') silverBalance = bal.result.silver;
    } catch {
        silverBalance = null;
    }
    return { ok, alreadyClaimed: ok && parts.length > 0 && replays === parts.length, silver, gems, silverBalance };
}
