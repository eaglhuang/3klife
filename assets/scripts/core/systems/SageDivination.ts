// @spec-source → 名士預言系統.md (doc_spec_0006) §F、因子解鎖系統.md (doc_spec_0009) §A §B
/**
 * SageDivination — 名士占卜觸發因子覺醒，純邏輯，不依賴 cc
 *
 * 規格重點：
 * - 因子解鎖三種途徑之一：名士占卜（三個階段都可用，仍受 discoveryLevel 門檻限制）
 * - 名士偏好表：諸葛亮 85%、華佗 80%、司馬徽 75%、許劭 80%、龐統 85%、左慈 70%
 * - Random() <= accuracy_rate → 非扭曲（合理預言）；否則扭曲（故意偏離）
 * - 合理預言 = WeightedSample(實際因子, 名士偏好權重)
 *
 * 暫定（規格沒寫，PROG-2-0052）：
 * - 非扭曲：從可覺醒的鎖定因子裡依偏好加權抽一個並覺醒；偏好色權重 3、其他 1
 * - 扭曲：不覺醒，只回傳名士偏見方向的提示色（司馬徽沒有偏好，提示為 null）
 * - 諸葛亮「智力 / 政治」歸藍色（基礎屬性）；司馬徽「全面 / 中庸」不加權
 * - 沒有可覺醒的因子時不擲骰，呼叫端不應扣求籤令
 * - 求籤令扣除在 GameSession.divineFactor（PROG-2-0053）；名士解鎖條件、名士等級提高準確率未做
 *
 * Unity 對照：像一個 static class OracleService.Divine(general, sage, rng)，
 * 只回傳結果與新資料，由 GameManager 存檔並廣播事件。
 */
import type { GeneralConfig } from '../models/GeneralUnit';
import { awakenFactor, AwakeningCandidate, FactorAwakenedEvent, listAwakeningCandidates } from './FactorAwakening';
import { FactorColor, normalizeFactorColor } from './FactorInheritance';

export type SageId = 'zhuge-liang' | 'hua-tuo' | 'sima-hui' | 'xu-shao' | 'pang-tong' | 'zuo-ci';

export interface SageDefinition {
    id: SageId;
    name: string;
    /** 規格的「偏好面向」 */
    focus: string;
    /** 0.0 ~ 1.0：給出非扭曲預言的機率 */
    accuracy: number;
    /** 偏好的因子色系；空陣列表示不加權 */
    biasColors: readonly FactorColor[];
}

export const SAGES: Readonly<Record<SageId, SageDefinition>> = {
    'zhuge-liang': { id: 'zhuge-liang', name: '諸葛亮', focus: '智力/政治', accuracy: 0.85, biasColors: ['blue'] },
    'hua-tuo': { id: 'hua-tuo', name: '華佗', focus: '壽命/體魄', accuracy: 0.8, biasColors: ['red'] },
    'sima-hui': { id: 'sima-hui', name: '司馬徽', focus: '全面/中庸', accuracy: 0.75, biasColors: [] },
    'xu-shao': { id: 'xu-shao', name: '許劭', focus: '性格/天賦', accuracy: 0.8, biasColors: ['white'] },
    'pang-tong': { id: 'pang-tong', name: '龐統', focus: '軍事/戰法', accuracy: 0.85, biasColors: ['green'] },
    'zuo-ci': { id: 'zuo-ci', name: '左慈', focus: '運氣/天命', accuracy: 0.7, biasColors: ['purple'] },
};

/** 偏好色系的抽樣權重（其他色系為 1） */
export const SAGE_BIAS_WEIGHT = 3;

/** no-token 由 GameSession 回傳（求籤令不足，未擲骰） */
export type SageDivinationOutcome = 'awakened' | 'distorted' | 'no-candidate' | 'no-such-general' | 'no-such-sage' | 'no-token';

export interface SageDivinationResult {
    sageId: string;
    outcome: SageDivinationOutcome;
    /** 覺醒後的武將；沒有覺醒時為原資料 */
    general?: GeneralConfig;
    event?: FactorAwakenedEvent;
    /** 預言指向的色系：覺醒時為該因子色系，扭曲時為名士偏見方向 */
    hintColor: FactorColor | null;
    /** 本次是否擲了骰（擲了才算一次占卜，呼叫端據此扣求籤令） */
    consumed: boolean;
}

export function getSage(sageId: string): SageDefinition | undefined {
    return SAGES[sageId as SageId];
}

function candidateColor(general: GeneralConfig, candidate: AwakeningCandidate): FactorColor | null {
    const gene = (general.genes ?? []).find((g) => g.id === candidate.factorId);
    return normalizeFactorColor(gene?.type);
}

/** 依名士偏好加權抽一個候選 */
function pickWeighted(
    general: GeneralConfig,
    candidates: readonly AwakeningCandidate[],
    sage: SageDefinition,
    random: () => number,
): AwakeningCandidate {
    const weights = candidates.map((c) => {
        const color = candidateColor(general, c);
        return color !== null && sage.biasColors.includes(color) ? SAGE_BIAS_WEIGHT : 1;
    });
    const total = weights.reduce((sum, w) => sum + w, 0);
    let roll = random() * total;
    for (let i = 0; i < candidates.length; i++) {
        roll -= weights[i];
        if (roll < 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
}

/** 名士占卜：先擲準確率，非扭曲才依偏好覺醒一個鎖定因子 */
export function divineFactor(
    general: GeneralConfig | undefined,
    sageId: string,
    discoveryLevel: number,
    random: () => number,
): SageDivinationResult {
    const sage = getSage(sageId);
    if (!sage) return { sageId, outcome: 'no-such-sage', hintColor: null, consumed: false };
    if (!general) return { sageId, outcome: 'no-such-general', hintColor: null, consumed: false };

    const candidates = listAwakeningCandidates(general, ['sage'], discoveryLevel);
    if (candidates.length === 0) {
        return { sageId, outcome: 'no-candidate', general, hintColor: null, consumed: false };
    }

    if (!(random() <= sage.accuracy)) {
        return { sageId, outcome: 'distorted', general, hintColor: sage.biasColors[0] ?? null, consumed: true };
    }

    const pick = pickWeighted(general, candidates, sage, random);
    const awakened = awakenFactor(general, pick.factorId, pick.trigger, discoveryLevel);
    if (!awakened.ok) {
        // 候選已用同一套規則篩過，理論上不會失敗；保險起見當成扭曲處理
        return { sageId, outcome: 'distorted', general, hintColor: sage.biasColors[0] ?? null, consumed: true };
    }
    return {
        sageId,
        outcome: 'awakened',
        general: awakened.general,
        event: awakened.event,
        hintColor: awakened.event.color,
        consumed: true,
    };
}
