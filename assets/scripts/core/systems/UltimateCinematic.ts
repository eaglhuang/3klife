// @spec-source → 奧義系統.md §F-7 Step 2（ultimate-definitions 描述 cinematicProfile）；WBS ULT-12（PROG-2-1061）
/**
 * UltimateCinematic — 奧義演出設定檔的解析（純邏輯，不依賴 cc）
 *
 * 規則：奧義定義有明寫 cinematicProfile 就用它；沒寫（null 或空字串）就退回該效果家族的預設演出。
 * 每個家族都有一套預設，所以任何奧義都能解析到一套可播放的演出。
 *
 * Unity 對照：像 Animator Override Controller，個別奧義有覆寫動畫，沒覆寫就用家族的預設 clip。
 */
import { UltimateEffectFamily } from '../../shared/SkillRuntimeContract';

/** 每個效果家族的預設演出 id（對應之後的全屏特效、鏡頭與 HUD 文案設定） */
export const DEFAULT_CINEMATIC_PROFILE: Readonly<Record<UltimateEffectFamily, string>> = {
    [UltimateEffectFamily.SelfBurst]: 'cinematic-self-burst',
    [UltimateEffectFamily.TeamBuff]: 'cinematic-team-buff',
    [UltimateEffectFamily.TeamHeal]: 'cinematic-team-heal',
    [UltimateEffectFamily.EnemyMassDebuff]: 'cinematic-enemy-mass-debuff',
    [UltimateEffectFamily.SingleExecute]: 'cinematic-single-execute',
    [UltimateEffectFamily.AreaBurst]: 'cinematic-area-burst',
    [UltimateEffectFamily.ControlOverride]: 'cinematic-control-override',
    [UltimateEffectFamily.SpecialRule]: 'cinematic-special-rule',
};

export function cinematicProfileOf(definition: { family: UltimateEffectFamily; cinematicProfile?: string | null }): string {
    const explicit = definition.cinematicProfile?.trim();
    return explicit ? explicit : DEFAULT_CINEMATIC_PROFILE[definition.family];
}
