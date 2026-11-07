// @spec-source → 俘虜處理系統.md (doc_spec_0021) §K 戰後處置延伸分支、年齡與身分類型處理（POW-09，PROG-2-1937）
/**
 * PowExtendedBranches — 四選一之後的延伸分支（純邏輯，不依賴 cc）。
 *
 * 規格 §K：
 * - 勸降：可套用結義金蘭卡提高成功率。
 * - 無期徒刑：追加傳家寶物掉落池。
 * - 放走：可觸發「傳道／頓悟」，我方隨機一名武將學會對方代表戰法。
 * - 年齡已高（例如 60 歲以上）勸降／招募成功後優先轉為教官卡。
 *
 * 暫定：金蘭卡加成、傳家寶掉落率、頓悟機率規格未給數值，全部由 tuning 參數傳入（資料驅動），本檔不寫死；
 * 只有教官年齡門檻採規格舉例的 60 歲作預設。掉落池內容與 UI 接線另卡。
 * Unity 對照：像戰後結算的一組 static helper，數值從 ScriptableObject 讀。
 */
import type { PowDecision } from './PrisonerOfWar';

/** 規格舉例：60 歲以上優先轉教官 */
export const POW_INSTRUCTOR_AGE_DEFAULT = 60;

export interface PowBranchTuning {
    /** 結義金蘭卡對勸降率的加成（百分點） */
    bondingCardBonus: number;
    /** 無期徒刑每季傳家寶掉落機率 0~1 */
    heirloomDropChance: number;
    /** 放走時觸發傳道／頓悟的機率 0~1 */
    enlightenmentChance: number;
    /** 轉教官年齡門檻（缺值用 60） */
    instructorAge?: number;
}

function chance01(v: number): number {
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
}

function roll(random: () => number): number {
    const r = random();
    return Number.isFinite(r) ? r : 1;
}

/** 勸降率套用結義金蘭卡（0~100）。 */
export function persuadeRateWithBondingCard(baseRate: number, useCard: boolean, tuning: Readonly<PowBranchTuning>): number {
    const base = Number.isFinite(baseRate) ? baseRate : 0;
    const bonus = useCard && Number.isFinite(tuning.bondingCardBonus) ? Math.max(0, tuning.bondingCardBonus) : 0;
    return Math.min(100, Math.max(0, base + bonus));
}

/** 勸降／招募成功後是否優先轉教官。 */
export function shouldBecomeInstructor(
    decision: PowDecision, success: boolean, age: number, tuning: Readonly<PowBranchTuning>,
): boolean {
    if (!success || (decision !== 'persuade' && decision !== 'recruit')) return false;
    const threshold = Number.isFinite(tuning.instructorAge) ? (tuning.instructorAge as number) : POW_INSTRUCTOR_AGE_DEFAULT;
    return Number.isFinite(age) && age >= threshold;
}

/** 無期徒刑當季是否掉落傳家寶。 */
export function rollHeirloomDrop(random: () => number, tuning: Readonly<PowBranchTuning>): boolean {
    return roll(random) < chance01(tuning.heirloomDropChance);
}

export interface EnlightenmentResult {
    learnerId: string;
    techniqueId: string;
}

/** 放走時的傳道／頓悟：觸發則從我方武將隨機挑一名學會對方代表戰法。 */
export function rollReleaseEnlightenment(
    allyIds: readonly string[], techniqueId: string | null, random: () => number, tuning: Readonly<PowBranchTuning>,
): EnlightenmentResult | null {
    if (!techniqueId || allyIds.length === 0) return null;
    if (roll(random) >= chance01(tuning.enlightenmentChance)) return null;
    const index = Math.min(allyIds.length - 1, Math.floor(Math.max(0, roll(random)) * allyIds.length));
    return { learnerId: allyIds[index], techniqueId };
}
