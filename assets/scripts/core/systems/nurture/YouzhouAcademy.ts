// @spec-source → ACAD_02_幽州演武_沙盤巡哨與煞氣突破規格書.md (doc_spec_0304) §2 煞氣計量與突破、§2.3 胡騎犯邊、§3 專屬產出（PROG-2-2010）
/**
 * YouzhouAcademy — 幽州演武堂的煞氣計量、煞氣突破、戰傷檢定、胡騎犯邊事件與結業產出（純邏輯，不依賴 cc）。
 *
 * 規格定案：
 * - 常規操練：精力 -10、武統成長 ×1.0、煞氣 +5；沙盤巡哨：精力 -20、成長 ×1.5、煞氣 +15；煞氣上限 100。
 * - 煞氣 ≥ 80 可開啟突破，持續 3 回合：成長 ×2.2、每回合精力 -20；
 *   突破中精力 < 20 時 30% 戰傷，強制終止突破並休養 1 回合。
 * - 突破完整結束：煞氣歸 0、百戰武勳 +1。
 * - 第 10、20、30 回合胡騎犯邊：A 白馬衝陣（武力判定，成功補滿煞氣、失敗精力 -15）；
 *   B 堅壁設伏（統率判定，成功統率大量加成、失敗防禦經驗折半）。
 * - 結業：突騎破陣（武力 ≥ 88 且成功突破 2 次）、白馬義從（統率 ≥ 85 且武勳 ≥ 2）、塞外百戰（武＋統 ≥ 170）。
 *
 * 暫定：
 * - 戰傷終止時煞氣也歸 0，但不給武勳；成功突破次數只計完整 3 回合者。
 * - 「精力 < 20」以扣除本回合消耗前的精力判定。
 * - 事件判定門檻與「統率大量加成」數值未定，集中在 YOUZHOU_TUNING；判定由呼叫端擲骰傳入成功與否。
 * - 未掛到 AcademyTrainingEngine 的 IAcademyGimmickHandler，接線另卡。
 * Unity 對照：像一個獨立的 State 物件與靜態 Resolver，回傳要套用的差值，由培育流程實際改數值。
 */
import type { IDeterministicRng } from './AcademyTypes';

export const YOUZHOU_MALICE_MAX = 100;
export const YOUZHOU_SURGE_THRESHOLD = 80;
export const YOUZHOU_SURGE_TURNS = 3;
export const YOUZHOU_SURGE_MULTIPLIER = 2.2;
export const YOUZHOU_SURGE_ENERGY_COST = 20;
export const YOUZHOU_STRAIN_ENERGY_LINE = 20;
export const YOUZHOU_STRAIN_CHANCE_PERCENT = 30;
export const YOUZHOU_SKIRMISH_TURNS: readonly number[] = [10, 20, 30];

export const YOUZHOU_DRILLS = {
    regular: { energyCost: 10, statMultiplier: 1.0, maliceGain: 5 },
    recon: { energyCost: 20, statMultiplier: 1.5, maliceGain: 15 },
} as const;

/** 規格未給的數值（暫定）。 */
export const YOUZHOU_TUNING = {
    skirmishFailEnergyLoss: 15,
    ambushLeaBonus: 10,
} as const;

export interface YouzhouGimmickState {
    maliceGauge: number;
    isSurgeActive: boolean;
    surgeRemainingTurns: number;
    valorPoints: number;
    hasInjury: boolean;
    restTurns: number;
    completedSurges: number;
}

export function createYouzhouState(): YouzhouGimmickState {
    return { maliceGauge: 0, isSurgeActive: false, surgeRemainingTurns: 0, valorPoints: 0, hasInjury: false, restTurns: 0, completedSurges: 0 };
}

export interface YouzhouTurnResult {
    state: YouzhouGimmickState;
    statMultiplier: number;
    energyDelta: number;
    maliceDelta: number;
    logs: string[];
}

/** 煞氣是否足以開啟突破。 */
export function canStartSurge(state: YouzhouGimmickState): boolean {
    return !state.isSurgeActive && state.restTurns === 0 && state.maliceGauge >= YOUZHOU_SURGE_THRESHOLD;
}

/** 開啟煞氣突破；條件不足原樣回傳。 */
export function startSurge(state: YouzhouGimmickState): YouzhouGimmickState {
    if (!canStartSurge(state)) return state;
    return { ...state, isSurgeActive: true, surgeRemainingTurns: YOUZHOU_SURGE_TURNS };
}

