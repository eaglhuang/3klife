---
doc_id: doc_task_0013
id: HARN-EVAL-0003
priority: P2
phase: Phase2
created: 2026-05-04
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: open
type: eval-tooling
chain_id: HARN-CHAIN-EVAL
chain_step: 3/3
sensor_triggered_by: harness-rollout planning
depends:
  - HARN-EVAL-0002
notes: "2026-05-04 | 狀態: open | 驗證: pending | 變更: GitHubCopilot 建立 Path Drift Comparator 任務卡 | 阻塞: depends HARN-EVAL-0002"
---

# [HARN-EVAL-0003] 建立 Path Drift Comparator

> **Harness rollout 開卡** — 比較同樣最終 pass 的兩輪是否走了不同且更差的路
> **定位**：Phase 2 / Eval baseline 第 3 步
> **前置依賴**：`HARN-EVAL-0002` baseline fixture pack 已可用

## 問題描述

Agent workflow 最容易被忽略的風險是「結果看起來對，但路徑開始漂移」。例如：

- 多跑了不必要工具
- gate fail/retry 次數上升
- handoff validator 常常先 fail 再補救
- UI-QA workflow 漏跑某個固定 smoke check

需要一支 comparator 將 candidate 與 baseline 做 path-level 比較，而不是只看最終 pass/fail。

## INPUT_CONTRACT

- baseline fixture pack 已存在
- taxonomy 已能區分主要 workflow path class
- trace summary 已有 tool sequence、duration、errorCount 等聚合資訊

## OUTPUT_CONTRACT

- [ ] 新增 `tools_node/compare-execution-path.js`
- [ ] 比對至少包含：tool sequence、gate fail 次數、retry 數、缺驗證情況
- [ ] 輸出 `pass / warn / fail` 或等價 drift verdict
- [ ] 同一路徑穩定重跑時應可 stable pass
- [ ] 插入額外無效步驟或漏驗證時可產生可解釋 warn/fail

## VALIDATION_CMD

```bash
node tools_node/compare-execution-path.js --baseline tests/fixtures/harness-paths/doc-only-pass.json --candidate tests/fixtures/harness-paths/doc-only-pass.json --strict
node tools_node/compare-execution-path.js --baseline tests/fixtures/harness-paths/doc-only-pass.json --candidate tests/fixtures/harness-paths/doc-only-drift.json
```

## ROLLBACK_HINT

```bash
git checkout tools_node/compare-execution-path.js
git checkout tests/fixtures/harness-paths/
```

## 執行步驟

1. 先比對高訊號欄位：tool sequence、gate fail、retry、缺驗證；不急著做太細的事件相似度演算法。
2. verdict 要能指出 drift 來源，不只給總分。
3. 同一路徑穩定重跑必須 pass，避免 comparator 自己太敏感。
4. 缺驗證與多餘步驟要能分開分類，讓 remediation 清楚。
5. 完成後交由 `HARN-MET-0003` 與 pilot workflow 消費。

---
*由 Harness rollout planning 開立 | 2026-05-04*

## 審核結果（2026-05-04）

- 審核結論：未達成（依賴未滿）
- 驗證證據：baseline fixture pack 尚未交付；未見 path drift comparator CLI。
- 需修改：等 EVAL-0002 後建立 comparator 與 pass/warn/fail verdict。
