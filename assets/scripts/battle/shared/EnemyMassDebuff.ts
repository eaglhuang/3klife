// @spec-source → 奧義系統.md (doc_spec_0030)「UALLDEBUFF 敵方全體減益家族」；SYS-SKILL-ULT-0004
/**
 * 敵方全體減益（SYS-SKILL-ULT-0004）— 純邏輯，不依賴 cc。
 *
 * 一次施放對敵方陣營掛上一層「群體減益」：命中／暴擊下降、攻擊下降、易傷、每回合 DOT，
 * 並可附加狀態（暈眩／減速／虛弱／定身）與驅散正面狀態。
 * 目標列舉以 id 排序，確保覆蓋結果與單位順序無關；無敵與死亡單位排除。
 * 重複施放逐欄取「較強」值（倍率取小、易傷／DOT 取大、回合取長），再受上限約束。
 *
 * PM 暫定（可逆）：規格只給文字的欄位，數字集中在 ENEMY_MASS_DEBUFF_PARAMS。
 * 魅惑／沉默在戰場尚無專屬狀態，暫以暈眩近似；司馬懿轉化護盾待後續片。
 */
import { StatusEffect } from '../../shared/CommonEnums';

export interface EnemyMassDebuffParams {
    durationTurns: number;
    /** 命中下降（0..1，扣在命中率上） */
    accuracyPenalty: number;
    /** 暴擊率下降（0..1） */
    critPenalty: number;
    /** 攻擊倍率（< 1 為下降） */
    attackMultiplier: number;
    /** 受到傷害倍率（> 1 為易傷） */
    damageTakenMultiplier: number;
    /** 每回合 DOT = 最大 HP × dotPct */
    dotPct: number;
    /** 附加狀態與回合；guo-jia-3 依目標輪流套用 */
    statuses: readonly StatusEffect[];
    statusTurns: number;
    /** 狀態輪流套用（每個目標拿不同的一個）而非全部套用 */
    rotateStatuses?: boolean;
    /** 目標上限；省略為全體 */
    targetCount?: number;
    /** 驅散正面狀態 */
    dispel?: boolean;
}

export const ENEMY_MASS_DEBUFF_CAPS = {
    accuracyPenalty: 0.5,
    critPenalty: 0.5,
    minAttackMultiplier: 0.5,
    maxDamageTakenMultiplier: 1.5,
    dotPct: 0.15,
} as const;

/** 可被驅散的正面狀態（無敵不可驅散） */
export const DISPELLABLE_POSITIVE_EFFECTS: readonly StatusEffect[] = [StatusEffect.Haste, StatusEffect.Fortified];

const BASE: EnemyMassDebuffParams = {
    durationTurns: 0, accuracyPenalty: 0, critPenalty: 0, attackMultiplier: 1,
    damageTakenMultiplier: 1, dotPct: 0, statuses: [], statusTurns: 0,
};

/** 奧義 id → 群體減益參數（資料表，數值暫定） */
export const ENEMY_MASS_DEBUFF_PARAMS: Readonly<Record<string, EnemyMassDebuffParams>> = {
    // 大幅降低命中與暴擊 2 回合
    'ult-diao-chan-3': { ...BASE, durationTurns: 2, accuracyPenalty: 0.25, critPenalty: 0.2 },
    // 魅惑＋沉默（暫以暈眩 1 回合近似）＋精神 DOT
    'ult-diao-chan-5': { ...BASE, durationTurns: 2, dotPct: 0.05, statuses: [StatusEffect.Stun], statusTurns: 1 },
    // 攻擊下降、降低行動條（暫以減速 1 回合）
    'ult-zhang-fei-4': { ...BASE, durationTurns: 2, attackMultiplier: 0.8, statuses: [StatusEffect.Slow], statusTurns: 1 },
    // 隨機 3 名敵軍施加不同減益（延長 1 回合 → 2 回合）
    'ult-guo-jia-3': { ...BASE, statuses: [StatusEffect.Slow, StatusEffect.Weak, StatusEffect.Rooted], statusTurns: 2, rotateStatuses: true, targetCount: 3 },
    // 崩解：易傷 2 回合
    'ult-guo-jia-5': { ...BASE, durationTurns: 2, damageTakenMultiplier: 1.25 },
    // 清除敵方全體增益（轉護盾待後續片）
    'ult-sima-yi-4': { ...BASE, dispel: true },
    // 火傷印記 2 回合
    'ult-zhou-yu-1': { ...BASE, durationTurns: 2, dotPct: 0.04 },
};

/** 掛在被減益陣營上的持續層 */
export interface EnemyMassDebuff {
    turnsLeft: number;
    accuracyPenalty: number;
    critPenalty: number;
    attackMultiplier: number;
    damageTakenMultiplier: number;
    dotPct: number;
}

export interface MassDebuffTarget {
    id: string;
    isDead(): boolean;
    effects: readonly StatusEffect[];
}

export function enemyMassDebuffParamsOf(ultimateId: string | null | undefined): EnemyMassDebuffParams | null {
    return (ultimateId && ENEMY_MASS_DEBUFF_PARAMS[ultimateId]) || null;
}