/** 處理一回合訓練。休養中不能訓練；突破中忽略路線選擇。 */
export function processYouzhouTurn(
    state: YouzhouGimmickState,
    energy: number,
    isRecon: boolean,
    rng: IDeterministicRng,
): YouzhouTurnResult {
    const logs: string[] = [];
    if (state.restTurns > 0) {
        logs.push('【戰傷休養】：本回合無法操練。');
        return { state: { ...state, restTurns: state.restTurns - 1, hasInjury: state.restTurns - 1 > 0 }, statMultiplier: 0, energyDelta: 0, maliceDelta: 0, logs };
    }
    if (state.isSurgeActive) {
        if (energy < YOUZHOU_STRAIN_ENERGY_LINE && rng.chance(YOUZHOU_STRAIN_CHANCE_PERCENT, 100, 'youzhou.strain')) {
            logs.push('【戰傷負傷】：體力透支，突破中止，須休養 1 回合。');
            return {
                state: { ...state, isSurgeActive: false, surgeRemainingTurns: 0, maliceGauge: 0, hasInjury: true, restTurns: 1 },
                statMultiplier: 0, energyDelta: -YOUZHOU_SURGE_ENERGY_COST, maliceDelta: -state.maliceGauge, logs,
            };
        }
        const remaining = state.surgeRemainingTurns - 1;
        let next: YouzhouGimmickState = { ...state, surgeRemainingTurns: remaining };
        if (remaining <= 0) {
            next = { ...next, isSurgeActive: false, surgeRemainingTurns: 0, maliceGauge: 0, valorPoints: state.valorPoints + 1, completedSurges: state.completedSurges + 1 };
            logs.push('【煞氣收束】：3 回合極限突破圓滿完成，獲取百戰武勳！');
        }
        return { state: next, statMultiplier: YOUZHOU_SURGE_MULTIPLIER, energyDelta: -YOUZHOU_SURGE_ENERGY_COST, maliceDelta: next.maliceGauge - state.maliceGauge, logs };
    }
    const drill = isRecon ? YOUZHOU_DRILLS.recon : YOUZHOU_DRILLS.regular;
    const malice = Math.min(YOUZHOU_MALICE_MAX, state.maliceGauge + drill.maliceGain);
    logs.push(`煞氣值上升至 ${malice}/100。`);
    return { state: { ...state, maliceGauge: malice }, statMultiplier: drill.statMultiplier, energyDelta: -drill.energyCost, maliceDelta: malice - state.maliceGauge, logs };
}

export function isYouzhouSkirmishTurn(turn: number): boolean {
    return YOUZHOU_SKIRMISH_TURNS.includes(turn);
}

export type YouzhouSkirmishOption = 'A' | 'B';

export interface YouzhouSkirmishOutcome {
    state: YouzhouGimmickState;
    energyDelta: number;
    leaBonus: number;
    cavalryArcheryExp: boolean;
    halveDefenseExp: boolean;
}

/** 胡騎犯邊抉擇結果；success 由呼叫端依武力／統率判定。 */
export function resolveYouzhouSkirmish(state: YouzhouGimmickState, option: YouzhouSkirmishOption, success: boolean): YouzhouSkirmishOutcome {
    const base = { state, energyDelta: 0, leaBonus: 0, cavalryArcheryExp: false, halveDefenseExp: false };
    if (option === 'A') {
        return success
            ? { ...base, state: { ...state, maliceGauge: YOUZHOU_MALICE_MAX }, cavalryArcheryExp: true }
            : { ...base, energyDelta: -YOUZHOU_TUNING.skirmishFailEnergyLoss };
    }
    return success ? { ...base, leaBonus: YOUZHOU_TUNING.ambushLeaBonus } : { ...base, halveDefenseExp: true };
}

/** 結業時可得的專屬產出 id。 */
export function youzhouGraduationRewards(str: number, lea: number, state: YouzhouGimmickState): string[] {
    const out: string[] = [];
    if (str >= 88 && state.completedSurges >= 2) out.push('TAC_TUQI_POZHEN');
    if (lea >= 85 && state.valorPoints >= 2) out.push('TAC_BAIMA_YICONG');
    if (str + lea >= 170) out.push('TRT_SAIWAI_BAIZHAN');
    return out;
}
