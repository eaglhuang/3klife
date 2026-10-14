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

/** 戰場上的一個我方單位：有虎符才會帶 templateId，陣亡後不計入在場 Set */
export interface TallySetMember {
    templateId: string | null;
    alive: boolean;
}

/** 同陣營在場虎符部隊的 Set 攻防乘數：只計存活且有虎符的部隊（PROG-2-0574） */
export function fieldTallySetMods(members: readonly TallySetMember[]): { atkMod: number; defMod: number } {
    const ids: string[] = [];
    for (const member of members) {
        if (member.alive && member.templateId) ids.push(member.templateId);
    }
    return tallySetMultipliers(ids);
}

/** 單一 Set 的顯示文字，例如「五虎將（攻 +10% / 防 +10%）」；供戰場 UI 顯示（PROG-2-0575） */
export function describeTallySet(def: TigerTallySetDef): string {
    const atkPct = Math.round((def.bonus.atkMod - 1) * 100);
    const defPct = Math.round((def.bonus.defMod - 1) * 100);
    return `${def.name}（攻 +${atkPct}% / 防 +${defPct}%）`;
}

/** 在場虎符部隊成立的 Set 顯示文字清單；沒有 Set 時回空陣列 */
export function describeActiveTallySets(activeTallyTroopIds: readonly string[]): string[] {
    return getActiveTallySets(activeTallyTroopIds).map(describeTallySet);
}
