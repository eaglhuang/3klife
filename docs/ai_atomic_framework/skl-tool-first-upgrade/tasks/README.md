---
doc_id: doc_skl_index_tasks_0001
owner: atm-core
status: active
related_plan: docs/ai_atomic_framework/skl-tool-first-upgrade/SKL-tool-first-upgrade-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
public_tracking: false
created_at: 2026-06-23
last_updated: 2026-06-23T22:15+08:00
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
| [TASK-SKL-0007](./TASK-SKL-0007-shared-skill-growth-contract-and-learning-loop.task.md) | P2 | Shared skill growth contract and learning loop | planned | `TASK-SKL-0002`, `TASK-SKL-0005` | ATM skill growth |
| [TASK-SKL-0008](./TASK-SKL-0008-team-role-skill-pack-and-capability-boundary-contract.task.md) | P3 | Team role skill-pack and capability boundary contract | planned | `TASK-SKL-0005`, `TASK-SKL-0007` | Team role contract |
| [TASK-SKL-0009](./TASK-SKL-0009-team-role-routing-matrix-and-playbook-slices.task.md) | P3 | Team role-routing matrix and playbook slices | planned | `TASK-SKL-0003`, `TASK-SKL-0005`, `TASK-SKL-0008` | Team playbook routing |
| [TASK-SKL-0010](./TASK-SKL-0010-provider-neutral-role-skill-pack-manifest.task.md) | P4 | Provider-neutral role skill-pack manifest | planned | `TASK-SKL-0007`, `TASK-SKL-0008`, `TASK-SKL-0009` | Team runtime manifest |
| [TASK-SKL-0011](./TASK-SKL-0011-agent-plus-skill-runtime-pilot.task.md) | P4 | Agent plus skill runtime pilot | planned | `TASK-SKL-0008`, `TASK-SKL-0009`, `TASK-SKL-0010` | Team runtime pilot |
| [TASK-SKL-0012](./TASK-SKL-0012-team-role-growth-and-observability-integration.task.md) | P4 | Team role growth and observability integration | planned | `TASK-SKL-0007`, `TASK-SKL-0010`, `TASK-SKL-0011` | Team growth / observability |

## Sequencing Note

1. `TASK-SKL-0001` 是 planning-only opener，負責建立 plan、index 與 execution pack。
2. `TASK-SKL-0002` 先定義共同 tool result contract，避免各 tool 自行發明 shape。
3. `TASK-SKL-0003` 與 `TASK-SKL-0004` 分別實作 routing/claim lane 與 operator lane。
4. `TASK-SKL-0005` 把現有 skill 遷移到 tool-first orchestration，並確立 `router / playbook / specialist skill` 三層模型。
5. `TASK-SKL-0007` 為大小 skill 建立共用 learning loop、taxonomy 與 promotion policy。
6. `TASK-SKL-0008` 到 `TASK-SKL-0012` 把這套架構正式接到 Team Agents，讓 `Agent + Skill` 成為可獨立治理的角色單元。
7. `TASK-SKL-0006` 最後用真實 residue / active-claim / cross-repo 邊界收尾 hardening，並吸收由 growth contract 捕獲的 tooling friction。

## Completion Gate

- tool result shape 在主要治理 surface 上一致；
- `nextAction / userNotice / runnerMode / messages` 可被 skill 直接消費；
- `taskflow`、`close`、`commit` lane 的 blocker 有 machine-readable 診斷；
- ATM skills 共用同一套 growth contract，而不是每顆 skill 自己發明 learning loop；
- Team role 能被映射到 skill packs 與 capability manifests，而不是只靠 prompt 人設；
- tool-first path 與 CLI fallback 共存，但不形成第二套治理模型。
