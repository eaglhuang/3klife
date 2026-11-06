// @spec-source → 名士預言系統.md (doc_spec_0006) §E-4「名士等級提高準確率」、§E-6「占卜次數/劇情進度解鎖新名士」；2026-11-06 使用者裁決 #10；PROG-2-1951
/**
 * SageFavor — 名士好感等級與劇情解鎖（純邏輯，不依賴 cc）。
 *
 * 暫定（11/06 裁決）：
 * - 好感等級 1～5，累積好感經驗達 [100, 250, 500, 850, 1300] 分別升到 Lv1～Lv5；未滿 100 為 Lv0（尚未結識）。
 * - 每級準確率 +1%，加總後不超過 95%：暫定（自訂），不在 11/06 裁決內，規格只寫「名士等級提高準確率」，幅度待使用者確認。
 * - 劇情錨點（龐統官階 3、左慈第 5 年）同為暫定（自訂），裁決只說「改以官階或年份為錨點」。
 * - 劇情解鎖以玩家官階（OfficerState.currentTier 1～5）或遊戲年份（GameClock.currentYear，從 1 起算）為錨點；
 *   名士只要「累計占卜次數」或「劇情錨點」任一達成即解鎖。
 * - 內建值只是備援；遊戲啟動時由 installSageProgressTable 依 sage-progress.json 覆寫。
 *
 * Unity 對照：像一張可被 JSON 覆寫的 ScriptableObject 設定表＋幾個查表純函式。
 */
import { getSage, isSageUnlocked, SAGES, SageId } from './SageDivination';

export const SAGE_FAVOR_LEVEL_MAX = 5;

/** 升到 Lv1～Lv5 需要的累積好感經驗（索引 0 = Lv1） */
export const SAGE_FAVOR_LEVEL_EXP: number[] = [100, 250, 500, 850, 1300];

/** 好感每級增加的準確率與上限（暫定（自訂），非 11/06 裁決數值） */
export const SAGE_FAVOR_ACCURACY = { perLevel: 0.01, cap: 0.95 };

export type SageStoryUnlock = { type: 'officer-tier'; minTier: number } | { type: 'year'; minYear: number };

/** 劇情解鎖錨點（暫定（自訂））；沒列的名士只能靠占卜次數（或一開始就可用） */
export const SAGE_STORY_UNLOCKS: Partial<Record<SageId, SageStoryUnlock>> = {
    'pang-tong': { type: 'officer-tier', minTier: 3 },
    'zuo-ci': { type: 'year', minYear: 5 },
};

export interface SageUnlockContext {
    divinationCount: number;
    /** 玩家官階 1～5 */
    officerTier: number;
    /** 遊戲年份（從 1 起算） */
    year: number;
}

function nonNegInt(value: number | undefined): number {
    return Number.isFinite(value) && (value as number) > 0 ? Math.floor(value as number) : 0;
}

/** 好感經驗對應的等級 0～5 */
export function sageFavorLevel(exp: number): number {
    const value = nonNegInt(exp);
    let level = 0;
    for (let i = 0; i < SAGE_FAVOR_LEVEL_EXP.length; i++) {
        if (value >= SAGE_FAVOR_LEVEL_EXP[i]) level = i + 1;
    }
    return level;
}

/** 升到下一級需要的累積經驗；已滿級回傳 null */
export function nextSageFavorExp(level: number): number | null {
    const current = Math.min(SAGE_FAVOR_LEVEL_MAX, nonNegInt(level));
    return current >= SAGE_FAVOR_LEVEL_MAX ? null : SAGE_FAVOR_LEVEL_EXP[current];
}

/** 好感加成後的準確率；不低於基準、不超過上限（基準已超過上限時維持基準） */
export function sageAccuracyWithFavor(baseAccuracy: number, favorLevel: number): number {
    const level = Math.min(SAGE_FAVOR_LEVEL_MAX, nonNegInt(favorLevel));
    const boosted = baseAccuracy + level * SAGE_FAVOR_ACCURACY.perLevel;
    return Math.max(baseAccuracy, Math.min(SAGE_FAVOR_ACCURACY.cap, Math.round(boosted * 10000) / 10000));
}

