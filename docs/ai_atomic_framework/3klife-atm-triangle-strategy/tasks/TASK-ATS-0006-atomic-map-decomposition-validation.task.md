---
doc_id: doc_other_0236
task_id: TASK-ATS-0006
title: Legacy Python feature decomposition to atomic map dry-run
owner: atm-core
priority: P0
status: completed
milestone: M5
related_plan: docs/ai_atomic_framework/3klife-atm-triangle-strategy/3KLife ATM 採用三角策略規劃書.md
depends_on: TASK-ATS-0005
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
---

# TASK-ATS-0006：Legacy Python feature decomposition to atomic map dry-run

## 目標

驗證 ATM 能否把一個**高價值的大型 Python 功能簇**，從人類可辨識的 feature decomposition plan，推進成 canonical Atomic Map 的 dry-run proposal 與 map-level evidence。

這張卡才是「大拆小 → 原子 map」的主戰場。

## Target 原則

不得選小 helper 或單一 leaf function 當主要目標。必須選擇高價值、具明確人類架構邊界的大功能，例如：

- `pipelines/sanguo-rag/run_full_roster_convergence_loop.py`
- `pipelines/sanguo-rag/run_progress_advancement_loop.py`
- 或一個更明確的人類功能簇（例如 full-roster convergence orchestration、progress advancement orchestration）

## 建議首選

第一順位建議：

- `pipelines/sanguo-rag/run_full_roster_convergence_loop.py`

第二順位備選：

- `pipelines/sanguo-rag/run_progress_advancement_loop.py`

## 驗收條件

- [x] 選定一個高價值大型 Python feature target，並留下為何不選小 helper 的治理理由
- [x] 產出 feature decomposition plan，而不是只有 leaf extraction plan
- [x] `create-map --from-plan` 或等價官方 surface 能對該 decomposition dry-run 建立 canonical Atomic Map proposal
- [x] map proposal 具備成員角色、入口點、邊關係、replaceable contract 與 rollback boundary
- [x] 至少一份 map integration evidence 產出
- [x] 至少一份 map equivalence / review-advisory 類 evidence 產出
- [x] 最終結果可回答「這個大功能被拆成哪些 atoms，為什麼這樣分，而不是零散 helper」

## 交付物

- feature decomposition plan
- atomic map dry-run proposal
- canonical member / edge definition
- map integration report
- equivalence or review-advisory evidence
- M5 acceptance summary

## 驗證方式

- `node atm.mjs candidates rank --include "pipelines/**/*.py" --json`
- `node atm.mjs start --legacy-flow --target-file <high-value feature> --json`
- `node atm.mjs next --json`
- `node atm.mjs create-map --from-plan ... --dry-run --json` or official equivalent
- map integration / equivalence validators or reports

## 依賴

- TASK-ATS-0005

## Notes

2026-05-18 | status: open | validation: pending | change: Opened as the large-feature decomposition stage after leaf-level strangler validation. | blocker: none
2026-05-19 | status: in_progress | validation: decomposition plan + canonical map evidence created | change: Scope refined to feature-level decomposition into Atomic Map dry-run. Primary target is `pipelines/sanguo-rag/run_full_roster_convergence_loop.py`. Created `.atm/history/reports/decomposition-plan.full-roster-convergence-v1.json`, then materialized canonical map `ATM-MAP-0001` with official `create-map --from-plan` surface and passed `test --map ATM-MAP-0001`. | blocker: equivalence / review-advisory evidence still missing before this card can be considered complete
2026-05-19 | status: completed | validation: canonical map + integration + equivalence evidence present | change: Materialized canonical map `ATM-MAP-0001` from `.atm/history/reports/decomposition-plan.full-roster-convergence-v1.json`, passed map integration, added fixture/executor-based equivalence evidence, and aligned the registry entry with the active replacement state. The first governed leaf patch now runs inside the map boundary through `run_full_roster_convergence_loop.py#run_global_seed_pipeline`. | blocker: none
