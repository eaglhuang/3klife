// @spec-source → 戰法系統.md (doc_spec_0038)；PROG-2-1429 依建檔紀錄補標出處
import { TerrainType, TroopType, Weather } from '../../core/config/Constants';
import { fireDamageMultiplier, isFireTactic } from '../../core/systems/WeatherTacticRestriction';
import { fateBlessingLevel, fateDamageMultiplier } from '../../core/systems/FateBlessing';
import { GeneralUnit } from '../../core/models/GeneralUnit';
import { TroopUnit } from '../../core/models/TroopUnit';
import { FormulaSystem } from '../../core/systems/FormulaSystem';
import { critDamageOf, critRateOf, rollCrit } from '../../core/systems/CombatCrit';
import type { SkillScalingStat } from '../../shared/SkillRuntimeContract';
import type { BattleSkillExecutionContext } from './BattleSkillResolver';
import type { BattleSkillProfile } from './BattleSkillProfiles';
import { isStraightLine } from './SkillGridGeometry';
import { tallyFireDamageTakenOf } from '../shared/TallyPassive';

/** 戰法依天氣的傷害倍率（PROG-2-1698）；未設定或該天氣未列時為 1 */
export function weatherDamageMultiplierOf(profile: Pick<BattleSkillProfile, 'weatherDamageMultiplier'>, weather: Weather): number {
  return profile.weatherDamageMultiplier?.[weather] ?? 1;
}

export class BattleSkillDamageResolver {
  constructor(private readonly formula = new FormulaSystem()) {}

  public resolveDamage(
    profile: BattleSkillProfile,
    caster: GeneralUnit,
    target: TroopUnit,
    context: BattleSkillExecutionContext,
    hitIndex: number,
    stageIndex = 0,
    ultimateAttack?: number | null,
  ): number {
    // 奧義攻擊基準（PROG-2-0927）：有值時取代一般的 scaledAttack，其餘防禦與加成照常結算
    const scaledAttack = ultimateAttack ?? this.resolveScaledAttack(profile, caster, hitIndex);
    const zoneMultiplier = context.getDefenseZoneMultiplier?.(target) ?? 1;
    const rawDefense = profile.ignoreDefense ? 0 : target.getEffectiveDefense() * (target.isShieldWallActive ? 2 : 1) * zoneMultiplier;
    const penetration = profile.defensePenetrationRatio ?? 0;
    const defenderDefense = Math.floor(rawDefense * (1 - penetration));

    const rawBaseDamage = this.formula.calculateDamage({
      attackerAttack: scaledAttack,
      defenderDefense,
      attackerType: this.resolveVirtualAttackerType(caster),
      defenderType: target.type,
      attackerTerrain: TerrainType.Plain,
      defenderTerrain: context.getTerrain(target.lane, target.depth),
      attackBonus: caster.attackBonus,
    });
    const chargedDamage = this.applyCharge(profile, context, caster, target, rawBaseDamage);
    const baseDamage = this.applyFirstTurn(profile, context, chargedDamage);

    const weather = context.getWeather?.() ?? Weather.Clear;
    const weatherMultiplier = fireDamageMultiplier(profile.tags ?? [], weather) * weatherDamageMultiplierOf(profile, weather);
    const stageMultiplier = profile.hitStageMultipliers?.[stageIndex] ?? 1;
    const staged = stageMultiplier === 1 ? baseDamage : Math.max(1, Math.floor(baseDamage * stageMultiplier));
    const weathered = weatherMultiplier === 1 ? staged : Math.max(1, Math.floor(staged * weatherMultiplier));
    // 天命加護（FBR-10）：火計傷害隨施放者的紫色天命等級增加
    const fateMultiplier = isFireTactic(profile.tags ?? [])
      ? fateDamageMultiplier(fateBlessingLevel(caster.genes))
      : 1;
    // 藤甲（PROG-2-1437）：目標承受火計傷害 ×3；火燒偷襲戰我方火抗 ×0.5（PROG-2-1459）
    const fireTaken = isFireTactic(profile.tags ?? [])
      ? tallyFireDamageTakenOf(target) * (context.getSceneFireDamageTakenMultiplier?.(target) ?? 1)
      : 1;
    const fated = fateMultiplier * fireTaken === 1 ? weathered : Math.max(1, Math.floor(weathered * fateMultiplier * fireTaken));

    // 爆擊率加成（百步穿楊 +50%）：以基礎爆擊率加成後擲骰，爆擊 ×1.5；沒有亂數源的測試 context 視為不爆擊
    if (profile.critRateBonus && context.randomSource) {
      const rate = critRateOf(profile.critRateBonus);
      return rollCrit(rate, context.randomSource) ? critDamageOf(fated) : fated;
    }
    return fated;
  }

