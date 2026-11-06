// @spec-source → 英靈世家系統 §F-1 人頭分權重、§G-1 姓氏零和、§G-2 家傳絕學限制（SPI-09，PROG-2-1929）
/**
 * SurnameAffiliation — 子嗣姓氏歸屬與家傳絕學權限（純邏輯，不依賴 cc）。
 *
 * - 姓氏零和：子嗣在父姓、母姓中擇一；一旦選定即鎖定，家族積分只計入該姓。
 * - 家傳絕學：本姓完整威力；非本姓弱化（比例由呼叫端傳入）。
 * - 人頭分權重：本家後代 100%、俘虜轉化 80%、外嫁隨母姓 120%。
 *
 * 暫定：姓氏存檔欄位與出生流程接線另卡；弱化比例規格未給。
 * Unity 對照：像只能 Set 一次的屬性，第二次寫入直接拒絕。
 */

export type SurnameSide = 'father' | 'mother';

export interface SurnameChoice {
    side: SurnameSide;
    clanKey: string;
}

export type SurnameChoiceResult =
    | { ok: true; choice: SurnameChoice }
    | { ok: false; reason: 'ALREADY_CHOSEN' | 'MISSING_CLAN' };

/** 擇一姓氏；已選過就拒絕（零和：不可改投另一家）。 */
export function chooseChildSurname(
    current: Readonly<SurnameChoice> | null, side: SurnameSide, fatherClan: string | null, motherClan: string | null,
): SurnameChoiceResult {
    if (current) return { ok: false, reason: 'ALREADY_CHOSEN' };
    const clanKey = side === 'father' ? fatherClan : motherClan;
    if (!clanKey) return { ok: false, reason: 'MISSING_CLAN' };
    return { ok: true, choice: { side, clanKey } };
}

/** 這位子嗣的家族積分要計入哪些姓：最多一個；未選姓則不計入任何一家。 */
export function clanScoreTargets(choice: Readonly<SurnameChoice> | null): string[] {
    return choice ? [choice.clanKey] : [];
}

export type HeadScoreKind = 'NATIVE' | 'CONVERTED_CAPTIVE' | 'MATERNAL_SURNAME';

export const HEAD_SCORE_WEIGHT: Readonly<Record<HeadScoreKind, number>> = {
    NATIVE: 1.0,
    CONVERTED_CAPTIVE: 0.8,
    MATERNAL_SURNAME: 1.2,
};

/** 人頭分：每人依類型權重加總。 */
export function headScoreOf(members: readonly HeadScoreKind[]): number {
    return members.reduce((sum, kind) => sum + HEAD_SCORE_WEIGHT[kind], 0);
}

/** 家傳絕學威力倍率：本姓 1；非本姓用弱化比例（夾在 0~1）。 */
export function inheritedTechniqueMultiplier(wearerClan: string | null, techniqueClan: string, weakenedRatio: number): number {
    if (wearerClan === techniqueClan) return 1;
    return Math.max(0, Math.min(1, Number.isFinite(weakenedRatio) ? weakenedRatio : 0));
}
