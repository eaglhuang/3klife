// @spec-source → 武將壽命系統.md §年齡階段與能力修正（LIFE-02 係數）、武將系統.md §六色屬性成長曲線（GEN-11，PROG-2-0553）
/**
 * GeneralGrowth — 六色屬性依年齡階段修正（純邏輯，不依賴 cc）
 *
 * 年齡階段（左閉右開）：幼兒 0~5、少年 5~15、青年 15~40、壯年 40~55（巔峰）、老年 55~65、退役候選 65 以上。
 * 係數與 LIFE-02 一致：幼兒 0（不可用）、少年 0.6、青年 1.0、壯年 1.1、老年 0.8、退役候選 0.5。
 * 係數值以 BattlePowerRating 的 BATTLE_POWER_CONSTANTS.AGE_MODIFIER 為準，測試會對照，避免兩處分歧。
 *
 * Unity 對照：像一條 AnimationCurve，依年齡取係數，再乘到六個屬性上。
 */
import { AgePhase, BATTLE_POWER_CONSTANTS } from '../systems/BattlePowerRating';

export type SixStats = { str: number; int: number; lea: number; pol: number; cha: number; luk: number };

/** 依年齡判定階段；負數視為 0 歲 */
export function agePhaseOf(age: number): AgePhase {
    const a = Math.max(0, age);
    if (a < 5) return 'Child';
    if (a < 15) return 'Youth';
    if (a < 40) return 'Prime';
    if (a < 55) return 'Peak';
    if (a < 65) return 'Elder';
    return 'Over';
}

/** 該年齡的六色屬性修正係數 */
export function ageStatMultiplier(age: number): number {
    return BATTLE_POWER_CONSTANTS.AGE_MODIFIER[agePhaseOf(age)];
}

/** 把六色屬性乘上年齡係數，結果四捨五入為整數（取整方式為暫定） */
export function applyAgeToStats(stats: SixStats, age: number): SixStats {
    const m = ageStatMultiplier(age);
    return {
        str: Math.round(stats.str * m),
        int: Math.round(stats.int * m),
        lea: Math.round(stats.lea * m),
        pol: Math.round(stats.pol * m),
        cha: Math.round(stats.cha * m),
        luk: Math.round(stats.luk * m),
    };
}
