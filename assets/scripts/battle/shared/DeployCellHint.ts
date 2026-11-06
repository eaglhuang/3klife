/**
 * DeployCellHint — 部署列格子提示（主戰場UI規格書 §3.3，PROG-2-1876）
 *
 * 規格：可部署格亮綠；不可部署格以紅色網格覆蓋。判斷與 BattleController.tryDeployTroop 相同：
 * 格子已有單位，或地格效果會擋住進入（blocksOnEnter）即不可部署。純邏輯，BoardRenderer 依結果選材質。
 *
 * Unity 對照：DeployGridHighlighter 依 CanDeploy(cell) 切換綠／紅 overlay。
 */
import type { TileEffect } from '../models/BattleState';
import { tileStateRuleOf } from './TileStateRules';

export type DeployCellHint = 'open' | 'blocked';

export interface DeployCellSource {
    getCell(lane: number, depth: number): { occupantId: string | null } | null | undefined;
    getTileEffect(lane: number, depth: number): TileEffect | null;
}

/** 格子不存在回 null（不畫提示） */
export function deployCellHint(source: DeployCellSource, lane: number, depth = 0): DeployCellHint | null {
    const cell = source.getCell(lane, depth);
    if (!cell) return null;
    if (cell.occupantId) return 'blocked';
    return tileStateRuleOf(source.getTileEffect(lane, depth)).blocksOnEnter ? 'blocked' : 'open';
}
