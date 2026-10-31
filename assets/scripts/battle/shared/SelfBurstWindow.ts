// @spec-source → 奧義系統.md (doc_spec_0030)「UBURST 自身爆發家族」；SYS-SKILL-ULT-0001
/**
 * 自身爆發窗口（SYS-SKILL-ULT-0001）— 純邏輯，不依賴 cc。
 *
 * 一次施放開一個窗口：開始 → 持續（每回合倒數）→ 結束；結束當回合回報 ended，供 UI 顯示回退提示。
 * 窗口期間提供攻擊倍率、暴擊加成、免控；再行動每個窗口有上限，不能無限連鎖。
 * 同一單位重複施放時刷新為新窗口（取較長回合、較高倍率），再行動次數不累加。
 *
 * PM 暫定（可逆）：規格只給「大幅提升」等文字的欄位，數字為暫定值，集中在 SELF_BURST_PARAMS。
 * 司馬懿「韜光養晦」是隱匿＋回滿 SP，屬特殊規則，不在本表。
 */
import { StatusEffect } from '../../shared/CommonEnums';

export interface SelfBurstParams {
    durationTurns: number;
    attackMultiplier: number;
    critRateBonus: number;
    controlImmune: boolean;
    /** 一個窗口內最多可再行動幾次 */
    maxExtraActions: number;
}

/** 奧義 id → 爆發參數（資料表，數值暫定） */
export const SELF_BURST_PARAMS: Readonly<Record<string, SelfBurstParams>> = {
    // 全屬性 +30%（友軍忠誠度 -10 屬養成面，不在戰場窗口內）；回合數暫定 2
    'ult-lu-bu-3': { durationTurns: 2, attackMultiplier: 1.3, critRateBonus: 0, controlImmune: false, maxExtraActions: 0 },
    // 戰神形態：全屬性 ×2 持續 3 回合
    'ult-guan-yu-5': { durationTurns: 3, attackMultiplier: 2, critRateBonus: 0, controlImmune: false, maxExtraActions: 0 },
    // 攻擊與暴擊率大幅提升 2 回合：暫定攻擊 ×1.5、暴擊 +30%
    'ult-zhang-fei-2': { durationTurns: 2, attackMultiplier: 1.5, critRateBonus: 0.3, controlImmune: false, maxExtraActions: 0 },
    // 武力 +50%，免疫控制 2 回合；暫定可再行動 1 次
    'ult-zhao-yun-1': { durationTurns: 2, attackMultiplier: 1.5, critRateBonus: 0, controlImmune: true, maxExtraActions: 1 },
};

export interface SelfBurstWindow {
    ultimateId: string;
    remainingTurns: number;
    attackMultiplier: number;
    critRateBonus: number;
    controlImmune: boolean;
    extraActionsLeft: number;
}

export type SelfBurstPhase = 'inactive' | 'active' | 'ended';

export function selfBurstParamsOf(ultimateId: string): SelfBurstParams | null {
    return SELF_BURST_PARAMS[ultimateId] ?? null;
}

/** 開窗；已有窗口時刷新（回合取長、倍率取高、免控取或），再行動不累加 */
export function startSelfBurst(current: SelfBurstWindow | null, ultimateId: string): SelfBurstWindow | null {
    const params = selfBurstParamsOf(ultimateId);
    if (!params) return current;
    const fresh: SelfBurstWindow = {
        ultimateId,
        remainingTurns: params.durationTurns,
        attackMultiplier: params.attackMultiplier,
        critRateBonus: params.critRateBonus,
        controlImmune: params.controlImmune,
        extraActionsLeft: params.maxExtraActions,
    };
    if (!current || current.remainingTurns <= 0) return fresh;
    return {
        ultimateId,
        remainingTurns: Math.max(current.remainingTurns, fresh.remainingTurns),
        attackMultiplier: Math.max(current.attackMultiplier, fresh.attackMultiplier),
        critRateBonus: Math.max(current.critRateBonus, fresh.critRateBonus),
        controlImmune: current.controlImmune || fresh.controlImmune,
        // 刷新不補再行動次數，否則反覆施放就能無限連鎖
        extraActionsLeft: current.extraActionsLeft,
    };
}

/** 回合結束倒數；回傳下一個窗口（到期為 null）與這回合的階段 */
export function tickSelfBurst(window: SelfBurstWindow | null): { window: SelfBurstWindow | null; phase: SelfBurstPhase } {
    if (!window || window.remainingTurns <= 0) return { window: null, phase: 'inactive' };
    const remainingTurns = window.remainingTurns - 1;
    if (remainingTurns <= 0) return { window: null, phase: 'ended' };
    return { window: { ...window, remainingTurns }, phase: 'active' };
}

export function selfBurstPhaseOf(window: SelfBurstWindow | null): SelfBurstPhase {
    return window && window.remainingTurns > 0 ? 'active' : 'inactive';
}

export function selfBurstAttackMultiplier(window: SelfBurstWindow | null): number {
    return selfBurstPhaseOf(window) === 'active' ? window!.attackMultiplier : 1;
}

export function selfBurstCritBonus(window: SelfBurstWindow | null): number {
    return selfBurstPhaseOf(window) === 'active' ? window!.critRateBonus : 0;
}

/** 免控只在窗口期間生效 */
export function isSelfBurstControlImmune(window: SelfBurstWindow | null): boolean {
    return selfBurstPhaseOf(window) === 'active' && window!.controlImmune;
}

export interface SelfBurstChangedEvent {
    faction: string;
    phase: 'started' | 'ended';
    ultimateId: string;
    turns: number;
}

/** 戰報文字：開始寫出效果與回合，結束寫回退提示 */
export function selfBurstNoticeText(event: SelfBurstChangedEvent, isPlayer: boolean): string {
    const side = isPlayer ? '我方' : '敵方';
    if (event.phase === 'ended') return `${side}爆發結束，能力回復原狀`;
    const params = selfBurstParamsOf(event.ultimateId);
    const parts = params ? [
        params.attackMultiplier !== 1 ? `攻擊 ×${params.attackMultiplier}` : '',
        params.critRateBonus > 0 ? `暴擊 +${Math.round(params.critRateBonus * 100)}%` : '',
        params.controlImmune ? '免控' : '',
    ].filter(Boolean) : [];
    return `${side}進入爆發：${parts.join('、') || '能力提升'}（${event.turns} 回合）`;
}

/** 免控擋下的控制類狀態（定身、緩速、暈眩）；虛弱屬減益不擋 */
const CONTROL_EFFECTS: ReadonlySet<StatusEffect> = new Set([StatusEffect.Stun, StatusEffect.Rooted, StatusEffect.Slow]);

export function selfBurstBlocksEffect(window: SelfBurstWindow | null, effect: StatusEffect): boolean {
    return isSelfBurstControlImmune(window) && CONTROL_EFFECTS.has(effect);
}

/** 嘗試消耗一次再行動；次數用完或窗口不在時不允許（避免無限連鎖） */
export function consumeSelfBurstExtraAction(window: SelfBurstWindow | null): { allowed: boolean; window: SelfBurstWindow | null } {
    if (selfBurstPhaseOf(window) !== 'active' || window!.extraActionsLeft <= 0) return { allowed: false, window };
    return { allowed: true, window: { ...window!, extraActionsLeft: window!.extraActionsLeft - 1 } };
}
