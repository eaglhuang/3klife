# close-orch-live-apply-success-2026-06-21-rerun

這份 archive 是 `close-orchestration.ts` 正向同檔案例的 **clean-baseline live rerun**，目標是補齊最後一顆「live apply 成功」證據。

## 本輪前提

- `packages/cli/src/commands/taskflow/close-orchestration.ts` 先回到未套 A/B patch 的乾淨 baseline
- `TASK-COLLIDE-CLOSE-ORCH-A` 與 `TASK-COLLIDE-CLOSE-ORCH-B` 的舊 active lease 已先 release
- 雙方重新建立 fresh team-run 與 fresh broker intent

## live runtime 結果

- Lane B (`resolveClosebackPlanningPath`)：
  - 仍為 `direct-brokered`
  - `parallel-safe`
- Lane A (`buildClosebackPlan`)：
  - broker register 後升級為 `needs-physical-split`
  - lane = `deterministic-composer`
  - 原因：同一實體檔案重疊，但 broker 要求走 composer 路徑，而非直接阻擋

## 官方成功路徑

本輪沒有繞過 broker，也沒有硬拗回雙 `direct-brokered`。正式路徑是：

1. `proposal-a.json` / `proposal-b.json`
2. broker compose -> `merge-plan.json`
3. steward plan
4. steward apply -> `steward-apply-evidence.json`

## 權威結論

- compose verdict：`parallel-safe`
- apply method：`patch-apply`
- steward apply verdict：`applied`
- target file：`packages/cli/src/commands/taskflow/close-orchestration.ts`
- outcome：同一檔案上的兩個不同函式 patch，在 live rerun 中成功套用

## 檔案說明

- `compose-result.json`：CLI compose 的原始結果
- `merge-plan.json`：broker compose 生成的 merge plan
- `proposal-a.json`：Lane A live proposal
- `proposal-b.json`：Lane B live proposal
- `steward-apply-evidence.json`：live steward apply 成功證據

## 論文上的精確定位

這個 archive 是 `close-orchestration` 正向案例的最後一層：它補上了「clean baseline 下，沿官方 deterministic-composer / steward 路徑，live apply 也能成功」。

因此，`close-orchestration` 最終可被寫成一條完整證據鏈：

1. live same-file admission layer
2. live runtime lane-escalation layer
3. live apply-success layer
4. 先前 replay/apply artifact 作為可重放對照
