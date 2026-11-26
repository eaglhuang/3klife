// @spec-source → 首年目標清單規格；獎勵框架 doc_spec_1186 §4 結算層；PROG-2-10062
/**
 * Year1GoalsReward — 首年目標的銀兩入帳（純邏輯，不依賴 cc）
 *
 * 銀兩一律經 reward.claim 套件入帳（走 SilverRoutedWallet → 家族銀兩帳本），不直接改存檔欄位。
 * 一次性領獎有兩層：存檔的 claimed 清單，以及 grantKey（記在存檔 rewardMeta.grants，重送回原結果、不重複入帳）。
 * 套件金額在 reward-config.json（BUNDLE_Y1_GOAL_*），與 year1-goals.json 的 reward.silver 由單元測試對齊。
 */
import type { IApiClient } from '../../shared/api/IApiClient';
import { isApiFail } from '../../shared/api/ApiProtocol';
import type { RewardGrantResult } from '../../shared/api/ApiCommands';
import type { Year1GoalDef } from './Year1Goals';

export const YEAR1_GOAL_REWARD_SOURCE = 'year1Goal';

export type Year1RewardKind = 'reward' | 'consolation';

export function year1GoalGrantKey(goalId: string, kind: Year1RewardKind): string {
    return kind === 'consolation' ? `year1Goal:${goalId}:consolation` : `year1Goal:${goalId}`;
}

export interface Year1ClaimOutcome {
    /** 入帳成功（含先前已領的重送）；false 代表失敗，下次可重試 */
    ok: boolean;
    /** 先前已領過（本次沒有新入帳） */
    replayed: boolean;
    /** 本次新入帳的銀兩 */
    silver: number;
}

/** 領單一目標的獎勵（或衝刺安慰獎）；失敗不丟例外，回 ok=false */
export async function claimYear1GoalReward(
    api: Pick<IApiClient, 'cmd'>,
    goal: Year1GoalDef,
    kind: Year1RewardKind = 'reward',
): Promise<Year1ClaimOutcome> {
    const bundleId = kind === 'consolation' ? goal.consolation?.bundleId : goal.reward.bundleId;
    if (!bundleId) return { ok: false, replayed: false, silver: 0 };
    try {
        const res = await api.cmd<RewardGrantResult>('reward.claim', {
            bundleId,
            grantKey: year1GoalGrantKey(goal.id, kind),
            source: { kind: YEAR1_GOAL_REWARD_SOURCE, ref: goal.id },
        });
        if (isApiFail(res)) return { ok: false, replayed: false, silver: 0 };
        if (res.result.replayed) return { ok: true, replayed: true, silver: 0 };
        const silver = res.result.plan.reduce((sum, line) => {
            const applied = line.applied;
            return applied.kind === 'currency' && applied.id === 'silver' && typeof applied.amount === 'number' ? sum + applied.amount : sum;
        }, 0);
        return { ok: true, replayed: false, silver };
    } catch {
        return { ok: false, replayed: false, silver: 0 };
    }
}
