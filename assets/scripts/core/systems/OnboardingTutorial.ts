// @spec-source → MVP遊戲驗證規格書 §E #11 之後的「開場新手引導：最基礎的 3 段式引導」§G；新手開場規格書 §18.3 教學引導正式版；WBS v3 MVP-11
/**
 * OnboardingTutorial — 新手 3 段式引導（首次進入依序出現）純邏輯，不依賴 cc。
 *
 * 三段文字取自新手開場規格書 §18.3 的三個段落；字串 key 為暫定，待 P0 UI_ 字串表定案。
 * 尚未接到場景、i18n 表或存檔；由後續工單接線。
 *
 * Unity 對照：像 Tutorial 的 [Serializable] class TutorialProgress { int step; bool done; }，
 * 每次按「下一步」呼叫一次純函式，UI 只讀 currentSegment 顯示。
 */

export interface OnboardingSegment {
    id: 'fate' | 'growth' | 'legacy';
    /** 暫定字串 key，對應 P0 UI_ 字串表。 */
    key: string;
    /** 規格 §18.3 的正式版文字，逐段保留。 */
    text: string;
}

export const ONBOARDING_SEGMENTS: readonly OnboardingSegment[] = Object.freeze([
    {
        id: 'fate',
        key: 'UI_TUTORIAL_1',
        text: '你已經獲得第一位宿命之將，也看見了因子的力量。',
    },
    {
        id: 'growth',
        key: 'UI_TUTORIAL_2',
        text: '接下來，請帶領你的名將在戰場上成長，讓家族在傳承中變強。',
    },
    {
        id: 'legacy',
        key: 'UI_TUTORIAL_3',
        text: '真正的三國，不只是在戰鬥，而是在決定未來由誰延續。',
    },
]);

export interface OnboardingState {
    /** 下一段要顯示的索引；等於段數時表示已完成。 */
    nextIndex: number;
}

export type OnboardingRejectReason = 'out-of-order' | 'already-complete';

export interface OnboardingResult {
    state: OnboardingState;
    ok: boolean;
    reason?: OnboardingRejectReason;
    /** 本次確認的段落；只有 ok 時有值。 */
    acknowledged?: OnboardingSegment;
    completed: boolean;
}

export const FRESH_ONBOARDING: Readonly<OnboardingState> = Object.freeze({ nextIndex: 0 });

export function isOnboardingComplete(state: OnboardingState): boolean {
    return state.nextIndex >= ONBOARDING_SEGMENTS.length;
}

/** 目前要顯示的段落；已完成時為 null。 */
export function currentOnboardingSegment(state: OnboardingState): OnboardingSegment | null {
    return isOnboardingComplete(state) ? null : ONBOARDING_SEGMENTS[state.nextIndex];
}

/**
 * 確認某一段已看過。必須依序確認，跳段或重複確認都被拒絕。
 * 回傳新狀態，不改輸入、不用亂數、不寫存檔。
 */
export function acknowledgeOnboardingSegment(source: OnboardingState, segmentId: OnboardingSegment['id']): OnboardingResult {
    const state = { ...source };
    if (isOnboardingComplete(source)) {
        return { state, ok: false, reason: 'already-complete', completed: true };
    }
    const expected = ONBOARDING_SEGMENTS[source.nextIndex];
    if (expected.id !== segmentId) {
        return { state, ok: false, reason: 'out-of-order', completed: false };
    }
    state.nextIndex = source.nextIndex + 1;
    return { state, ok: true, acknowledged: expected, completed: isOnboardingComplete(state) };
}

/**
 * 讀取存檔欄位時的防呆：非整數、負數或超出段數的值一律視為重新開始，避免卡在引導中。
 */
export function normalizeOnboardingState(raw: unknown): OnboardingState {
    if (typeof raw !== 'object' || raw === null) return { ...FRESH_ONBOARDING };
    const value = (raw as { nextIndex?: unknown }).nextIndex;
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) return { ...FRESH_ONBOARDING };
    return { nextIndex: Math.min(value, ONBOARDING_SEGMENTS.length) };
}
