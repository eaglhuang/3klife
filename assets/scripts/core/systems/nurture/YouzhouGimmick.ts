// @spec-source → ACAD_02_幽州演武_沙盤巡哨與煞氣突破規格書.md (doc_spec_0304)、ACAD_CORE (doc_spec_0302) 學府機制介面（PROG-2-2014）
/**
 * YouzhouGimmick — 把 YouzhouAcademy 的純邏輯接到 AcademyTrainingEngine 的 IAcademyGimmickHandler。
 *
 * 互動 optionId：
 * - DRILL:REGULAR／DRILL:RECON：切換常規操練與沙盤巡哨（不耗回合）。
 * - SURGE：煞氣 ≥ 80 時開啟煞氣突破。
 * - SKIRMISH:A／SKIRMISH:B：第 10／20／30 回合胡騎犯邊抉擇，未處理前不能訓練或休息。
 *
 * 暫定：
 * - 事件成功率＝對應屬性值（武力／統率）夾在 10～90%，數值集中在 YOUZHOU_GIMMICK_TUNING。
 * - 白馬衝陣成功的「騎射經驗」先折成武力 +10；堅壁設伏成功給統率 +10；防禦經驗折半只記旗標。
 * - 戰傷休養期間選休息也算休養 1 回合；AUTO 模式犯邊依武統較高者選 A／B。
 * Unity 對照：像掛在訓練引擎上的 Strategy 物件，狀態序列化在 gimmickStatePayload。
 */
import { ACADEMY_TRAIT_SLOTS, ACADEMY_TACTIC_SLOTS, AcademyId } from './AcademyTypes';
import type { AcademyStateSnapshot, AcademyStatKey, AcademyTrainResult, IAcademyGimmickHandler, IDeterministicRng } from './AcademyTypes';
import { ACADEMY_TUNING, addAcademyStatCapped } from './AcademyTrainingEngine';
import {
    createYouzhouState, isYouzhouSkirmishTurn, processYouzhouTurn, resolveYouzhouSkirmish, startSurge,
    youzhouGraduationRewards, type YouzhouGimmickState, type YouzhouSkirmishOption,
} from './YouzhouAcademy';

export const YOUZHOU_GIMMICK_TUNING = {
    skirmishMinPct: 10,
    skirmishMaxPct: 90,
    cavalryArcheryStr: 10,
} as const;

export interface YouzhouGimmickPayload extends YouzhouGimmickState {
    isRecon: boolean;
    skirmishPending: boolean;
    trainedThisTurn: boolean;
    halveDefenseExp: boolean;
}

export function youzhouPayloadOf(state: AcademyStateSnapshot): YouzhouGimmickPayload {
    return state.gimmickStatePayload as unknown as YouzhouGimmickPayload;
}

function writeCore(p: YouzhouGimmickPayload, core: YouzhouGimmickState): void {
    Object.assign(p, core);
}

function coreOf(p: YouzhouGimmickPayload): YouzhouGimmickState {
    return {
        maliceGauge: p.maliceGauge, isSurgeActive: p.isSurgeActive, surgeRemainingTurns: p.surgeRemainingTurns,
        valorPoints: p.valorPoints, hasInjury: p.hasInjury, restTurns: p.restTurns, completedSurges: p.completedSurges,
    };
}

function skirmishChancePct(value: number): number {
    return Math.max(YOUZHOU_GIMMICK_TUNING.skirmishMinPct, Math.min(YOUZHOU_GIMMICK_TUNING.skirmishMaxPct, value));
}

function addOnce(list: string[], id: string, cap: number): void {
    if (list.indexOf(id) < 0 && list.length < cap) list.push(id);
}

