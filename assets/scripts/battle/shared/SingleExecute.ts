// @spec-source → 奧義系統.md (doc_spec_0030)「USINGLE 敵將定點傷害家族」；SYS-SKILL-ULT-0005
/**
 * 敵將定點傷害（SYS-SKILL-ULT-0005）— 純邏輯，不依賴 cc。
 *
 * 單體重創、斬殺線、標記壓制收斂成一張參數表：
 * - 目標優先權：鎖定目標存活就不換；否則依奧義的挑選規則（最低血量比／最高攻擊），同值以 id 排序。
 * - 斬殺：傷害結算後目標剩餘血量比 ≤ 門檻即直接擊殺。
 * - 標記：被標記陣營 / 單位受到施放方的傷害提高，持續數回合。
 *
 * PM 暫定（可逆）：規格只給文字的欄位，數字集中在 SINGLE_EXECUTE_PARAMS。
 */

export type SingleTargetRule = 'lowest-hp-ratio' | 'highest-attack';

export interface SingleExecuteParams {
    targetRule: SingleTargetRule;
    /** 連擊次數 */
    hits: number;
    /** 純傷害 = 目標最大 HP × pureHpPct（無視防禦）；0 表示走一般公式 */
    pureHpPct: number;
    /** 必定暴擊 */
    guaranteedCrit: boolean;
    /** 斬殺門檻：結算後剩餘血量比 ≤ 此值直接擊殺；0 表示無斬殺 */
    executeThresholdPct: number;
    /** 標記增傷與回合 */
    markDamageBonus: number;
    markTurns: number;
    /** 每次擊殺回復施放者最大 HP 比例 */
    healOnKillPct: number;
    /** 吸取目標攻擊比例轉為施放者護盾 */
    drainAttackToShieldPct: number;
}

export const SINGLE_EXECUTE_CAPS = {
    pureHpPct: 0.8,
    executeThresholdPct: 0.3,
    markDamageBonus: 0.5,
} as const;

const BASE: SingleExecuteParams = {
    targetRule: 'lowest-hp-ratio', hits: 1, pureHpPct: 0, guaranteedCrit: false,
    executeThresholdPct: 0, markDamageBonus: 0, markTurns: 0, healOnKillPct: 0, drainAttackToShieldPct: 0,
};

/** 奧義 id → 單體參數（資料表，數值暫定） */
export const SINGLE_EXECUTE_PARAMS: Readonly<Record<string, SingleExecuteParams>> = {
    // 吸取敵方最高攻單位 30% 攻擊轉為自身護盾
    'ult-diao-chan-4': { ...BASE, targetRule: 'highest-attack', drainAttackToShieldPct: 0.3 },
    // 三連擊（穿透交給技能本體）
    'ult-lu-bu-1': { ...BASE, hits: 3 },
    // 必定暴擊
    'ult-lu-bu-2': { ...BASE, guaranteedCrit: true },
    // 最大 HP 80% 純傷害；剩 15% 以下斬殺
    'ult-lu-bu-5': { ...BASE, pureHpPct: 0.8, executeThresholdPct: 0.15 },
    // 連破 5 格；殘血 10% 以下斬殺
    'ult-guan-yu-2': { ...BASE, hits: 5, executeThresholdPct: 0.1 },
    // 7 次突擊，每次擊殺回 5% HP
    'ult-zhao-yun-3': { ...BASE, hits: 7, healOnKillPct: 0.05 },
    // 連施 2 次，第二次必暴擊（逐擊暴擊由 critOnHit 決定）
    'ult-cao-zhi-4': { ...BASE, hits: 2 },
    // 揭露最弱點：標記後受傷 +35%，2 回合
    'ult-sima-yi-1': { ...BASE, markDamageBonus: 0.35, markTurns: 2 },
};

export interface SingleTargetCandidate {
    id: string;
    currentHp: number;
    maxHp: number;
    attack: number;
    isDead(): boolean;
}

export function singleExecuteParamsOf(ultimateId: string | null | undefined): SingleExecuteParams | null {
    return (ultimateId && SINGLE_EXECUTE_PARAMS[ultimateId]) || null;
}

/** 目標優先權：鎖定目標仍存活就保留；否則依規則挑選，同值 id 小者優先 */
export function selectSingleTarget<T extends SingleTargetCandidate>(units: Iterable<T>, rule: SingleTargetRule, lockedId: string | null = null): T | null {
    const alive = Array.from(units).filter((u) => !u.isDead());
    if (lockedId) {
        const locked = alive.find((u) => u.id === lockedId);
        if (locked) return locked;
    }
    const score = (u: T) => (rule === 'highest-attack' ? -u.attack : u.currentHp / Math.max(1, u.maxHp));
    alive.sort((a, b) => score(a) - score(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return alive[0] ?? null;
}

/** 第 hitIndex（0 起）擊是否必暴擊 */
export function critOnHit(ultimateId: string, params: SingleExecuteParams, hitIndex: number): boolean {
    if (params.guaranteedCrit) return true;
    // 曹植才華橫溢：第二次必定暴擊
    return ultimateId === 'ult-cao-zhi-4' && hitIndex === 1;
}

/** 純傷害（無視防禦），受上限約束 */
export function singlePureDamage(params: SingleExecuteParams, targetMaxHp: number): number {
    return Math.floor(targetMaxHp * Math.min(SINGLE_EXECUTE_CAPS.pureHpPct, params.pureHpPct));
}

export interface ExecuteOutcome {
    /** 實際扣血量（斬殺時補到剩餘血量） */
    damage: number;
    executed: boolean;
    killed: boolean;
}

/** 斬殺判定：先套傷害，剩餘比 ≤ 門檻就補到 0 */
export function resolveExecute(params: SingleExecuteParams, currentHp: number, maxHp: number, damage: number): ExecuteOutcome {
    const dealt = Math.max(0, Math.min(currentHp, Math.floor(damage)));
    const left = currentHp - dealt;
    const threshold = Math.min(SINGLE_EXECUTE_CAPS.executeThresholdPct, params.executeThresholdPct);
    if (left > 0 && threshold > 0 && left / Math.max(1, maxHp) <= threshold) {
        return { damage: currentHp, executed: true, killed: true };
    }
    return { damage: dealt, executed: false, killed: left <= 0 };
}

/** 標記期間受到施放方傷害的倍率 */
export function singleMarkMultiplier(params: SingleExecuteParams | null, marked: boolean): number {
    if (!params || !marked) return 1;
    return 1 + Math.min(SINGLE_EXECUTE_CAPS.markDamageBonus, params.markDamageBonus);
}

export function singleHealOnKill(params: SingleExecuteParams, casterMaxHp: number, kills: number): number {
    return Math.floor(casterMaxHp * params.healOnKillPct) * Math.max(0, kills);
}

export function singleDrainShield(params: SingleExecuteParams, targetAttack: number): number {
    return Math.floor(targetAttack * params.drainAttackToShieldPct);
}

export interface SingleExecuteEvent {
    faction: string;
    ultimateId: string;
    targetName: string;
    damage: number;
    executed: boolean;
    killed: boolean;
}

/** 戰報：斬殺成功／擊殺／未斬殺三種分支 */
export function singleExecuteNoticeText(event: SingleExecuteEvent, isPlayer: boolean): string {
    const side = isPlayer ? '我方' : '敵方';
    if (event.executed) return `${side}斬殺 ${event.targetName}！`;
    if (event.killed) return `${side}重創擊破 ${event.targetName}（${event.damage}）`;
    return `${side}重創 ${event.targetName}（${event.damage}），未達斬殺線`;
}
