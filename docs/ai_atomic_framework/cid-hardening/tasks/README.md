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
| TASK-CID-0005 | E2 | Team lease TTL / heartbeat / fencing 對齊 TASK-TEAM-0018 | E0 後**優先開**（0018 已 draft） |
| TASK-CID-0006 | E3 | closure attestation / sandbox wording 對齊 TASK-TEAM-0019 | Deno 候選；`node:vm`/`isolated-vm` 列不採用 |
| TASK-CID-0007 | E5 | Trust Tier 責任矩陣與 promotion gate | Trust Tier 1/2/3 ≠ 既有 `RegistryGovernanceTier` |

## Sequencing Note

E0 最小閉環收口順序：`0001 → 0002 → 0003`。
E0 收口後，先以 future queue 中的 `TASK-CID-0005`（E2 對齊 `TASK-TEAM-0018`）優先正式開卡；`0004 / 0006 / 0007` 接續排程。

## Cross-Lane References

- TEAM lane: [../../team-agents/tasks/README.md](../../team-agents/tasks/README.md)
- APF lane: [../../atomic-police-family/tasks/README.md](../../atomic-police-family/tasks/README.md)
