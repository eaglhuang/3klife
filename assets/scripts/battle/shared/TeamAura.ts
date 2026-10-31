// @spec-source → 奧義系統.md (doc_spec_0030)「UTEAMBUFF 全隊增益家族」；SYS-SKILL-ULT-0002
/**
 * 全隊增益 aura（SYS-SKILL-ULT-0002）— 純邏輯，不依賴 cc。
 *
 * 一次施放替施放陣營開一個 aura：攻擊／防禦倍率、減傷、群體護盾、免控，每回合倒數。
 * 同家族不疊加：重複施放時逐欄取較高值、回合取較長，避免爆表；來源記錄最後一次施放的奧義。
 * 目標只取存活單位；入場補掛與中途加入的單位因 aura 以陣營為鍵，自動吃到加成。
 *
 * PM 暫定（可逆）：規格只給文字的欄位，數字集中在 TEAM_AURA_PARAMS。
 * 郭嘉十勝定論為條件型：只對身上有負面狀態的目標增傷。孫權坐斷東南為條件型：只有指定兵種命中提升。曹操對酒當歌待後續片處理，不在本表；孫權碧眼統軍屬 team-heal 家族。
 */

import { StatusEffect } from '../../shared/CommonEnums';

export interface TeamAuraParams {
    durationTurns: number;
    attackMultiplier: number;
    defenseMultiplier: number;
    /** 受到傷害減免比例 0..1 */
    damageReduction: number;
    /** 護盾量 = 單位最大 HP × shieldPct */
    shieldPct: number;
    controlImmune: boolean;
    /** 對身上有負面狀態的目標增傷比例（條件型），缺省 0 */
    vsDebuffedDamageBonus?: number;
    /** 命中率加成（條件型），只套用在 accuracyTroopTypes 列出的兵種，缺省 0 */
    accuracyBonus?: number;
    accuracyTroopTypes?: readonly string[];
    /** 負面狀態抵抗機率 0..1（抗性），缺省 0 */
    debuffResistChance?: number;
    /** 反擊發動率加成 0..1（加在既有反擊的發動率上），缺省 0 */
    counterRateBonus?: number;
}

/** 視為負面狀態的效果（條件型增傷用） */
export const TEAM_AURA_DEBUFF_EFFECTS: readonly StatusEffect[] = [StatusEffect.Stun, StatusEffect.Rooted, StatusEffect.Slow, StatusEffect.Weak];

/** 單一 aura 的上限，防止同家族疊出爆表結果 */
export const TEAM_AURA_CAPS = { attackMultiplier: 2, defenseMultiplier: 2, damageReduction: 0.5, shieldPct: 0.5, vsDebuffedDamageBonus: 0.5, debuffResistChance: 0.6, counterRateBonus: 0.5 } as const;

/** 奧義 id → aura 參數（資料表，數值暫定） */
export const TEAM_AURA_PARAMS: Readonly<Record<string, TeamAuraParams>> = {
    // 義兄弟全員攻擊 ×2 並免疫控制；暫定全軍、2 回合
    'ult-guan-yu-4': { durationTurns: 2, attackMultiplier: 2, defenseMultiplier: 1, damageReduction: 0, shieldPct: 0, controlImmune: true },
    // 相鄰友軍攻防 +35% 3 回合；暫定全軍
    'ult-liu-bei-2': { durationTurns: 3, attackMultiplier: 1.35, defenseMultiplier: 1.35, damageReduction: 0, shieldPct: 0, controlImmune: false },
    // 攻防速全面提升：暫定攻防 +25% 2 回合（首輪必暴擊待後續片）
    'ult-liu-bei-5': { durationTurns: 2, attackMultiplier: 1.25, defenseMultiplier: 1.25, damageReduction: 0, shieldPct: 0, controlImmune: false },
    // 全軍防禦 +40%；回合暫定 3（自身嘲諷待後續片）
    'ult-zhao-yun-4': { durationTurns: 3, attackMultiplier: 1, defenseMultiplier: 1.4, damageReduction: 0, shieldPct: 0, controlImmune: false },
    // 全軍攻擊 +30% 3 回合
    'ult-cao-cao-1': { durationTurns: 3, attackMultiplier: 1.3, defenseMultiplier: 1, damageReduction: 0, shieldPct: 0, controlImmune: false },
    // 我軍全體對 debuff 目標增傷 30%；回合暫定 3
    'ult-guo-jia-2': { durationTurns: 3, attackMultiplier: 1, defenseMultiplier: 1, damageReduction: 0, shieldPct: 0, controlImmune: false, vsDebuffedDamageBonus: 0.3 },
    // 我軍水戰與弓兵單位命中率 +25% 持續 3 回合
    'ult-sun-quan-2': { durationTurns: 3, attackMultiplier: 1, defenseMultiplier: 1, damageReduction: 0, shieldPct: 0, controlImmune: false, accuracyBonus: 0.25, accuracyTroopTypes: ['archer', 'navy'] },
    // 智傷與減傷雙重加成 3 回合：暫定攻擊 +20%、減傷 20%
    'ult-sima-yi-5': { durationTurns: 3, attackMultiplier: 1.2, defenseMultiplier: 1, damageReduction: 0.2, shieldPct: 0, controlImmune: false },
    // 攻速與智傷加成 3 回合：暫定攻擊 +20%
    'ult-zhou-yu-4': { durationTurns: 3, attackMultiplier: 1.2, defenseMultiplier: 1, damageReduction: 0, shieldPct: 0, controlImmune: false },
};

