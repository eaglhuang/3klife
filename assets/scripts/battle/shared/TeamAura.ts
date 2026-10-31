// @spec-source → 奧義系統.md (doc_spec_0030)「UTEAMBUFF 全隊增益家族」；SYS-SKILL-ULT-0002
/**
 * 全隊增益 aura（SYS-SKILL-ULT-0002）— 純邏輯，不依賴 cc。
 *
 * 一次施放替施放陣營開一個 aura：攻擊／防禦倍率、減傷、群體護盾、免控，每回合倒數。
 * 同家族不疊加：重複施放時逐欄取較高值、回合取較長，避免爆表；來源記錄最後一次施放的奧義。
 * 目標只取存活單位；入場補掛與中途加入的單位因 aura 以陣營為鍵，自動吃到加成。
 *
 * PM 暫定（可逆）：規格只給文字的欄位，數字集中在 TEAM_AURA_PARAMS。
 * 條件型（曹操對酒當歌、郭嘉十勝定論、孫權坐斷東南）待後續片處理，不在本表；孫權碧眼統軍屬 team-heal 家族。
 */

export interface TeamAuraParams {
    durationTurns: number;
    attackMultiplier: number;
    defenseMultiplier: number;
    /** 受到傷害減免比例 0..1 */
    damageReduction: number;
    /** 護盾量 = 單位最大 HP × shieldPct */
    shieldPct: number;
    controlImmune: boolean;
}

/** 單一 aura 的上限，防止同家族疊出爆表結果 */
export const TEAM_AURA_CAPS = { attackMultiplier: 2, defenseMultiplier: 2, damageReduction: 0.5, shieldPct: 0.5 } as const;

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
    ].filter(Boolean) : [];
    return `${side}全隊增益：${parts.join('、') || '能力提升'}（${event.turns} 回合）`;
}

export function teamAuraParamsOf(ultimateId: string | null | undefined): TeamAuraParams | null {
    return ultimateId ? TEAM_AURA_PARAMS[ultimateId] ?? null : null;
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
