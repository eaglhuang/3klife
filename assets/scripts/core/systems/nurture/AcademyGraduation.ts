// @spec-source → MVP核心循環貫通與遊玩動線功能規格書.md (doc_spec_0308) Phase 2 畢業審定、CP-07；PROG-2-1907
/**
 * AcademyGraduation — 學府結業寫回武將本體（純邏輯，不依賴 cc）。
 *
 * 學府全程只改鏡像快照；結業後才把五維、學到的戰法寫回武將，並給出評級 S/A/B/C。
 * 特質目前武將資料沒有欄位，先隨結果回傳，由呼叫端決定存放處。
 *
 * Unity 對照：像副本結束時把暫存角色資料 Commit 回存檔角色。
 */
import type { GeneralConfig } from '../../models/GeneralUnit';
import { ACADEMY_STAT_KEYS, type AcademyStateSnapshot } from './AcademyTypes';

export type AcademyGrade = 'S' | 'A' | 'B' | 'C';

/** 評級門檻：五維總和（暫定，規格未給） */
export const ACADEMY_GRADE_TOTAL_MIN: Readonly<Record<Exclude<AcademyGrade, 'C'>, number>> = { S: 900, A: 700, B: 500 };

export interface AcademyGraduationResult {
    general: GeneralConfig;
    grade: AcademyGrade;
    statTotal: number;
    /** 這次新學會的戰法 */
    newTactics: string[];
    /** 學府解鎖的特質（武將資料尚無欄位） */
    traits: string[];
}

export class AcademyGraduationError extends Error {}

export function academyGradeOf(statTotal: number): AcademyGrade {
    if (statTotal >= ACADEMY_GRADE_TOTAL_MIN.S) return 'S';
    if (statTotal >= ACADEMY_GRADE_TOTAL_MIN.A) return 'A';
    if (statTotal >= ACADEMY_GRADE_TOTAL_MIN.B) return 'B';
    return 'C';
}

/** 結業寫回；快照未結業或不屬於該武將時拋錯，輸入物件不會被改動 */
export function applyAcademyGraduation(general: Readonly<GeneralConfig>, snapshot: Readonly<AcademyStateSnapshot>): AcademyGraduationResult {
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
    next.learnedTactics = [...known, ...newTactics];
    return { general: next, grade: academyGradeOf(statTotal), statTotal, newTactics, traits: [...snapshot.learnedTraits] };
}
