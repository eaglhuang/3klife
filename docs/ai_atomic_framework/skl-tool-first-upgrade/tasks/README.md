---
doc_id: doc_skl_index_tasks_0001
owner: atm-core
status: active
related_plan: docs/ai_atomic_framework/skl-tool-first-upgrade/SKL-tool-first-upgrade-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
public_tracking: false
created_at: 2026-06-23
last_updated: 2026-06-23T16:45+08:00
---

# SKL Tool-First Task Index

Related plan: [../SKL-tool-first-upgrade-plan.md](../SKL-tool-first-upgrade-plan.md)
Verified facts: [../00-verified-facts.md](../00-verified-facts.md)

## Task Card Contract

每張 `TASK-SKL-*` 卡都遵守 ATM task-card authoring contract：

- 必須有 machine-readable frontmatter；
- `planning_repo` 持有意圖與規劃權；
- `target_repo` 持有 execution source-write 權；
- `scopePaths`、`deliverables`、`validators`、`rollback`、`atomizationImpact` 在實作前就要明列；
- planning-only 卡不得直接視為 `AI-Atomic-Framework` source delivery 授權。

## Task Pack

| Task ID | Stage | Planned Title | Status | Depends | Target |
|---|---|---|---|---|---|
| [TASK-SKL-0001](./TASK-SKL-0001-skl-tool-first-plan-and-task-pack.task.md) | P0 | SKL tool-first plan and task pack | planned | none | planning docs / 3KLife |
| [TASK-SKL-0002](./TASK-SKL-0002-tool-bridge-v1-schema-and-result-adapter.task.md) | P1 | Tool Bridge v1 schema and result adapter | planned | `TASK-SKL-0001` | ATM tool bridge |
| [TASK-SKL-0003](./TASK-SKL-0003-next-claim-framework-mode-tools.task.md) | P1 | Next, claim, and framework-mode tools | planned | `TASK-SKL-0001`, `TASK-SKL-0002` | ATM CLI / governance entry |
| [TASK-SKL-0004](./TASK-SKL-0004-evidence-guard-taskflow-governed-commit-tools.task.md) | P1 | Evidence, guard, taskflow, and governed commit tools | planned | `TASK-SKL-0001`, `TASK-SKL-0002` | ATM operators |
| [TASK-SKL-0005](./TASK-SKL-0005-skill-tool-first-orchestration-migration.task.md) | P2 | Skill tool-first orchestration migration | planned | `TASK-SKL-0002`, `TASK-SKL-0003`, `TASK-SKL-0004` | ATM skills / integrations |
| [TASK-SKL-0006](./TASK-SKL-0006-governed-commit-and-close-lane-hardening.task.md) | P3 | Governed commit and close lane hardening | planned | `TASK-SKL-0003`, `TASK-SKL-0004`, `TASK-SKL-0005` | ATM close/commit safety |

## Sequencing Note

1. `TASK-SKL-0001` 是 planning-only opener，負責建立 plan、index 與 execution pack。
2. `TASK-SKL-0002` 先定義共同 tool result contract，避免各 tool 自行發明 shape。
3. `TASK-SKL-0003` 與 `TASK-SKL-0004` 分別實作 routing/claim lane 與 operator lane。
4. `TASK-SKL-0005` 把現有 skill 遷移到 tool-first orchestration，保留 CLI fallback。
5. `TASK-SKL-0006` 最後用真實 residue / active-claim / cross-repo 邊界收尾 hardening。

## Completion Gate

- tool result shape 在主要治理 surface 上一致；
- `nextAction / userNotice / runnerMode / messages` 可被 skill 直接消費；
- `taskflow`、`close`、`commit` lane 的 blocker 有 machine-readable 診斷；
- tool-first path 與 CLI fallback 共存，但不形成第二套治理模型。
