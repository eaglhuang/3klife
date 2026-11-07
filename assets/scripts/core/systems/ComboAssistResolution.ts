// @spec-source → 戰場相鄰合攻聯動與情誼共鳴規格書 (doc_spec_0323) §1~§3（KIN-09、KIN-08，PROG-2-1949）
/**
 * ComboAssistResolution — 合攻觸發後的援護追擊結算、相鄰判定與情誼共鳴台詞（純邏輯，不依賴 cc）。
 *
 * 規格定案：
 * - 相鄰：九宮格 8 格（切比雪夫距離 ≤ 1，不含自身格）。
 * - 援護傷害 = 主動普攻的 60%；目標已陣亡則無效；不消耗 AP。
 * - 單支部隊每回合最多援護 2 次；援護扣 3 精力，精力 < 10 不能響應。
 * - 成功合攻雙方全軍士氣 +5。
 * - 演出：切屏 0.6s + 突進 0.8s，總長 ≤ 1.4s，可跳過。
 *
 * 觸發機率（20% × 最大羈絆倍率，不疊乘）沿用 ComboAttackKin。
 * 暫定：BattleController 接線、切屏演出與台詞配音另卡；台詞表以武將 id 組合查詢，未列組合不出台詞。
 * Unity 對照：像戰鬥結算的 static helper，回傳要套用的數值，由 Controller 實際改狀態。
 */

export const COMBO_ASSIST_DAMAGE_RATIO = 0.6;
export const COMBO_ASSIST_MAX_PER_TURN = 2;
export const COMBO_ASSIST_VITALITY_COST = 3;
export const COMBO_ASSIST_MIN_VITALITY = 10;
export const COMBO_ASSIST_MORALE_BONUS = 5;
export const COMBO_SPLIT_SCREEN_SEC = 0.6;
export const COMBO_DASH_SEC = 0.8;

export interface GridPos {
    x: number;
    y: number;
}

/** 九宮格相鄰（不含同格）。 */
export function isComboAdjacent(a: GridPos, b: GridPos): boolean {
    const d = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
    return d === 1;
}

export interface AssistUnitState {
    vitality: number;
    assistsThisTurn: number;
}

/** 援護方能否響應：每回合未滿 2 次且精力 ≥ 10。 */
export function canRespondToCombo(unit: AssistUnitState): boolean {
    return unit.assistsThisTurn < COMBO_ASSIST_MAX_PER_TURN && unit.vitality >= COMBO_ASSIST_MIN_VITALITY;
}

export interface ComboAssistResult {
    damage: number;
    assist: AssistUnitState;
    moraleBonus: number;
}

/** 合攻判定成功後的援護結算；目標已陣亡或援護方不能響應時回 null。 */
export function resolveComboAssist(primaryDamage: number, targetAlive: boolean, assist: AssistUnitState): ComboAssistResult | null {
    if (!targetAlive || !canRespondToCombo(assist)) return null;
    return {
        damage: Math.max(0, Math.floor(primaryDamage * COMBO_ASSIST_DAMAGE_RATIO)),
        assist: { vitality: assist.vitality - COMBO_ASSIST_VITALITY_COST, assistsThisTurn: assist.assistsThisTurn + 1 },
        moraleBonus: COMBO_ASSIST_MORALE_BONUS,
    };
}

/** 回合開始重置援護次數。 */
export function resetComboAssistTurn(unit: AssistUnitState): AssistUnitState {
    return { ...unit, assistsThisTurn: 0 };
}

const RESONANCE_LINES: readonly { ids: readonly string[]; line: string }[] = [
    { ids: ['liu-bei', 'guan-yu', 'zhang-fei'], line: '桃園同心，共破頑敵！' },
    { ids: ['zhou-yu', 'xiao-qiao'], line: '琴瑟相和，烈火焚營！' },
    { ids: ['zhao-yun', 'ma-chao'], line: '雙龍會聚，誰攖其鋒！' },
];

/** 情誼共鳴台詞：主攻與援護兩人都在同一組才出台詞。 */
export function comboResonanceLine(attackerId: string, assistId: string): string | null {
    const hit = RESONANCE_LINES.find((g) => g.ids.includes(attackerId) && g.ids.includes(assistId) && attackerId !== assistId);
    return hit ? hit.line : null;
}
