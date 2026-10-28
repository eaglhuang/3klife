// @spec-source → 奧義系統.md「F-6 Step 6：AI 規則按家族寫，不按角色寫」；WBS ULT-13
/**
 * AiUltimateFamilyRule — 敵方 AI 依奧義效果家族決定施放時機（純邏輯，不依賴 cc）
 *
 * 規格對照（家族 → AI 看的指標）：
 * - 自身爆發 SelfBurst：斬殺線（能擊殺 ≥1 支）或自身危險（血量 ≤ 30%）。
 * - 全隊增益 TeamBuff／團隊回復 TeamHeal：我方血線（血量 ≤ 50%）或戰局落後。
 * - 敵方全體減益 EnemyMassDebuff／強控 ControlOverride：敵方密度（玩家存活 ≥ 3 支）。
 * - 敵將定點傷害 SingleExecute／範圍傷害 AreaBurst：最優擊殺（能擊殺 ≥1 支）。
 * - 特殊規則 SpecialRule：規格未定義時機，不額外限制（回傳 true，只看 IQ 規則）。
 *
 * PM 暫定（可逆）：
 * - 門檻數字（30%、50%、3 支、1 支）是暫定值，規格只給指標不給數字。
 * - 沒有家族資料（undefined／null）時不限制，維持 AIS-07 的 IQ 規則原樣。
 *
 * Unity 對照：像 AI 的 Ability 選擇節點，先看技能的 Tag（家族）再看場景條件，Tag 缺少時退回原本的通用判斷。
 */
import { UltimateEffectFamily } from '../../shared/SkillRuntimeContract';

export interface AiUltimateFamilyInput {
    /** 奧義可擊殺的我方（玩家方）單位數 */
    estimatedKills: number;
    /** 場上玩家方存活單位數 */
    enemyCount: number;
    /** 施放者自身血量比例（0~1） */
    selfHpRatio: number;
    /** 施放者陣營（敵方）的全隊血量比例（0~1） */
    allyHpRatio: number;
    /** 我方總兵力是否低於敵方 */
    isLosing: boolean;
}

/** 暫定門檻（規格未給數字） */
export const ULT_FAMILY_SELF_DANGER_HP_RATIO = 0.3;
export const ULT_FAMILY_ALLY_LOW_HP_RATIO = 0.5;
export const ULT_FAMILY_MASS_ENEMY_COUNT = 3;
export const ULT_FAMILY_MIN_KILLS = 1;

export function aiUltimateFamilyPermits(
    family: UltimateEffectFamily | null | undefined,
    input: AiUltimateFamilyInput,
): boolean {
    switch (family) {
        case UltimateEffectFamily.SelfBurst:
            return input.estimatedKills >= ULT_FAMILY_MIN_KILLS || input.selfHpRatio <= ULT_FAMILY_SELF_DANGER_HP_RATIO;
        case UltimateEffectFamily.TeamBuff:
        case UltimateEffectFamily.TeamHeal:
            return input.allyHpRatio <= ULT_FAMILY_ALLY_LOW_HP_RATIO || input.isLosing;
        case UltimateEffectFamily.EnemyMassDebuff:
        case UltimateEffectFamily.ControlOverride:
            return input.enemyCount >= ULT_FAMILY_MASS_ENEMY_COUNT;
        case UltimateEffectFamily.SingleExecute:
        case UltimateEffectFamily.AreaBurst:
            return input.estimatedKills >= ULT_FAMILY_MIN_KILLS;
        default:
            return true;
    }
}
