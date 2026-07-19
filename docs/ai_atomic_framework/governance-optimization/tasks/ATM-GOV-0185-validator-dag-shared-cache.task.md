---
task_id: ATM-GOV-0185
title: Validator DAG、共享結果與安全 Cache
status: planned
owner: atm-core
priority: P0
depends_on:
  - ATM-GOV-0183
related_plan: docs/ai_atomic_framework/governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: wave validator 去重與證據 fan-out 是治理效能工作，沿用 ATM-GOV 家族 0185。
scopePaths:
  - packages/core/src/evidence/**
  - packages/cli/src/commands/evidence/**
  - scripts/run-validators/**
  - tests/cli/validator-dag-shared-cache.test.ts
deliverables:
  - validator DAG planner、sealed-input cache key 與 evidence fan-out
validators:
  - node --strip-types tests/cli/validator-dag-shared-cache.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: disable cache and revert-commit
errorCodes:
  - code: ATM_VALIDATOR_FAILED
    disposition: reuse
    trigger: command-backed validator 真正失敗
    registryOwnerTask: existing
atomizationImpact:
  ownerAtomOrMap: atm.validator-dag-cache
  mapUpdates: []
  extractionCandidates:
    - atom: atm.validator-dag-cache
      pattern: DAG Scheduler
      source: packages/core/src/evidence/
      disposition: extract
      inlineReason: null
waveId: auto-batch-perf-v2
surfaceFamily: validator
---

# ATM-GOV-0185 - Validator DAG、共享結果與安全 Cache

相同 sealed inputs 與完整 toolchain/env key 的 validator 每 wave 只跑一次並 fan-out。cache miss、unsafe cache 與 bypass 是正常 planner decision；只有命令實際失敗才重用 `ATM_VALIDATOR_FAILED`。
