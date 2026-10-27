// @spec-source → MVP遊戲驗證規格書（doc_spec_0045）祖→父→子三代循環；使用者回饋 2026-10-25（推進到第三代要點約 90 次）；PROG-2-1090
/**
 * SeasonFastForward — 連續推進季度，遇到要玩家處理的事件就停（純 TS，不依賴 cc）。
 *
 * 停下來的事件：子嗣開獎（要去培育）、武將離世、有武將剛成年可結緣（呼叫端判斷）。
 * 一次最多推進 FAST_FORWARD_MAX_SEASONS 季，避免一路推到天下大亂。
 *
 * Unity 對照：像 Time.timeScale 加速，但每一步仍走正式的 advanceSeason，規則與存檔都不變。
 */

export const FAST_FORWARD_MAX_SEASONS = 20;

/** advanceSeason 回傳值裡快進需要看的欄位（GameSession.SeasonAdvancedPayload 滿足） */
export interface FastForwardStep {
    readonly unveilings: readonly unknown[];
    readonly agingEvents: ReadonlyArray<{ readonly type: string }>;
}

export type FastForwardStopReason = 'unveiling' | 'death' | 'came-of-age' | 'limit' | 'error';

export interface FastForwardResult<P extends FastForwardStep> {
    readonly seasons: number;
    readonly reason: FastForwardStopReason;
    readonly last: P | null;
}

export const FAST_FORWARD_REASON_TEXT: Readonly<Record<FastForwardStopReason, string>> = {
    unveiling: '有子嗣開獎，去「開獎・培育」看看',
    death: '有武將離世',
    'came-of-age': '有武將成年，可以去「結緣」',
    limit: `已推進 ${FAST_FORWARD_MAX_SEASONS / 4} 年`,
    error: '推進中斷',
};

export function stopReasonOf(step: FastForwardStep): FastForwardStopReason | null {
    if (step.unveilings.length > 0) return 'unveiling';
    if (step.agingEvents.some((event) => event.type === 'died')) return 'death';
    return null;
}

/**
 * 連續推進：每季呼叫 advance()，遇到事件或達上限就停。
 * cameOfAge 在每季推進後呼叫，回 true 表示有人剛成年（由呼叫端比對名冊）。
 */
export async function fastForwardSeasons<P extends FastForwardStep>(
    advance: () => Promise<P>,
    cameOfAge: () => boolean = () => false,
    maxSeasons = FAST_FORWARD_MAX_SEASONS,
): Promise<FastForwardResult<P>> {
    let last: P | null = null;
    for (let seasons = 1; seasons <= maxSeasons; seasons++) {
        try {
            last = await advance();
        } catch {
            return { seasons: seasons - 1, reason: 'error', last };
        }
        const reason = stopReasonOf(last) ?? (cameOfAge() ? 'came-of-age' : null);
        if (reason) return { seasons, reason, last };
    }
    return { seasons: maxSeasons, reason: 'limit', last };
}
