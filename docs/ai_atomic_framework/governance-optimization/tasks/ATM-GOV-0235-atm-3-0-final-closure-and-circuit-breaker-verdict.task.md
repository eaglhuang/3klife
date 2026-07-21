---
task_id: ATM-GOV-0235
title: ATM 3.0 final closure and circuit breaker verdict
status: planned
owner: atm-governance
priority: P0
milestone: ATM-3.0-F
severity: P0
depends_on:
  - ATM-GOV-0234
  - ATM-GOV-0232
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns final cross-plan closure, rollout policy and evidence-bound verdict."
scopePaths:
  - "docs/governance/atm-bug-and-optimization-backlog.md"
  - "docs/governance/atm-3-replay-evidence.md"
  - "packages/cli/src/commands/broker/parallel-admission/**"
  - "tests/cli/atm-3-final-closure.test.ts"
  - "tests/cli/parallel-admission-circuit-breaker.test.ts"
deliverables:
  - "docs/governance/atm-bug-and-optimization-backlog.md"
  - "docs/governance/atm-3-replay-evidence.md"
  - "packages/cli/src/commands/broker/parallel-admission/**"
  - "tests/cli/atm-3-final-closure.test.ts"
  - "tests/cli/parallel-admission-circuit-breaker.test.ts"
validators:
  - "node --strip-types tests/cli/atm-3-final-closure.test.ts"
  - "node --strip-types tests/cli/parallel-admission-circuit-breaker.test.ts"
  - "npm run validate:cli"
  - "npm run validate:schemas"
  - "npm run typecheck"
  - "git diff --check"
errorCodes:
  - "ATM_EVIDENCE_SEAL_REQUIRED"
  - "ATM_BROKER_STATE_DIVERGENCE"
createdByCommand: atm plan card create
evidence:
  required: sealed-cross-plan
producer:
  - "ATM 3.0 closure verdict and Plan 2.2 inherited-acceptance disposition."
consumer:
  - "Project owner and future ATM rollout plans."
missingData:
  - "Any failed or unavailable replay cell keeps the plan open; there is no fixture waiver."
dataDrivenStopRule:
  - "Do not close if any inherited acceptance is open, any correctness counter is nonzero, observed coverage is below 100 percent, or replay evidence is not real multiprocess."
  - "Do not reset circuit breaker without a newer passing evidence digest."
out_of_scope:
  - "No new product implementation beyond minimal verdict/circuit-breaker wiring discovered by final integration."
  - "No rewriting Plan 2.2 history."
rollback:
  strategy: remain-open-and-queue-only
  notes: "On any failure keep ATM 3.0 active, trip queue-only, preserve evidence and emit exact failing cells plus recovery manifests."
atomizationImpact:
  ownerAtomOrMap: "atm.governance.closure"
  mapUpdates: []
  extractionCandidates: []
---

# ATM-GOV-0235 ATM 3.0 final closure and circuit breaker verdict

## Intent

以新的真實 replay 證據決定是否完成 ATM 3.0，並同時處置 Plan 2.2 尚未滿足的驗收。功能存在但 evidence 不足仍不得關閉。

## Required Work

- 重跑 divergence census、runner parity、release/adopter projection、rollback 與 backlog reconciliation。
- 驗證 healthy replay 沒有非注入 trip 或 queue-only residency；故障演練能自動 trip `queue-only`，reset 綁定較新的 passing digest，並封存 trip reason 與 recovery latency。
- 對每個 2.2 inherited acceptance 記錄 terminal disposition 與證據。
- 任一失敗輸出精確 cell、authority generation、recovery manifests 與 next action。

## Acceptance

- [ ] 0226 所有 divergence terminal，active stale authorization 為 0。
- [ ] 0234 真多行程與 paired evidence 有效，correctness 七項均為 0、coverage 100%。
- [ ] source/frozen/release/adopter parity 與 rollback drill 通過。
- [ ] healthy replay 的 `unexpectedBreakerTripCount = 0`、`timeInQueueOnlyRatio = 0`；trip/reset 演練通過，reset 引用新的 passing digest。
- [ ] 所有 2.2 未完成驗收有 terminal disposition；有任何 open 則本卡不得 close。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-21T01:22:48.696Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0235-atm-3-0-final-closure-and-circuit-breaker-verdict.task.md","contentDigest":"sha256:9908d53ea8eb46227ac7e31a0bcb5a2c60ae619bc4862c508b47afdc4407d6ee"} -->