export const YOUZHOU_GIMMICK: IAcademyGimmickHandler = {
    academyId: AcademyId.YOUZHOU,

    initGimmickState(): Record<string, unknown> {
        const p: YouzhouGimmickPayload = { ...createYouzhouState(), isRecon: false, skirmishPending: false, trainedThisTurn: false, halveDefenseExp: false };
        return p as unknown as Record<string, unknown>;
    },

    onTurnStart(): void {
        // 犯邊由 onTurnEnd 預先標記
    },

    onTrain(state: AcademyStateSnapshot, _target: AcademyStatKey, rng: IDeterministicRng): AcademyTrainResult {
        const p = youzhouPayloadOf(state);
        const r = processYouzhouTurn(coreOf(p), state.energy, p.isRecon, rng);
        writeCore(p, r.state);
        p.trainedThisTurn = true;
        return {
            statBonusPct: Math.round(r.statMultiplier * 100),
            extraEnergyCost: -r.energyDelta - ACADEMY_TUNING.trainEnergyCost,
            gimmickLogs: r.logs,
        };
    },

    onTurnEnd(state: AcademyStateSnapshot): void {
        const p = youzhouPayloadOf(state);
        if (!p.trainedThisTurn && p.restTurns > 0) {
            p.restTurns -= 1;
            p.hasInjury = p.restTurns > 0;
        }
        p.trainedThisTurn = false;
        p.skirmishPending = isYouzhouSkirmishTurn(state.currentTurn + 1);
    },

    onInteract(state: AcademyStateSnapshot, optionId: string | undefined, rng: IDeterministicRng): void {
        const p = youzhouPayloadOf(state);
        const option = optionId ?? '';
        if (option === 'DRILL:REGULAR' || option === 'DRILL:RECON') {
            p.isRecon = option === 'DRILL:RECON';
        } else if (option === 'SURGE') {
            const next = startSurge(coreOf(p));
            if (!next.isSurgeActive || p.isSurgeActive) throw new Error('煞氣未滿 80 或正在突破／休養中');
            writeCore(p, next);
        } else if (option === 'SKIRMISH:A' || option === 'SKIRMISH:B') {
            if (!p.skirmishPending) throw new Error('本回合沒有胡騎犯邊');
            const choice = option.slice('SKIRMISH:'.length) as YouzhouSkirmishOption;
            const stat = choice === 'A' ? state.stats.str : state.stats.lea;
            const success = rng.chance(skirmishChancePct(stat), 100, `yz-skirmish-${choice}`);
            const out = resolveYouzhouSkirmish(coreOf(p), choice, success);
            writeCore(p, out.state);
            state.energy = Math.max(0, state.energy + out.energyDelta);
            if (out.cavalryArcheryExp) addAcademyStatCapped(state.stats, 'str', YOUZHOU_GIMMICK_TUNING.cavalryArcheryStr);
            if (out.leaBonus > 0) addAcademyStatCapped(state.stats, 'lea', out.leaBonus);
            if (out.halveDefenseExp) p.halveDefenseExp = true;
            p.skirmishPending = false;
            state.chronicles.push({
                turn: state.currentTurn,
                title: choice === 'A' ? '白馬衝陣' : '堅壁設伏',
                description: success ? '胡騎犯邊，擊退來敵' : '胡騎犯邊，失利而還',
                highlightScore: success ? 2 : 1,
            });
        } else {
            throw new Error(`幽州演武不認得的互動：${option}`);
        }
    },

    blockingInteraction(state: AcademyStateSnapshot): string | null {
        return youzhouPayloadOf(state).skirmishPending ? 'SKIRMISH' : null;
    },

    autoInteraction(state: AcademyStateSnapshot): string {
        return state.stats.str >= state.stats.lea ? 'SKIRMISH:A' : 'SKIRMISH:B';
    },

    onGraduate(state: AcademyStateSnapshot): void {
        for (const id of youzhouGraduationRewards(state.stats.str, state.stats.lea, coreOf(youzhouPayloadOf(state)))) {
            if (id.startsWith('TRT_')) addOnce(state.learnedTraits, id, ACADEMY_TRAIT_SLOTS);
            else addOnce(state.learnedTactics, id, ACADEMY_TACTIC_SLOTS);
        }
    },
};