/** 目標列舉：排除死亡與無敵，以 id 排序；有上限時用 roll（0..1）決定起點，結果與輸入順序無關 */
export function massDebuffTargets<T extends MassDebuffTarget>(units: Iterable<T>, params: EnemyMassDebuffParams, roll = 0): T[] {
    const alive = Array.from(units)
        .filter((u) => !u.isDead() && u.effects.indexOf(StatusEffect.Invincible) < 0)
        .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const count = params.targetCount;
    if (count === undefined || count >= alive.length) return alive;
    const start = Math.min(alive.length - 1, Math.floor(Math.max(0, roll) * alive.length));
    const out: T[] = [];
    for (let i = 0; i < count; i++) out.push(alive[(start + i) % alive.length]);
    return out;
}

/** 每個目標要套的狀態：輪流或全部 */
export function massDebuffStatusesFor(params: EnemyMassDebuffParams, index: number): StatusEffect[] {
    if (params.statuses.length === 0) return [];
    if (params.rotateStatuses) return [params.statuses[index % params.statuses.length]];
    return params.statuses.slice();
}

/** 驅散只挑白名單內的正面狀態 */
export function dispelPick(effects: readonly StatusEffect[]): StatusEffect[] {
    return DISPELLABLE_POSITIVE_EFFECTS.filter((e) => effects.indexOf(e) >= 0);
}

/** 開始或刷新持續層；無持續欄位的奧義回傳原值 */
export function startEnemyMassDebuff(current: EnemyMassDebuff | null, ultimateId: string): EnemyMassDebuff | null {
    const p = enemyMassDebuffParamsOf(ultimateId);
    if (!p || p.durationTurns <= 0) return current;
    const c = ENEMY_MASS_DEBUFF_CAPS;
    const prev = current ?? { turnsLeft: 0, accuracyPenalty: 0, critPenalty: 0, attackMultiplier: 1, damageTakenMultiplier: 1, dotPct: 0 };
    return {
        turnsLeft: Math.max(prev.turnsLeft, p.durationTurns),
        accuracyPenalty: Math.min(c.accuracyPenalty, Math.max(prev.accuracyPenalty, p.accuracyPenalty)),
        critPenalty: Math.min(c.critPenalty, Math.max(prev.critPenalty, p.critPenalty)),
        attackMultiplier: Math.max(c.minAttackMultiplier, Math.min(prev.attackMultiplier, p.attackMultiplier)),
        damageTakenMultiplier: Math.min(c.maxDamageTakenMultiplier, Math.max(prev.damageTakenMultiplier, p.damageTakenMultiplier)),
        dotPct: Math.min(c.dotPct, Math.max(prev.dotPct, p.dotPct)),
    };
}

export function tickEnemyMassDebuff(debuff: EnemyMassDebuff | null): { debuff: EnemyMassDebuff | null; phase: 'none' | 'active' | 'ended' } {
    if (!debuff) return { debuff: null, phase: 'none' };
    const turnsLeft = debuff.turnsLeft - 1;
    if (turnsLeft <= 0) return { debuff: null, phase: 'ended' };
    return { debuff: { ...debuff, turnsLeft }, phase: 'active' };
}

export function massDebuffDotDamage(debuff: EnemyMassDebuff | null, maxHp: number): number {
    return debuff ? Math.floor(maxHp * debuff.dotPct) : 0;
}

export function massDebuffAttackMultiplier(debuff: EnemyMassDebuff | null): number {
    return debuff ? debuff.attackMultiplier : 1;
}

export function massDebuffDamageTakenMultiplier(debuff: EnemyMassDebuff | null): number {
    return debuff ? debuff.damageTakenMultiplier : 1;
}

export function massDebuffAccuracyDelta(debuff: EnemyMassDebuff | null): number {
    return debuff ? -debuff.accuracyPenalty : 0;
}

export function massDebuffCritDelta(debuff: EnemyMassDebuff | null): number {
    return debuff ? -debuff.critPenalty : 0;
}

export interface EnemyMassDebuffChangedEvent {
    /** 被減益的陣營 */
    faction: string;
    phase: 'started' | 'ended';
    debuff: EnemyMassDebuff | null;
}

/** 戰報摘要；isPlayer 指被減益的是否為我方 */
export function enemyMassDebuffNoticeText(event: EnemyMassDebuffChangedEvent, isPlayer: boolean): string {
    const side = isPlayer ? '我方' : '敵方';
    if (event.phase === 'ended' || !event.debuff) return `${side}全體減益解除`;
    const d = event.debuff;
    const parts: string[] = [];
    if (d.accuracyPenalty > 0) parts.push(`命中 -${Math.round(d.accuracyPenalty * 100)}%`);
    if (d.critPenalty > 0) parts.push(`暴擊 -${Math.round(d.critPenalty * 100)}%`);
    if (d.attackMultiplier < 1) parts.push(`攻擊 ×${d.attackMultiplier}`);
    if (d.damageTakenMultiplier > 1) parts.push(`易傷 ×${d.damageTakenMultiplier}`);
    if (d.dotPct > 0) parts.push(`每回合 -${Math.round(d.dotPct * 100)}% HP`);
    return `${side}全體受減益：${parts.join('、')}（${d.turnsLeft} 回合）`;
}
