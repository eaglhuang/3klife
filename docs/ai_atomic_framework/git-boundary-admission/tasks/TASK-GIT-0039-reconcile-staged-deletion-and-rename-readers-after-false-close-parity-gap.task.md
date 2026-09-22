---
task_id: TASK-GIT-0039
title: Reconcile staged deletion and rename readers after false-close parity gap
status: done
owner: unassigned
priority: P0
depends_on: ["TASK-GIT-0033", "TASK-GIT-0034", "TASK-GIT-0036"]
causalGraph:
  causalDependencies: ["TASK-GIT-0033", "TASK-GIT-0034", "TASK-GIT-0036"]
  startConditions: ["baseline readers and false-close reproduction are recorded"]
  softRelations: ["TASK-GIT-0038"]
  changedPublicSeams: ["staged-change-reader-set"]
  causalImpactEdges: ["git-staged-change-set", "git-tree-delivery", "git-content-scan-safety"]
  parallelFrontierInputs: ["disposable-git-fixture", "existing-git-reader-tests"]
  validatorReferences: ["test_git_0039_acc1", "test_git_0039_acc2", "test_git_0039_acc3"]
  phaseOwner: "git-boundary-admission"
related_plan: git-boundary-admission/git-boundary-admission-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/git-governance/implementation/git-index-transaction.ts
  - packages/cli/src/commands/hook/pre-commit/input-state.ts
  - packages/cli/src/commands/hook/pre-commit/cross-task-admission.ts
  - packages/cli/src/commands/hook/git-index-diagnostics.ts
  - packages/cli/src/commands/git-governance/implementation/commit-bundle-resolution.ts
  - tests/cli/git-commit-task-scoped-staging.test.ts
  - tests/cli/commit-attribution-sealed-transaction.test.ts
  - tests/cli/git-change-read-integrity.test.ts
deliverables:
  - packages/cli/src/commands/git-governance/implementation/git-index-transaction.ts
  - packages/cli/src/commands/hook/pre-commit/input-state.ts
  - packages/cli/src/commands/hook/pre-commit/cross-task-admission.ts
  - packages/cli/src/commands/hook/git-index-diagnostics.ts
  - packages/cli/src/commands/git-governance/implementation/commit-bundle-resolution.ts
  - tests/cli/git-commit-task-scoped-staging.test.ts
  - tests/cli/commit-attribution-sealed-transaction.test.ts
  - tests/cli/git-change-read-integrity.test.ts
validators:
  - node --strip-types tests/cli/git-commit-task-scoped-staging.test.ts
  - node --strip-types tests/cli/commit-attribution-sealed-transaction.test.ts
  - node --strip-types tests/cli/git-change-read-integrity.test.ts
errorCodes: []
tddMode: required
methodProfiles: [tdd-oracle-fidelity]
requiredTestCaseIds: ["test_git_0039_acc1", "test_git_0039_acc2", "test_git_0039_acc3"]
phaseTestCaseIds: ["test_git_0039_phase_frozen_runner"]
advisoryTestCaseIds: ["test_git_0039_advisory_latency"]
testContributions:
  - caseId: test_git_0039_acc1
    semanticKey: git_0039_reader_parity
    coversAcceptance: [ACC-1]
    coversImpactEdges: [git-staged-change-set]
    expectedRedPredicate: "至少一個正式 reader 漏掉 staged deletion；同一 fixture 的 commit、hook、attribution 與診斷輸出集合不一致。"
    responsibility: task-required
    contractEdge: git_0039_delivery
    command: "node --strip-types tests/cli/git-commit-task-scoped-staging.test.ts"
  - caseId: test_git_0039_acc2
    semanticKey: git_0039_tree_oracle
    coversAcceptance: [ACC-2]
    coversImpactEdges: [git-tree-delivery]
    expectedRedPredicate: "deletion-only、modified+deletion、pure rename、rename+modify 的 staged index、commit tree 與 hook 語義完全一致。"
    responsibility: task-required
    contractEdge: git_0039_delivery
    command: "node --strip-types tests/cli/commit-attribution-sealed-transaction.test.ts"
  - caseId: test_git_0039_acc3
    semanticKey: git_0039_negative_control
    coversAcceptance: [ACC-3]
    coversImpactEdges: [git-content-scan-safety]
    expectedRedPredicate: "故意移除 deletion-inclusive filter 或將不存在路徑送入內容掃描時，對應 oracle 必須失敗且不得以 setup error 充當 red。"
    responsibility: task-required
    contractEdge: git_0039_delivery
    command: "node --strip-types tests/cli/git-change-read-integrity.test.ts"
  - caseId: test_git_0039_phase_frozen_runner
    semanticKey: git_0039_frozen_runner
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [git-staged-change-set, git-tree-delivery]
    expectedRedPredicate: "正式 frozen runner 對受影響入口的 deletion/rename 行為與 source focused tests 一致。"
    responsibility: phase-suite
    contractEdge: git_0039_delivery
    command: "node atm.mjs doctor --json"
  - caseId: test_git_0039_advisory_latency
    semanticKey: git_0039_latency
    coversAcceptance: []
    coversImpactEdges: [git-staged-change-set]
    expectedRedPredicate: "記錄 focused reader 與 hook 入口 p50/p95，不以單次成功宣稱改善。"
    responsibility: advisory
    contractEdge: git_0039_delivery
    command: "node atm.mjs next --json"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.cli-command-router-map
  mapUpdates: []
  newScriptsAllowed: false
  extractionCandidates:
    - source: packages/cli/src/commands/git-governance/implementation/git-index-transaction.ts
      disposition: inline
      inlineReason: "Owner requires a bounded quickfix; extraction would expand the change without reducing the staged-reader semantic duplication."
