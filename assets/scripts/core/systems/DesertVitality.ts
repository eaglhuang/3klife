// @spec-source → 戰場適性系統.md（地形適性效果：沙漠 S「精力消耗減半」、D「每回合扣精力」）；APT-05
/**
 * DesertVitality — 沙漠地形的每回合精力消耗（純邏輯，不依賴 cc）
 *
 * 暫定（規格沒有寫數字與對象）：
 *   - 基礎每回合消耗 DESERT_BASE_VITALITY_DRAIN = 4（暫定）。
 *   - 判斷順序（PM 暫定）：先扣每回合基礎精力，再依沙漠適性等級減半；
 *     所以沙漠地形的每回合扣精力 = 基礎 × 0.5（S 級減半後的值）。
 *   - 適性 A/B/C/D 的沙漠：S 減半、其他等級視為基礎值；本函式只回傳扣多少，不改武將資料。
 *
 * Unity 對照：像回合開始的 Buff tick，讀格子的地形與角色適性，算出本回合要扣的數字。
 */
import type { AptitudeGrade } from './BattleAptitude';
import { TerrainType } from '../../shared/CommonEnums';

/** 暫定基礎每回合精力消耗 */
export const DESERT_BASE_VITALITY_DRAIN = 4;

/** 站在這格上的部隊本回合要扣的精力；不是沙漠時為 0 */
export function desertVitalityDrain(terrain: TerrainType | string | null | undefined, grade: AptitudeGrade): number {
    if (terrain !== TerrainType.Desert) return 0;
    // 先扣基礎，再依 S 級「消耗減半」處理（PM 暫定順序）
    const base = DESERT_BASE_VITALITY_DRAIN;
    return grade === 'S' ? base * 0.5 : base;
}
