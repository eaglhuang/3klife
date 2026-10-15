/**
 * BossGuardSummon — Boss 親衛隊召喚觸發判定（WBS v7 LVL-11，PROG-2-0599）
 *
 * 規格（關卡設計系統）：敵方主將為呂布、曹操等 Boss 時，血量降至 50% 以下
 * 自動召喚親衛隊，阻擋玩家直接斬首。
 *
 * 本檔只做觸發判定；親衛隊的兵種與站位由呼叫端決定。
 */

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
