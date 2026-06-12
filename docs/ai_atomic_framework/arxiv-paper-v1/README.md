# arXiv Paper v1 — Adapter-Guided Atomization

**Target Venue:** arXiv（vision paper，6 月優先權窗口）→ ICSE / FSE / POPL（12 月完整版）
**Status:** Skeleton — Abstract + Intro + Related Work 完整，其他章節留骨架

## Files

- `paper.md` — 完整論文中文初稿（骨架版）
- `figures/` — 待補
- `references.bib` — 待補（BibTeX）
- `submission/` — 後續放 LaTeX / arXiv tar.gz

## Strategy

1. **Now → 1 週**：補完 §3 形式化（CID Broker 演算法、AtomizationPlanningAdapter 介面、Governance Pipeline）
2. **1 → 3 週**：翻譯 EN，整理 LaTeX，補圖表
3. **3 → 4 週**：上傳 arXiv，鎖優先權
4. **9 月**：等 ASP 任務卡完成後補 §5 評估結果
5. **12 月**：投 ICSE / FSE / POPL 完整版

## Key Claims

1. Tier 2（function/module 級）是 multi-agent 代碼合成的甜蜜點
2. 不需通用 AST 即可達成跨語言並發治理
3. CID disjoint 路由（同檔案不同函式並行）超越 STORM 的盲拒
4. ATM 已開源實作（broker 1932 LOC）

## Talking Points to Avoid

- ❌ 不要說 ATM 已有 AST/LSP 工具鏈
- ❌ 不要說 CID 是 AST 分析的免費副產品
- ❌ 不要承諾 6 月底前完成所有評估
- ✅ 強調 governance + scope-based admission 是新角度
- ✅ 強調 adapter 自由選擇偵測方式

## Related Documents

- `docs/ai_atomic_framework/vision-paper-semantic-admission.md` — 學術定位
- `docs/ai_atomic_framework/atomic-cost-reduction-plan.md` — 工程計畫
- `docs/ai_atomic_framework/atm-core-broker-survey.md` — 現況調查
- `docs/ai_atomic_framework/adapter-guided-atomization-sdk/` — SDK 強化任務卡
