---
doc_id: doc_other_0237
task_id: TASK-ATS-0007
title: Atomic map equivalence and rollout validation
owner: atm-core
priority: P1
status: in_progress
milestone: M6
related_plan: docs/ai_atomic_framework/3klife-atm-triangle-strategy/3KLife ATM ?∠銝?蝑閬???md
depends_on: TASK-ATS-0006
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
---

# TASK-ATS-0007嚗tomic map equivalence and rollout validation

## ?格?

??`TASK-ATS-0006` 撌脩??Ｗ canonical Atomic Map dry-run proposal 敺?撽?閰?map ?臬?賡脣 equivalence?eview-advisory?eplacement lane?誑??蝥?evolution / polymorphize ?祥?楝敺?

?撐?⊿?敹??胯?摰?敺銝摰銝????脯?銝?獐?頨怒?

## 撽璇辣

- [ ] ?喳?銝撘?Atomic Map proposal ?脣 equivalence / review-advisory 撽??挾
- [ ] map-level rollout evidence ?航牧??shadow / canary / active / legacy-retired ?祥????
- [ ] replacement lane ??rollback proof ?摩?臬??閰?map ??楝敺?
- [ ] evolution / polymorphize proposal ?賭誑 map-level evidence ?箄撓?伐????舐?亦?霈?registry
- [ ] ??map members ??variants ?閬?propagation / impact 瑼Ｘ嚗??????
- [ ] ?蝯?????撐 map ?臬撌脣?? dry-run 韏啣? rollout ??????

## 鈭支???

- map equivalence evidence
- review-advisory or rollout evidence
- replacement-lane / rollback proof references
- evolution or polymorph impact report
- M6 acceptance summary

## 撽??孵?

- map equivalence / propagation / review-advisory validators
- replacement lane or rollback-proof reports
- evolve / polymorphize dry-run proposal flow

## 靘陷

- TASK-ATS-0006

## Notes

2026-05-18 | status: open | validation: pending | change: Opened as the post-decomposition rollout and evolution stage. | blocker: none
2026-05-19 | status: in_progress | validation: shadow + canary reached; active blocker captured | change: `ATM-MAP-0001` was promoted from `draft -> shadow -> canary` using `atomic_workbench/maps/ATM-MAP-0001/map.test.report.json`. A deliberate `active` probe returned formal blocker evidence requiring `map-equivalence`, `propagation-report`, `review-advisory`, and `human-review`. This card now owns the rollout/equivalence gate instead of feature decomposition itself. | blocker: waiting for map equivalence, propagation, review advisory, and human review evidence before `active`
2026-05-19 | status: in_progress | validation: map equivalence + propagation + review advisory + human review complete; pinned runner replacement-lane smoke passes | change: Closed the onefile registry-validator gap by validating replacement-lane promotion on the adopter pinned runner and confirmed `registryStatus=validated` on shadow promotion. `ATM-MAP-0001` now has map-equivalence, propagation-report, review-advisory, and human-review evidence, and its registry lifecycle status matches `replacement.mode` at `active`. | blocker: remaining M6 scope is evolution/polymorphize and broader governed rollout beyond the first active map


2026-05-20 | status: in_progress | validation: polymorph impact pass; evolve blocker captured; next governed leaf queued | change: Generated and validated ATM-MAP-0001 polymorph impact evidence with zero template-bound hits, persisted the real registry-diff blocker (ATM_DIFF_ATOM_NOT_FOUND) for ATM-NPCBRAIN-0002, and queued a second collision-safe atomize dry-run proposal for run_full_roster_convergence_loop.py#apply_convergence_loop_state_governance. | blocker: real evolve proof still requires atom-level version lineage in the adopter registry, and atm next does not yet treat the custom queued proposal as satisfying the guidance-session recommendation.

2026-05-20 | status: in_progress | validation: second governed leaf approved for actual patch planning; next router still stale | change: Recorded ATM human-review approval for guided-legacy-atomize-guidance-20260519151625-f417f5a6f2-apply-convergence-loop-state-governance, allowing the apply_convergence_loop_state_governance leaf to proceed to actual patch planning inside ATM-MAP-0001 without broadening scope beyond the governance initializer. | blocker: map-level evolve remains blocked by missing adopter atom version lineage, and atm next still repeats the dry-run recommendation even after the approval exists.
2026-05-20 | status: in_progress | validation: proposal-rollout-ready verified; governed leaf closeout complete | change: node atm.mjs next --json now routes the approved second leaf to review rollout-ready, and node atm.mjs review rollout-ready "guided-legacy-atomize-guidance-20260519151625-f417f5a6f2-apply-convergence-loop-state-governance" --json returns smokeEvidenceSatisfied=true + rollbackReadySatisfied=true with missingEvidence cleared. The leaf run_full_roster_convergence_loop.py#apply_convergence_loop_state_governance is formally marked rollout closeout complete. | blocker: map-level evolve remains blocked until adopter atom-level version lineage is available (ATM_DIFF_ATOM_NOT_FOUND).




## Leaf Rollout Closeout

- [x] `run_full_roster_convergence_loop.py#apply_convergence_loop_state_governance` marked rollout closeout complete via `proposal-rollout-ready` verification.
- [ ] Map-level evolve closeout is still pending adopter atom-level version lineage (`ATM_DIFF_ATOM_NOT_FOUND`).
