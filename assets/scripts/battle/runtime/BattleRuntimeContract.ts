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
  'enemy-auto-move',
  'enemy-tile-effect',
  'enemy-combat-resolve',
  'enemy-special-resolve',
  // 敵方部署放最後：上一回合部署的敵軍先走開讓出部署格，且本回合新部署的敵軍不會在同回合行動（PROG-2-9302）
  'enemy-deploy',
  'auto-move',
  'tile-effect',
  'combat-resolve',
  'special-resolve',
  'victory-check',
];