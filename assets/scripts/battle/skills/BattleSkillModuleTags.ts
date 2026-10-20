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

/**
 * 狀態類戰法的規格代號（SYS-SKILL-TAC-0002 第一片，PROG-2-0586）。
 * THEAL 治療、TBUFF 增益（士氣等）、TDEBUFF 減益（緩速、DOT）。
 * 只看效果種類，不改既有的 buff／heal／debuff 結算。
 */
export type BattleSkillStatusModuleTag = 'THEAL' | 'TBUFF' | 'TDEBUFF';

const STATUS_MODULE_BY_EFFECT_KIND: Partial<Record<string, BattleSkillStatusModuleTag>> = {
  heal: 'THEAL',
  morale: 'TBUFF',
  slow: 'TDEBUFF',
  dot: 'TDEBUFF',
};

export function statusModuleTagOf(
  profile: Pick<BattleSkillProfile, 'effectKind'>,
): BattleSkillStatusModuleTag | null {
  return profile.effectKind ? (STATUS_MODULE_BY_EFFECT_KIND[profile.effectKind] ?? null) : null;
}
