---
task_id: TASK-GIT-0041
title: Preserve staged deletion semantics in encoding guard
status: done
owner: unassigned
priority: P2
depends_on: ["TASK-GIT-0040"]
causalGraph:
  causalDependencies: ["TASK-GIT-0040"]
  startConditions: ["GIT-0040 staged-reader parity is closed"]
  softRelations: []
  changedPublicSeams: ["encoding-guard-staged-file-set"]
  causalImpactEdges: ["git-staged-deletion-discovery", "encoding-guard-safety"]
  parallelFrontierInputs: ["disposable-git-fixture", "encoding-guard-script"]
  validatorReferences: ["test_git_0041_acc1", "test_git_0041_acc2"]
  phaseOwner: "git-boundary-admission"
related_plan: git-boundary-admission/git-boundary-admission-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/check-encoding-touched.ts
  - tests/cli/check-encoding-staged-deletion.test.ts
deliverables:
  - scripts/check-encoding-touched.ts
  - tests/cli/check-encoding-staged-deletion.test.ts
validators:
  - node --strip-types tests/cli/check-encoding-staged-deletion.test.ts
requiredTestCaseIds: ["test_git_0041_acc1", "test_git_0041_acc2"]
phaseTestCaseIds: ["test_git_0041_phase_encoding"]
advisoryTestCaseIds: ["test_git_0041_advisory_latency"]
tddMode: required
methodProfiles: [tdd-oracle-fidelity]
testContributions:
  - caseId: test_git_0041_acc1
    semanticKey: git_0041_staged_deletion_discovery
    coversAcceptance: [ACC-1]
    coversImpactEdges: [git-staged-deletion-discovery]
    expectedRedPredicate: "staged deletion of a text file is included in the encoding guard input set."
    responsibility: task-required
    contractEdge: git_0041_delivery
    command: "node --strip-types tests/cli/check-encoding-staged-deletion.test.ts"
  - caseId: test_git_0041_acc2
    semanticKey: git_0041_missing_path_safety
    coversAcceptance: [ACC-2]
    coversImpactEdges: [encoding-guard-safety]
    expectedRedPredicate: "the guard must skip or classify a deleted path safely; it must not report a missing-file crash as a clean pass."
    responsibility: task-required
    contractEdge: git_0041_delivery
    command: "node --strip-types tests/cli/check-encoding-staged-deletion.test.ts"
  - caseId: test_git_0041_phase_encoding
    semanticKey: git_0041_phase_encoding
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [git-staged-deletion-discovery, encoding-guard-safety]
    expectedRedPredicate: "the formal staged encoding guard and source fixture agree."
    responsibility: phase-suite
    contractEdge: git_0041_delivery
    command: "node atm.mjs doctor --json"
  - caseId: test_git_0041_advisory_latency
    semanticKey: git_0041_latency
    coversAcceptance: []
    coversImpactEdges: [git-staged-deletion-discovery]
    expectedRedPredicate: "record p50/p95 guard latency; unknown is acceptable when not measured."
    responsibility: advisory
    contractEdge: git_0041_delivery
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
    - source: scripts/check-encoding-touched.ts
      disposition: inline
      inlineReason: "The defect is one staged-file filter and missing-path contract; extraction would add a new boundary without reducing complexity."
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-GIT-0041 Preserve staged deletion semantics in encoding guard

## Intent

修復 encoding guard 在 `--mode staged` 下使用不含 `D` 的 Git filter，並明確驗證
刪除的文字檔不存在於工作樹時，guard 仍能安全處理。只改既有腳本與最小回歸
fixture，不新增 CLI、gate、ledger、審核層或平行索引。

## Acceptance

- [ ] ACC-1：staged deletion 的文字檔會進入 guard 的候選集合；故意移除 `D` 時測試必須失敗。
- [ ] ACC-2：deleted path 的內容檢查不因不存在檔案而假綠或未分類退出；合法空 index 仍通過。

最多兩輪修正；source focused test 與正式 staged guard 入口一致後才可 close。記錄
p50/p95；未知就標 unknown。禁止 `--no-verify`、直接修改 hook、擴大 scope 或順手重構。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-22T23:21:25.974Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"git-boundary-admission/tasks/TASK-GIT-0041-preserve-staged-deletion-semantics-in-encoding-guard.task.md","contentDigest":"sha256:f9485b9879076f84403a1822768312aaa1dfb909fd6b270ab723f9aa78ec2024"} -->
