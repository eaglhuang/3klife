// @spec-source → docs/demo_技術架構.md §10「遭遇初始敵軍」；使用者 11/20 裁決 Q-C2；PROG-2-9420
/**
 * EnemyInitialDeployment — 遭遇戰敵軍開場布陣（純邏輯，不依賴 cc）
 *
 * encounters.json 每關都寫了 enemyInitialDeployment（[{ type, lane }]），以前沒有程式讀，
 * 敵方開場棋盤空無一兵。這裡把資料整理成「真的要生成」的清單：
 * - 兵種必須是 TroopType 的值，路線必須是 0 ~ lanes-1 的整數，否則略過（資料打錯不讓戰鬥崩）。
 * - 同一路只取第一筆：生成在敵方後排同一格，兩筆擠同一路只會有一隊站得下。
 * - 教學戰不布陣：教學戰的出兵波次表就是劇本（PROG-2-9346），開場多三隊會打亂教學節奏。
 *
 * 實際生成（格子被占、被阻擋）由 BattleController.applyEnemyInitialDeployment 處理。
 * Unity 對照：等於 ScriptableObject 上的 initial spawn list，在 Battle 開始時由 Spawner 讀一次。
 */
import { TroopType } from '../../shared/CommonEnums';

/** encounters.json 的一筆開場布陣（原始資料，兵種是字串） */
export interface EnemyInitialDeploymentEntry {
  type: string;
  lane: number;
}

/** 整理後要生成的一筆 */
export interface EnemyInitialSpawn {
  type: TroopType;
  lane: number;
}

const TROOP_TYPE_VALUES = new Set<string>(Object.values(TroopType));

export function isTroopTypeValue(value: unknown): value is TroopType {
  return typeof value === 'string' && TROOP_TYPE_VALUES.has(value);
}

/**
 * 依資料算出開場要生成的敵軍。
 * entries 不是陣列（關卡沒寫）、教學戰、或 lanes 不合法時回傳空陣列。
 */
export function resolveEnemyInitialDeployment(
  entries: readonly EnemyInitialDeploymentEntry[] | null | undefined,
  options: { lanes: number; tutorialBattle?: boolean },
): EnemyInitialSpawn[] {
  if (!Array.isArray(entries) || options.tutorialBattle) return [];
  if (!Number.isInteger(options.lanes) || options.lanes <= 0) return [];
  const usedLanes = new Set<number>();
  const spawns: EnemyInitialSpawn[] = [];
  for (const entry of entries) {
    if (!entry || !isTroopTypeValue(entry.type)) continue;
    const lane = entry.lane;
    if (!Number.isInteger(lane) || lane < 0 || lane >= options.lanes) continue;
    if (usedLanes.has(lane)) continue;
    usedLanes.add(lane);
    spawns.push({ type: entry.type, lane });
  }
  return spawns;
}
