import { StatusEffect } from '../../core/config/Constants';
import { BattleSkillAutoAimMode, BattleSkillTargetMode, type SkillScalingStat } from '../../shared/SkillRuntimeContract';

export type BattleSkillFalloffRule = 'none' | 'linear-step';
export type BattleSkillEffectKind =
  | 'damage' | 'heal' | 'control' | 'link' | 'counter' | 'reset'
  | 'push' | 'root' | 'slow' | 'dot' | 'morale' | 'tile-buff' | 'extra-attack';

export interface BattleSkillProfile {
  battleSkillId: string;
  /** 戰法標籤（PROG-2-0406）：例如 fire 火計，供天氣強約束判定 */
  tags?: readonly string[];
  targetMode: BattleSkillTargetMode;
  manualTargeting?: boolean;
  autoAimMode?: BattleSkillAutoAimMode;
  effectKind?: BattleSkillEffectKind;
  coefficient: number;
  scalingStat?: SkillScalingStat;
  ignoreDefense?: boolean;
  /** 防禦穿透比例 0~1，無視目標該比例的防禦力（G-1 無視防禦：0.5） */
  defensePenetrationRatio?: number;
  /** 傷害爆擊加成倍率（flat 增益）：final = base * (1 + critBonus)（G-1 百步穿楊：0.5） */
  critBonus?: number;
  maxTargets?: number;
  /** 多段結算的遞增係數：每段對全部目標各結算一次（趙家槍法 1.0/1.2/1.4） */
  hitStageMultipliers?: readonly number[];
  falloffRule?: BattleSkillFalloffRule;
  lineLength?: number;
  fanDepth?: number;
  fanHalfWidth?: number;
  areaRadius?: number;
  excludeCenter?: boolean;
  healRatio?: number;
  healFloor?: number;
  /** 精銳突擊：衝鋒傷害倍率（PROG-2-0751，規格 2.0） */
  chargeMultiplier?: number;
  /** 毒箭：每回合扣目標最大 HP 的比例（規格 10%） */
  dotMaxHpRatio?: number;
  /** 緩速：移動範圍減少的格數（規格 1） */
  slowAmount?: number;
  /** 鼓舞：士氣加成（規格 +20） */
  moraleBonus?: number;
  /** 結姻連射：額外攻擊次數（規格 +1） */
  extraHits?: number;
  /** 強制位移的格數（規格 1～2） */
  pushSteps?: number;
  /** 定身回合數（規格 1） */
  rootTurns?: number;
  /** 火計連環：結算後把每個目標及其四向相鄰格設為火場（PROG-2-0757） */
  hazardCross?: boolean;
  statusEffect?: StatusEffect;
  statusTurns?: number;
  linkShareRatio?: number;
  linkRadius?: number;
  linkMaxTargets?: number;
  counterRatio?: number;
  counterStatusEffect?: StatusEffect;
  counterStatusTurns?: number;
  counterTriggers?: number;
  counterMeleeOnly?: boolean;
  resetFirstHitMultiplier?: number;
  resetExtraActions?: number;
  battleLogKey?: string;
}