  /**
   * 精銳突擊衝鋒（PROG-2-0756）：施放者與目標在同一直線上時，基礎傷害 × chargeMultiplier。
   * 沒有 chargeMultiplier 或缺少施放者位置時維持原傷害。
   */
  private applyCharge(
    profile: BattleSkillProfile,
    context: BattleSkillExecutionContext,
    caster: GeneralUnit,
    target: TroopUnit,
    baseDamage: number,
  ): number {
    if (!profile.chargeMultiplier) {
      return baseDamage;
    }
    const casterCell = context.getCasterCell?.(caster.faction) ?? null;
    if (!casterCell || !isStraightLine(casterCell, { lane: target.lane, depth: target.depth })) {
      return baseDamage;
    }
    return Math.max(1, Math.floor(baseDamage * profile.chargeMultiplier));
  }

  /** 威震華夏（PROG-2-0773）：戰鬥第 1 回合傷害 × firstTurnDamageMultiplier；其他回合不變 */
  private applyFirstTurn(
    profile: BattleSkillProfile,
    context: BattleSkillExecutionContext,
    baseDamage: number,
  ): number {
    if (!profile.firstTurnDamageMultiplier || context.getTurnNumber?.() !== 1) {
      return baseDamage;
    }
    return Math.max(1, Math.floor(baseDamage * profile.firstTurnDamageMultiplier));
  }

  private resolveScaledAttack(
    profile: BattleSkillProfile,
    caster: GeneralUnit,
    hitIndex: number,
  ): number {
    const baseAttack = this.resolveCasterAttack(caster, profile.scalingStat);
    const coefficientAttack = Math.max(1, Math.floor(baseAttack * profile.coefficient));
    const falloffMultiplier = this.resolveFalloffMultiplier(profile, hitIndex);
    return Math.max(1, Math.floor(coefficientAttack * falloffMultiplier));
  }

  private resolveCasterAttack(caster: GeneralUnit, scalingStat?: SkillScalingStat): number {
    if (scalingStat === 'int') {
      return this.formula.calculateGeneralAttack({
        int: caster.int,
        lea: caster.lea,
        maxHp: caster.maxHp,
      });
    }

    if (scalingStat === 'str') {
      return this.formula.calculateGeneralAttack({
        str: caster.str,
        lea: caster.lea,
        maxHp: caster.maxHp,
      });
    }

    if (scalingStat === 'lea') {
      return Math.max(1, Math.floor(caster.lea));
    }

    return caster.int > caster.str
      ? this.formula.calculateGeneralAttack({ int: caster.int, lea: caster.lea, maxHp: caster.maxHp })
      : this.formula.calculateGeneralAttack({ str: caster.str, lea: caster.lea, maxHp: caster.maxHp });
  }

  private resolveFalloffMultiplier(profile: BattleSkillProfile, hitIndex: number): number {
    if (profile.falloffRule !== 'linear-step') {
      return 1;
    }

    return Math.max(0.55, 1 - hitIndex * 0.1);
  }

  private resolveVirtualAttackerType(caster: GeneralUnit): TroopType {
    if (caster.int > caster.str) {
      return TroopType.Archer;
    }

    return TroopType.Infantry;
  }
}
