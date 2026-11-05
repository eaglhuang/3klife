// @spec-source → 關卡設計系統.md (doc_spec_0049)；PROG-2-1429 依建檔紀錄補標出處
/**
 * BossGuardSummon — Boss 親衛隊召喚觸發判定（WBS v7 LVL-11，PROG-2-0599）
 *
 * 規格（關卡設計系統）：敵方主將為呂布、曹操等 Boss 時，血量降至 50% 以下
 * 自動召喚親衛隊，阻擋玩家直接斬首。
 *
 * 本檔決定觸發、Boss 名單、親衛隊編成與站位；實際生成由戰場的敵方部署階段處理（PROG-2-1862）。
 */
import { TroopType } from '../config/Constants';

export const BOSS_GUARD_SUMMON_HP_RATIO = 0.5;

export function isBossGuardSummonDue(
    hp: number,
    maxHp: number,
    isBoss: boolean,
    alreadySummoned: boolean,
): boolean {
    if (!isBoss || alreadySummoned) return false;
    if (!(maxHp > 0)) return false;
    return hp <= maxHp * BOSS_GUARD_SUMMON_HP_RATIO;
}

/** 會召喚親衛隊的 Boss：規格舉例呂布、曹操（名單暫定，PROG-2-1862）；比對 id 或姓名 */
export const BOSS_GUARD_GENERALS: readonly { readonly id: string; readonly name: string }[] = Object.freeze([
    { id: 'lu-bu', name: '呂布' },
    { id: 'cao-cao', name: '曹操' },
]);

/** 親衛隊編成（暫定）：盾兵 2 隊，不耗敵方糧草 */
export const BOSS_GUARD_TROOP = TroopType.Shield;
export const BOSS_GUARD_COUNT = 2;
export const BOSS_GUARD_UNIT_NAME = '親衛隊';

export function isBossGuardGeneral(id: string | null | undefined, name: string | null | undefined): boolean {
    return BOSS_GUARD_GENERALS.some((boss) => boss.id === id || boss.name === name);
}

/** 親衛隊站位：從空著的路線挑最靠中間的幾路（擋住通往主將的正面），同距離取編號小的 */
export function bossGuardLanes(freeLanes: readonly number[], laneCount: number, count: number = BOSS_GUARD_COUNT): number[] {
    const center = (laneCount - 1) / 2;
    return [...freeLanes]
        .sort((a, b) => Math.abs(a - center) - Math.abs(b - center) || a - b)
        .slice(0, Math.max(0, count));
}

export function bossGuardSummonLine(bossName: string): string {
    return `${bossName}危急，親衛隊現身護主！`;
}
