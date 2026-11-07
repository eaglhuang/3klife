// @spec-source → 虎符名錄圖鑑收錄與委任AI出展調配規格書.md（doc_spec_0346）；PROG-2-2032
/**
 * TallyCodexDeploy — 虎符圖鑑四態狀態機與委任 AI 出展決策（純邏輯，不依賴 cc）
 *
 * - §1 四態：LOCKED → DISCOVERED → ACQUIRED → STAR_ENHANCED，只進不退。
 * - §2 AI 出展：智力 ≥ 75 且糧草 ≥ 2 × 虎符扣糧才評分；DeployScore ≥ 0.65 即出展。
 * 既有「已獲」收藏表見 EliteTroopCodexCollection，本模組不改它。
 */

export type TallyCodexState = 'LOCKED' | 'DISCOVERED' | 'ACQUIRED' | 'STAR_ENHANCED';

export const TALLY_CODEX_STATE_ORDER: readonly TallyCodexState[] = ['LOCKED', 'DISCOVERED', 'ACQUIRED', 'STAR_ENHANCED'];
export const TALLY_STAR_MIN = 1;
export const TALLY_STAR_MAX = 5;

export const AI_TALLY_TUNING = {
    minInt: 75,
    grainSafetyMultiplier: 2,
    counterWeight: 0.4,
    intWeight: 0.35,
    starWeight: 0.25,
    starWeightPerLevel: 0.2,
    deployThreshold: 0.65,
    counterRatioMax: 1.5,
};

export interface TallyCodexEntry {
    state: TallyCodexState;
    /** 只有 STAR_ENHANCED 有意義（1～5） */
    star: number;
}

export function stateRank(state: TallyCodexState): number {
    return TALLY_CODEX_STATE_ORDER.indexOf(state);
}

/** 狀態只進不退；傳入較低狀態時維持原狀 */
export function advanceTallyCodex(entry: TallyCodexEntry, next: TallyCodexState): TallyCodexEntry {
    if (stateRank(next) <= stateRank(entry.state)) return entry;
    return { state: next, star: next === 'STAR_ENHANCED' ? Math.max(TALLY_STAR_MIN, entry.star) : entry.star };
}

/** 升星：須已入庫；上限 5 星，只升不降 */
export function enhanceTallyStar(entry: TallyCodexEntry, star: number): TallyCodexEntry {
    if (stateRank(entry.state) < stateRank('ACQUIRED')) return entry;
    const clamped = Math.min(TALLY_STAR_MAX, Math.max(TALLY_STAR_MIN, Math.floor(star)));
    if (entry.state === 'STAR_ENHANCED' && clamped <= entry.star) return entry;
    return { state: 'STAR_ENHANCED', star: clamped };
}

/** 讀檔：未知狀態視為 LOCKED，星數夾在 1～5 */
export function tallyCodexFromSave(raw: unknown): TallyCodexEntry {
    const obj = (raw && typeof raw === 'object' ? raw : {}) as { state?: unknown; star?: unknown };
    const state = TALLY_CODEX_STATE_ORDER.includes(obj.state as TallyCodexState) ? (obj.state as TallyCodexState) : 'LOCKED';
    const starNum = typeof obj.star === 'number' && Number.isFinite(obj.star) ? Math.floor(obj.star) : TALLY_STAR_MIN;
    return { state, star: Math.min(TALLY_STAR_MAX, Math.max(TALLY_STAR_MIN, starNum)) };
}

/** 已入庫（含升星）才可列入出征名單 */
export function isTallyAcquired(entry: TallyCodexEntry): boolean {
    return stateRank(entry.state) >= stateRank('ACQUIRED');
}

/** LOCKED 只顯示剪影與問號 */
export function isTallyRevealed(entry: TallyCodexEntry): boolean {
    return entry.state !== 'LOCKED';
}

export interface AiTallyEvaluationInput {
    generalInt: number;
    currentGrain: number;
    tallyGrainCost: number;
    /** 敵軍受此兵種剋制的比例（0～1.5） */
    counterRatio: number;
    tallyStarLevel: number;
}

/** §2.1 安全閘門 */
export function passesAiTallyGate(input: AiTallyEvaluationInput): boolean {
    return input.generalInt >= AI_TALLY_TUNING.minInt
        && input.currentGrain >= input.tallyGrainCost * AI_TALLY_TUNING.grainSafetyMultiplier;
}

/** §2.2 DeployScore */
export function aiTallyDeployScore(input: AiTallyEvaluationInput): number {
    const t = AI_TALLY_TUNING;
    const counter = Math.min(t.counterRatioMax, Math.max(0, input.counterRatio));
    const star = Math.min(1, Math.max(0, input.tallyStarLevel) * t.starWeightPerLevel);
    return counter * t.counterWeight + (input.generalInt / 100) * t.intWeight + star * t.starWeight;
}

/** §3 是否出展 */
export function evaluateAiTallyDeployment(input: AiTallyEvaluationInput): boolean {
    return passesAiTallyGate(input) && aiTallyDeployScore(input) >= AI_TALLY_TUNING.deployThreshold;
}

export interface AiTallyCandidate extends AiTallyEvaluationInput {
    tallyId: string;
}

/** §4-3 多個候選時挑分數最高且可出展者（同分取先列者）；都不行回 null */
export function pickAiTallyDeployment(candidates: readonly AiTallyCandidate[]): string | null {
    let best: { id: string; score: number } | null = null;
    for (const candidate of candidates) {
        if (!evaluateAiTallyDeployment(candidate)) continue;
        const score = aiTallyDeployScore(candidate);
        if (!best || score > best.score) best = { id: candidate.tallyId, score };
    }
    return best ? best.id : null;
}
