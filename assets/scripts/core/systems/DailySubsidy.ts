// @spec-source → 經濟系統.md「地窖保護與每日補貼」DAILY_SUBSIDY；Data Schema 文件 Player_Economy.Daily_Subsidy（PROG-2-1309，ECO-06）
/**
 * DailySubsidy — 每日補貼的判定與入帳（純邏輯，不依賴 cc）
 *
 * - 同一天只領一次（以 lastClaimDay 判定），依糧草、黃金、城市兵源各自低於門檻才補。
 * - 補的是固定量，不是補到舒服線；入帳後仍經 ResourceCap 夾制。
 * - 沒有任何資源低於門檻時不算領取，lastClaimDay 保持原值。
 * - 門檻與補量依經濟系統表（暫定，待設定表覆寫）。
 *
 * Unity 對照：像每日登入獎勵的 Coroutine，先看 PlayerPrefs 的上次領取日，
 * 條件符合才 Add 固定量，並記下今天的日期。
 */
import { clampResource, type BaseResourceKey } from './ResourceCap';

export type SubsidyResourceKey = Extract<BaseResourceKey, 'food' | 'gold' | 'troops'>;
export type SubsidyResources = Readonly<Record<SubsidyResourceKey, number>>;

export interface SubsidyRule {
    readonly key: SubsidyResourceKey;
    readonly ifBelow: number;
    readonly grant: number;
}

export const DAILY_SUBSIDY_RULES: readonly SubsidyRule[] = Object.freeze([
    { key: 'food', ifBelow: 1200, grant: 400 },
    { key: 'gold', ifBelow: 500, grant: 150 },
    { key: 'troops', ifBelow: 600, grant: 200 },
]);

export interface DailySubsidyResult {
    /** 本次是否真的領到補貼 */
    claimed: boolean;
    /** 入帳後的資源量 */
    resources: SubsidyResources;
    /** 更新後的上次領取日（沒領到則維持原值） */
    lastClaimDay: number | null;
    /** 各資源實際補的量；沒補的資源不出現 */
    grants: Partial<Record<SubsidyResourceKey, number>>;
}

/** 依今日與上次領取日，判定並計算每日補貼。today 為切日後的日序號（RET-09 UTC+8）。 */
export function dailySubsidyOf(
    resources: SubsidyResources,
    lastClaimDay: number | null,
    today: number,
): DailySubsidyResult {
    if (lastClaimDay === today) {
        return { claimed: false, resources: { ...resources }, lastClaimDay, grants: {} };
    }
    const next: Record<SubsidyResourceKey, number> = { ...resources };
    const grants: Partial<Record<SubsidyResourceKey, number>> = {};
    for (const rule of DAILY_SUBSIDY_RULES) {
        if (resources[rule.key] >= rule.ifBelow) continue;
        grants[rule.key] = rule.grant;
        next[rule.key] = clampResource(rule.key, resources[rule.key] + rule.grant);
    }
    const claimed = Object.keys(grants).length > 0;
    return {
        claimed,
        resources: next,
        lastClaimDay: claimed ? today : lastClaimDay,
        grants,
    };
}
