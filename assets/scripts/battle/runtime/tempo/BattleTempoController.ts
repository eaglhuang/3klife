// @spec-source → 戰場部署系統.md (doc_spec_0040)、demo_技術架構.md (doc_tech_0015)；PROG-2-1429 依建檔紀錄補標出處
import type { BattlePhaseExecutor } from '../phases/BattlePhaseExecutor';

export interface BattleTempoController {
  resolveTurnPlan(phaseExecutors: readonly BattlePhaseExecutor[]): readonly BattlePhaseExecutor[];
}