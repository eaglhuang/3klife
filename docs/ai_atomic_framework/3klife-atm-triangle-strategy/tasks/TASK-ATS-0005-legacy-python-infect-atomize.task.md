---
doc_id: doc_other_0235
task_id: TASK-ATS-0005
title: Leaf-level legacy Python atomize and infect dry-run pass
owner: atm-core
priority: P0
status: completed
milestone: M4
related_plan: docs/ai_atomic_framework/3klife-atm-triangle-strategy/3KLife ATM 採用三角策略規劃書.md
depends_on: TASK-ATS-0004
created_at: 2026-05-18T00:00:00+08:00
created_by_agent: codex
---

# TASK-ATS-0005：Leaf-level legacy Python atomize and infect dry-run pass

## 目標

驗證 ATM 能否在真實 `npc-brain` Python host 上，對 legacy Python surface 建立正確的 `LegacyRoutePlan`、選出 safe leaf、並產出受治理的 `atomize` / `infect` dry-run proposal。

這張卡**不是**在驗證大型功能如何拆成完整 Atomic Map；它只收斂到 leaf-level strangler machinery 是否打通。

## 邊界

- 驗證 pinned `atm.mjs` 能在 adopter repo 自己跑通 `start --legacy-flow`
- 驗證 Python 語言表面能被 route planning 正確辨識
- 驗證 `next --json` 能挑出 safe leaf，而不是 generic blocked split
- 驗證 `atomize` / `infect` proposal 為 dry-run、review-first、rollback-aware
- 不要求在本卡完成 feature-level map decomposition
- 不要求在本卡完成 equivalence rollout

## 驗收條件

- [ ] `node atm.mjs start --legacy-flow` 在 `3klife-npc-brain` pinned runner 上可成功建立 Python `LegacyRoutePlan`
- [ ] `node atm.mjs next --json` 能為 Python legacy target 選出 safe leaf 與 deterministic `selectedBehavior`
- [ ] 至少一張 `behavior.atomize` guided dry-run proposal 成功入列 review queue
- [ ] 若有 existing atom match，至少一張 `behavior.infect` guided dry-run proposal 成功入列 review queue；若尚無 existing atom match，需留下明確 blocker/evidence 說明
- [ ] proposal 具備 `legacyTarget`、`guidanceSession`、`rollbackProofRequired`、`humanReviewRequired`
- [ ] 全程不直接 mutate host Python source

## 目前 pilot

- Host repo: `C:\Users\User\3klife-npc-brain`
- Current pilot file: `pipelines/sanguo-rag/sanguo_governance_loader.py`
- Current pinned-session result:
  - `guidanceSession`: `guidance-20260519134240-815ea27a83`
  - `selectedSegment`: `default_governance_root`
  - `selectedBehavior`: `atomize`
  - `proposalId`: `guided-legacy-atomize-guidance-20260519134240-815ea27a83`

## 交付物

- Python legacy route plan evidence
- atomize dry-run proposal
- infect dry-run proposal or explicit infect-blocker evidence
- review queue / projection references
- short acceptance summary for M4 closeout

## 驗證方式

- pinned adopter `atm.mjs start --legacy-flow --json`
- pinned adopter `atm.mjs next --json`
- pinned adopter `atm.mjs upgrade --propose --behavior behavior.atomize ... --dry-run --json`
- pinned adopter `atm.mjs upgrade --propose --behavior behavior.infect ... --dry-run --json` or blocker evidence

## 依賴

- TASK-ATS-0004

## Notes

2026-05-18 | status: open | validation: pending | change: Opened to validate legacy Python strangler flow on npc-brain after cross-editor onboarding work. | blocker: none
2026-05-19 | status: completed | validation: atomize + infect dry-run proposals both ready-for-review | change: Scope refined to leaf-level legacy Python atomize/infect dry-run pass, not feature-level Atomic Map decomposition. Pinned adopter runner built Python LegacyRoutePlan and produced `behavior.atomize` proposal `guided-legacy-atomize-guidance-20260519134240-815ea27a83` plus `behavior.infect` proposal `guided-legacy-infect-guidance-20260519134240-815ea27a83` for `pipelines/sanguo-rag/sanguo_governance_loader.py#default_governance_root`, with no direct host Python mutation. | blocker: none
2026-05-19 | status: completed | validation: focused dry-run / smoke pass on governed leaf wrapper | change: Began the first actual governed pilot patch by extracting `run_full_roster_convergence_loop.py#run_global_seed_pipeline` into `pipelines/sanguo-rag/full_roster_global_seed_pipeline.py` while preserving the original wrapper signature. A focused dry-run smoke using temp scoreboard and seed fixtures returned enabled output, wrote the merged seed and allowlist artifacts, and kept harvest / score / promote payloads in dry-run mode without touching trunk orchestration. | blocker: none
