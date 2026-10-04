---
task_id: TASK-GIT-0043
title: Preserve both endpoints at staged rename scope boundaries
status: planned
owner: unassigned
priority: P0
depends_on: ["TASK-GIT-0042"]
causalGraph:
  causalDependencies: ["TASK-GIT-0042"]
  startConditions: ["GIT-0042 audit proves a reader loses the old or new rename endpoint"]
  softRelations: ["TASK-GIT-0039", "TASK-GIT-0033"]
  changedPublicSeams: ["staged-rename-scope-membership"]
  causalImpactEdges: ["cross-scope-rename-blocking", "foreign-deletion-protection", "commit-hook-parity"]
  parallelFrontierInputs: ["GIT-0042 endpoint oracle", "existing commit/hook fixtures"]
  validatorReferences: ["test_git_0043_acc1", "test_git_0043_acc2", "test_git_0043_acc3"]
  phaseOwner: "git-boundary-admission"
related_plan: git-boundary-admission/git-boundary-admission-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/git-governance.ts
  - packages/cli/src/commands/git-index-ownership.ts
  - packages/cli/src/commands/hook/pre-commit/residue-candidates.ts
  - packages/cli/src/commands/tasks/claim-intent.ts
  - packages/cli/src/commands/git-governance/implementation/commit-bundle-resolution.ts
  - tests/cli/git-rename-endpoint-parity.test.ts
deliverables:
  - packages/cli/src/commands/git-governance.ts
  - packages/cli/src/commands/git-index-ownership.ts
  - packages/cli/src/commands/hook/pre-commit/residue-candidates.ts
  - packages/cli/src/commands/tasks/claim-intent.ts
  - packages/cli/src/commands/git-governance/implementation/commit-bundle-resolution.ts
  - tests/cli/git-rename-endpoint-parity.test.ts
validators:
  - node --strip-types tests/cli/git-rename-endpoint-parity.test.ts
  - node --strip-types tests/cli/git-commit-task-scoped-staging.test.ts
  - node --strip-types tests/cli/commit-attribution-sealed-transaction.test.ts
  - git diff --check
errorCodes: []
tddMode: required
methodProfiles: [tdd-oracle-fidelity]
requiredTestCaseIds: ["test_git_0043_acc1", "test_git_0043_acc2", "test_git_0043_acc3"]
phaseTestCaseIds: ["test_git_0043_phase_frozen_runner"]
advisoryTestCaseIds: ["test_git_0043_advisory_latency"]
testContributions:
  - caseId: test_git_0043_acc1
    semanticKey: git_0043_both_rename_endpoints
    coversAcceptance: [ACC-1]
    coversImpactEdges: [cross-scope-rename-blocking]
    expectedRedPredicate: "cross-scope rename cannot pass scope membership when the old endpoint is outside the task scope."
    responsibility: task-required
    contractEdge: git_0043_delivery
    command: "node --strip-types tests/cli/git-rename-endpoint-parity.test.ts"
  - caseId: test_git_0043_acc2
    semanticKey: git_0043_foreign_deletion_protection
    coversAcceptance: [ACC-2]
    coversImpactEdges: [foreign-deletion-protection]
    expectedRedPredicate: "foreign deletion and rename endpoints remain visible to ownership and residue admission."
    responsibility: task-required
    contractEdge: git_0043_delivery
    command: "node --strip-types tests/cli/git-commit-task-scoped-staging.test.ts"
  - caseId: test_git_0043_acc3
    semanticKey: git_0043_no_new_gate
    coversAcceptance: [ACC-3]
    coversImpactEdges: [commit-hook-parity]
    expectedRedPredicate: "the fix preserves existing command count and does not add a new gate, ledger, or approval step."
    responsibility: task-required
    contractEdge: git_0043_delivery
    command: "node --strip-types tests/cli/commit-attribution-sealed-transaction.test.ts"
  - caseId: test_git_0043_phase_frozen_runner
    semanticKey: git_0043_frozen_runner
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [cross-scope-rename-blocking, commit-hook-parity]
    expectedRedPredicate: "the frozen runner matches source behavior for the rename matrix."
    responsibility: phase-suite
    contractEdge: git_0043_delivery
    command: "node atm.mjs doctor --json"
  - caseId: test_git_0043_advisory_latency
    semanticKey: git_0043_latency
    coversAcceptance: []
    coversImpactEdges: [commit-hook-parity]
    expectedRedPredicate: "record p50/p95 and Git subprocess count; unknown is acceptable when not measured."
    responsibility: advisory
    contractEdge: git_0043_delivery
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
    - source: packages/cli/src/commands/git-governance.ts
      disposition: inline
      inlineReason: "Reuse existing readers; do not add a generic rename abstraction unless GIT-0042 proves it is necessary."
createdByCommand: atm plan card create
---

# TASK-GIT-0043 Preserve both endpoints at staged rename scope boundaries

## Intent

若 GIT-0042 證明 scope、ownership 或 attribution reader 只看到 rename 的新路徑，
本卡以最小 in-place 修正讓需要判斷權限的邊界同時看見 old/new endpoint。目標是
阻止 cross-scope rename、foreign deletion 與 false-close；不是把所有 reader 強迫
改成新框架，也不是新增 gate。

## Acceptance

- [ ] ACC-1：cross-scope rename 的任一端超出 scope 時必須阻擋；同 scope rename、rename+modify 與合法不相交變更維持原行為。
- [ ] ACC-2：ownership、residue、claim 與 commit bundle 對 foreign deletion/rename 均保留可追溯端點，不得因舊路徑消失而誤放行。
- [ ] ACC-3：不新增 CLI、審批、ledger、常駐服務或平行索引；正常路徑的 gate 數量與命令介面不增加。

## Execution limits

只有 GIT-0042 的 oracle 明確指出缺口才可實作；先寫 red test，再做最小
修補，最多兩輪。若需要變更 shared public contract、schema、ErrorCode、
frozen runner 或超出 scope，立即停手另開卡。不得 raw Git mutation、
`--no-verify`、`--force`、修改 hook 腳本本體或覆蓋其他 agent WIP。

必須以 Git tree/index 作獨立 oracle，並在 source focused tests 後由既有
build lane 重跑一次 frozen runner。記錄 p50/p95、Git 子程序數、重試/build
次數及修復至提交分鐘數；不得以測試檔數或治理文件數宣稱改善。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-23T01:40:20.923Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"git-boundary-admission/tasks/TASK-GIT-0043-preserve-both-endpoints-at-staged-rename-scope-boundaries.task.md","contentDigest":"sha256:d83d1acd22bb25f9cf9270d18d4b1b25d3d11158ea735bc929b83bb4c24ef4d9"} -->
