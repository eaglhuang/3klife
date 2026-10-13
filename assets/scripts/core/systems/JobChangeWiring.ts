// @spec-source → 轉職與宿命系統.md §D/§F（WBS v3 FATE-06 接線）；PROG-2-0226；主職後備 PROG-2-0228
/**
 * JobChangeWiring — 20 歲轉職的名冊接線（純邏輯，不依賴 cc）
 *
 * 把 JobChange 的純函式套到名冊上：主職能力由武力／統率（武官）或智識／政治（文官）換算成單一數值。
 * 主職解析順序（resolvePrimaryClass）：primaryClass → 開獎時寫入的 careerClass → 暫定後備（武官能力高於文官則武官，否則文官）。
 * 後備規則是規格沒寫的暫定判斷：5 歲宿命只對新生子嗣有效，名冊上的既有武將沒有宿命紀錄。
 */
import type { GeneralConfig } from '../models/GeneralUnit';
import { applyJobChange, JobChangeResult, JobClass } from './JobChange';

export type JobWiringGeneral = GeneralConfig & {
    primaryClass?: JobClass;
    /** 開獎宿命時寫入的主職（Unveiling.chooseFate） */
    careerClass?: JobClass;
    subClass?: JobClass | null;
    subClassAbility?: number;
};

function average(values: Array<number | undefined>): number {
    const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    if (valid.length === 0) return 0;
    return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

/** 武官看武力與統率，文官看智識與政治；缺欄位時只平均現有欄位，全缺為 0。 */
export function primaryAbilityOf(general: JobWiringGeneral, primaryClass: JobClass): number {
    return primaryClass === 'Warrior'
        ? average([general.str, general.lea])
        : average([general.int, general.pol]);
}

/**
 * 解析武將的主職（見檔頭的順序）。沒有任何主職資料時走暫定後備，不回傳 null。
 * 後備的比較與 Unveiling.recommendFate 的無因子後備相同（武官能力 > 文官能力 → 武官）。
 */
export function resolvePrimaryClass(general: JobWiringGeneral): JobClass {
    if (general.primaryClass) return general.primaryClass;
    if (general.careerClass) return general.careerClass;
    return primaryAbilityOf(general, 'Warrior') > primaryAbilityOf(general, 'Scholar') ? 'Warrior' : 'Scholar';
}

/**
 * 對名冊中指定武將執行轉職。找不到武將或缺少年齡時回傳 null。
 * 轉職令數量由呼叫端傳入；只有 ok 時名冊才會換成新資料。
 */
export function applyJobChangeToRoster(
    roster: readonly JobWiringGeneral[],
    generalId: string,
    targetSubClass: JobClass,
    ordersOwned: number,
): { roster: JobWiringGeneral[]; result: JobChangeResult } | null {
    const index = roster.findIndex((general) => general.id === generalId);
    if (index < 0) return null;
    const source = roster[index];
    if (typeof source.age !== 'number') return null;

    const primaryClass = resolvePrimaryClass(source);
    const result = applyJobChange(
        {
            age: source.age,
            primaryClass,
            subClass: source.subClass ?? null,
            primaryAbility: primaryAbilityOf(source, primaryClass),
        },
        ordersOwned,
        targetSubClass,
    );
    const next = roster.slice();
    if (result.ok) {
        // 成功才寫回主職：後備結果固定下來，之後不再隨能力值變動
        next[index] = { ...source, primaryClass, subClass: targetSubClass, subClassAbility: result.subAbility };
    }
    return { roster: next, result };
}