export interface TeamAura extends TeamAuraParams {
    ultimateId: string;
    remainingTurns: number;
}

export interface TeamAuraChangedEvent {
    faction: string;
    phase: 'started' | 'ended';
    ultimateId: string;
    turns: number;
}

/** 戰報文字：開始寫全隊效果與回合，結束寫回退提示（Battle / UI 共用同一份 aura 結果） */
export function teamAuraNoticeText(event: TeamAuraChangedEvent, isPlayer: boolean): string {
    const side = isPlayer ? '我軍' : '敵軍';
    if (event.phase === 'ended') return `${side}全隊增益結束`;
    const p = teamAuraParamsOf(event.ultimateId);
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    const parts = p ? [
        p.attackMultiplier > 1 ? `攻擊 +${pct(p.attackMultiplier - 1)}` : '',
        p.defenseMultiplier > 1 ? `防禦 +${pct(p.defenseMultiplier - 1)}` : '',
        p.damageReduction > 0 ? `減傷 ${pct(p.damageReduction)}` : '',
        p.controlImmune ? '免控' : '',
        (p.counterRateBonus ?? 0) > 0 ? `反擊率 +${pct(p.counterRateBonus!)}` : '',
        (p.debuffResistChance ?? 0) > 0 ? `抗性 +${pct(p.debuffResistChance!)}` : '',
        (p.accuracyBonus ?? 0) > 0 ? `指定兵種命中 +${pct(p.accuracyBonus!)}` : '',
        (p.vsDebuffedDamageBonus ?? 0) > 0 ? `對負面狀態目標增傷 ${pct(p.vsDebuffedDamageBonus!)}` : '',
    ].filter(Boolean) : [];
    return `${side}全隊增益：${parts.join('、') || '能力提升'}（${event.turns} 回合）`;
}

/**
 * 團隊回復家族的持續附帶效果（SYS-SKILL-ULT-0003）：瞬間回復之外再掛一段 aura，
 * 與全隊增益共用同一份 aura 結果與上限，不另做一套持續狀態。
 */
export const TEAM_AURA_RIDERS: Readonly<Record<string, TeamAuraParams>> = {
    // 昭烈仁政：回復 20% HP 外，獲得 2 回合減傷；暫定減傷 20%
    'ult-liu-bei-3': { durationTurns: 2, attackMultiplier: 1, defenseMultiplier: 1, damageReduction: 0.2, shieldPct: 0, controlImmune: false },
    // 建安風骨：移除負面狀態外，我軍全體抗性提升；暫定 3 回合、負面狀態抵抗 30%
    // 碧眼統軍：護盾外，提高 2 回合反擊率；暫定反擊發動率 +30%
    'ult-sun-quan-4': { durationTurns: 2, attackMultiplier: 1, defenseMultiplier: 1, damageReduction: 0, shieldPct: 0, controlImmune: false, counterRateBonus: 0.3 },
    'ult-cao-zhi-3': { durationTurns: 3, attackMultiplier: 1, defenseMultiplier: 1, damageReduction: 0, shieldPct: 0, controlImmune: false, debuffResistChance: 0.3 },
};

export function teamAuraParamsOf(ultimateId: string | null | undefined): TeamAuraParams | null {
    return ultimateId ? TEAM_AURA_PARAMS[ultimateId] ?? TEAM_AURA_RIDERS[ultimateId] ?? null : null;
}