const PROFILE_BY_SKILL_ID: Record<string, BattleSkillProfile> = {
  'zhang-fei-roar': {
    battleSkillId: 'zhang-fei-roar',
    targetMode: BattleSkillTargetMode.EnemyAll,
    manualTargeting: false,
    autoAimMode: 'all-enemies',
    effectKind: 'control',
    coefficient: 0,
    statusEffect: StatusEffect.Stun,
    statusTurns: 1,
    battleLogKey: 'skill.zhang_fei_roar.hit',
  },
  'cao-cao-tactics': {
    battleSkillId: 'cao-cao-tactics',
    targetMode: BattleSkillTargetMode.EnemySingle,
    manualTargeting: false,
    autoAimMode: 'frontmost-enemy',
    coefficient: 0.55,
    scalingStat: 'int',
    ignoreDefense: true,
    maxTargets: 1,
    falloffRule: 'none',
    battleLogKey: 'skill.cao_cao_tactics.hit',
  },
  'guan-yu-slash': {
    battleSkillId: 'guan-yu-slash',
    targetMode: BattleSkillTargetMode.Line,
    manualTargeting: false,
    autoAimMode: 'densest-line',
    coefficient: 0.85,
    scalingStat: 'str',
    maxTargets: 3,
    lineLength: 3,
    falloffRule: 'linear-step',
    battleLogKey: 'skill.guan_yu_slash.hit',
  },
  'lu-bu-rampage': {
    battleSkillId: 'lu-bu-rampage',
    targetMode: BattleSkillTargetMode.Fan,
    manualTargeting: false,
    autoAimMode: 'densest-fan',
    coefficient: 0.75,
    scalingStat: 'str',
    maxTargets: 4,
    fanDepth: 2,
    fanHalfWidth: 1,
    falloffRule: 'linear-step',
    battleLogKey: 'skill.lu_bu_rampage.hit',
  },
  'zhao-yun-pierce': {
    battleSkillId: 'zhao-yun-pierce',
    targetMode: BattleSkillTargetMode.Line,
    manualTargeting: false,
    autoAimMode: 'densest-line',
    coefficient: 0.8,
    scalingStat: 'str',
    maxTargets: 4,
    lineLength: 3,
    // 三連擊：對直線目標依序三次獨立結算，每段套用遞增係數（戰法系統 G-3：1.0/1.2/1.4）
    hitStageMultipliers: [1.0, 1.2, 1.4],
    falloffRule: 'none',
    battleLogKey: 'skill.zhao_yun_pierce.hit',
  },
  'zhuge-liang-storm': {
    battleSkillId: 'zhuge-liang-storm',
    targetMode: BattleSkillTargetMode.Area,
    manualTargeting: false,
    autoAimMode: 'densest-area',
    coefficient: 0.72,
    scalingStat: 'int',
    maxTargets: 5,
    areaRadius: 1,
    falloffRule: 'linear-step',
    battleLogKey: 'skill.zhuge_liang_storm.hit',
  },
  'zhou-yu-inferno': {
    battleSkillId: 'zhou-yu-inferno',
    tags: ['fire'],
    targetMode: BattleSkillTargetMode.Tile,
    manualTargeting: false,
    autoAimMode: 'occupied-tile',
    coefficient: 0.95,
    scalingStat: 'int',
    maxTargets: 1,
    falloffRule: 'none',
    battleLogKey: 'skill.zhou_yu_inferno.hit',
  },
  'sun-quan-tide': {
    battleSkillId: 'sun-quan-tide',
    targetMode: BattleSkillTargetMode.AdjacentTiles,
    manualTargeting: false,
    autoAimMode: 'adjacent-ring',
    coefficient: 0.68,
    scalingStat: 'int',
    maxTargets: 4,
    areaRadius: 1,
    excludeCenter: true,
    falloffRule: 'linear-step',
    battleLogKey: 'skill.sun_quan_tide.hit',
  },
  'liu-bei-rally': {
    battleSkillId: 'liu-bei-rally',
    targetMode: BattleSkillTargetMode.AllyAll,
    manualTargeting: false,
    autoAimMode: 'all-allies',
    effectKind: 'heal',
    coefficient: 0,
    scalingStat: 'cha',
    healRatio: 0.18,
    healFloor: 30,
    battleLogKey: 'skill.liu_bei_rally.heal',
  },
  'diao-chan-charm': {
    battleSkillId: 'diao-chan-charm',
    targetMode: BattleSkillTargetMode.EnemyAll,
    manualTargeting: false,
    autoAimMode: 'all-enemies',
    effectKind: 'control',
    coefficient: 0,
    statusEffect: StatusEffect.Stun,
    statusTurns: 1,
    battleLogKey: 'skill.diao_chan_charm.control',
  },
  'lian-huan-chain': {
    battleSkillId: 'lian-huan-chain',
    targetMode: BattleSkillTargetMode.EnemySingle,
    manualTargeting: false,
    autoAimMode: 'frontmost-enemy',
    effectKind: 'link',
    coefficient: 0,
    linkShareRatio: 0.5,
    linkRadius: 1,
    linkMaxTargets: 2,
    battleLogKey: 'skill.lian_huan_chain.link',
  },
  'you-qi-counter': {
    battleSkillId: 'you-qi-counter',
    targetMode: BattleSkillTargetMode.AllySingle,
    manualTargeting: false,
    autoAimMode: 'all-allies',
    effectKind: 'counter',
    coefficient: 0,
    counterRatio: 2,
    counterStatusEffect: StatusEffect.Weak,
    counterStatusTurns: 2,
    counterTriggers: 1,
    counterMeleeOnly: true,
    battleLogKey: 'skill.you_qi_counter.reaction',
  },
  'wei-zhen-reset': {
    battleSkillId: 'wei-zhen-reset',
    targetMode: BattleSkillTargetMode.AllySingle,
    manualTargeting: false,
    autoAimMode: 'all-allies',
    effectKind: 'reset',
    coefficient: 0,
    resetFirstHitMultiplier: 2,
    resetExtraActions: 1,
    battleLogKey: 'skill.wei_zhen_reset.stance',
  },
  'cao-zhi-verse': {
    battleSkillId: 'cao-zhi-verse',
    targetMode: BattleSkillTargetMode.Fan,
    manualTargeting: false,
    autoAimMode: 'densest-fan',
    coefficient: 0.78,
    scalingStat: 'int',
    maxTargets: 4,
    fanDepth: 3,
    fanHalfWidth: 2,
    falloffRule: 'linear-step',
    battleLogKey: 'skill.cao_zhi_verse.hit',
  },
  'guo-jia-foresight': {
    battleSkillId: 'guo-jia-foresight',
    targetMode: BattleSkillTargetMode.Area,
    manualTargeting: false,
    autoAimMode: 'densest-area',
    coefficient: 0.66,
    scalingStat: 'int',
    maxTargets: 5,
    areaRadius: 1,
    falloffRule: 'linear-step',
    battleLogKey: 'skill.guo_jia_foresight.hit',
  },
  'sima-yi-shadow': {
    battleSkillId: 'sima-yi-shadow',
    targetMode: BattleSkillTargetMode.EnemyAll,
    manualTargeting: false,
    autoAimMode: 'all-enemies',
    coefficient: 0.62,
    scalingStat: 'int',
    maxTargets: 5,
    falloffRule: 'linear-step',
    battleLogKey: 'skill.sima_yi_shadow.hit',
  },
  // --- 虎符戰法（TigerTally） G-1 最低成本兩條 ---
  'tally-defense-pierce': {
    battleSkillId: 'tally-defense-pierce',
    targetMode: BattleSkillTargetMode.EnemySingle,
    manualTargeting: false,
    autoAimMode: 'frontmost-enemy',
    effectKind: 'damage',
    coefficient: 1.0,
    scalingStat: 'str',
    maxTargets: 1,
    defensePenetrationRatio: 0.5,
    battleLogKey: 'skill.tally_defense_pierce.hit',
  },
  'tally-charge': {
    battleSkillId: 'tally-charge',
    targetMode: BattleSkillTargetMode.EnemySingle,
    manualTargeting: false,
    autoAimMode: 'frontmost-enemy',
    effectKind: 'damage',
    coefficient: 1.0,
    scalingStat: 'str',
    maxTargets: 1,
    chargeMultiplier: 2.0,
    battleLogKey: 'skill.tally_charge.hit',
  },
  'tally-fire-chain': {
    battleSkillId: 'tally-fire-chain',
    tags: ['fire'],
    targetMode: BattleSkillTargetMode.EnemySingle,
    manualTargeting: false,
    autoAimMode: 'frontmost-enemy',
    effectKind: 'damage',
    coefficient: 1.0,
    scalingStat: 'int',
    maxTargets: 1,
    hazardCross: true,
    battleLogKey: 'skill.tally_fire_chain.hit',
  },
  'tally-counter-weak': {
    battleSkillId: 'tally-counter-weak',
    targetMode: BattleSkillTargetMode.AllySingle,
    manualTargeting: false,
    autoAimMode: 'all-allies',
    effectKind: 'counter',
    coefficient: 0,
    counterRatio: 2,
    counterStatusEffect: StatusEffect.Weak,
    counterStatusTurns: 1,
    counterTriggers: 1,
    counterMeleeOnly: true,
    battleLogKey: 'skill.tally_counter_weak.reaction',
  },
  'tally-link': {
    battleSkillId: 'tally-link',
    targetMode: BattleSkillTargetMode.EnemySingle,
    manualTargeting: false,
    autoAimMode: 'frontmost-enemy',
    effectKind: 'link',
    coefficient: 0,
    linkShareRatio: 0.5,
    linkRadius: 1,
    linkMaxTargets: 2,
    battleLogKey: 'skill.tally_link.link',
  },
  'tally-hundred-steps': {
    battleSkillId: 'tally-hundred-steps',
    targetMode: BattleSkillTargetMode.EnemySingle,
    manualTargeting: false,
    autoAimMode: 'frontmost-enemy',
    effectKind: 'damage',
    coefficient: 1.2,
    scalingStat: 'str',
    maxTargets: 1,
    critBonus: 0.5,
    battleLogKey: 'skill.tally_hundred_steps.hit',
  },
};

export function resolveBattleSkillProfile(skillId: string): BattleSkillProfile | null {
  return PROFILE_BY_SKILL_ID[skillId] ?? null;
}

export function listBattleSkillProfiles(): BattleSkillProfile[] {
  return Object.values(PROFILE_BY_SKILL_ID);
}

export function resolveBattleSkillTargetMode(
  skillId: string,
  fallback: BattleSkillTargetMode,
): BattleSkillTargetMode {
  return resolveBattleSkillProfile(skillId)?.targetMode ?? fallback;
}

export function requiresBattleSkillManualTargeting(skillId: string): boolean {
  return resolveBattleSkillProfile(skillId)?.manualTargeting ?? false;
}
