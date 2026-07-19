---
task_id: ATM-GOV-0184
title: Real Team Wave Worker Executor
status: planned
owner: atm-core
priority: P0
depends_on:
  - ATM-GOV-0183
related_plan: docs/ai_atomic_framework/governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: Team Wave 正式執行仍屬 auto-batch governance，沿用 ATM-GOV 家族 0184。
scopePaths:
  - packages/core/src/team-agents/**
  - packages/cli/src/commands/team/**
  - packages/cli/src/commands/batch/**
  - tests/cli/real-team-wave-worker-executor.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli-team.json
deliverables:
  - provider/editor worker executor 與 atm.teamWorkerReport.v1 ingestion
  - per-task lane heartbeat/sweep、retry 與 coordinator authority guard
validators:
  - node --strip-types tests/cli/real-team-wave-worker-executor.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: force serial fallback and revert-commit
errorCodes:
  - code: ATM_TEAM_RUN_INVALID
    disposition: reuse
    trigger: worker report schema 或 run binding 無效
    registryOwnerTask: existing
  - code: ATM_TEAM_WRITE_SCOPE_OUT_OF_BOUNDS
    disposition: reuse
    trigger: worker report 包含 claim scope 外修改
    registryOwnerTask: existing
  - code: ATM_TEAM_LEASE_CONFLICT
    disposition: reuse
    trigger: worker lane lease 與 active owner 衝突
    registryOwnerTask: existing
atomizationImpact:
  ownerAtomOrMap: atm.team-wave-worker-executor
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli-team.json
  extractionCandidates:
    - atom: atm.team-wave-worker-executor
      pattern: Strategy
      source: packages/cli/src/commands/team/
      disposition: extract
      inlineReason: null
waveId: auto-batch-perf-v2
surfaceFamily: team-wave
---

# ATM-GOV-0184 - Real Team Wave Worker Executor

真正啟動或接收 Team workers；每卡永久綁定 lane，worker 只回傳 scope-bounded patch/report/evidence，commit、checkpoint 與 close 只屬 coordinator。

本卡只重用既有 Team ErrorCodes；`partial`、`needs-review` 與 one-member fallback 是狀態，不建立新碼。focused tests 必須驗證 structured details 與安全復原路徑。
