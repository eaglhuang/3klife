// @spec-source → MVP核心循環貫通與遊玩動線功能規格書.md (doc_spec_0308) Phase 2 畢業審定、CP-07；PROG-2-1907
/**
 * AcademyGraduation — 學府結業寫回武將本體（純邏輯，不依賴 cc）。
 *
 * 學府全程只改鏡像快照；結業後才把五維、學到的戰法寫回武將，並給出評級 S/A/B/C。
 * 學到的特質寫進 learnedTraits（PROG-2-1909），重複的不再加。
 *
 * Unity 對照：像副本結束時把暫存角色資料 Commit 回存檔角色。
 */
import type { GeneralConfig } from '../../models/GeneralUnit';
import type { CareerMarkRecord } from './AcademyInheritAndMarks';
import { ACADEMY_STAT_KEYS, type AcademyStateSnapshot } from './AcademyTypes';

export type AcademyGrade = 'S' | 'A' | 'B' | 'C';

/** 評級門檻：五維總和（暫定，規格未給） */
export const ACADEMY_GRADE_TOTAL_MIN: Readonly<Record<Exclude<AcademyGrade, 'C'>, number>> = { S: 900, A: 700, B: 500 };

export interface AptitudeBoostOutcome {
    target: string;
    from: string;
    to: string;
}

export interface AcademyGraduationResult {
    general: GeneralConfig;
    grade: AcademyGrade;
    statTotal: number;
    /** 這次新學會的戰法 */
    newTactics: string[];
    /** 這次新解鎖的特質 */
    traits: string[];
    /** 這次結業凝練之生平白因子印記（PROG-2-9182） */
    careerMark?: CareerMarkRecord | null;
    /** 這次結業套用的雙年適性升階結果（PROG-2-9185） */
    aptitudeBoosts?: AptitudeBoostOutcome[];
}

const APTITUDE_RANK_ORDER: readonly string[] = ['D', 'C', 'B', 'A', 'S'];
const TERRAIN_KEYS = new Set(['PLAIN', 'FOREST', 'MOUNTAIN', 'WATER', 'CITY', 'DESERT']);
const WEATHER_KEYS = new Set(['SUNNY', 'RAIN', 'WIND', 'SNOW', 'FOG']);

function boostSingleAptitude(next: GeneralConfig, rawTarget: string): AptitudeBoostOutcome | null {
    const trimmed = rawTarget.trim();
    if (!trimmed) return null;
    const [prefix, rest] = trimmed.includes(':') ? trimmed.split(':', 2) : ['', trimmed];
    const key = (rest || trimmed).trim().toUpperCase();
    let bucket: 'troopAptitude' | 'terrainAptitude' | 'weatherAptitude' = 'troopAptitude';
    if (prefix.toLowerCase() === 'terrain' || (!prefix && (TERRAIN_KEYS.has(key) || (next.terrainAptitude && key in next.terrainAptitude)))) {
        bucket = 'terrainAptitude';
    } else if (prefix.toLowerCase() === 'weather' || (!prefix && (WEATHER_KEYS.has(key) || (next.weatherAptitude && key in next.weatherAptitude)))) {
        bucket = 'weatherAptitude';
    }
    const map = { ...(next[bucket] ?? {}) };
    const current = String(map[key] ?? 'C').toUpperCase();
    const idx = APTITUDE_RANK_ORDER.indexOf(current);
    const nextRank = idx >= 0
        ? APTITUDE_RANK_ORDER[Math.min(APTITUDE_RANK_ORDER.length - 1, idx + 1)]
        : 'B';
    map[key] = nextRank;
    next[bucket] = map;
    return { target: key, from: current, to: nextRank };
}

export class AcademyGraduationError extends Error {}

export function academyGradeOf(statTotal: number): AcademyGrade {
    if (statTotal >= ACADEMY_GRADE_TOTAL_MIN.S) return 'S';
    if (statTotal >= ACADEMY_GRADE_TOTAL_MIN.A) return 'A';
    if (statTotal >= ACADEMY_GRADE_TOTAL_MIN.B) return 'B';
    return 'C';
}

/** 結業寫回；快照未結業或不屬於該武將時拋錯，輸入物件不會被改動 */
export function applyAcademyGraduation(
    general: Readonly<GeneralConfig>,
    snapshot: Readonly<AcademyStateSnapshot>,
    /** tacticsGrantedBySkillApi：戰法由技能 API（skill.grant）寫入持有，這裡只算 newTactics、不改 learnedTactics（PROG-2-9204） */
    options: { tacticsGrantedBySkillApi?: boolean } = {},
): AcademyGraduationResult {
    if (!snapshot.graduated) throw new AcademyGraduationError('學府尚未結業');
    if (snapshot.childId !== general.id) throw new AcademyGraduationError(`快照屬於 ${snapshot.childId}，不是 ${general.id}`);
    const next = JSON.parse(JSON.stringify(general)) as GeneralConfig;
    const record = next as unknown as Record<string, number>;
    let statTotal = 0;
    for (const key of ACADEMY_STAT_KEYS) {
        record[key] = snapshot.stats[key];
        statTotal += snapshot.stats[key];
    }
    const known = next.learnedTactics ?? [];
    const newTactics = snapshot.learnedTactics.filter((t, i, arr) => arr.indexOf(t) === i && known.indexOf(t) < 0);
    if (!options.tacticsGrantedBySkillApi) next.learnedTactics = [...known, ...newTactics];
    const knownTraits = next.learnedTraits ?? [];
    const traits = snapshot.learnedTraits.filter((t, i, arr) => arr.indexOf(t) === i && knownTraits.indexOf(t) < 0);
    next.learnedTraits = [...knownTraits, ...traits];
    const careerMark = snapshot.graduatedCareerMark ?? null;
    if (careerMark) {
        next.careerMarks = [...(next.careerMarks ?? []), { id: careerMark.id, stars: careerMark.stars }];
    }
    const aptitudeBoosts: AptitudeBoostOutcome[] = [];
    for (const target of snapshot.pendingAptitudeBoosts ?? []) {
        const outcome = boostSingleAptitude(next, target);
        if (outcome) aptitudeBoosts.push(outcome);
    }
    return { general: next, grade: academyGradeOf(statTotal), statTotal, newTactics, traits, careerMark, aptitudeBoosts };
}
