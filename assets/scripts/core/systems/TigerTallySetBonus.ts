// @spec-source → 兵種（虎符）系統.md §虎符陣容 Set 羈絆加成（Q64=A）、Set 羈絆表；TRP-14（PROG-2-0570）
/**
 * TigerTallySetBonus — 虎符陣容 Set 羈絆判定與攻防加成（純邏輯，不依賴 cc）
 *
 * 同一場戰中，相同 Set 的虎符部隊在場達到門檻，即觸發攻防加成。
 * 同一 Set 只加一次，不因重複出現而疊加；只回傳倍率，由戰場端套用到單位數值。
 *
 * Unity 對照：像成就系統，收集到指定數量的成員就解鎖一次加成，重複收集不會再加。
 */

export interface TigerTallySetDef {
    setId: string;
    name: string;
    memberTroopIds: readonly string[];
    /** 需同時在場的最低成員數 */
    requiredCount: number;
    bonus: { atkMod: number; defMod: number };
}

export const TIGER_TALLY_SET_DEFS: readonly TigerTallySetDef[] = [
    {
        setId: 'SET_FIVE_TIGERS',
        name: '五虎將',
        memberTroopIds: ['TROOP_CHANGSHAN_DRAGON', 'TROOP_LOYAL_IRON_GUARD', 'TROOP_THUNDER_SQUAD', 'TROOP_GOD_SNIPER', 'TROOP_DIVINE_CAVALRY'],
        requiredCount: 3,
        bonus: { atkMod: 1.10, defMod: 1.10 },
    },
    {
        setId: 'SET_JIANGDONG_TIGERS',
        name: '江東十二虎臣',
        memberTroopIds: ['TROOP_WU_NAVY', 'TROOP_BROCADE_RAIDERS', 'TROOP_FEARLESS_GUARD', 'TROOP_JIANGDONG_GUARD'],
        requiredCount: 3,
        bonus: { atkMod: 1.10, defMod: 1.05 },
    },
    {
        setId: 'SET_FIVE_ADVISORS',
        name: '曹魏五謀',
        memberTroopIds: ['TROOP_GHOST_STRATEGISTS', 'TROOP_SHADOW_GUARD', 'TROOP_SWIFT_CAVALRY', 'TROOP_CROSSBOW_VOLLEY', 'TROOP_PHANTOM_CAMP'],
        requiredCount: 3,
        bonus: { atkMod: 1.08, defMod: 1.08 },
    },
];

/** 依在場的虎符部隊 ID 判定成立的 Set；同一 Set 不論成員重複幾次都只計一次 */
export function getActiveTallySets(activeTallyTroopIds: readonly string[]): TigerTallySetDef[] {
    const onField = new Set(activeTallyTroopIds);
    return TIGER_TALLY_SET_DEFS.filter((def) => {
        const matched = def.memberTroopIds.filter((id) => onField.has(id)).length;
        return matched >= def.requiredCount;
    });
}

/**
 * 所有成立 Set 的攻防倍率（PM 裁定：多 Set 同時成立採加法疊加，不相乘）。
 * 每個 Set 貢獻 (加成 − 1)，合計後加回 1；無 Set 時為 1。
 */
export function tallySetMultipliers(activeTallyTroopIds: readonly string[]): { atkMod: number; defMod: number } {
    return getActiveTallySets(activeTallyTroopIds).reduce(
        (acc, def) => ({
            atkMod: acc.atkMod + (def.bonus.atkMod - 1),
            defMod: acc.defMod + (def.bonus.defMod - 1),
        }),
        { atkMod: 1, defMod: 1 },
    );
}
