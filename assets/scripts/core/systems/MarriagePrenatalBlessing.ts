// @spec-source → 結緣系統 shard-d「待產倒數與胎教祈福」（PROG-2-10223）
/**
 * MarriagePrenatalBlessing — 待產倒數與胎教祈福（純邏輯，不依賴 cc）。
 * 只能花銀兩、每次待產限次、只微調小名稀有度權重，不直接加屬性。
 * 數值在 data/master/marriage-prenatal-blessing-config.json。
 */
import blessingJson from '../../../resources/data/master/marriage-prenatal-blessing-config.json';
import { genderKeyOf, namedText, type TextLookup } from './NamedParams';

export interface PrenatalBlessingConfig {
    costSilver: number;
    maxUsesPerPregnancy: number;
    nicknameRarityWeightDelta: number;
}

function num(v: unknown, d: number): number {
    return typeof v === 'number' && Number.isFinite(v) ? v : d;
}

export function normalizePrenatalBlessingConfig(raw: unknown): PrenatalBlessingConfig {
    const r = (raw ?? {}) as Record<string, unknown>;
    return {
        costSilver: Math.max(0, num(r.costSilver, 120)),
        maxUsesPerPregnancy: Math.max(0, Math.floor(num(r.maxUsesPerPregnancy, 1))),
        nicknameRarityWeightDelta: Math.max(0, num(r.nicknameRarityWeightDelta, 0.08)),
    };
}

export const PRENATAL_BLESSING_CONFIG: PrenatalBlessingConfig = normalizePrenatalBlessingConfig(blessingJson);

/** 一次待產期的祈福紀錄。 */
export interface PrenatalBlessingState {
    uses: number;
    /** 累計的高階小名稀有度權重增量 */
    rarityWeightDelta: number;
}

export function emptyPrenatalBlessingState(): PrenatalBlessingState {
    return { uses: 0, rarityWeightDelta: 0 };
}

export function prenatalRemainingSeasons(conceivedSeason: number, currentSeason: number, totalSeasons: number): number {
    return Math.max(0, conceivedSeason + totalSeasons - currentSeason);
}

export type BlessingFailReason = 'silver-low' | 'limit';

export interface BlessingResult {
    ok: boolean;
    reason?: BlessingFailReason;
    state: PrenatalBlessingState;
    /** 扣款後的銀兩（只動銀兩，不碰黃金／元寶） */
    silver: number;
}

export function performPrenatalBlessing(state: PrenatalBlessingState, silver: number, cfg: PrenatalBlessingConfig = PRENATAL_BLESSING_CONFIG): BlessingResult {
    if (state.uses >= cfg.maxUsesPerPregnancy) return { ok: false, reason: 'limit', state, silver };
    if (silver < cfg.costSilver) return { ok: false, reason: 'silver-low', state, silver };
    return {
        ok: true,
        state: { uses: state.uses + 1, rarityWeightDelta: state.rarityWeightDelta + cfg.nicknameRarityWeightDelta },
        silver: silver - cfg.costSilver,
    };
}

/** 把祈福增量加到高階小名權重（夾在 0～1）；其餘階級由呼叫端維持原狀。 */
export function applyBlessingToHighTierWeight(highTierWeight: number, state: PrenatalBlessingState): number {
    return Math.min(1, Math.max(0, highTierWeight + state.rarityWeightDelta));
}

function motherParams(lookup: TextLookup | undefined, motherName: string, gender: string | undefined, fetusCount: number): Record<string, string | number> {
    return { motherName, genderLabel: namedText(lookup, `ui.marriage.gender.${genderKeyOf(gender)}`, {}), fetusCount };
}

export function prenatalCountdownLine(lookup: TextLookup | undefined, remainingSeasons: number, motherName: string, motherGender: string | undefined, fetusCount = 1): string {
    return namedText(lookup, 'ui.marriage.prenatal_countdown', { remainingSeasons, ...motherParams(lookup, motherName, motherGender, fetusCount) });
}

export function prenatalBlessingDoneLine(lookup: TextLookup | undefined, motherName: string, motherGender: string | undefined, fetusCount = 1): string {
    return namedText(lookup, 'ui.marriage.prenatal_blessing_done', motherParams(lookup, motherName, motherGender, fetusCount));
}
