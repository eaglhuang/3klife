---
task_id: TASK-GIT-0040
title: Make context-map advisor preserve staged deletion semantics
status: done
owner: unassigned
priority: P1
depends_on: ["TASK-GIT-0039"]
causalGraph:
  causalDependencies: ["TASK-GIT-0039"]
  startConditions: ["GIT-0039 reader parity baseline is available"]
  softRelations: []
  changedPublicSeams: ["context-map-staged-reader"]
  causalImpactEdges: ["git-context-map-deletion-awareness"]
  parallelFrontierInputs: ["disposable-git-fixture"]
  validatorReferences: ["test_git_0040_acc1", "test_git_0040_acc2"]
  phaseOwner: "git-boundary-admission"
related_plan: git-boundary-admission/git-boundary-admission-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/hook/context-map-advisor.ts
  - tests/cli/context-map-advisor-staged-deletion.test.ts
deliverables:
  - packages/cli/src/commands/hook/context-map-advisor.ts
  - tests/cli/context-map-advisor-staged-deletion.test.ts
validators:
  - node --strip-types tests/cli/context-map-advisor-staged-deletion.test.ts
errorCodes: []
tddMode: required
methodProfiles: [tdd-oracle-fidelity]
requiredTestCaseIds: ["test_git_0040_acc1", "test_git_0040_acc2"]
phaseTestCaseIds: ["test_git_0040_phase_hook"]
advisoryTestCaseIds: ["test_git_0040_advisory_latency"]
testContributions:
  - caseId: test_git_0040_acc1
    semanticKey: git_0040_deletion_visibility
    coversAcceptance: [ACC-1]
    coversImpactEdges: [git-context-map-deletion-awareness]
    expectedRedPredicate: "context-map advisor 對 staged deletion 不得因 ACMRT filter 而漏報。"
    responsibility: task-required
    contractEdge: git_0040_delivery
    command: "node --strip-types tests/cli/context-map-advisor-staged-deletion.test.ts"
  - caseId: test_git_0040_acc2
    semanticKey: git_0040_negative_control
    coversAcceptance: [ACC-2]
    coversImpactEdges: [git-context-map-deletion-awareness]
    expectedRedPredicate: "故意移除 D 後，fixture oracle 必須失敗；不得以 exit 0 取代 assertion。"
    responsibility: task-required
    contractEdge: git_0040_delivery
    command: "node --strip-types tests/cli/context-map-advisor-staged-deletion.test.ts"
  - caseId: test_git_0040_phase_hook
    semanticKey: git_0040_phase_hook
    coversAcceptance: [ACC-1]
    coversImpactEdges: [git-context-map-deletion-awareness]
    expectedRedPredicate: "正式 hook 入口與 source test 對相同 staged fixture 一致。"
    responsibility: phase-suite
    contractEdge: git_0040_delivery
    command: "node atm.mjs doctor --json"
  - caseId: test_git_0040_advisory_latency
    semanticKey: git_0040_latency
    coversAcceptance: []
    coversImpactEdges: [git-context-map-deletion-awareness]
    expectedRedPredicate: "記錄 advisor 讀取 p50/p95，不宣稱未量測的性能改善。"
    responsibility: advisory
    contractEdge: git_0040_delivery
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
    - source: packages/cli/src/commands/hook/context-map-advisor.ts
      disposition: inline
      inlineReason: "Single filter correction; extraction would add complexity without a replaceable boundary."
createdByCommand: atm plan card create
completed_at: "2026-09-22T23:20:07.193Z"
completed_by_agent: "codex-captain-20260923"
closedAt: "2026-09-22T23:20:07.193Z"
closedByActor: "codex-captain-20260923"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-22T23-20-07-193Z-close-3bcadc47dac2"
lastTransitionAt: "2026-09-22T23:20:07.193Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "1acd0786780717ba5dde0754d893278e03a372a9"
---

# TASK-GIT-0040 Make context-map advisor preserve staged deletion semantics

## Intent

修復 context-map advisor 對 staged deletion 的讀取缺口。這是 GIT-0039 盤點
後發現的另一個獨立 reader；不把它併入已 claim 的 commit/hook parity 卡，
避免 scope drift 與 false-close。只改既有 filter 與最小回歸測試，不新增 CLI、
gate、ledger、審核層或平行索引。

## Acceptance

- [ ] ACC-1：context-map advisor 讀取 deletion-only 與 rename fixture 時，輸出包含 Git staged 變更的完整語義。
- [ ] ACC-2：故意還原 ACMRT filter 時，`test_git_0040_acc1` 必須失敗；合法空 index 與不存在檔案不可被誤報為 deletion。

最多兩輪修正；source focused test 與正式入口一致後才可 close。記錄 p50/p95；未知就標 unknown。禁止 `--no-verify`、`--force`、直接改 hook、本卡以外檔案或順手重構。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-22T22:54:43.290Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"git-boundary-admission/tasks/TASK-GIT-0040-make-context-map-advisor-preserve-staged-deletion-semantics.task.md","contentDigest":"sha256:a4b145020e3c014219a9cb0cba0ffae6568b38e58bc2ac242c32eb4302d55bb9"} -->
