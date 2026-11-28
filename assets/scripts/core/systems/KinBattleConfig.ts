// @spec-source → 羈絆戰場效果整併方案規格書 doc_spec_1358 §2.6（資料驅動）
/**
 * KinBattleConfig — 羈絆戰場效果的數值表（讀 kin-battle-effects.json，純邏輯不依賴 cc）。
 * 程式其他處一律從這裡取值，不寫死常數。
 */
import data from '../../../resources/data/kin-battle-effects.json';

export interface KinBattleConfig {
    sworn: { deployMorale: number };
    aura: { radius: number; attackDefenseRatio: number; critBonus: number };
    combo: { baseChance: number; swornMod: number; comradeMod: number; followUpRatio: number };
    rescue: { chance: number; shareRatio: number };
}

export const KIN_BATTLE_CONFIG: Readonly<KinBattleConfig> = data as KinBattleConfig;