/** 施放：非全隊增益奧義原樣回傳；已有 aura 時逐欄取高（受上限約束） */
export function startTeamAura(current: TeamAura | null, ultimateId: string): TeamAura | null {
    const p = teamAuraParamsOf(ultimateId);
    if (!p) return current;
    const base = current && current.remainingTurns > 0 ? current : null;
    return {
        ultimateId,
        remainingTurns: Math.max(p.durationTurns, base?.remainingTurns ?? 0),
        durationTurns: Math.max(p.durationTurns, base?.durationTurns ?? 0),
        attackMultiplier: Math.min(TEAM_AURA_CAPS.attackMultiplier, Math.max(p.attackMultiplier, base?.attackMultiplier ?? 1)),
        defenseMultiplier: Math.min(TEAM_AURA_CAPS.defenseMultiplier, Math.max(p.defenseMultiplier, base?.defenseMultiplier ?? 1)),
        damageReduction: Math.min(TEAM_AURA_CAPS.damageReduction, Math.max(p.damageReduction, base?.damageReduction ?? 0)),
        shieldPct: Math.min(TEAM_AURA_CAPS.shieldPct, Math.max(p.shieldPct, base?.shieldPct ?? 0)),
        controlImmune: p.controlImmune || !!base?.controlImmune,
        // 命中加成取較高者，兵種限制跟著取高的那一方
        ...((p.accuracyBonus ?? 0) >= (base?.accuracyBonus ?? 0)
            ? { accuracyBonus: p.accuracyBonus ?? 0, accuracyTroopTypes: p.accuracyTroopTypes }
            : { accuracyBonus: base!.accuracyBonus, accuracyTroopTypes: base!.accuracyTroopTypes }),
        counterRateBonus: Math.min(TEAM_AURA_CAPS.counterRateBonus, Math.max(p.counterRateBonus ?? 0, base?.counterRateBonus ?? 0)),
        debuffResistChance: Math.min(TEAM_AURA_CAPS.debuffResistChance, Math.max(p.debuffResistChance ?? 0, base?.debuffResistChance ?? 0)),
        vsDebuffedDamageBonus: Math.min(TEAM_AURA_CAPS.vsDebuffedDamageBonus, Math.max(p.vsDebuffedDamageBonus ?? 0, base?.vsDebuffedDamageBonus ?? 0)),
    };
}

/** 施放陣營回合結束倒數；到期回報 ended 並清空 */
export function tickTeamAura(aura: TeamAura | null): { aura: TeamAura | null; phase: 'none' | 'active' | 'ended' } {
    if (!aura || aura.remainingTurns <= 0) return { aura: null, phase: 'none' };
    const remainingTurns = aura.remainingTurns - 1;
    if (remainingTurns <= 0) return { aura: null, phase: 'ended' };
    return { aura: { ...aura, remainingTurns }, phase: 'active' };
}

function active(aura: TeamAura | null): aura is TeamAura {
    return !!aura && aura.remainingTurns > 0;
}

export function teamAuraAttackMultiplier(aura: TeamAura | null): number {
    return active(aura) ? aura.attackMultiplier : 1;
}

export function teamAuraDefenseMultiplier(aura: TeamAura | null): number {
    return active(aura) ? aura.defenseMultiplier : 1;
}

/** 反擊發動率：既有發動率加上 aura 加成，不超過 100% */
export function teamAuraCounterRate(aura: TeamAura | null, baseRate: number): number {
    return Math.min(1, baseRate + (active(aura) ? aura.counterRateBonus ?? 0 : 0));
}

/** 抗性：負面狀態施加時依機率抵抗；roll 為 0..1 亂數，正面狀態不受影響 */
export function teamAuraResistsDebuff(aura: TeamAura | null, effect: StatusEffect, roll: number): boolean {
    if (!active(aura) || !aura.debuffResistChance) return false;
    return TEAM_AURA_DEBUFF_EFFECTS.includes(effect) && roll < aura.debuffResistChance;
}

/** 條件型命中加成：攻擊方兵種在名單內才生效 */
export function teamAuraAccuracyDelta(aura: TeamAura | null, troopType: string): number {
    if (!active(aura) || !aura.accuracyBonus) return 0;
    return aura.accuracyTroopTypes?.includes(troopType) ? aura.accuracyBonus : 0;
}

/** 條件型增傷倍率：目標身上有負面狀態才生效 */
export function teamAuraVsDebuffedMultiplier(aura: TeamAura | null, targetDebuffed: boolean): number {
    return active(aura) && targetDebuffed ? 1 + (aura.vsDebuffedDamageBonus ?? 0) : 1;
}

/** 結算順序固定：先減傷，再由護盾吸收，剩餘才扣 HP */
export function applyTeamAuraToDamage(aura: TeamAura | null, damage: number, shield: number): { hpDamage: number; shieldLeft: number } {
    const reduced = active(aura) ? Math.round(damage * (1 - aura.damageReduction)) : damage;
    const absorbed = Math.min(Math.max(0, shield), reduced);
    return { hpDamage: reduced - absorbed, shieldLeft: Math.max(0, shield) - absorbed };
}

/** 施放當下每個存活單位拿到的護盾量 */
export function teamAuraShieldFor(aura: TeamAura | null, maxHp: number): number {
    return active(aura) ? Math.round(maxHp * aura.shieldPct) : 0;
}

/** 全隊目標：只取指定陣營的存活單位 */
export function teamAuraTargets<T extends { faction: string; isDead(): boolean }>(units: Iterable<T>, faction: string): T[] {
    const out: T[] = [];
    for (const u of units) if (u.faction === faction && !u.isDead()) out.push(u);
    return out;
}