createdByCommand: atm plan card create
completed_at: "2026-09-22T23:06:36.893Z"
completed_by_agent: "codex-captain-20260923"
closedAt: "2026-09-22T23:06:36.893Z"
closedByActor: "codex-captain-20260923"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-22T23-06-36-893Z-close-ea3c18b190c1"
lastTransitionAt: "2026-09-22T23:06:36.893Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "197ecef481a3d12ad5dfce73ca467f2ec565337d"
---

# TASK-GIT-0039 Reconcile staged deletion and rename readers after false-close parity gap

## Intent

修復 GIT-0033 已關閉但仍存在的 false-close：不同 commit/hook 讀取器對 staged
變更集合採用不一致 filter，造成 deletion 從正式交付路徑消失。這張 follow-up
只處理讀取器語義一致性與可重現回歸，不重開歷史卡，也不新增治理機制。

Planning authority: `C:/Users/User/3KLife`；target / closure authority:
`C:/Users/User/AI-Atomic-Framework`；source card 只在 planning repo，實作
代理不得修改 planning repo。

## Acceptance

- [ ] ACC-1：先盤點所有 scoped readers，commit、pre-commit、attribution、diagnostics 對同一 fixture 產生一致的 deletion/rename 集合；未納入者須記錄理由。
- [ ] ACC-2：deletion-only、modified+deletion、pure rename、rename+modify、foreign deletion/cross-scope rename 均由 Git tree/index 與 hook oracle 驗證；漏交付與錯誤放行為零。
- [ ] ACC-3：內容掃描遇到不存在路徑安全跳過；故意還原漏 `D` 或盲目送不存在路徑時，相同 caseId 必須 red。不得新增 CLI、gate、ledger、審核層或平行索引。

## Execution limits

先查 active claim、baseline SHA 與 GIT-0033/0034/0036 的既有測試；不可把已修部分重做成新機制。測試先 red、再最小修補、再 green，最多兩輪；第三輪候選或 scope drift 立即停止並回報。focused tests 通過後，以正式 frozen runner 重跑受影響入口；只在有 source 變更時由既有 build lane 建置一次。

記錄同一 fixture 的 p50/p95、Git 子程序數、重試/build 次數與修復到提交分鐘數；未知就標 unknown，不以文件數或治理步驟代表改善。raw evidence 放 repo 外，回滾只 revert 本卡提交，不 reset 或覆蓋他人 WIP。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-22T17:31:09.070Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"git-boundary-admission/tasks/TASK-GIT-0039-reconcile-staged-deletion-and-rename-readers-after-false-close-parity-gap.task.md","contentDigest":"sha256:2339a8b2d8517c7bbd71ed65bcc446db1299117546a8cf6e5e66bacd5141ee14"} -->
