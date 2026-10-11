// @spec-source → 武將壽命系統.md (doc_spec_0018) §A §F §H、資源循環系統.md §F §H
/**
 * LifeVitalityPresenter — 壽命 / 精力顯示（純邏輯，不依賴 cc）
 *
 * 規格字串：
 * - UI_AGE_DISPLAY「{Name}（{Age} 歲）」、UI_LIFESPAN_BAR「壽命：{Age}/{Max_Lifespan}」
 * - UI_PHASE_YOUTH / PRIME / PEAK / ELDER、UI_DEATH_NOTIFY「{Name} 辭世，享年 {Age} 歲」
 * - UI_VIT_BAR「精力：{Current}/{Max}」、UI_VIT_COST、UI_VIT_EXHAUSTED、UI_PREGNANCY_LOCK「待產中（剩餘 {N} 季）」
 * 年齡階段：幼兒 0~5、少年 5~15、青年 15~40、壯年 40~55、老年 55~65、超齡 65+
 *
 * 暫定（規格沒寫，PROG-2-0074）：
 * - 幼兒、超齡的階段名稱：「幼年期」「退役候選」
 * - 年齡顯示取整數（每季 +0.25 歲）
 * - 精力條分段：≥ 60% 綠、30%~60% 黃、< 30% 紅；精力低於一場戰鬥消耗（30）時顯示「精力不足！」
 * - 壽命條：超過壽命上限紅、老年 / 超齡黃、其餘綠
 *
 * Unity 對照：像一個 static class LifeVitalityFormatter，只把資料換成字串與顏色，
 * MonoBehaviour（GeneralDetailBasicsChild）負責套到 Label 與 Image。
 */
import type { GeneralConfig } from '../../core/models/GeneralUnit';
import { AgingGeneral, GENERAL_STATUS_DEAD, resolveMaxLifespan } from '../../core/systems/GeneralAging';
import { BATTLE_VITALITY_COST } from '../../core/systems/BattleRoster';

export type LifePhase = 'infant' | 'youth' | 'prime' | 'peak' | 'elder' | 'overage';

/** 各階段起始年齡（含） */
export const LIFE_PHASE_STARTS: ReadonlyArray<readonly [LifePhase, number]> = [
    ['infant', 0], ['youth', 5], ['prime', 15], ['peak', 40], ['elder', 55], ['overage', 65],
];

export const LIFE_PHASE_LABELS: Readonly<Record<LifePhase, string>> = {
    infant: '幼年期',
    youth: '少年期',
    prime: '青年期',
    peak: '壯年期（巔峰）',
    elder: '老年期',
    overage: '退役候選',
};

export type MeterTier = 'high' | 'mid' | 'low';

/** 條的顏色（綠 / 黃 / 紅），十六進位 RGB */
export const METER_TIER_COLORS: Readonly<Record<MeterTier, string>> = {
    high: '#5FBF6A',
    mid: '#E0B341',
    low: '#D9534F',
};

export const VITALITY_HIGH_RATIO = 0.6;
export const VITALITY_LOW_RATIO = 0.3;

export const UI_VIT_EXHAUSTED = '精力不足！';

export interface LifespanView {
    age: number;
    maxLifespan: number;
    phase: LifePhase;
    phaseLabel: string;
    /** UI_AGE_DISPLAY */
    ageDisplay: string;
    /** 「30 歲 · 青年期」 */
    ageText: string;
    /** UI_LIFESPAN_BAR */
    lifespanText: string;
    /** 0~1，條的填滿比例 */
    ratio: number;
    tier: MeterTier;
    color: string;
    overLifespan: boolean;
    dead: boolean;
}

export interface VitalityView {
    current: number;
    max: number;
    /** UI_VIT_BAR */
    text: string;
    ratio: number;
    tier: MeterTier;
    color: string;
    /** UI_PREGNANCY_LOCK；沒有待產時為 null */
    pregnancyText: string | null;
    exhausted: boolean;
    /** 精力卡標題列的狀態字：待產優先，其次精力不足；都沒有時為空字串 */
    statusText: string;
}

export function lifePhaseOf(age: number): LifePhase {
    let phase: LifePhase = 'infant';
    for (const [name, start] of LIFE_PHASE_STARTS) {
        if (age >= start) phase = name;
    }
    return phase;
}

function clamp01(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
}

export function describeLifespan(general: GeneralConfig): LifespanView {
    const age = Math.max(0, general.age ?? 0);
    const shownAge = Math.floor(age);
    const maxLifespan = resolveMaxLifespan(general as AgingGeneral);
    const phase = lifePhaseOf(age);
    const phaseLabel = LIFE_PHASE_LABELS[phase];
    const overLifespan = age > maxLifespan;
    const tier: MeterTier = overLifespan ? 'low' : phase === 'elder' || phase === 'overage' ? 'mid' : 'high';
    return {
        age: shownAge,
        maxLifespan,
        phase,
        phaseLabel,
        ageDisplay: `${general.name}（${shownAge} 歲）`,
        ageText: `${shownAge} 歲 · ${phaseLabel}`,
        lifespanText: `壽命：${shownAge}/${maxLifespan}`,
        ratio: clamp01(maxLifespan > 0 ? age / maxLifespan : 0),
        tier,
        color: METER_TIER_COLORS[tier],
        overLifespan,
        dead: (general.status ?? '').toLowerCase() === GENERAL_STATUS_DEAD,
    };
}

export function vitalityTier(ratio: number): MeterTier {
    if (ratio >= VITALITY_HIGH_RATIO) return 'high';
    if (ratio >= VITALITY_LOW_RATIO) return 'mid';
    return 'low';
}

export function describeVitality(general: GeneralConfig & { pregnancySeasonsLeft?: number }): VitalityView {
    const max = Math.max(0, Math.floor(general.maxVitality ?? general.vitality ?? 0));
    const current = Math.max(0, Math.min(max, Math.floor(general.vitality ?? max)));
    const ratio = clamp01(max > 0 ? current / max : 0);
    const tier = vitalityTier(ratio);
    const pregnant = Math.max(0, Math.floor(general.pregnancySeasonsLeft ?? 0));
    const pregnancyText = pregnant > 0 ? `待產中（剩餘 ${pregnant} 季）` : null;
    const exhausted = current < BATTLE_VITALITY_COST;
    return {
        current,
        max,
        text: `精力：${current}/${max}`,
        ratio,
        tier,
        color: METER_TIER_COLORS[tier],
        pregnancyText,
        exhausted,
        statusText: pregnancyText ?? (exhausted ? UI_VIT_EXHAUSTED : ''),
    };
}

/** UI_VIT_COST */
export function formatVitalityCost(cost: number): string {
    return `此行動消耗精力 ${cost}`;
}

/** UI_DEATH_NOTIFY */
export function formatDeathNotice(name: string, age: number): string {
    return `${name} 辭世，享年 ${Math.floor(age)} 歲`;
}
