// @spec-source → 血統傳承G2二代傳承_功業回流與三代譜牒規格書.md §E #5、§F 年齡曲線分流、§H UI_G2_AGING_CIVIL；PROG-2-1822
/**
 * PeakCurve — 器局巔峰曲線與文武年齡分流（純邏輯，不依賴 cc）
 *
 * 武力過峰後依斜率下滑；智政魅只在 95%～100% 的高原內微降；統率與運氣規格沒提，不動。
 * 暫定：斜率每年 1.5%、下限 60%；高原每年 0.5%；曲線依 id 決定，抗命的大器晚成固定晚成；
 * 只套用有實力層的培育武將，卡面成年武將不動，避免現有名冊整批變弱；巔峰前不打折。
 */
export type PeakCurveType = 'early' | 'mid' | 'late';

export interface PeakCurveWindow {
    label: string;
    from: number;
    to: number;
}

export const PEAK_CURVES: Readonly<Record<PeakCurveType, PeakCurveWindow>> = {
    early: { label: '早慧', from: 19, to: 27 },
    mid: { label: '中堅', from: 24, to: 35 },
    late: { label: '晚成', from: 29, to: 42 },
};

const CURVE_ORDER: readonly PeakCurveType[] = ['early', 'mid', 'late'];

export const MARTIAL_DECAY_PER_YEAR = 0.015;
export const MARTIAL_FLOOR = 0.6;
export const CIVIL_DECAY_PER_YEAR = 0.005;
export const CIVIL_FLOOR = 0.95;

/** G2 §H UI_G2_AGING_CIVIL；氣血壽元的消耗沒有實作，括號那段先不說 */
export const AGING_CIVIL_LINE = '【老而彌堅】雖年過巔峰導致武藝體能下滑，但憑藉深厚閱歷，智謀與治政仍維持巔峰水準';

export interface PeakCurveSubject {
    id: string;
    age?: number;
    prowess?: unknown;
    fate?: { lateBloomer?: boolean };
}

export function peakCurveOf(general: PeakCurveSubject): PeakCurveType {
    if (general.fate?.lateBloomer) return 'late';
    let seed = 0;
    for (let i = 0; i < general.id.length; i++) seed += general.id.charCodeAt(i);
    return CURVE_ORDER[seed % CURVE_ORDER.length];
}

function followsCurve(general: PeakCurveSubject): boolean {
    return !!general.prowess && typeof general.age === 'number' && Number.isFinite(general.age);
}

/** 戰場屬性倍率；不受曲線影響的武將或屬性回傳 1 */
export function peakStatMultiplier(general: PeakCurveSubject, stat: string): number {
    if (!followsCurve(general)) return 1;
    const years = Math.max(0, (general.age as number) - PEAK_CURVES[peakCurveOf(general)].to);
    if (stat === 'str') return Math.max(MARTIAL_FLOOR, 1 - years * MARTIAL_DECAY_PER_YEAR);
    if (stat === 'int' || stat === 'pol' || stat === 'cha') return Math.max(CIVIL_FLOOR, 1 - years * CIVIL_DECAY_PER_YEAR);
    return 1;
}

/** 這次增齡是否剛跨過巔峰窗 */
export function crossedPeakEnd(general: PeakCurveSubject, previousAge: number, nextAge: number): boolean {
    if (!general.prowess) return false;
    const end = PEAK_CURVES[peakCurveOf(general)].to;
    return previousAge <= end && nextAge > end;
}

/** 曲線名，例如「中堅」；不受曲線影響時回傳 null */
export function peakCurveName(general: PeakCurveSubject): string | null {
    return followsCurve(general) ? PEAK_CURVES[peakCurveOf(general)].label : null;
}

/** 武將詳情用，例如「中堅 24–35」；不受曲線影響時回傳 null */
export function peakCurveLabel(general: PeakCurveSubject): string | null {
    if (!followsCurve(general)) return null;
    const curve = PEAK_CURVES[peakCurveOf(general)];
    return `${curve.label} ${curve.from}–${curve.to}`;
}
