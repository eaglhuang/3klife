// @spec-source → 轉職與宿命系統.md §D/§F（WBS v3 FATE-06 接線）；PROG-2-0226
/**
 * JobChangeWiring — 20 歲轉職的名冊接線（純邏輯，不依賴 cc）
 *
 * 把 JobChange 的純函式套到名冊上：主職能力由武力／統率（武官）或智識／政治（文官）換算成單一數值。
 * 沒有主職資料（primaryClass）的武將不轉職，回傳 null，不猜測。
 */
import type { GeneralConfig } from '../models/GeneralUnit';
import { applyJobChange, JobChangeResult, JobClass } from './JobChange';

export type JobWiringGeneral = GeneralConfig & {
    primaryClass?: JobClass;
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
 * 對名冊中指定武將執行轉職。找不到武將或沒有主職資料時回傳 null。
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
    if (!source.primaryClass || typeof source.age !== 'number') return null;

    const result = applyJobChange(
        {
            age: source.age,
            primaryClass: source.primaryClass,
            subClass: source.subClass ?? null,
            primaryAbility: primaryAbilityOf(source, source.primaryClass),
        },
        ordersOwned,
        targetSubClass,
    );
    const next = roster.slice();
    if (result.ok) {
        next[index] = { ...source, subClass: targetSubClass, subClassAbility: result.subAbility };
    }
    return { roster: next, result };
}
