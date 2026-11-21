// @spec-source → 獎勵系統 Base 框架規格書 (doc_spec_1186) §12.4 reward.pools 完整機率表、§12.3 軟保底；GCH-R2（PROG-2-9461）
/**
 * RewardDisclosure — 獎池機率公開（純函式，零依賴 cc）。
 *
 * 機率表與抽樣用同一份資料：數字全部來自 RewardRules.poolDistribution（rollPool 抽樣時用的同一個函式），
 * 這裡只負責整理成 API 回應的形狀。畫面與文案不得自己寫機率常數，只讀 reward.pools。
 */
import type { RewardPityView, RewardPoolSlotView, RewardPoolTierView, RewardPoolView } from '../api/ApiCommands';
import type { RewardPoolDef } from './RewardConfig';
import { poolDistribution, type PityLadderState } from './RewardRules';

/** 保底階梯進度視圖（下一抽機率由 poolDistribution 的階梯狀態直接取得） */
export function pityViewsOf(pool: RewardPoolDef, counters: Readonly<Record<string, number>>): RewardPityView[] {
    if (pool.pity.length === 0) return [];
    const ladders: PityLadderState[] = poolDistribution(pool, counters).ladders;
    return ladders.map((l) => ({
        tier: l.ladder.tier,
        counterKey: l.ladder.counterKey,
        counter: l.counter,
        count: l.counter,
        softStartAt: l.ladder.soft ? l.ladder.soft.startAt : null,
        curveExp: l.ladder.soft ? l.ladder.soft.curveExp : null,
        hardAt: l.ladder.hardCount,
        remaining: Math.max(1, l.ladder.hardCount - l.counter),
        zone: l.zone,
        baseRate: l.baseRate,
        nextPullRate: l.rate,
    }));
}

function slotViewsOf(pool: RewardPoolDef): RewardPoolSlotView[] {
    return pool.slots.map((slot) => {
        const members = pool.entries.filter((e) => e.weight > 0 && (slot.tier === null || e.tier === slot.tier) && (slot.group === null || e.group === slot.group));
        const total = members.reduce((t, e) => t + e.weight, 0);
        return { count: slot.count, tier: slot.tier, group: slot.group, entries: members.map((e) => ({ entryId: e.id, rate: total > 0 ? e.weight / total : 0 })) };
    });
}

function rulesOf(pool: RewardPoolDef): string[] {
    const rules: string[] = [];
    if (pool.pity.length > 0) rules.push('pity.hard');
    if (pool.pity.some((p) => p.soft !== null)) rules.push('pity.soft');
    if (pool.entries.some((e) => e.group === 'up') && Object.keys(pool.tierGroups).length > 0) rules.push('up.share');
    for (const r of pool.rules) if (rules.indexOf(r) < 0) rules.push(r);
    return rules;
}

/** 單一獎池的完整機率表視圖；counters 是目前保底計數（權威端 meta.pity） */
export function poolViewOf(pool: RewardPoolDef, open: boolean, counters: Readonly<Record<string, number>>): RewardPoolView {
    const base = poolDistribution(pool, {}, { applyLadders: false });
    const next = poolDistribution(pool, counters);
    const nextById = new Map(next.entries.map((x) => [x.entry.id, x.probability]));
    const tiers: RewardPoolTierView[] = pool.tiers.map((tier) => {
        const t = next.tiers.find((x) => x.tier === tier);
        const baseRate = t ? t.baseRate : 0;
        return {
            tier,
            probability: baseRate,
            baseRate,
            effectiveRate: t ? t.effectiveRate : 0,
            entries: pool.disclosurePublic
                ? base.entries.filter((x) => x.entry.tier === tier).map((x) => ({
                    entryId: x.entry.id,
                    nameKey: x.entry.nameKey,
                    rate: x.probability,
                    effectiveRate: nextById.get(x.entry.id) ?? 0,
                    isUp: x.entry.group === 'up',
                    group: x.entry.group,
                }))
                : [],
        };
    });
    const pities = pityViewsOf(pool, counters);
    return {
        poolId: pool.id,
        open,
        nameKey: pool.nameKey,
        disclosureVersion: pool.disclosureVersion,
        public: pool.disclosurePublic,
        currency: [...pool.currency],
        tiers,
        pity: pities.length > 0 ? { counterKey: pities[0].counterKey, count: pities[0].count, hardAt: pities[0].hardAt } : null,
        pities,
        slots: slotViewsOf(pool),
        rules: rulesOf(pool),
    };
}
