// @spec-source → 兵種（虎符）系統.md：死亡傳承虎符（白馬 / 騎射合一）
/**
 * TallyPassive — 虎符被動的通用掛點（不依賴 cc）
 *
 * 虎符部隊出陣綁定時呼叫 applyTallyPassive，依卡片模板 id 查表套用被動。
 * 之後其他虎符被動（七進七出、結姻連射、空城計…）各自加一條表項即可，
 * 不需要再改綁定流程。
 *
 * Unity 對照：ScriptableObject 上的被動欄位，部署時 Instantiate 後依資料套用到角色上。
 */
import type { TroopUnit } from '../../core/models/TroopUnit';

/** 弓兵射程（BattleUnitSpawner 弓兵 attackRange = 2） */
const ARCHER_ATTACK_RANGE = 2;

export interface TallyPassiveSpec {
  /** 射程下限：攻擊射程至少提高到這個值 */
  attackRangeFloor?: number;
  /** 結姻連射：與男性武將相鄰時，每次攻擊額外多打的次數 */
  extraHitWhenAdjacentMale?: number;
  /** 騎射合一：移動力加成（規格 Move + 1，PROG-2-0796） */
  moveRangeBonus?: number;
  /** 七進七出：移動穿透敵格（Ghost_Move），由移動階段依穿透規則結算（PROG-2-0776） */
  ghostMove?: boolean;
}

/** 虎符模板 id → 被動規格；暫定數字，規格未寫的欄位以此為準 */
export const TALLY_PASSIVE_BY_TEMPLATE: Readonly<Record<string, TallyPassiveSpec>> = {
  // 騎射合一：騎兵保留騎兵移動力，攻擊射程改用弓兵射程
  // 騎射合一：攻擊射程 ＝ 弓兵射程、移動 +1（g.md 規格）；移動後攻擊由戰鬥階段用移動後格位計算
  'tiger-tally-bai-ma': { attackRangeFloor: ARCHER_ATTACK_RANGE, moveRangeBonus: 1 },
  // 結姻連射：與男性武將相鄰時攻擊次數 +1（每次攻擊判定，不是出陣時套用）
  'tiger-tally-jiao-ji': { extraHitWhenAdjacentMale: 1 },
  // 七進七出（龍膽符）：暫定 id，龍膽符尚未進 TallyCardCatalog，出陣前不會有單位帶到
  'tiger-tally-long-dan': { ghostMove: true },
};

/** 此部隊是否帶七進七出（移動穿透敵格）；沒有模板 id 或沒有該被動時為 false */
export function hasGhostMove(unit: TroopUnit): boolean {
  const spec = unit.tallyTemplateId ? TALLY_PASSIVE_BY_TEMPLATE[unit.tallyTemplateId] : undefined;
  return spec?.ghostMove === true;
}

/** 把虎符被動套到部隊上；沒有被動或沒有模板 id 時什麼都不做 */
export function applyTallyPassive(unit: TroopUnit, templateId: string | null): void {
  const spec = templateId ? TALLY_PASSIVE_BY_TEMPLATE[templateId] : undefined;
  if (!spec) return;
  if (spec.attackRangeFloor !== undefined) {
    unit.attackRange = Math.max(unit.attackRange, spec.attackRangeFloor);
  }
  if (spec.moveRangeBonus !== undefined) {
    unit.moveRangeBonus += spec.moveRangeBonus;
  }
}

/**
 * 額外攻擊次數（結姻連射）：沒有此被動、或不與男性武將相鄰時為 0。
 * 相鄰判定由戰鬥解算端算好傳入（武將不在格子上，要看所屬陣營的主將位置）。
 */
export function extraAttackHitsOf(unit: TroopUnit, adjacentToMaleGeneral: boolean): number {
  const spec = unit.tallyTemplateId ? TALLY_PASSIVE_BY_TEMPLATE[unit.tallyTemplateId] : undefined;
  if (!spec?.extraHitWhenAdjacentMale || !adjacentToMaleGeneral) return 0;
  return spec.extraHitWhenAdjacentMale;
}
