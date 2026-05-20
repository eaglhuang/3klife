---
doc_id: doc_other_0237
task_id: TASK-ATS-0007
title: Atomic map equivalence and rollout validation
owner: atm-core
priority: P1
status: completed
milestone: M6
related_plan: docs/ai_atomic_framework/3klife-atm-triangle-strategy/3KLife ATM 採用三角策略規劃書.md
depends_on: TASK-ATS-0006
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
---

# TASK-ATS-0007：Atomic map equivalence and rollout validation

## 目標

在 `TASK-ATS-0006` 產生 canonical Atomic Map 後，驗證 map 是否能進入 equivalence、review-advisory、replacement lane、rollback-ready，以及 evolution / polymorphize 相關證據鏈。

這張卡的重點不是再拆更多 helper，而是確認 `ATM-MAP-0001` 這張 map 能不能從 dry-run proposal 走到可被信任的 rollout closeout。

## 驗收條件

- [x] 至少一個 Atomic Map proposal 具備 equivalence / review-advisory 證據。
- [x] map-level rollout evidence 涵蓋 `shadow`、`canary`、`active` 或等價 transition。
- [x] replacement lane 與 rollback proof 不混用 registry lifecycle status 與 replacement mode。
- [x] evolution / polymorphize proposal 能讀取 map-level evidence，且不直接手改 registry。
- [x] map members / variants 具備 propagation / impact 證據。
- [x] 最終可回答這張 map 是否已從 dry-run 走到 rollout closeout。

## 產出

- map equivalence evidence
- review-advisory and rollout evidence
- replacement-lane / rollback-ready proof references
- evolution or polymorph impact report
- registry-diff lineage continuity report
- M6 acceptance summary

## 驗證方式

- map equivalence / propagation / review-advisory reports
- replacement lane or rollback-ready reports
- evolve / polymorphize dry-run proposal flow
- registry diff for adopter atom version lineage

## 依賴

- TASK-ATS-0006

## Notes

2026-05-18 | status: open | validation: pending | change: Opened as the post-decomposition rollout and evolution stage. | blocker: none

2026-05-19 | status: in_progress | validation: shadow + canary reached; active blocker captured | change: `ATM-MAP-0001` was promoted from `draft -> shadow -> canary` using `atomic_workbench/maps/ATM-MAP-0001/map.test.report.json`. A deliberate `active` probe returned formal blocker evidence requiring `map-equivalence`, `propagation-report`, `review-advisory`, and `human-review`. | blocker: waiting for map equivalence, propagation, review advisory, and human review evidence before `active`

2026-05-19 | status: in_progress | validation: map equivalence + propagation + review advisory + human review complete; pinned runner replacement-lane smoke passes | change: Closed the onefile registry-validator gap by validating replacement-lane promotion on the adopter pinned runner and confirmed `registryStatus=validated` on shadow promotion. `ATM-MAP-0001` now has map-equivalence, propagation-report, review-advisory, and human-review evidence, and its registry lifecycle status matches `replacement.mode` at `active`. | blocker: remaining M6 scope is evolution/polymorphize and broader governed rollout beyond the first active map

2026-05-20 | status: in_progress | validation: polymorph impact pass; evolve blocker captured; next governed leaf queued | change: Generated and validated ATM-MAP-0001 polymorph impact evidence with zero template-bound hits, persisted the real registry-diff blocker `ATM_DIFF_ATOM_NOT_FOUND` for `ATM-NPCBRAIN-0002`, and queued a second collision-safe atomize dry-run proposal for `run_full_roster_convergence_loop.py#apply_convergence_loop_state_governance`. | blocker: real evolve proof still requires atom-level version lineage in the adopter registry, and `atm next` does not yet treat the custom queued proposal as satisfying the guidance-session recommendation.

2026-05-20 | status: in_progress | validation: second governed leaf approved for actual patch planning; next router still stale | change: Recorded ATM human-review approval for `guided-legacy-atomize-guidance-20260519151625-f417f5a6f2-apply-convergence-loop-state-governance`, allowing the `apply_convergence_loop_state_governance` leaf to proceed to actual patch planning inside `ATM-MAP-0001` without broadening scope beyond the governance initializer. | blocker: map-level evolve remains blocked by missing adopter atom version lineage, and `atm next` still repeats the dry-run recommendation even after the approval exists.

2026-05-20 | status: in_progress | validation: proposal-rollout-ready verified; governed leaf closeout complete | change: `node atm.mjs next --json` now routes the approved second leaf to `review rollout-ready`, and `node atm.mjs review rollout-ready "guided-legacy-atomize-guidance-20260519151625-f417f5a6f2-apply-convergence-loop-state-governance" --json` returns `smokeEvidenceSatisfied=true` and `rollbackReadySatisfied=true` with `missingEvidence=[]`. The leaf `run_full_roster_convergence_loop.py#apply_convergence_loop_state_governance` is formally marked rollout closeout complete. | blocker: map-level evolve remains blocked until adopter atom-level version lineage is available (`ATM_DIFF_ATOM_NOT_FOUND`).

2026-05-20 | status: completed | validation: registry-diff passed with lineage continuity | change: The adopter now has atom-level version lineage for `ATM-NPCBRAIN-0002` from `0.1.0 -> 0.1.1`. `.atm/history/reports/registry-diff.ATM-NPCBRAIN-0002.0.1.0-to-0.1.1.json` returns `ok=true`, `lineageContinuity=true`, and only `codeHash` drift. `.atm/history/evidence/TASK-ATS-0007.json` marks the map closeout decision as `closeout-ready`. | blocker: none

## Closeout Decision

`TASK-ATS-0007` is completed.

The map-level rollout path is now validated at the level required for the triangle strategy:

- `ATM-MAP-0001` exists as the canonical map for the full-roster convergence decomposition.
- Map integration, equivalence, propagation, review-advisory, human-review, smoke evidence, and rollback-ready proof all exist.
- Polymorph impact is neutral and non-blocking for the current map.
- The earlier evolve blocker was converted into a real registry-diff success after adopter atom-level lineage was present.

Next handoff: `TASK-ATS-0008` should classify these adopter reports into upstream-blocker, adopter-local, and host-governance-overlap buckets.
