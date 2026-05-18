<!-- doc_id: doc_server_pipeline_0048 -->
# NPC-brain / Sanguo-RAG Residual Hardcode Freeze Audit

## Summary

這份 audit 是 Sanguo-RAG governance 的收斂點。前面 Phase 1-44 已經把大量 deterministic policy、rule、catalog、schema 搬到 governance data；剩下的硬寫不一定都該搬。這份文件把剩餘項目分成三類：

- `done-governed`：已由 governance data 管理。
- `intentional-fallback`：刻意留在 Python，通常是演算法、schema guard、錯誤防護或 orchestration。
- `postponed`：條件還沒成熟，等 PostgreSQL / vector production 等階段再處理。

## Audit Items

- `gold_seed_registry.py` 的 battle seed registry 暫留 Python：這是穩定 catalog 候選，但要搬時需要獨立 baseline，不在本階段順手搬。
- `validate_sanguo_governance.py` 的 allowed sets 留在 Python：它們是 validator 的邊界條件，不是 runtime policy。
- `run_sanguo_governance_regression_harness.py` 的 payload key 留在 Python：這些 key 是 snapshot contract，放在 code 裡較清楚。
- `npc_dialogue_service.py` 的安全 fallback 留在 Python：runtime 緊急防護不應完全依賴外部 policy。
- convergence runner 的 subprocess / manifest plumbing 留在 Python：policy 值已外部化，流程控制保留在 orchestration code。
- vector production rollout 與 PostgreSQL state store 標為 postponed：條件式階段未達標前不引入新複雜度。

## Freeze Rule

後續 Agent 不應再以「看到 Python 常數」為理由直接開新 governance phase。除非能證明該常數是 deterministic business policy、會頻繁調整、或已造成 regression/維護成本，否則先查本 audit 的分類。

## Next Step

下一步若要繼續，最自然是 Phase 47：Conditional Vector Production Rollout Plan。它同樣應該先做 plan-only，不直接改 production upsert 行為。
