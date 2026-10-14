// @spec-source → 見 docs/cross-reference-index.md
import { Faction, TroopType } from "../config/Constants";

export function resolveTroopDisplayName(type: TroopType): string {
  if (type === TroopType.Cavalry) return '騎兵';
  if (type === TroopType.Infantry) return '步兵';
  if (type === TroopType.Shield) return '盾兵';
  if (type === TroopType.Archer) return '弓兵';
  if (type === TroopType.Pikeman) return '長槍兵';
  if (type === TroopType.Engineer) return '工兵';
  if (type === TroopType.Medic) return '醫護兵';
  return '水軍';
}

export interface TroopStats {
  hp: number;
  attack: number;
  defense: number;
  moveRange?: number;
  attackRange?: number;
}

export class TroopUnit {
  public readonly id: string;
  public readonly type: TroopType;
  public readonly faction: Faction;
  public readonly name: string;
  public readonly maxHp: number;
  public readonly attack: number;
  public readonly defense: number;
  public currentHp: number;
  
  public lane = 0;
  public depth = 0;
  
  // 新增屬性：移動力與攻擊距離
  public readonly moveRange: number;
  public readonly attackRange: number;
  public attackBonus = 0;
  public maxHpBonus = 0;
  public moveRangeBonus = 0;
  
  // 戰鬥狀態緩存 (可用於結算時的狀態，如盾牆加倍)
  public isShieldWallActive = false;

  // 虎符部隊（TRP-13）：出陣時記下虎符與主將；乘數每次結算時依當下格子的地形算
  public tallyId: string | null = null;
  public commanderUid: string | null = null;
  /** (lane, depth) → 攻防乘數；沒有虎符時為 null，戰力不變 */
  public tallyAffinity: ((lane: number, depth: number) => number) | null = null;
  /** 虎符星級攻防乘數（1 + 星 × 0.08，PROG-2-0573）；沒有虎符時為 1，戰力不變 */
  public tallyStarMultiplier = 1;

  constructor(id: string, type: TroopType, faction: Faction, stats: TroopStats, name?: string) {
    this.id = id;
    this.type = type;
    this.faction = faction;
    this.name = name?.trim() || resolveTroopDisplayName(type);
    this.maxHp = stats.hp;
    this.currentHp = stats.hp;
    this.attack = stats.attack;
    this.defense = stats.defense;
    
    this.moveRange = stats.moveRange ?? 1;
    this.attackRange = stats.attackRange ?? 1;
  }

  public moveTo(lane: number, depth: number): void {
    this.lane = lane;
    this.depth = depth;
  }

  public takeDamage(value: number): void {
    this.currentHp = Math.max(0, this.currentHp - value);
  }

  public heal(value: number): void {
    this.currentHp = Math.min(this.getEffectiveMaxHp(), this.currentHp + value);
  }

  public getEffectiveAttack(): number {
    return Math.max(1, (this.attack + this.attackBonus) * this.getTallyAffinityMod());
  }

  /** 防禦（不含盾牆、地形等戰鬥中的加成）；虎符適性乘數在這裡套用 */
  public getEffectiveDefense(): number {
    return this.defense * this.getTallyAffinityMod();
  }

  /** 目前站位的虎符適性乘數；不是虎符部隊時為 1 */
  public getTallyAffinityMod(): number {
    return this.tallyAffinity ? this.tallyAffinity(this.lane, this.depth) : 1;
  }

  public getEffectiveMaxHp(): number {
    return Math.max(1, this.maxHp + this.maxHpBonus);
  }

  public getEffectiveMoveRange(): number {
    return Math.max(0, this.moveRange + this.moveRangeBonus);
  }

  public applyMoveRangeDelta(delta: number): number {
    this.moveRangeBonus += delta;
    return this.moveRangeBonus;
  }

  public applyAttackMultiply(factor: number): number {
    const current = this.getEffectiveAttack();
    const next = Math.max(1, Math.floor(current * factor));
    const delta = next - current;
    this.attackBonus += delta;
    return delta;
  }

  public applyAttackDivide(factor: number): number {
    const current = this.getEffectiveAttack();
    const next = Math.max(1, Math.floor(current / factor));
    const delta = next - current;
    this.attackBonus += delta;
    return delta;
  }

  public applyHpMultiply(factor: number): number {
    const currentMax = this.getEffectiveMaxHp();
    const nextMax = Math.max(1, Math.floor(currentMax * factor));
    const delta = nextMax - currentMax;
    this.maxHpBonus += delta;

    this.currentHp = Math.max(1, Math.floor(this.currentHp * factor));
    this.currentHp = Math.min(this.currentHp, this.getEffectiveMaxHp());
    return delta;
  }

  public applyHpDivide(factor: number): number {
    const currentMax = this.getEffectiveMaxHp();
    const nextMax = Math.max(1, Math.floor(currentMax / factor));
    const delta = nextMax - currentMax;
    this.maxHpBonus += delta;

    this.currentHp = Math.max(1, Math.floor(this.currentHp / factor));
    this.currentHp = Math.min(this.currentHp, this.getEffectiveMaxHp());
    return delta;
  }

  public isDead(): boolean {
    return this.currentHp <= 0;
  }
}