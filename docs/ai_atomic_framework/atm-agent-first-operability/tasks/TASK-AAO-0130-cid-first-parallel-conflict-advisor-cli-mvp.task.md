---
doc_id: ""
task_id: TASK-AAO-0130
title: "CID-first parallel conflict advisor CLI MVP"
milestone: M17
status: open
artifact_status: draft
runtime_status: n/a
upstream_mutation_status: not-applied
created: "2026-06-05"
created_by_agent: codex-gpt-5.4-mini
started_at: ""
started_by_agent: ""
blocked_by: []
owner: atm-core
priority: P0
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:task-ledger-governance
public_tracking: false
executionMode: phase0-cid-first-parallel-conflict-advisor-cli-mvp
planning_repo: 3KLife
closure_authority: target_repo
related:
  - TASK-CID-0005
  - TASK-AAO-0128
  - TASK-AAO-0129
depends:
  - TASK-CID-0005
allowed_files:
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/command-specs/tasks.spec.ts
  - C:/Users/User/AI-Atomic-Framework/atomic_workbench/atomization-coverage/path-to-atom-map.json
  - C:/Users/User/AI-Atomic-Framework/scripts/validate-task-parallel-advisor.ts
forbidden_files:
  - C:/Users/User/AI-Atomic-Framework/.atm/history/**
  - C:/Users/User/AI-Atomic-Framework/release/**
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/next.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/batch.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/hook.ts
non_goals:
  - "Do not touch AI-Atomic-Framework source in Phase 0."
  - "Do not create a tasks-cid ledger or shard."
  - "Do not build a second scheduler."
  - "Do not add claim / lock mutator behavior."
  - "Do not fold release runner sync into this card."
  - "Do not widen the card beyond read-only advisor planning."
notes: "2026-06-05 | status: open | validation: pending | change: Phase 0 open card for CID-first parallel conflict advisor CLI MVP | blocker: none"
---

# TASK-AAO-0130 CID-first parallel conflict advisor CLI MVP

## 目標
開立 AI-Atomic-Framework 的 target_repo 實作卡，定義 read-only 的 `tasks parallel` advisor contract。
這張卡只做 3KLife Phase 0 開卡，不碰 AI-Atomic-Framework source。

## 背景
TASK-CID-0005 已把 P0 合約說清楚：ATM 要先用 atom_id / atom_cid 判斷語意衝突，再把 physical file overlap 視為包裝限制。
這張 AAO 卡是 target_repo 的實作卡，用來落地 CID-first parallel conflict advisor CLI MVP，不是第二套 scheduler，也不是 claim / lock mutator。

## Phase 0 Scope
- 只更新這張 3KLife planning card 與 `docs/tasks/tasks-aao.json`。
- 不新增 tasks-cid ledger / shard。
- 不觸碰 `C:/Users/User/AI-Atomic-Framework/**`。
- 不把 CLI 寫成 scheduler、claim mutator 或 lock mutator。

## Phase 1 Candidate Allowed Files
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/command-specs/tasks.spec.ts`
- `C:/Users/User/AI-Atomic-Framework/atomic_workbench/atomization-coverage/path-to-atom-map.json`
- `C:/Users/User/AI-Atomic-Framework/scripts/validate-task-parallel-advisor.ts`

### Conditional secondary surfaces
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/task-direction.ts` only if the implementation needs scope-partition reuse.
- `C:/Users/User/AI-Atomic-Framework/scripts/validate-cli.ts` only if CLI registry wiring needs a validator touch.

## Phase 1 Forbidden Surfaces
- `C:/Users/User/AI-Atomic-Framework/.atm/history/**`
- `C:/Users/User/AI-Atomic-Framework/release/**`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/next.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/batch.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/hook.ts`

## CLI Contract
- ATM CLI: tasks parallel --task <id> --with <id> --json
- ATM CLI: tasks parallel --task <id> --queue --json
- ATM CLI: tasks parallel --queue --report --json

## Verdicts
- `parallel-safe`
- `blocked-cid-conflict`
- `needs-physical-split`
- `blocked-shared-generator`
- `blocked-shared-validator`
- `blocked-shared-projection`
- `blocked-shared-artifact`
- `blocked-active-lease`
- `insufficient-atom-map`

## Report Fields
- overlapping files / scripts
- overlapping atom_id
- overlapping atom_cid
- shared generator / projection / registry / index
- shared validator
- shared output artifact
- active lease / direction lock conflicts
- hotspot report: which scripts / atoms most often collide, with split priorities

## Validators
### Phase 0 Planning Validators
- `node tools_node/check-encoding-touched.js --files <touched>`
- `git diff --check`

### Phase 1 AAF Validators
- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-task-parallel-advisor.ts`

## Plain-language Anchor
This card opens the planning lane for a parallel conflict advisor.
It helps Captain decide whether two tasks can run together, but it does not itself schedule, claim, or lock work.
