// @spec-source → ACAD_05_隆中草廬_八陣羅盤與機巧工造規格書.md (doc_spec_0307)、ACAD_CORE (doc_spec_0302) 學府機制介面（PROG-2-2017）
/**
 * LongzhongGimmick — 把 LongzhongAcademy 的純邏輯接到 AcademyTrainingEngine 的 IAcademyGimmickHandler。
 *
 * - 訓練：套用當門倍率與精力增減，並掉落機巧部件（景門翻倍）。
 * - 回合結束：不論訓練或休息，羅盤順時針轉一門。
 * - 互動 optionId（不耗回合）：CRAFT:WOODEN_OX／CRAFT:REPEATING_CROSSBOW／CRAFT:EIGHT_FORMATION_TABLE，完成即加屬性。
 *
 * 暫定：
 * - 每次訓練掉落 1 件隨機部件，數值集中在 LONGZHONG_GIMMICK_TUNING。
 * - 生門的「治癒負傷」在學府快照沒有對應欄位，先只回復精力。
 * - 死／驚／休門的意志考驗未定，只記 log。
 * Unity 對照：像掛在訓練引擎上的 Strategy 物件，狀態序列化在 gimmickStatePayload。
 */
import { ACADEMY_TRAIT_SLOTS, ACADEMY_TACTIC_SLOTS, AcademyId } from './AcademyTypes';
import type { AcademyStateSnapshot, AcademyStatKey, AcademyTrainResult, IAcademyGimmickHandler, IDeterministicRng } from './AcademyTypes';
import { addAcademyStatCapped } from './AcademyTrainingEngine';
import {
    addLongzhongParts, advanceLongzhongCompass, craftLongzhong, createLongzhongState, evaluateLongzhongGate,
    longzhongGraduationRewards, type LongzhongGimmickState, type LongzhongPart, type LongzhongStat,
} from './LongzhongAcademy';

export const LONGZHONG_GIMMICK_TUNING = {
    partsPerTrain: 1,
} as const;

const PARTS: readonly LongzhongPart[] = ['gears', 'mortises', 'springs'];

export function longzhongPayloadOf(state: AcademyStateSnapshot): LongzhongGimmickState {
    return state.gimmickStatePayload as unknown as LongzhongGimmickState;
}

function addOnce(list: string[], id: string, cap: number): void {
    if (list.indexOf(id) < 0 && list.length < cap) list.push(id);
}

export const LONGZHONG_GIMMICK: IAcademyGimmickHandler = {
    academyId: AcademyId.LONGZHONG,

    initGimmickState(): Record<string, unknown> {
        return createLongzhongState() as unknown as Record<string, unknown>;
    },

    onTurnStart(): void {
        // 羅盤於回合結束轉動
    },

    onTrain(state: AcademyStateSnapshot, _target: AcademyStatKey, rng: IDeterministicRng): AcademyTrainResult {
        const p = longzhongPayloadOf(state);
        const bonus = evaluateLongzhongGate(p.currentGate);
        const logs = [bonus.description];
        const drops = LONGZHONG_GIMMICK_TUNING.partsPerTrain * bonus.partDropMultiplier;
        for (let i = 0; i < drops; i++) {
            const part = PARTS[rng.nextInt(PARTS.length, `lz-part-${i}`)];
            Object.assign(p, addLongzhongParts(p, part, 1));
            logs.push(`part:${part}`);
        }
        if (bonus.willTrial) logs.push('will-trial');
        return { statBonusPct: Math.round(bonus.multiplier * 100), extraEnergyCost: bonus.extraEnergyCost, gimmickLogs: logs };
    },

    onTurnEnd(state: AcademyStateSnapshot): void {
        const p = longzhongPayloadOf(state);
        Object.assign(p, advanceLongzhongCompass(p));
    },

    onInteract(state: AcademyStateSnapshot, optionId: string | undefined): void {
        const option = optionId ?? '';
        if (!option.startsWith('CRAFT:')) throw new Error(`隆中草廬不認得的互動：${option}`);
        const p = longzhongPayloadOf(state);
        const r = craftLongzhong(p, option.slice('CRAFT:'.length));
        if (!r) throw new Error('部件不足、發明不存在或已完成');
        Object.assign(p, r.state);
        for (const key of Object.keys(r.rewards) as LongzhongStat[]) addAcademyStatCapped(state.stats, key, r.rewards[key] ?? 0);
        state.chronicles.push({ turn: state.currentTurn, title: '機巧工造', description: `完成發明 ${option.slice('CRAFT:'.length)}`, highlightScore: 2 });
    },

    onGraduate(state: AcademyStateSnapshot): void {
        for (const id of longzhongGraduationRewards(state.stats, longzhongPayloadOf(state))) {
            if (id.startsWith('TRT_')) addOnce(state.learnedTraits, id, ACADEMY_TRAIT_SLOTS);
            else addOnce(state.learnedTactics, id, ACADEMY_TACTIC_SLOTS);
        }
    },
};
