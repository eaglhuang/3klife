// @spec-source → ACAD_03_江東督府_水文天時與陣型火攻規格書.md (doc_spec_0305)、ACAD_CORE (doc_spec_0302) 學府機制介面（PROG-2-2015）
/**
 * JiangdongGimmick — 把 JiangdongAcademy 的純邏輯接到 AcademyTrainingEngine 的 IAcademyGimmickHandler。
 *
 * 互動 optionId：FORMATION:WARSHIP_RAM／FORMATION:TOWER_FORTRESS／FORMATION:FIRE_RAIDER（不耗回合）。
 * - 訓練時以當期風向結算陣型契合，倍率直接作為成長加成；不論訓練或休息，回合結束都推進預報。
 * - 第 9／18／27 回合結束時自動舉行長江大閱兵，甲等給全隊統率大飛躍。
 *
 * 暫定：
 * - 「統率大飛躍」數值未定，暫 +20，集中在 JIANGDONG_GIMMICK_TUNING。
 * - 休息回合視為未匹配，計入大閱兵的 9 回合窗。
 * Unity 對照：像掛在訓練引擎上的 Strategy 物件，狀態序列化在 gimmickStatePayload。
 */
import { ACADEMY_TRAIT_SLOTS, ACADEMY_TACTIC_SLOTS, AcademyId } from './AcademyTypes';
import type { AcademyStateSnapshot, AcademyStatKey, AcademyTrainResult, IAcademyGimmickHandler, IDeterministicRng } from './AcademyTypes';
import { addAcademyStatCapped } from './AcademyTrainingEngine';
import {
    NavalFormation, createJiangdongState, isJiangdongInspectionTurn, jiangdongGraduationRewards, processJiangdongTurn,
    resolveJiangdongInspection, rollJiangdongWeather, type JiangdongGimmickState,
} from './JiangdongAcademy';

export const JIANGDONG_GIMMICK_TUNING = {
    inspectionLeaBonus: 20,
} as const;

export interface JiangdongGimmickPayload extends JiangdongGimmickState {
    trainedThisTurn: boolean;
}

export function jiangdongPayloadOf(state: AcademyStateSnapshot): JiangdongGimmickPayload {
    return state.gimmickStatePayload as unknown as JiangdongGimmickPayload;
}

function addOnce(list: string[], id: string, cap: number): void {
    if (list.indexOf(id) < 0 && list.length < cap) list.push(id);
}

const FORMATIONS: readonly string[] = [NavalFormation.WARSHIP_RAM, NavalFormation.TOWER_FORTRESS, NavalFormation.FIRE_RAIDER];

/** 初始天候用入學種子確定性擲出（不推進引擎 RNG）。 */
function seedRng(seedHex: string): IDeterministicRng {
    let h = 0;
    for (let i = 0; i < seedHex.length; i++) h = (h * 31 + seedHex.charCodeAt(i)) >>> 0;
    return {
        seedHex, stepIndex: 0,
        nextUint32: (salt: string) => { let x = h; for (let i = 0; i < salt.length; i++) x = (x * 33 + salt.charCodeAt(i)) >>> 0; return x; },
        nextInt(max: number, salt: string) { return this.nextUint32(salt) % max; },
        chance(num: number, den: number, salt: string) { return this.nextUint32(salt) % den < num; },
        pickWeighted: () => 0,
    };
}

export const JIANGDONG_GIMMICK: IAcademyGimmickHandler = {
    academyId: AcademyId.JIANGDONG,

    initGimmickState(seedHex: string): Record<string, unknown> {
        const p: JiangdongGimmickPayload = { ...createJiangdongState(seedRng(seedHex)), trainedThisTurn: false };
        return p as unknown as Record<string, unknown>;
    },

    onTurnStart(): void {
        // 陣型由玩家在訓練前以互動切換
    },

    onTrain(state: AcademyStateSnapshot, _target: AcademyStatKey, rng: IDeterministicRng): AcademyTrainResult {
        const p = jiangdongPayloadOf(state);
        const r = processJiangdongTurn(p, state.currentTurn, rng);
        Object.assign(p, r.state);
        p.trainedThisTurn = true;
        return { statBonusPct: Math.round(r.synergy.multiplier * 100), extraEnergyCost: 0, gimmickLogs: [r.synergy.synergyName] };
    },

    onTurnEnd(state: AcademyStateSnapshot, rng: IDeterministicRng): void {
        const p = jiangdongPayloadOf(state);
        if (!p.trainedThisTurn) {
            p.current = p.forecast;
            p.forecast = rollJiangdongWeather(rng, `jiangdong.weather.${state.currentTurn + 1}`);
            p.matchHistory = [...p.matchHistory, false];
        }
        p.trainedThisTurn = false;
        if (isJiangdongInspectionTurn(state.currentTurn)) {
            const r = resolveJiangdongInspection(p);
            Object.assign(p, r.state);
            if (r.gradeA) addAcademyStatCapped(state.stats, 'lea', JIANGDONG_GIMMICK_TUNING.inspectionLeaBonus);
            state.chronicles.push({
                turn: state.currentTurn, title: '長江大閱兵',
                description: r.gradeA ? '三陣配合無間，評定甲上神威' : '舟師操演尚欠火候',
                highlightScore: r.gradeA ? 3 : 1,
            });
        }
    },

    onInteract(state: AcademyStateSnapshot, optionId: string | undefined): void {
        const option = optionId ?? '';
        const f = option.startsWith('FORMATION:') ? option.slice('FORMATION:'.length) : '';
        if (FORMATIONS.indexOf(f) < 0) throw new Error(`江東督府不認得的互動：${option}`);
        jiangdongPayloadOf(state).currentFormation = f as NavalFormation;
    },

    onGraduate(state: AcademyStateSnapshot): void {
        for (const id of jiangdongGraduationRewards(state.stats.lea, state.stats.int, jiangdongPayloadOf(state))) {
            if (id.startsWith('TRT_')) addOnce(state.learnedTraits, id, ACADEMY_TRAIT_SLOTS);
            else addOnce(state.learnedTactics, id, ACADEMY_TACTIC_SLOTS);
        }
    },
};
