---
doc_id: doc_cid_index_tasks_0001
owner: atm-core
status: active
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
public_tracking: false
created_at: 2026-06-03
last_updated: 2026-06-03T13:55+08:00
---

# CID Hardening Task Index

Related plan: [../CID硬化計畫書.md](../CID硬化計畫書.md)
Verified facts: [../00-verified-facts.md](../00-verified-facts.md)（待 TASK-CID-0001 收口時落地）
Upstream roadmap：`C:/Users/User/.claude/plans/ticklish-bouncing-lagoon.md`（v3.1）

## Task Card Contract

Every `TASK-CID-*` card follows the ATM task-card authoring contract:

- `task_id`、`target_repo`、`closure_authority`。
- `scopePaths`: target repo paths an implementation agent may change.
- `deliverables`: concrete target outputs, not only `.atm/history/**`.
- `validators`: command-backed checks required for closure.
- `evidence.required: command-backed`: completion requires command evidence.
- `rollback`: revertable rollback guidance.
- `atomizationImpact`: owner atom/map and required map updates.
- `outOfScope`: explicit non-goals.

Planning-only cards: `target_repo: 3KLife`、`closure_authority: planning_repo`。
Framework implementation cards: `target_repo: AI-Atomic-Framework`、`closure_authority: target_repo`。

## Pilot Cards（本輪只開這三張，E0 最小閉環）

| Task ID | Stage | Title | Status | Depends | Target |
|---|---|---|---|---|---|
| [TASK-CID-0001](./TASK-CID-0001-cid-hardening-control-plane-bootstrap.task.md) | E0 | CID hardening 控制面 bootstrap + 三層事實表 | **done** | none | planning docs（3KLife） |
| [TASK-CID-0002](./TASK-CID-0002-cid-semantics-and-fingerprint-profile-schema.task.md) | E0 | CID semantics + fingerprintProfile schema（optional/additive） | planned | `TASK-CID-0001` | AAF docs / schema |
| [TASK-CID-0003](./TASK-CID-0003-validate-semantic-fingerprint-determinism.task.md) | E0 | 擴充既有 validate:semantic-fingerprint 確定性夾具 | planned | `TASK-CID-0002` | AAF scripts / tests |

## Future Queue（**暫不正式開卡**，待 E0 收口後逐張正式入庫）

> 隊長指令：本輪只允許 E0 三張 pilot；下列 future queue 僅作 roadmap 對照，**不得**在本輪建立 task.md 檔案。

| Future Task ID | Stage | Planned Title | Notes |
|---|---|---|---|
| TASK-CID-0004 | E1 | dependencyPolicy 擴充 / CID.Effects 設計草案 | 復用既有 `dependencyPolicy`；不新增 top-level `effectTags`；planning_repo |
| TASK-CID-0005 | E2 | Active Resource Index / Scope Lease Registry / Team lease TTL / heartbeat / fencing 對齊 TASK-TEAM-0018 | E0 後**優先開**（0018 已 draft）；CID E2 定義 concurrency primitive，Team Agents 只採用 contract；不得建立第二個 scheduler / Git / task ledger |
| TASK-CID-0006 | E3 | closure attestation / sandbox wording 對齊 TASK-TEAM-0019 | Deno 候選；`node:vm`/`isolated-vm` 不採用。吸收限制：Deno sandbox 證據僅限 Tier 2（防混亂）；防竄改證據需外部 Attestation 簽章（不硬綁 GitHub Actions，以其為 reference adapter），信任根為簽章與 provenance。 |
| TASK-CID-0007 | E5 | Trust Tier 責任矩陣與 promotion gate | Trust Tier 1/2/3 ≠ 既有 `RegistryGovernanceTier`。吸收限制：非同步對抗 QA 與突變測試（需有 budget/cap/sampling 等防止算力災難政策）作為 Tier 3 promotion gate，同步 close 僅能掛 pending/candidate，非同步通過後方可掛 Behavior/Tier 3 標章。 |

## Sequencing Note

E0 最小閉環收口順序：`0001 → 0002 → 0003`。
E0 收口後，先以 future queue 中的 `TASK-CID-0005`（E2 對齊 `TASK-TEAM-0018`）優先正式開卡；`0004 / 0006 / 0007` 接續排程。
`TASK-CID-0005` 正式開卡時，必須把三種 deployment 情境評分納入設計證據：A. 單一人類本機多 AI 工具（目前最適合）；B. 多人各自電腦同 repo（需 Git/PR/CI/遠端 lease 補強）；C. 多 Agent 同 server 同 repo（需 E2 fencing、wait-for graph、worktree/patch isolation 後才可安全擴大）。

## Future Extension Proposal
- **TASK-CID-0008 (已提案，本輪暫不開卡)**：規劃與設計非同步對抗 QA 與突變測試的資源調度與降級政策（budget/cap/sampling/sharding/timeout policy），確保背景管線具備算力自我保護機制。本輪僅作規劃性記錄，除非隊長另行裁決，否則不得正式開立此任務卡。

## Cross-Lane References

- TEAM lane: [../../team-agents/tasks/README.md](../../team-agents/tasks/README.md)
- APF lane: [../../atomic-police-family/tasks/README.md](../../atomic-police-family/tasks/README.md)
