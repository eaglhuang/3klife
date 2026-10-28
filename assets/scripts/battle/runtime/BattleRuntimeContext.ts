// @spec-source → 戰場部署系統.md (doc_spec_0040)、demo_技術架構.md (doc_tech_0015)；PROG-2-1429 依建檔紀錄補標出處
import type { BattleTactic } from '../../core/config/Constants';
import type { BattleState } from '../models/BattleState';
import type { BattleRuntimePhaseName, BattleRuntimePhaseOutcome } from './BattleRuntimeContract';

export interface BattleRuntimeContext {
  readonly state: BattleState;
  readonly battleTactic: BattleTactic;
  executePhase(phaseName: BattleRuntimePhaseName): BattleRuntimePhaseOutcome;
  finalizeTurnCycle(): void;
}