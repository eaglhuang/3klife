// @spec-source → ACAD_04_洛陽太學_五經注疏與九品官聲規格書.md (doc_spec_0306)、ACAD_CORE (doc_spec_0302) 學府機制介面（PROG-2-2016）
/**
 * LuoyangGimmick — 把 LuoyangAcademy 的純邏輯接到 AcademyTrainingEngine 的 IAcademyGimmickHandler。
 *
 * - 訓練：目標屬性推進對應經卷（智→易、政→書、魅→詩、統→禮、武→春秋），並累積太學名望；
 *   魅力／政治訓練套用品階乘區；三品以上於第 12／24 回合訓練自動借用遺物，觸發 ×2.4 大彩圈。
 * - 互動 optionId（不耗回合）：PETITION:<經卷>、VISIT、PROMOTE、SHORTCUT（急功近利：政治 +15，擲清議彈劾）。
 *
 * 暫定：
 * - 每次訓練經卷 +20、名望 +30；急功近利政治 +15；遺物依序取用，數值集中在 LUOYANG_GIMMICK_TUNING。
 * - 名望先存在學府 payload，未與家族名望帳本串接。
 * Unity 對照：像掛在訓練引擎上的 Strategy 物件，狀態序列化在 gimmickStatePayload。
 */
import { ACADEMY_TRAIT_SLOTS, ACADEMY_TACTIC_SLOTS, AcademyId } from './AcademyTypes';
import type { AcademyStateSnapshot, AcademyStatKey, AcademyTrainResult, IAcademyGimmickHandler, IDeterministicRng } from './AcademyTypes';
import { addAcademyStatCapped } from './AcademyTrainingEngine';
import {
    ClassicsBook, addClassicsProgress, borrowLuoyangRelic, createLuoyangState, luoyangGraduationRewards, luoyangTrainingMultiplier,
    petitionClassics, promoteLuoyang, rollLuoyangImpeachment, visitPatron, type LuoyangGimmickState,
} from './LuoyangAcademy';

export const LUOYANG_GIMMICK_TUNING = {
    progressPerTrain: 20,
    prestigePerTrain: 30,
    shortcutPol: 15,
    relics: ['RELIC_JIAOWEI_QIN', 'RELIC_ZHENGXUAN_YI'] as readonly string[],
} as const;

export const LUOYANG_STAT_BOOK: Record<AcademyStatKey, ClassicsBook> = {
    int: ClassicsBook.YIJING,
    pol: ClassicsBook.SHANGSHU,
    cha: ClassicsBook.SHIJING,
    lea: ClassicsBook.LIZHI,
    str: ClassicsBook.CHUNQIU,
};

export interface LuoyangGimmickPayload extends LuoyangGimmickState {
    prestige: number;
    shortcutCount: number;
}

export function luoyangPayloadOf(state: AcademyStateSnapshot): LuoyangGimmickPayload {
    return state.gimmickStatePayload as unknown as LuoyangGimmickPayload;
}

function addOnce(list: string[], id: string, cap: number): void {
    if (list.indexOf(id) < 0 && list.length < cap) list.push(id);
}

const BOOKS: readonly string[] = Object.values(ClassicsBook);

export const LUOYANG_GIMMICK: IAcademyGimmickHandler = {
    academyId: AcademyId.LUOYANG,

    initGimmickState(): Record<string, unknown> {
        const p: LuoyangGimmickPayload = { ...createLuoyangState(), prestige: 0, shortcutCount: 0 };
        return p as unknown as Record<string, unknown>;
    },

    onTurnStart(): void {
        // 拜謁、晉升皆由玩家互動觸發
    },

    onTrain(state: AcademyStateSnapshot, target: AcademyStatKey): AcademyTrainResult {
        const p = luoyangPayloadOf(state);
        Object.assign(p, addClassicsProgress(p, LUOYANG_STAT_BOOK[target], LUOYANG_GIMMICK_TUNING.progressPerTrain));
        p.prestige += LUOYANG_GIMMICK_TUNING.prestigePerTrain;
        const logs: string[] = [];
        let pct = target === 'cha' || target === 'pol' ? Math.round(luoyangTrainingMultiplier(p.officialRank) * 100) : 100;
        const relicId = LUOYANG_GIMMICK_TUNING.relics[p.relicsBorrowed.length % LUOYANG_GIMMICK_TUNING.relics.length];
        const relic = borrowLuoyangRelic(p, state.currentTurn, relicId);
        if (relic) {
            Object.assign(p, relic.state);
            pct = Math.round(relic.multiplier * 100);
            logs.push(`relic:${relicId}`);
        }
        return { statBonusPct: pct, extraEnergyCost: 0, gimmickLogs: logs };
    },

    onTurnEnd(): void {
        // 洛陽太學沒有回合末事件
    },

    onInteract(state: AcademyStateSnapshot, optionId: string | undefined, rng: IDeterministicRng): void {
        const p = luoyangPayloadOf(state);
        const option = optionId ?? '';
        if (option.startsWith('PETITION:')) {
            const book = option.slice('PETITION:'.length);
            if (BOOKS.indexOf(book) < 0) throw new Error(`不認得的經卷：${book}`);
            const r = petitionClassics(p, book as ClassicsBook);
            if (!r.success) throw new Error('經卷未滿或已請益過');
            Object.assign(p, r.state);
        } else if (option === 'VISIT') {
            const r = visitPatron(p, p.prestige);
            if (!r.success) throw new Error('經生筆記或名望不足');
            Object.assign(p, r.state);
            p.prestige -= r.prestigeSpent;
        } else if (option === 'PROMOTE') {
            const r = promoteLuoyang(p);
            if (!r.success) throw new Error('注疏進度或引薦信不足');
            Object.assign(p, r.state);
            state.chronicles.push({ turn: state.currentTurn, title: '官聲晉升', description: `晉升為${r.newRank}品`, highlightScore: r.newRank <= 3 ? 3 : 2 });
        } else if (option === 'SHORTCUT') {
            addAcademyStatCapped(state.stats, 'pol', LUOYANG_GIMMICK_TUNING.shortcutPol);
            p.shortcutCount += 1;
            const r = rollLuoyangImpeachment(p, rng, String(p.shortcutCount));
            Object.assign(p, r.state);
            if (r.impeached) state.chronicles.push({ turn: state.currentTurn, title: '士林清議', description: '急功近利遭彈劾，官聲降等', highlightScore: 1 });
        } else {
            throw new Error(`洛陽太學不認得的互動：${option}`);
        }
    },

    onGraduate(state: AcademyStateSnapshot): void {
        for (const id of luoyangGraduationRewards(state.stats.cha, state.stats.pol, luoyangPayloadOf(state))) {
            if (id.startsWith('TRT_')) addOnce(state.learnedTraits, id, ACADEMY_TRAIT_SLOTS);
            else addOnce(state.learnedTactics, id, ACADEMY_TACTIC_SLOTS);
        }
    },
};
