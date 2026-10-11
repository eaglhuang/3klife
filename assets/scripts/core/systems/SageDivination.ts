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
 * - 求籤令扣除在 GameSession（PROG-2-0053）；名士依累計占卜次數解鎖（PROG-2-0065）；名士等級提高準確率未做
 *
 * Unity 對照：像一個 static class OracleService.Divine(general, sage, rng)，
 * 只回傳結果與新資料，由 GameManager 存檔並廣播事件。
 */
import type { GeneralConfig } from '../models/GeneralUnit';
import { awakenFactor, AwakeningCandidate, FactorAwakenedEvent, listAwakeningCandidates } from './FactorAwakening';
import { ALL_FACTOR_COLORS, FactorColor, normalizeFactorColor } from './FactorInheritance';
import type { FactorPoolEntry } from './BreedingSystem';

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
    /** 累計占卜幾次後解鎖；0 = 一開始就可用 */
    unlockDivinations: number;
}

export const SAGES: Readonly<Record<SageId, SageDefinition>> = {
    'zhuge-liang': { id: 'zhuge-liang', name: '諸葛亮', focus: '智力/政治', accuracy: 0.85, biasColors: ['blue'], unlockDivinations: 0 },
    'hua-tuo': { id: 'hua-tuo', name: '華佗', focus: '壽命/體魄', accuracy: 0.8, biasColors: ['red'], unlockDivinations: 0 },
    'sima-hui': { id: 'sima-hui', name: '司馬徽', focus: '全面/中庸', accuracy: 0.75, biasColors: [], unlockDivinations: 0 },
    'xu-shao': { id: 'xu-shao', name: '許劭', focus: '性格/天賦', accuracy: 0.8, biasColors: ['white'], unlockDivinations: 0 },
    // 規格 §C 範例：占卜 50 次解鎖龐統
    'pang-tong': { id: 'pang-tong', name: '龐統', focus: '軍事/戰法', accuracy: 0.85, biasColors: ['green'], unlockDivinations: 50 },
    // 規格 §C：左慈為限定活動 VIP 名士；活動系統未做，暫定累計 100 次解鎖
    'zuo-ci': { id: 'zuo-ci', name: '左慈', focus: '運氣/天命', accuracy: 0.7, biasColors: ['purple'], unlockDivinations: 100 },
};

/** 偏好色系的抽樣權重（其他色系為 1） */
export const SAGE_BIAS_WEIGHT = 3;

/** no-token / sage-locked 由 GameSession 回傳（求籤令不足 / 名士未解鎖，未擲骰） */
export type SageDivinationOutcome = 'awakened' | 'distorted' | 'no-candidate' | 'no-such-general' | 'no-such-sage' | 'no-token' | 'sage-locked';

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

/** 名士是否已依累計占卜次數解鎖 */
export function isSageUnlocked(sageId: string, divinationCount: number): boolean {
    const sage = getSage(sageId);
    return sage !== undefined && divinationCount >= sage.unlockDivinations;
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

// ── 結緣前預測子嗣（PROG-2-0065） ─────────────────────────────────────────
//
// 規格 §F：if (Random() <= accuracy) Prediction = WeightedSample(child_genes, bias)
//          else Prediction = Distort(WeightedSample(child_genes, bias))
// 規格 §K：預測結果採「批語 + 色彩傾向 + 關鍵詞」，不顯示精準數字
//
// 暫定（規格沒寫）：
// - 結緣前子嗣還不存在，child_genes 以父母祖譜的因子池代替（FactorPoolEntry），權重 = 進池機率 × 偏好權重
// - Distort：色彩傾向改成另一個色系（名士偏好色優先，其次依六色順序取下一個），關鍵詞換成字典裡該色系、
//   但不在因子池內的因子名（找不到就不給關鍵詞）
// - isDistorted 只給測試與紀錄用，畫面不顯示

export interface OffspringProphecy {
    /** 色彩傾向 */
    color: FactorColor;
    /** 關鍵詞來源因子；扭曲且字典沒有可用因子時為 null */
    factorId: string | null;
    keyword: string | null;
    isDistorted: boolean;
}

export interface ProphecyResult {
    sageId: string;
    outcome: 'predicted' | 'no-candidate' | 'no-such-sage' | 'no-token' | 'sage-locked';
    prophecy?: OffspringProphecy;
    consumed: boolean;
}

/** 可供扭曲時借用關鍵詞的因子（id、色系、名稱） */
export interface ProphecyKeywordSource {
    id: string;
    color: FactorColor;
    displayName?: string;
}

function distortColor(actual: FactorColor, sage: SageDefinition): FactorColor {
    const biased = sage.biasColors.find((c) => c !== actual);
    if (biased) return biased;
    const index = ALL_FACTOR_COLORS.indexOf(actual);
    return ALL_FACTOR_COLORS[(index + 1) % ALL_FACTOR_COLORS.length];
}

export function predictOffspring(
    pool: readonly FactorPoolEntry[],
    sageId: string,
    random: () => number,
    keywordSources: readonly ProphecyKeywordSource[] = [],
): ProphecyResult {
    const sage = getSage(sageId);
    if (!sage) return { sageId, outcome: 'no-such-sage', consumed: false };
    const candidates = pool.filter((entry) => entry.chance > 0);
    if (candidates.length === 0) return { sageId, outcome: 'no-candidate', consumed: false };

    const accurate = random() <= sage.accuracy;
    const weights = candidates.map((entry) => entry.chance * (sage.biasColors.includes(entry.color) ? SAGE_BIAS_WEIGHT : 1));
    const total = weights.reduce((sum, w) => sum + w, 0);
    let roll = random() * total;
    let pick = candidates[candidates.length - 1];
    for (let i = 0; i < candidates.length; i++) {
        roll -= weights[i];
        if (roll < 0) { pick = candidates[i]; break; }
    }

    if (accurate) {
        return {
            sageId,
            outcome: 'predicted',
            consumed: true,
            prophecy: { color: pick.color, factorId: pick.id, keyword: pick.displayName ?? pick.id, isDistorted: false },
        };
    }
    const color = distortColor(pick.color, sage);
    const inPool = new Set(pool.map((entry) => entry.id));
    const decoy = keywordSources.find((source) => source.color === color && !inPool.has(source.id));
    return {
        sageId,
        outcome: 'predicted',
        consumed: true,
        prophecy: { color, factorId: decoy?.id ?? null, keyword: decoy ? decoy.displayName ?? decoy.id : null, isDistorted: true },
    };
}
