import { BattleSkillTargetMode } from '../../shared/SkillRuntimeContract';
import type { BattleSkillProfile } from './BattleSkillProfiles';

/**
 * 戰法傷害投射模組代號（戰法系統規格 G-6-1）。
 * TDIR 單體直接傷害、TLINE 直線多段、TFAN 扇形／範圍 AOE。
 * 只做代號與施放形狀的對應，不另外寫戰鬥流程；結算仍走既有的 target selector 與傷害 resolver。
 */
export type BattleSkillDamageModuleTag = 'TDIR' | 'TLINE' | 'TFAN';

const DAMAGE_MODULE_BY_TARGET_MODE: Partial<Record<BattleSkillTargetMode, BattleSkillDamageModuleTag>> = {
  [BattleSkillTargetMode.EnemySingle]: 'TDIR',
  [BattleSkillTargetMode.Line]: 'TLINE',
  [BattleSkillTargetMode.Fan]: 'TFAN',
  [BattleSkillTargetMode.Area]: 'TFAN',
};

export function damageModuleTagOf(
  profile: Pick<BattleSkillProfile, 'targetMode'>,
): BattleSkillDamageModuleTag | null {
  return DAMAGE_MODULE_BY_TARGET_MODE[profile.targetMode] ?? null;
}