/** 劇情錨點是否達成；名士沒有劇情錨點時為 false */
export function isSageStoryUnlocked(sageId: string, ctx: Readonly<Pick<SageUnlockContext, 'officerTier' | 'year'>>): boolean {
    const anchor = SAGE_STORY_UNLOCKS[sageId as SageId];
    if (!anchor) return false;
    if (anchor.type === 'officer-tier') return nonNegInt(ctx.officerTier) >= anchor.minTier;
    return nonNegInt(ctx.year) >= anchor.minYear;
}

/** 名士是否可用：累計占卜次數或劇情錨點任一達成 */
export function isSageAvailable(sageId: string, ctx: Readonly<SageUnlockContext>): boolean {
    if (!getSage(sageId)) return false;
    return isSageUnlocked(sageId, ctx.divinationCount) || isSageStoryUnlocked(sageId, ctx);
}

export type ParseSageProgressResult = { ok: true } | { ok: false; issues: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseStoryUnlock(sageId: string, raw: unknown, issues: string[]): SageStoryUnlock | null | undefined {
    if (raw === null) return null;
    if (!isRecord(raw)) {
        issues.push(`storyUnlocks.${sageId} 不是物件或 null`);
        return undefined;
    }
    if (raw.type === 'officer-tier' && Number.isInteger(raw.minTier) && (raw.minTier as number) >= 1 && (raw.minTier as number) <= 5) {
        return { type: 'officer-tier', minTier: raw.minTier as number };
    }
    if (raw.type === 'year' && Number.isInteger(raw.minYear) && (raw.minYear as number) >= 1) {
        return { type: 'year', minYear: raw.minYear as number };
    }
    issues.push(`storyUnlocks.${sageId} 必須是 officer-tier（minTier 1～5）或 year（minYear ≥ 1）`);
    return undefined;
}

/**
 * 驗證 sage-progress.json；全部通過才覆寫好感門檻、準確率加成與劇情錨點。
 * storyUnlocks 某名士設為 null 表示移除該名士的劇情錨點；沒列的名士維持內建值。
 */
export function installSageProgressTable(raw: unknown): ParseSageProgressResult {
    if (!isRecord(raw)) return { ok: false, issues: ['根節點不是物件'] };
    const issues: string[] = [];
    let levelExp: number[] | undefined;
    if (raw.favorLevelExp !== undefined) {
        const list = raw.favorLevelExp;
        const valid = Array.isArray(list)
            && list.length === SAGE_FAVOR_LEVEL_MAX
            && list.every((v, i) => Number.isInteger(v) && (v as number) > 0 && (i === 0 || (v as number) > (list[i - 1] as number)));
        if (valid) levelExp = list as number[];
        else issues.push(`favorLevelExp 必須是 ${SAGE_FAVOR_LEVEL_MAX} 個遞增正整數`);
    }
    let accuracy: { perLevel: number; cap: number } | undefined;
    if (raw.favorAccuracy !== undefined) {
        const acc = raw.favorAccuracy;
        if (isRecord(acc) && typeof acc.perLevel === 'number' && acc.perLevel >= 0 && acc.perLevel <= 0.1
            && typeof acc.cap === 'number' && acc.cap > 0 && acc.cap <= 1) {
            accuracy = { perLevel: acc.perLevel, cap: acc.cap };
        } else {
            issues.push('favorAccuracy 需 perLevel 0～0.1、cap (0, 1]');
        }
    }
    const unlocks = new Map<SageId, SageStoryUnlock | null>();
    if (raw.storyUnlocks !== undefined) {
        if (!isRecord(raw.storyUnlocks)) {
            issues.push('storyUnlocks 不是物件');
        } else {
            for (const [sageId, value] of Object.entries(raw.storyUnlocks)) {
                if (!Object.prototype.hasOwnProperty.call(SAGES, sageId)) {
                    issues.push(`storyUnlocks.${sageId} 不是已知名士`);
                    continue;
                }
                const parsed = parseStoryUnlock(sageId, value, issues);
                if (parsed !== undefined) unlocks.set(sageId as SageId, parsed);
            }
        }
    }
    if (issues.length > 0) return { ok: false, issues };
    if (levelExp) SAGE_FAVOR_LEVEL_EXP.splice(0, SAGE_FAVOR_LEVEL_EXP.length, ...levelExp);
    if (accuracy) Object.assign(SAGE_FAVOR_ACCURACY, accuracy);
    for (const [sageId, value] of unlocks) {
        if (value === null) delete SAGE_STORY_UNLOCKS[sageId];
        else SAGE_STORY_UNLOCKS[sageId] = value;
    }
    return { ok: true };
}
