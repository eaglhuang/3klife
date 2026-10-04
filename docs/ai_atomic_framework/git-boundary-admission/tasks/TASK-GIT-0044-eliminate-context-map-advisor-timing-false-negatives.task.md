---
task_id: TASK-GIT-0044
title: Eliminate context-map advisor timing false negatives
status: planned
owner: unassigned
priority: P0
depends_on: ["TASK-GIT-0040"]
causalGraph:
  causalDependencies: ["TASK-GIT-0040"]
  startConditions: ["Repeated execution of the staged-deletion advisor test demonstrates nondeterministic null output"]
  softRelations: ["TASK-GIT-0042"]
  changedPublicSeams: ["context-map-advisor-result-contract"]
  causalImpactEdges: ["advisor-false-negative", "staged-deletion-observability", "hook-determinism"]
  parallelFrontierInputs: ["disposable Git fixture", "existing advisor test"]
  validatorReferences: ["test_git_0044_acc1", "test_git_0044_acc2", "test_git_0044_acc3"]
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
  - git diff --check
errorCodes: []
tddMode: required
methodProfiles: [tdd-oracle-fidelity]
requiredTestCaseIds: ["test_git_0044_acc1", "test_git_0044_acc2", "test_git_0044_acc3"]
phaseTestCaseIds: ["test_git_0044_phase_hook"]
advisoryTestCaseIds: ["test_git_0044_advisory_latency"]
testContributions:
  - caseId: test_git_0044_acc1
    semanticKey: git_0044_deterministic_advisor
    coversAcceptance: [ACC-1]
    coversImpactEdges: [advisor-false-negative]
    expectedRedPredicate: "同一 staged deletion fixture 連續執行 20 次，每次都必須回傳相同 out-of-scope finding；不得因固定 50ms 牆導致 null。"
    responsibility: task-required
    contractEdge: git_0044_delivery
    command: "node --strip-types tests/cli/context-map-advisor-staged-deletion.test.ts"
  - caseId: test_git_0044_acc2
    semanticKey: git_0044_deletion_observability
    coversAcceptance: [ACC-2]
    coversImpactEdges: [staged-deletion-observability]
    expectedRedPredicate: "staged deletion、rename 與 empty index 的結果保持原有語義；不得用 timeout 代替錯誤分類。"
    responsibility: task-required
    contractEdge: git_0044_delivery
    command: "node --strip-types tests/cli/context-map-advisor-staged-deletion.test.ts"
  - caseId: test_git_0044_acc3
    semanticKey: git_0044_no_new_gate
    coversAcceptance: [ACC-3]
    coversImpactEdges: [hook-determinism]
    expectedRedPredicate: "效能量測只記錄 p50/p95，不新增阻擋 gate、重試服務或永久索引。"
    responsibility: task-required
    contractEdge: git_0044_delivery
    command: "node --strip-types tests/cli/context-map-advisor-staged-deletion.test.ts"
  - caseId: test_git_0044_phase_hook
    semanticKey: git_0044_phase_hook
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [advisor-false-negative, staged-deletion-observability]
    expectedRedPredicate: "正式 hook invocation 與 source advisor 在同一 fixture 上結果一致。"
    responsibility: phase-suite
    contractEdge: git_0044_delivery
    command: "node atm.mjs doctor --json"
  - caseId: test_git_0044_advisory_latency
    semanticKey: git_0044_latency
    coversAcceptance: []
    coversImpactEdges: [hook-determinism]
    expectedRedPredicate: "記錄 Git 子程序與 advisor p50/p95；若資料不足標 unknown。"
    responsibility: advisory
    contractEdge: git_0044_delivery
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
      inlineReason: "修正 false-negative 的 timeout policy；不抽新模組、不增加治理面。"
createdByCommand: atm plan card create
---

# TASK-GIT-0044 Eliminate context-map advisor timing false negatives

## Intent

GIT-0040 修正了 staged deletion filter，但 repeated execution 顯示 advisor
仍可能因固定 50ms wall-clock guard 回傳 `null`。在 Windows/Git process startup
波動下，這會把真實 out-of-scope 變更變成非確定性假綠。產品目標不是讓
advisor 永遠快於任意硬編碼毫秒，而是「不漏報且成本可量測」。本卡只修正
timeout 造成的 false negative，保留 advisory-only、不阻擋 commit 的既有契約。

## Acceptance

- [ ] ACC-1：同一 staged deletion fixture 連續至少 20 次，結果集合 100% 一致；不得因 50ms wall-clock 波動回傳 null。
- [ ] ACC-2：deletion、rename、empty index 與不存在檔案的既有語義保持不變；任何真正讀取錯誤不得被 timeout 偽裝成成功。
- [ ] ACC-3：不新增 CLI、gate、ledger、審核層、重試服務或永久快取；只記錄 p50/p95 與 subprocess 成本。

## Execution limits

先重現 0/1/0 的不穩定結果，再寫 red regression，最多兩輪修正。若需要
改 hook 本體、shared error contract 或 frozen runner，停手另開卡。不得
使用 `--no-verify`、`--force`、raw Git mutation 或覆蓋其他 agent WIP。

Focused test 通過後，才由既有 build lane 重跑正式入口；若性能成本增加，
必須以同機 ABAB p50/p95 揭露，不得只報正確率。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-23T01:42:52.000Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"git-boundary-admission/tasks/TASK-GIT-0044-eliminate-context-map-advisor-timing-false-negatives.task.md","contentDigest":"sha256:98f4e9a546e356e5d43ee5dad69bd0298f8ad4721b3ce57eb7bb111d517846ad"} -->
