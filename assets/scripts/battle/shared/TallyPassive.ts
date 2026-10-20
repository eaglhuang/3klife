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
}

/** 虎符模板 id → 被動規格；暫定數字，規格未寫的欄位以此為準 */
export const TALLY_PASSIVE_BY_TEMPLATE: Readonly<Record<string, TallyPassiveSpec>> = {
  // 騎射合一：騎兵保留騎兵移動力，攻擊射程改用弓兵射程
  'tiger-tally-bai-ma': { attackRangeFloor: ARCHER_ATTACK_RANGE },
};

/** 把虎符被動套到部隊上；沒有被動或沒有模板 id 時什麼都不做 */
export function applyTallyPassive(unit: TroopUnit, templateId: string | null): void {
  const spec = templateId ? TALLY_PASSIVE_BY_TEMPLATE[templateId] : undefined;
  if (!spec) return;
  if (spec.attackRangeFloor !== undefined) {
    unit.attackRange = Math.max(unit.attackRange, spec.attackRangeFloor);
  }
}
