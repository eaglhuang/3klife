---
task_id: ATM-GOV-0328
title: Eliminate test facade timing-margin flake with measured policy
status: done
owner: atm-validator-runtime
priority: P0
depends_on: [ATM-GOV-0325]
causalGraph:
  causalDependencies: [ATM-GOV-0325]
  startConditions:
    - The three-commit functional-versus-timing lineage is sealed.
    - The performance test environment and sample stopping rule are declared before code changes.
  softRelations: [ATM-GOV-0329]
  changedPublicSeams: [atm.validatorTimeoutPolicy.v1, atm.validatorRunSummary.v1]
  causalImpactEdges: [facade-determinism, timeout-fail-closed, validator-performance-policy]
  parallelFrontierInputs: [timing-samples, validators-config, facade-smoke]
  validatorReferences: [validate-test-facade, validate-skew-matrix, validate-validator-envelope]
  phaseOwner: correction-wave-3-performance
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo_plus_planning_closeback
scopePaths:
  - scripts/validate-test-facade.ts
  - scripts/validate-skew-matrix.ts
  - scripts/validators.config.json
  - scripts/run-validators/implementation.ts
  - tests/skew/skew-matrix.test.ts
  - docs/governance/atm-bug-and-optimization-backlog.items/
deliverables:
  - scripts/validate-test-facade.ts
  - scripts/validators.config.json
  - tests/cli/test-facade-timeout-policy.test.ts
  - docs/reports/test-facade-performance-margin.json
validators:
  - node --strip-types tests/cli/test-facade-timeout-policy.test.ts
  - npm run validate:test-facade
  - node --strip-types scripts/run-validators.ts standard --filter validate-skew-matrix --json
testContributions:
  - caseId: test_facade_timeout_policy_single_source_0328
    semanticKey: facade_timeout_policy_single_source
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [facade-determinism, timeout-fail-closed, validator-performance-policy]
    expectedRedPredicate: a 120-second embedded smoke timeout or retry-to-green fails the policy test
    responsibility: task-required
    contractEdge: atm.validatorTimeoutPolicy.v1
  - caseId: test_facade_loaded_margin_stability_0328
    semanticKey: facade_loaded_margin_stability
    coversAcceptance: [ACC-4, ACC-5]
    coversImpactEdges: [facade-determinism, timeout-fail-closed]
    expectedRedPredicate: any declared cold warm or loaded sample times out or leaves an orphan child
    responsibility: task-required
    contractEdge: atm.validatorRunSummary.v1
requiredTestCaseIds: [test_facade_timeout_policy_single_source_0328, test_facade_loaded_margin_stability_0328]
phaseTestCaseIds: [test_group_plan4_performance-resilience-ratchet]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [tdd-oracle-fidelity, expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-timeout-policy-and-retain-red-timing-fixtures
atomizationImpact:
  ownerAtomOrMap: atm.validator-runner
  mapUpdates: []
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-08-09T16:01:50.322Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-08-09T16:01:50.322Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-09T16-01-50-322Z-close-653df36f6456"
lastTransitionAt: "2026-08-09T16:01:50.322Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "0ffcff9bc0a00b333b016d1639756293d7bda1f7"
---

# ATM-GOV-0328 Eliminate test facade timing-margin flake with measured policy

## Intent

消除 façade 測試以真實兩分鐘 release validator 當單元 smoke、且內嵌 120 秒常數造成的負載 flake。第一性原理是 façade 測介面語意，slow/release profile 測真實成本；兩者共享一個可觀測 timeout policy，timeout 永遠 fail-closed。

## Acceptance

- [ ] ACC-1: 先登錄 ATM backlog item shard 與 incident-learning candidate；記錄 110.2/113.6/118.6 秒為歷史觀測，不冒充新樣本。
- [ ] ACC-2: cold/warm/loaded 量測輸出 N、停止規則、p50/p95/max、host load、exit、timedOut、digest；timeout 決策由資料與 config 產生，不再由 façade 私有常數決定。
- [ ] ACC-3: 快速 deterministic fixture 驗證 filter、performance-output、budget violation、resource profile 與 timeout envelope；真實 skew matrix 由 slow/release integration profile 負責。
- [ ] ACC-4: 所有事前宣告樣本均無 timeout、orphan、silent retry 或 retry-to-green；任何 timeout 仍 exit non-zero 並保留 partial summary。
- [ ] ACC-5: `a548eb381` 的 hash-placeholder red/green regression 保持獨立，不被 timing 修復覆蓋。

## Dispatch and stop rules

不得只把 120000 改成任意更大數字。先寫 bound red case，再選「降低成本、fixture seam、profile 調整、量測式 timeout」中最小且通用的方案。若樣本受 foreign load 汙染，封存為 unavailable 並重開乾淨 window，不得挑綠樣本。報告必附分布、policy source、TDD lineage、orphan check、backlog ID 與 rollback。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-09T07:22:34.981Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0328-eliminate-test-facade-timing-margin-flake-with-measured-policy.task.md","contentDigest":"sha256:defe7c816790e0ec990dae2bc7cf3e26d27876fff91dd33c62ff33f571910eb7"} -->
