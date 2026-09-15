---
task_id: TASK-PRF-0109
title: Defer full framework status from normal next guidance
status: done
owner: atm-performance
priority: P1
depends_on: []
causalGraph:
  causalDependencies: [TASK-PRF-0102]
  startConditions:
    - "Fresh profiling shows build-governance-readiness is materially slower for framework prompts than ordinary task prompts."
    - "Framework claim and guard commands remain available as the authoritative full-status boundary."
  softRelations: [TASK-PRF-0103, TASK-PRF-0106]
  changedPublicSeams: [next-governance-readiness]
  causalImpactEdges: [governance-readiness-process-startup, multi-ai-private-read-parallelism]
  parallelFrontierInputs: [TASK-PRF-0102]
  validatorReferences: [next-governance-readiness-latency, next-governance-readiness-safety]
  phaseOwner: product-proof
related_plan: atm-product-proof/atm-convergence-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/next/governance-readiness.ts
  - packages/cli/src/commands/next/playbook-projection/governance-readiness.ts
  - packages/cli/src/commands/next/prompt-results.ts
  - packages/cli/src/commands/next/__tests__/active-work-summary.spec.ts
  - tests/cli/next-playbook-projection-contracts.test.ts
  - tests/cli/next-governance-readiness-latency.test.ts
  - docs/reports/atm-command-gate-latency-score.md
deliverables:
  - "Two-tier readiness path: lightweight normal-next guidance and full framework status only at claim/guard/close boundaries."
  - "Regression coverage proving framework claim hints, safety blockers, and multi-AI private-read classifications are unchanged."
  - "External AB/BA plus A/A latency receipt and report update with command, runner, Node, cache, p50, p95, cumulative ms, and outcome states."
  - "Raw runtime evidence retained outside Git history; no secrets or absolute machine paths committed."
validators:
  - "node --strip-types tests/cli/next-governance-readiness-latency.test.ts"
  - "node --strip-types tests/cli/next-playbook-projection-contracts.test.ts"
  - "node --strip-types packages/cli/src/commands/next/__tests__/active-work-summary.spec.ts"
  - "npm run typecheck -- --pretty false"
errorCodes: []
createdByCommand: atm plan card create
testContributions:
  - caseId: test_task_prf0109_readiness_safety_4c2d8e91
    targetGroupId: null
    semanticKey: next_governance_readiness_safety
    coversAcceptance: [ACC-1, ACC-2, ACC-4]
    coversImpactEdges: [governance-readiness-process-startup, multi-ai-private-read-parallelism]
    expectedRedPredicate: "Normal next guidance loses a required framework-claim hint, or claim/guard safety semantics change."
    responsibility: task-required
    dependencyEdge: governance-readiness-process-startup
    contractEdge: next-governance-readiness
    resourceKey: readiness-safety
  - caseId: test_task_prf0109_latency_receipt_7f14a6bc
    targetGroupId: null
    semanticKey: next_governance_readiness_latency_receipt
    coversAcceptance: [ACC-3, ACC-5]
    coversImpactEdges: [governance-readiness-process-startup]
    expectedRedPredicate: "Latency receipt lacks AB/BA or A/A controls, or misses p50/p95/cumulative millisecond evidence."
    responsibility: task-required
    dependencyEdge: governance-readiness-process-startup
    contractEdge: external-receipt-boundary
    resourceKey: external-receipt
requiredTestCaseIds:
  - test_task_prf0109_readiness_safety_4c2d8e91
  - test_task_prf0109_latency_receipt_7f14a6bc
tddMode: required
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert only the readiness deferral; retain the latency receipt and failed measurements."
atomizationImpact:
  ownerAtomOrMap: atm-cli-command-router
  mapUpdates: []
  extractionCandidates:
    - atom: atm.cli.next.governance-readiness
      pattern: Policy Object
      disposition: inline
      inlineReason: "This is a timing boundary in an existing projection; no new atom or registry is justified."
completed_at: "2026-09-15T01:06:50.569Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-09-15T01:06:50.569Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-15T01-06-50-569Z-close-978a6df195f3"
lastTransitionAt: "2026-09-15T01:06:50.569Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "9c59bee27467e7ed60529dbab5392b77b1ca241a"
---

# TASK-PRF-0109 Defer full framework status from normal next guidance

## Intent

`next` 目前在框架語意的 prompt 上，為了產生提示文字而每次重建完整
`createFrameworkModeStatus()`；實測 `build-governance-readiness` 約 4.0–4.2 秒，
一般 task prompt 約 1.1 秒。這張卡只把完整檢查延後到真正需要安全裁決的 claim、
guard、close 或 commit 邊界，讓多 AI 的 private read 保持並行，不改變 shared-write
仲裁與 fail-closed 語義。

## Acceptance

- [ ] ACC-1：普通 `next` guidance 不再無條件執行完整 framework status；輸出的 readiness
      仍明確告知需要 claim 的情境，且 claim／guard 路徑仍執行完整 status。
- [ ] ACC-2：framework critical files、stale lock、pinned runner、Git worktree 等
      blocker 的判定與既有結果一致；multi-AI private-read、foreign dirty ownership
      與 shared-index 分類不變。
- [ ] ACC-3：固定 runner／Node／cache／prompt fixture 至少 30 組 AB/BA，另有 A/A
      noise control；候選 p50 至少降低 20%，p95 不得回歸超過 10%。
- [ ] ACC-4：不得新增 ATM command、gate、registry、daemon、database、第二狀態來源或
      跨程序 cache；改動必須是一個可 revert 的既有 projection boundary。
- [ ] ACC-5：外部 receipt 記錄每次毫秒值、runner/Node/cache、結果、失敗與重試；
      raw runtime evidence 留在 `atm-benchmark-sink`，不進 Git history。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T23:21:52.956Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0109-defer-full-framework-status-from-normal-next-guidance.task.md","contentDigest":"sha256:f664849a1aec0d2e0b1c7e3fffa775690504f775d391f7e500d4714792b77463"} -->
