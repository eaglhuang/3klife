---
doc_id: doc_index_0022
owner: atm-core
status: active
related_plan: docs/ai_atomic_framework/3klife-atm-triangle-strategy/3KLife ATM 採用三角策略規劃書.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
---

# 3KLife ATM Triangle Strategy Task Cards

本目錄收錄「3KLife ATM 採用三角策略規劃書」的內部任務卡（TASK-ATS-0001 ~ TASK-ATS-0010）。

這批卡不屬於 `agent-pack-onboarding`，也不直接放入 AI-Atomic-Framework public repo。它們用來協調 3KLife 母專案、npc-brain adopter 驗收場與 AI-Atomic-Framework upstream 之間的 evidence flow。

## 索引

| Task ID | 標題 | 里程碑 | 狀態 | 阻擋者 |
|---|---|---|---|---|
| [TASK-ATS-0001](./TASK-ATS-0001-docs-language-boundary-and-move.task.md) | Public docs language gate and strategy directory migration | M0 | completed | — |
| [TASK-ATS-0002](./TASK-ATS-0002-npc-brain-baseline-fixture-inventory.task.md) | npc-brain baseline freeze and fixture inventory | M1 | completed | TASK-ATS-0001 |
| [TASK-ATS-0003](./TASK-ATS-0003-official-onboarding-smoke.task.md) | npc-brain official ATM onboarding smoke | M2 | completed | TASK-ATS-0002 |
| [TASK-ATS-0004](./TASK-ATS-0004-atom-behavior-core-suite.task.md) | Atom behavior core suite on npc-brain | M3 | completed | TASK-ATS-0003 |
| [TASK-ATS-0005](./TASK-ATS-0005-legacy-python-infect-atomize.task.md) | Leaf-level legacy Python atomize and infect dry-run pass | M4 | completed | TASK-ATS-0004 |
| [TASK-ATS-0006](./TASK-ATS-0006-atomic-map-decomposition-validation.task.md) | Legacy Python feature decomposition to atomic map dry-run | M5 | completed | TASK-ATS-0005 |
| [TASK-ATS-0007](./TASK-ATS-0007-atom-evolution-polymorph-validation.task.md) | Atomic map equivalence and rollout validation | M6 | completed | TASK-ATS-0006 |
| [TASK-ATS-0008](./TASK-ATS-0008-adopter-sentinel-evidence-routing.task.md) | Adopter sentinel integration and evidence routing | M7 | completed | TASK-ATS-0007 |
| [TASK-ATS-0009](./TASK-ATS-0009-upstream-blocker-repair-batch.task.md) | Upstream blocker repair batch from npc-brain evidence | M8 | completed | TASK-ATS-0008 |
| [TASK-ATS-0010](./TASK-ATS-0010-graduation-release-gate.task.md) | 3KLife experiment graduation and ATM release gate | M9 | completed | TASK-ATS-0009 |

## 任務排序原則

任務卡代號已依執行優先序重排。越小的編號越早做：先處理文件邊界與 baseline，再做 onboarding，接著驗證十種原子行為、legacy Python strangler、Atomic Map、evolution，最後才做 sentinel、upstream repair 與 release gate。
## 2026-05-19 Status Update

TASK-ATS-0003 is now in progress. The first natural-language Codex smoke test is a partial pass: the Agent discovered ATM routing without explicit user prompting, ran `node atm.mjs next --json`, executed the onboarding refresh command, then returned to the original data-pipeline progress request. Remaining M2 work is to refresh npc-brain with the latest first-use notice contract and re-run the same style of black-box prompt.

TASK-ATS-0005 is completed. The pinned adopter runner in `3klife-npc-brain` produced both `guided-legacy-atomize-guidance-20260519134240-815ea27a83` and `guided-legacy-infect-guidance-20260519134240-815ea27a83` for `pipelines/sanguo-rag/sanguo_governance_loader.py#default_governance_root`, confirming the leaf-level legacy Python dry-run path.

TASK-ATS-0006 is now in progress. A feature-level decomposition plan for `pipelines/sanguo-rag/run_full_roster_convergence_loop.py` was written to `.atm/history/reports/decomposition-plan.full-roster-convergence-v1.json`, and the official `create-map --from-plan` flow materialized canonical map `ATM-MAP-0001`.

TASK-ATS-0007 is now in progress. `ATM-MAP-0001` passed `test --map`, then advanced through the replacement lane from `draft -> shadow -> canary`. A deliberate `active` transition probe produced the formal blocker demanding `map-equivalence`, `propagation-report`, `review-advisory`, and `human-review` evidence.

## 2026-05-20 Rollout-ready Update

TASK-ATS-0007 remains `in_progress` at map-level scope, but the governed leaf `run_full_roster_convergence_loop.py#apply_convergence_loop_state_governance` is now `rollout closeout complete`.

Evidence confirmed through adopter pinned runner:

- `node atm.mjs next --json` routes to `review rollout-ready ... --json`
- `node atm.mjs review rollout-ready ... --json` returns `smokeEvidenceSatisfied=true` and `rollbackReadySatisfied=true`

## 2026-05-20 Map-level Closeout Update

TASK-ATS-0006 is completed. The canonical Atomic Map `ATM-MAP-0001` exists, has member/edge definitions, and has map integration plus equivalence evidence.

TASK-ATS-0007 is completed. The previous evolve blocker for `ATM-NPCBRAIN-0002` was resolved by adopter atom-level version lineage: `.atm/history/reports/registry-diff.ATM-NPCBRAIN-0002.0.1.0-to-0.1.1.json` returns `ok=true`, `lineageContinuity=true`, and only `codeHash` drift.

TASK-ATS-0008 is now in progress. The next focus is not another feature patch; it is evidence routing: classify adopter evidence into upstream-blocker, adopter-local, and host-governance-overlap so the triangle strategy can decide what should return upstream.

## 2026-05-20 Evidence Routing Closeout

TASK-ATS-0008 is completed. The upstream adopter sentinel baseline passed outside the local tool sandbox, and the npc-brain evidence set is now classified into `upstream-blocker`, `adopter-local`, and `host-governance-overlap`.

Primary evidence:

- `evidence/TASK-ATS-0008-adopter-sentinel-evidence-routing-2026-05-20.md`

## 2026-05-20 Upstream Repair Batch Closeout

TASK-ATS-0009 is completed. The upstream-blocker bucket from TASK-ATS-0008 is now mapped to neutral upstream artifacts, framework commits, validators, and public docs surfaces.

Primary evidence:

- `evidence/TASK-ATS-0009-upstream-blocker-repair-batch-2026-05-20.md`

TASK-ATS-0010 is now in progress and owns the final graduation / release gate decision.

## 2026-05-20 Graduation Closeout

TASK-ATS-0010 is completed. The triangle strategy experiment graduates as a completed evidence program and is ready for AI-Atomic-Framework release-candidate review, but not automatic publish.

Primary evidence:

- `evidence/TASK-ATS-0010-graduation-release-gate-2026-05-20.md`
