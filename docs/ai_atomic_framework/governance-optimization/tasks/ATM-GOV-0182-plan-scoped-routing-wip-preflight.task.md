---
task_id: ATM-GOV-0182
title: Plan-Scoped Routing、Identity 與 WIP Provenance Preflight
status: planned
owner: atm-core
priority: P0
depends_on: []
related_plan: docs/ai_atomic_framework/governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: governance-optimization 的 plan routing 與並行准入，沿用既有 ATM-GOV 家族；0182 經 planning 與 target audit 確認未占用。
scopePaths:
  - packages/cli/src/commands/next/**
  - packages/cli/src/commands/batch/**
  - packages/cli/src/commands/tasks/**
  - tests/cli/plan-scoped-routing-preflight.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
deliverables:
  - plan path/digest resolver 與 plan-scoped preflight
  - WIP provenance classification 與單一 recovery command
validators:
  - node --strip-types tests/cli/plan-scoped-routing-preflight.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
errorCodes:
  - code: ATM_NEXT_TASK_SCOPE_NOT_FOUND
    disposition: reuse
    trigger: plan 無法解析到合法未完成 cards
    retryable: true
    requiresHumanApproval: false
    recovery: node atm.mjs next --prompt "<current goal>" --json
    registryOwnerTask: existing
  - code: ATM_NEXT_ACTIVE_TASK_DIVERGENCE_BLOCKED
    disposition: reuse
    trigger: candidate code scope 與 foreign active WIP 相交
    retryable: true
    requiresHumanApproval: false
    recovery: node atm.mjs tasks status --json
    registryOwnerTask: existing
atomizationImpact:
  ownerAtomOrMap: atm.plan-scoped-routing-preflight
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.plan-scoped-routing-preflight
      pattern: Policy Object
      source: packages/cli/src/commands/batch/
      disposition: extract
      inlineReason: null
waveId: auto-batch-perf-v2
surfaceFamily: plan-routing
---

# ATM-GOV-0182 - Plan-Scoped Routing、Identity 與 WIP Provenance Preflight

精確解析 2.0 plan 的未完成 cards、coordinator identity/lane 與 WIP provenance；done/abandoned 不重入，stale generated receipts 不冒充 active blocker。

ErrorCode 必須先經 `atm-error-code-resolver` 查 registry；本卡只重用既有 routing codes，不建立私有码。驗收涵蓋 plan path、actor mismatch、foreign active、stale generated receipt、unrelated dirty files，以及 `next` 與 `execute-plan --dry-run` 結論一致。
