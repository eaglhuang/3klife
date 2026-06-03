---
doc_id: doc_team_0018
task_id: TASK-TEAM-0018
title: "Team lease fencing and deadlock contract"
status: draft
owner: atm-core
priority: P0
milestone: M5H
depends_on:
  - "TASK-TEAM-0011"
  - "TASK-TEAM-0012"
  - "TASK-TEAM-0013"
related_plan: "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/command-specs/team.spec.ts"
  - "packages/core/src/governance/scope-lock.ts"
  - "packages/plugin-governance-local/src/stores.ts"
  - "scripts/validate-team-agents.ts"
  - "scripts/validate-governance-local.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "Team permission leases carry a monotonic fencing token such as leaseEpoch."
  - "Team lease transfer/release rejects stale holders and stale epochs."
  - "Team planning exposes a wait-for graph diagnostic and rejects direct cycles."
  - "Released tombstone coverage proves re-acquire after release cannot resurrect stale ownership."
  - "scripts/validate-team-agents.ts contains a fencing/deadlock case."
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json maps any new helper paths."
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-team-agents.ts --case fencing-deadlock"
  - "node --strip-types scripts/validate-governance-local.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert team lease fencing helpers, validator cases, and atom map entries. Do not hand-edit .atm/runtime/** tombstones."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-runtime"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "Any new scheduler/fencing helper must be mapped under the Team Agents runtime atom/map."
outOfScope:
  - "Subagent spawning"
  - "Pre-tool or pre-commit enforcement"
  - "Symbol-scope lease enforcement before Atomization Planner provides symbol inventory"
  - "Manual edits under .atm/runtime/** or .atm/history/**"
nonGoals:
  - "Do not make Team Agents a second task scheduler"
  - "Do not let leases override task allowedFiles"
  - "Do not replace ATM scope locks or taskDirectionLock"
---
# TASK-TEAM-0018 — Team lease fencing and deadlock contract

## Goal

把 CID Hardening v2 的 E2 concurrency hardening 接進 Team Agents：team lease 必須能抵抗 stale holder、transfer race、簡單 deadlock，並且把這些能力明確標成新實作。

## Why

目前 Team Agents 已規劃 permission lease、runtime state、`file.write` scope validator；ATM framework 也已有 lock record、heartbeat、TTL、taskDirectionLock 與 released tombstone 基礎。但現況尚未實作 `leaseEpoch`、fencing token、wait-for graph、cycle detection 或 symbol-scope lease。若 Team Agents 要真的支援多代理並行，M5 必須補上這層硬化，否則 `file.write` 唯一 owner 仍可能被 stale run 誤用。

## Implementation Contract

1. 在 team runtime permission lease 中加入 monotonic fencing token，例如 `leaseEpoch`。
2. `team lease` / `team release` / `team status` 必須顯示目前 epoch，並拒絕 stale epoch 的 release 或 transfer。
3. 新增 wait-for graph diagnostic：同一 team run 內若 lease dependency 出現直接 cycle，validator 回報 fail。
4. 擴充 released tombstone 測試：release 後重新 acquire 必須覆寫舊 active owner，且舊 holder 不可再成功釋放或轉交。
5. `file.write` lease 仍必須是 task allowedFiles 子集；fencing token 不能放寬 allowedFiles。

## Acceptance Criteria

- Duplicate exclusive owner 仍 fail。
- Stale epoch release / transfer fail，並回傳 agentId、permission、expectedEpoch、actualEpoch。
- Wait-for graph direct cycle fail；acyclic dependency pass。
- Released tombstone re-acquire path 有明確測試，不只測 `released: true`。
- No source path outside task allowedFiles can be authorized through Team lease.

## Validators

```
npm run typecheck
npm run validate:cli
node --strip-types scripts/validate-team-agents.ts --case fencing-deadlock
node --strip-types scripts/validate-governance-local.ts
git diff --check
```

## Stop Conditions

- 若實作需要新增 long-lived scheduler service，先停下來回 Captain decision；本卡只允許 CLI/runtime helper 級別的 deterministic validator。
- 若 symbol-scope lease 需要 AST/symbol inventory，先只輸出 advisory finding，正式 enforcement 留給後續 Atomization Planner 任務。
