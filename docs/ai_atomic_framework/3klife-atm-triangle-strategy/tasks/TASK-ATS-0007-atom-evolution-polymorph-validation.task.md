---
doc_id: doc_other_0237
task_id: TASK-ATS-0007
title: Atomic map equivalence and rollout validation
owner: atm-core
priority: P1
status: in_progress
milestone: M6
related_plan: docs/ai_atomic_framework/3klife-atm-triangle-strategy/3KLife ATM 採用三角策略規劃書.md
depends_on: TASK-ATS-0006
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
---

# TASK-ATS-0007：Atomic map equivalence and rollout validation

## 目標

在 `TASK-ATS-0006` 已經產出 canonical Atomic Map dry-run proposal 後，驗證該 map 是否能進入 equivalence、review-advisory、replacement lane、以及後續 evolution / polymorphize 的治理路徑。

這張卡關心的是「拆完之後能不能安全上線與演進」，不是「怎麼拆」本身。

## 驗收條件

- [ ] 至少一張 Atomic Map proposal 進入 equivalence / review-advisory 驗證階段
- [ ] map-level rollout evidence 可說明 shadow / canary / active / legacy-retired 的治理邊界
- [ ] replacement lane 或 rollback proof 邏輯可對應到該 map 的替換路徑
- [ ] evolution / polymorphize proposal 能以 map-level evidence 為輸入，而不是直接突變 registry
- [ ] 若 map members 或 variants 需要 propagation / impact 檢查，需有對應報告
- [ ] 最終結果可回答「這張 map 是否已具備從 dry-run 走向 rollout 的證據鏈」

## 交付物

- map equivalence evidence
- review-advisory or rollout evidence
- replacement-lane / rollback proof references
- evolution or polymorph impact report
- M6 acceptance summary

## 驗證方式

- map equivalence / propagation / review-advisory validators
- replacement lane or rollback-proof reports
- evolve / polymorphize dry-run proposal flow

## 依賴

- TASK-ATS-0006

## Notes

2026-05-18 | status: open | validation: pending | change: Opened as the post-decomposition rollout and evolution stage. | blocker: none
2026-05-19 | status: in_progress | validation: shadow + canary reached; active blocker captured | change: `ATM-MAP-0001` was promoted from `draft -> shadow -> canary` using `atomic_workbench/maps/ATM-MAP-0001/map.test.report.json`. A deliberate `active` probe returned formal blocker evidence requiring `map-equivalence`, `propagation-report`, `review-advisory`, and `human-review`. This card now owns the rollout/equivalence gate instead of feature decomposition itself. | blocker: waiting for map equivalence, propagation, review advisory, and human review evidence before `active`
2026-05-19 | status: in_progress | validation: map equivalence + propagation + review advisory + human review complete; pinned runner replacement-lane smoke passes | change: Closed the onefile registry-validator gap by validating replacement-lane promotion on the adopter pinned runner and confirmed `registryStatus=validated` on shadow promotion. `ATM-MAP-0001` now has map-equivalence, propagation-report, review-advisory, and human-review evidence, and its registry lifecycle status matches `replacement.mode` at `active`. | blocker: remaining M6 scope is evolution/polymorphize and broader governed rollout beyond the first active map


2026-05-20 | status: in_progress | validation: polymorph impact pass; evolve blocker captured; next governed leaf queued | change: Generated and validated ATM-MAP-0001 polymorph impact evidence with zero template-bound hits, persisted the real registry-diff blocker (ATM_DIFF_ATOM_NOT_FOUND) for ATM-NPCBRAIN-0002, and queued a second collision-safe atomize dry-run proposal for run_full_roster_convergence_loop.py#apply_convergence_loop_state_governance. | blocker: real evolve proof still requires atom-level version lineage in the adopter registry, and atm next does not yet treat the custom queued proposal as satisfying the guidance-session recommendation.

2026-05-20 | status: in_progress | validation: second governed leaf approved for actual patch planning; next router still stale | change: Recorded ATM human-review approval for guided-legacy-atomize-guidance-20260519151625-f417f5a6f2-apply-convergence-loop-state-governance, allowing the pply_convergence_loop_state_governance leaf to proceed to actual patch planning inside ATM-MAP-0001 without broadening scope beyond the governance initializer. | blocker: map-level evolve remains blocked by missing adopter atom version lineage, and tm next still repeats the dry-run recommendation even after the approval exists.
