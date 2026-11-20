// @spec-source → 戰場部署系統.md (doc_spec_0040)、demo_技術架構.md (doc_tech_0015)；PROG-2-1429 依建檔紀錄補標出處
import type { BattleRuntimeContext } from '../runtime/BattleRuntimeContext';
import type { BattleResult, BattleRuntimePhaseOutcome } from '../runtime/BattleRuntimeContract';
import type { BattlePhaseExecutor } from '../runtime/phases/BattlePhaseExecutor';
import type { BattleTempoController } from '../runtime/tempo/BattleTempoController';
import { UCUFLogger, LogCategory } from '../../core/utils/UCUFLogger';

export class BattleRuntimeOrchestrator {
  constructor(private readonly tempoController: BattleTempoController) {}

  public executeTurnCycle(
    context: BattleRuntimeContext,
    phaseExecutors: readonly BattlePhaseExecutor[],
  ): BattleResult {
    const turnPlan = this.tempoController.resolveTurnPlan(phaseExecutors);
    let result: BattleResult = 'ongoing';

    for (const executor of turnPlan) {
      let phaseOutcome: BattleRuntimePhaseOutcome;
      try {
        phaseOutcome = executor.execute(context);
      } catch (error) {
        // 單一階段丟錯（例如畫面層事件處理器因資源載入失敗而出錯）只記錯誤並略過該階段，後面的階段與回合收尾照跑；
        // 否則流程狀態機停在「結算中」，結束回合鍵永遠按不動（PROG-2-9404）
        UCUFLogger.error(LogCategory.BATTLE, `[BattleRuntimeOrchestrator] 階段 ${executor.phaseName} 執行失敗，略過該階段`, error);
        continue;
      }
      if (phaseOutcome.result) {
        result = phaseOutcome.result;
      }

      if (phaseOutcome.stopProcessing || result !== 'ongoing') {
        return result;
      }
    }

    context.finalizeTurnCycle();
    return result;
  }
}