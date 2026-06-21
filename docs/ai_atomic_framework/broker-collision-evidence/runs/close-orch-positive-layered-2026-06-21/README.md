# close-orch-positive-layered-2026-06-21

這份 archive 對應論文中的同檔正向 layered case：兩個真實 task card 在同一個目標檔 `packages/cli/src/commands/taskflow/close-orchestration.ts` 上並行啟動，admission 階段皆由 broker 判定為 `parallel-safe`，之後再以同一組真實 patch 內容重放 broker compose 與 steward apply，驗證第二層虛擬原子分段後仍可成功合併。

## 權威結論

- field admission 證據：`broker-evidence-bundle.json` / `broker-evidence-bundle.md`
  - `team-53e5bae34958` → `TASK-COLLIDE-CLOSE-ORCH-A`
  - `team-0c9db84467a6` → `TASK-COLLIDE-CLOSE-ORCH-B`
  - 兩側皆為 `lane=direct-brokered`、`verdict=parallel-safe`
  - 共享檔僅 `packages/cli/src/commands/taskflow/close-orchestration.ts`
- merge/apply 證據：`merge-evidence-report.json` / `steward-apply-evidence.json` / `steward-operation-run-envelope.json`
  - compose verdict：`parallel-safe`
  - steward apply verdict：`applied`
  - broker operation envelope schema：`atm.brokerOperationRunRecordEnvelope.v1`
  - merge verdict：`mergeable`

## 檔案說明

- `broker-evidence-bundle.*`：只保留本案例兩個 authoritative team-run 的 field admission bundle。
- `proposal-a.json`：Lane A，對 `buildClosebackPlan` 的最小 patch。
- `proposal-b.json`：Lane B，對 `resolveClosebackPlanningPath` 的最小 patch。
- `merge-plan.json`：broker compose 後的 merge plan。
- `steward-apply-evidence.json`：steward plan/apply 的完整重放證據。
- `steward-operation-run-envelope.json`：從 steward apply evidence 擷取出的既有 broker envelope，可直接對應論文 schema 敘述。

## 使用方式

論文正文若要引用這個 case，應把它寫成「同一個正向 layered 證據鏈」而不是兩個獨立案例：

1. field layer：真實雙任務、同檔、不同函式，broker admission 皆放行。
2. merge layer：用同一組 patch proposals 經 broker compose + steward apply 重放，得到 `mergeable` 與 `applied`。

這個 archive 的目的，是讓 reviewer 可以在不依賴 ATM 執行當下 runtime 狀態的前提下，重查同一條證據鏈。
