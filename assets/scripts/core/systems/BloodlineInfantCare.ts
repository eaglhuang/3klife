// @spec-source → 家族子嗣與血統總規格書 shard-d「幼兒近況小卡」（PROG-2-10223）
/**
 * BloodlineInfantCare — 子嗣 0～4 歲每季一句趣事＋摸頭親子好感（純邏輯，不依賴 cc）。
 * 數值在 data/master/bloodline-infant-care-config.json。
 */
import infantCareJson from '../../../resources/data/master/bloodline-infant-care-config.json';
import { addChildFavor, type BloodlineChildLedgerState } from './BloodlineChildLedger';
import { genderKeyOf, namedText, type TextLookup } from './NamedParams';

export interface InfantCareConfig {
    maxInfantAge: number;
    patFavorGain: number;
    patLimitPerSeason: number;
    anecdoteRefreshPerSeason: boolean;
}

export const INFANT_ANECDOTE_VARIANTS = 4;
export const INFANT_PAT_REPLY_VARIANTS = 3;

function num(v: unknown, d: number): number {
    return typeof v === 'number' && Number.isFinite(v) ? v : d;
}

export function normalizeInfantCareConfig(raw: unknown): InfantCareConfig {
    const r = (raw ?? {}) as Record<string, unknown>;
    return {
        maxInfantAge: Math.max(0, Math.floor(num(r.maxInfantAge, 4))),
        patFavorGain: num(r.patFavorGain, 1),
        patLimitPerSeason: Math.max(0, Math.floor(num(r.patLimitPerSeason, 1))),
        anecdoteRefreshPerSeason: typeof r.anecdoteRefreshPerSeason === 'boolean' ? r.anecdoteRefreshPerSeason : true,
    };
}

export const INFANT_CARE_CONFIG: InfantCareConfig = normalizeInfantCareConfig(infantCareJson);

/** 摸頭紀錄：childId → 該季已摸次數（只保留最近一季）。 */
export interface InfantCareState {
    patSeason: number;
    pats: Record<string, number>;
}

export function emptyInfantCareState(): InfantCareState {
    return { patSeason: -1, pats: {} };
}

export function isInfant(age: number, cfg: InfantCareConfig = INFANT_CARE_CONFIG): boolean {
    return age >= 0 && age <= cfg.maxInfantAge;
}

function hashStr(s: string): number {
    let h = 2166136261;
    for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
}

/** 本季趣事鍵；關閉每季刷新時固定用季 0。 */
export function infantAnecdoteKey(childId: string, season: number, cfg: InfantCareConfig = INFANT_CARE_CONFIG): string {
    const s = cfg.anecdoteRefreshPerSeason ? season : 0;
    return `ui.bloodline.infant_anecdote.${hashStr(`${childId}|${s}`) % INFANT_ANECDOTE_VARIANTS}`;
}

function childParams(lookup: TextLookup | undefined, childName: string, gender: string | undefined): Record<string, string> {
    return { childName, genderLabel: namedText(lookup, `ui.bloodline.gender.${genderKeyOf(gender)}`, {}) };
}

export function infantAnecdoteLine(lookup: TextLookup | undefined, childId: string, childName: string, gender: string | undefined, season: number, cfg: InfantCareConfig = INFANT_CARE_CONFIG): string {
    return namedText(lookup, infantAnecdoteKey(childId, season, cfg), childParams(lookup, childName, gender));
}

export function patsLeft(state: InfantCareState, childId: string, season: number, cfg: InfantCareConfig = INFANT_CARE_CONFIG): number {
    const used = state.patSeason === season ? state.pats[childId] ?? 0 : 0;
    return Math.max(0, cfg.patLimitPerSeason - used);
}

export type PatFailReason = 'not-infant' | 'limit';

export interface PatResult {
    ok: boolean;
    reason?: PatFailReason;
    state: InfantCareState;
    ledger: BloodlineChildLedgerState;
    favorGain: number;
    replyKey?: string;
}

/** 摸頭：年齡在 maxInfantAge 內且本季次數未滿才成立，親子好感 + patFavorGain。 */
export function patInfant(state: InfantCareState, ledger: BloodlineChildLedgerState, childId: string, age: number, season: number, cfg: InfantCareConfig = INFANT_CARE_CONFIG): PatResult {
    if (!isInfant(age, cfg)) return { ok: false, reason: 'not-infant', state, ledger, favorGain: 0 };
    if (patsLeft(state, childId, season, cfg) <= 0) return { ok: false, reason: 'limit', state, ledger, favorGain: 0 };
    const base = state.patSeason === season ? state.pats : {};
    const next: InfantCareState = { patSeason: season, pats: { ...base, [childId]: (base[childId] ?? 0) + 1 } };
    return {
        ok: true,
        state: next,
        ledger: addChildFavor(ledger, childId, cfg.patFavorGain),
        favorGain: cfg.patFavorGain,
        replyKey: `ui.bloodline.infant_pat_reply.${hashStr(`${childId}|${season}|pat`) % INFANT_PAT_REPLY_VARIANTS}`,
    };
}

export function infantPatReplyLine(lookup: TextLookup | undefined, replyKey: string, childName: string, gender: string | undefined): string {
    return namedText(lookup, replyKey, childParams(lookup, childName, gender));
}
