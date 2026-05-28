# TASK-AAO-0060 Branch & Worktree Archive Inventory

**Generated:** 2026-05-28
**Task:** TASK-AAO-0060 — Branch and worktree archive inventory after M16 operability chain
**Scope:** Local branches, git worktrees, standalone clones accumulated during AAO-0046 ~ AAO-0059
**Action taken:** Read-only diff review. No merge, rebase, or deletion performed.

---

## Risk Assessment — Reviewed Worktrees

### `aao-0055-draft` — `C:\Users\User\AI-Atomic-Framework-worktrees\aao-0055-draft`

**Classification: ⛔ HIGH-RISK SANDBOX — DO NOT MERGE**

此 worktree 的 `aao-0055-draft` branch 的 merge base 為 `651be18`（比 main HEAD 舊 9 個 commits），且 branch 上有 5 個 bootstrap 性質的 commits 不在 main 上。其中 commit `68d8c30 initial` 為**破壞性操作**：它刪除了 `.agents/skills/`、`.atm/catalog/`、`.atm/git-hooks/`、`.atm/history/baselines/`，以及 TASK-AAO/TASK-ASA 系列所有 task files。若將此 branch merge 進 main，將**摧毀整個 governance ledger**。

此外，worktree 內的 untracked `packages/cli/src/commands/framework-development.ts` 包含一個更舊的 `ClosurePacketReconcileAttestation` 設計草稿，具備 `closedByCommand: 'atm tasks close' | 'atm tasks reconcile'` 型別擴展、`historicalDeliveryRefs`、`historicalDeliveryTreeSha`、`attestedByActor` 等欄位。這些設計在正式實作（`ded09e1`）時被**刻意拒絕**（維持 `closedByCommand` 不擴展，attestation 改為 optional 欄位），並已由 `bda4718` commit message 明確記錄排除理由。此 untracked 內容從未進入任何 commit，不應作為未來實作依據。

**處置建議：** 確認無人正在此 worktree 上進行工作後，由人工執行 `git worktree remove` 並 `git branch -D aao-0055-draft`。**禁止 merge、cherry-pick、或 rebase 至 main。**

---

### `draft-0059` — `C:\Users\User\AI-Atomic-Framework-draft-0059`

**Classification: ⛔ OBSOLETE DRAFT — DO NOT MERGE（schema 不相容，已被 main 取代）**

此 worktree 的 `draft-aao-0059` branch tip 即為 merge base（`b1d8662`），branch 上**無任何 unique commit**。所有變更均為 uncommitted working tree changes，涵蓋以下 5 個 files：`framework-development.ts`、`tasks.ts`、`scripts/validate-task-ledger-governance.ts`、`atomic_workbench/atomization-coverage/path-to-atom-map.json`、`package-lock.json`。

其中最高風險為 `framework-development.ts`：draft 定義了 `ClosurePacketAttestation` interface（`schemaId: 'atm.closurePacketAttestation.v1'`），包含欄位 `kind: 'historical-reconcile'`、`attestedBy`，與 main 上 `ded09e1` 正式實作的 `ClosurePacketReconcileAttestation`（`schemaId: 'atm.reconcileAttestation.v1'`，欄位 `reconciledByActor`、`reason`）在 **interface 名稱、schemaId、欄位名三處均不相容**。若提交此 draft 內容至 main，將導致 `validateClosurePacket` 產生雙重驗證路徑並破壞 schema 一致性。

`package-lock.json` 的變更為 `@ai-atomic-framework/integrations-core` 從 `dependencies` 移至 `devDependencies`（多個 workspace packages），無對應 task，係意外狀態。

**處置建議：** 此 worktree 的所有 uncommitted changes 已被 main `ded09e1` 完整取代，無任何 unique value 值得保留。可由人工執行 `git restore .` 清除 working tree changes，或直接刪除整個目錄。**禁止 commit、merge、或 cherry-pick 至 main。**

---

### `AI-Atomic-Framework-0055` — `C:\Users\User\AI-Atomic-Framework-0055`

**Classification: ✅ SAFE ARCHIVE — 已吸收，不需 merge 或 cherry-pick**

此目錄為 main repo 的獨立 clone（remote 指向 `c:\Users\User\AI-Atomic-Framework`），branch 為 `draft-aao-0055-reconcile`，working tree **完全乾淨**（無 uncommitted changes）。Branch 上有一個 unique commit `bda4718 feat(aao-0055): add tasks reconcile command for half-synced historical-done tasks`，實作內容與 main 上的 `32adb52` 相同功能（tasks reconcile command），main 版本為嚴格超集（包含 0056 帶入的 `deliver-and-close`、`runAtmGit` import、`CommandResult` 型別標注等）。

`bda4718` 的 commit message 明確記錄「framework-development.ts ClosurePacket schema extension was excluded from this clone commit as it was not in original 0055 scopePaths」，顯示設計邊界已受控制。main 的正式實作（`32adb52` + `ded09e1`）完整吸收並超越此 draft 的所有內容。

**處置建議：** 無需執行任何 merge 或 cherry-pick。可由人工執行 `git branch -D draft-aao-0055-reconcile` 並刪除目錄。**安全封存，不阻擋後續任何任務。**

---

## 摘要對照表

| Worktree | Branch | 分類 | 刪除前需人工確認 |
|---|---|---|---|
| `AI-Atomic-Framework-worktrees/aao-0055-draft` | `aao-0055-draft` | ⛔ HIGH-RISK — DO NOT MERGE | 是 — 確認無人正在使用 |
| `AI-Atomic-Framework-draft-0059` | `draft-aao-0059` | ⛔ OBSOLETE — DO NOT MERGE | 否 — 無 unique value |
| `AI-Atomic-Framework-0055` | `draft-aao-0055-reconcile` | ✅ SAFE ARCHIVE | 否 — main 已完整吸收 |

---

*此報告為 planning-only 資產盤點，不涉及任何 git 操作。所有刪除、清理動作須由人工逐一確認後執行。*
