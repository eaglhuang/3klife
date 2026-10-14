// @spec-source → PROG-2-0109 OPEN-01；docs/tasks/prog-opening-flow-tasks.md
/** 僅紀錄事件種類；業務條件由設定的純函式判斷，不發布事件。 */
export interface OpeningFlowEvent { readonly type: string; }
export interface OpeningPhase {
    readonly id: string;
    readonly enterWhen: (event: OpeningFlowEvent) => boolean;
    readonly leaveWhen: (event: OpeningFlowEvent) => boolean;
}
/** 本卡不硬編各幕內容，由後續場景接線提供正式設定。 */
export interface OpeningFlowConfig { readonly phases: readonly OpeningPhase[]; }
