// @spec-source → 戰場部署系統.md (doc_spec_0040)、demo_技術架構.md (doc_tech_0015)；PROG-2-1429 依建檔紀錄補標出處
import type { BattleRuntimeContext } from '../BattleRuntimeContext';
import type { BattleRuntimePhaseName, BattleRuntimePhaseOutcome } from '../BattleRuntimeContract';

export interface BattlePhaseExecutor {
  readonly phaseName: BattleRuntimePhaseName;
  execute(context: BattleRuntimeContext): BattleRuntimePhaseOutcome;
}

export class CallbackBattlePhaseExecutor implements BattlePhaseExecutor {
  constructor(
    public readonly phaseName: BattleRuntimePhaseName,
    private readonly handler: (context: BattleRuntimeContext) => BattleRuntimePhaseOutcome,
  ) {}

  public execute(context: BattleRuntimeContext): BattleRuntimePhaseOutcome {
    return this.handler(context);
  }
}

export function createBattlePhaseExecutor(
  phaseName: BattleRuntimePhaseName,
  handler: (context: BattleRuntimeContext) => BattleRuntimePhaseOutcome,
): BattlePhaseExecutor {
  return new CallbackBattlePhaseExecutor(phaseName, handler);
}