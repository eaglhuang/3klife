---
doc_id: doc_task_0225
id: "H2U-REFACTOR-0002"
priority: "P2"
owner: "Unassigned"
status: "open"
type: "refactoring"
phase: "G"
created: "2026-05-05"
created_by_agent: "ClaudeCode_claude-sonnet-4-6"
related_cards:
  - "H2U-REFACTOR-0006"
depends: []
notes: "2026-05-05 | 狀態: open | 來源: html_skill_postmortem (doc_other_0026) §A2 / §D3 | 阻塞: 無"
---

# [H2U-REFACTOR-0002] rule-checkers.js 拆目錄

## 開單原因

`tools_node/lib/html-to-ucuf/rule-checkers.js` 已長到 **626 行 / 27 個 checker**，同檔混合：
- 27 個規則檢查邏輯
- core source 掃描
- workflow summary 驗證
- radar 幾何驗證

新增規則必須改本檔，且無法單獨測試個別規則。職責邊界與 rule-guard.js / rule-registry.json 三層也不清晰（postmortem §B1）。

## INPUT_CONTRACT

- `tools_node/lib/html-to-ucuf/rule-checkers.js` 當前 626 行
- `tools_node/lib/html-to-ucuf/rule-guard.js` import `rule-checkers`
- `tools_node/validate-html-to-ucuf-rule-guard.js` validator status=pass

## OUTPUT_CONTRACT

- [ ] 新建 `tools_node/lib/html-to-ucuf/rule-checkers/` 目錄含：
  - `base.js` — 通用 `addViolation` / `buildViolation` 助手
  - `formal-entry.js` — H2U-P4-001~003 等 formal 入口檢查
  - `source-package.js` — H2U-P4-009 等來源包檢查
  - `draft-builder.js` — H2U-P4-020~030 等 draft-builder 階段檢查
  - `workflow-summary.js` — workflow summary / specHashes / radar 等驗證
  - `index.js` — re-export all 維持 rule-guard.js 的 require API 不變
- [ ] 27 個 checker 全部歸位，無遺漏
- [ ] `rule-guard.js` 的 `require('./rule-checkers')` 不變
- [ ] `validate-html-to-ucuf-rule-guard.js` status=pass
- [ ] rule-registry.json 不變

## VALIDATION_CMD

```bash
# 1. 拆檔結構
ls tools_node/lib/html-to-ucuf/rule-checkers/

# 2. validator 仍 pass
node tools_node/validate-html-to-ucuf-rule-guard.js
# 期望: status=pass blockers=0

# 3. self-test
node tools_node/test/dom-to-ui-self-test.js

# 4. compute-gate
node tools_node/compute-gate.js --profile standard --agent-feedback
```

## ROLLBACK_HINT

```bash
git checkout tools_node/lib/html-to-ucuf/rule-checkers.js
rm -rf tools_node/lib/html-to-ucuf/rule-checkers/
```

## 建議作法

1. 先讀 rule-checkers.js 把 27 個 checker 按 rule ID prefix 分組
2. 建 base.js 抽出共用 helper
3. 一次抽一組（例如 formal-entry 4 個 checker → 一檔），跑 validator 確認 pass
4. index.js 用 `module.exports = { ...require('./formal-entry'), ...require('./source-package'), ... }` 模式
5. 最後刪除原 rule-checkers.js（或改為 shim）

## 交付物

- `tools_node/lib/html-to-ucuf/rule-checkers/base.js`
- `tools_node/lib/html-to-ucuf/rule-checkers/formal-entry.js`
- `tools_node/lib/html-to-ucuf/rule-checkers/source-package.js`
- `tools_node/lib/html-to-ucuf/rule-checkers/draft-builder.js`
- `tools_node/lib/html-to-ucuf/rule-checkers/workflow-summary.js`
- `tools_node/lib/html-to-ucuf/rule-checkers/index.js`
- `tools_node/lib/html-to-ucuf/rule-checkers.js`（刪除或改 shim）

## 估時

2-3 hours
