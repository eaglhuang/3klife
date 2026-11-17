// @spec-source → 戰場部署系統.md (doc_spec_0040)、demo_技術架構.md (doc_tech_0015)；PROG-2-1429 依建檔紀錄補標出處
import type { BattleResult } from '../BattleTypes';

export type { BattleResult } from '../BattleTypes';

export type BattleRuntimePhaseName =
  | 'player-auto-move'
  | 'enemy-auto-move'
  | 'player-tile-effect'
  | 'enemy-tile-effect'
  | 'player-combat-resolve'
  | 'enemy-combat-resolve'
  | 'player-special-resolve'
  | 'enemy-special-resolve'
  | 'enemy-deploy'
  | 'auto-move'
  | 'tile-effect'
  | 'combat-resolve'
  | 'special-resolve'
  | 'victory-check';

export interface BattleRuntimePhaseOutcome {
  result?: BattleResult;
  stopProcessing?: boolean;
}

export const TURN_BASED_RUNTIME_PHASE_ORDER: readonly BattleRuntimePhaseName[] = [
  'player-auto-move',
  'player-tile-effect',
  'player-combat-resolve',
  'player-special-resolve',
  // 敵方先部署、後行動（使用者 2026-11-17 定案，PROG-2-9397，取代 PROG-2-9302 的「部署放最後」）：剛部署的敵軍當回合就行動
  'enemy-deploy',
  'enemy-auto-move',
  'enemy-tile-effect',
  'enemy-combat-resolve',
  'enemy-special-resolve',
  'auto-move',
  'tile-effect',
  'combat-resolve',
  'special-resolve',
  'victory-check',
];