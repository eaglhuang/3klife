---
doc_id: doc_task_0224
id: "H2U-REFACTOR-0001"
priority: "P2"
owner: "Unassigned"
status: "open"
type: "refactoring"
phase: "G"
created: "2026-05-05"
created_by_agent: "ClaudeCode_claude-sonnet-4-6"
related_cards:
  - "H2U-REFACTOR-0002"
  - "PROG-2-0004"
  - "PROG-2-0005"
depends: []
notes: "2026-05-05 | 狀態: open | 來源: html_skill_postmortem (doc_other_0026) §A1 / §D2 | 阻塞: 無"
---

# [H2U-REFACTOR-0001] draft-builder.js 拆 5 模組

## 開單原因

`tools_node/lib/dom-to-ui/draft-builder.js` 已長到 **3091 行 / 172 個 functions**，單檔混雜 HTML 遍歷、型別推理、字體/背景/運動解析 5 種職責。任何小改動都要 reindex 整個 mental model。新 agent 接手時無法快速對齊，且修改某一層的改動容易意外影響其他層。

## INPUT_CONTRACT

- `tools_node/lib/dom-to-ui/draft-builder.js` 當前 3091 行
- `tools_node/test/dom-to-ui-self-test.js` 全綠
- `tools_node/run-html-to-ucuf-workflow.js` workflow CLI 行為穩定

## OUTPUT_CONTRACT

- [ ] 新建 `tools_node/lib/dom-to-ui/draft-builder/` 目錄含：
  - `traverser.js` — 遞迴遍歷 DOM + 型別推理
  - `typography.js` — 字體、文字轉換、行高
  - `backgrounds.js` — 背景圖、漸層、陰影
  - `interactions.js` — 互動翻譯
  - `motion.js` — 運動翻譯
  - `index.js` — thin orchestrator + re-export 維持 backward compat
- [ ] 每個模組 ≤ 600 行
- [ ] 原 `draft-builder.js` 改為 thin re-export shim 或刪除（視 require 路徑而定）
- [ ] `tools_node/test/dom-to-ui-self-test.js` 全綠
- [ ] `tools_node/run-html-to-ucuf-workflow.js` workflow summary 與重構前一致（fixture 比對）

## VALIDATION_CMD

```bash
# 1. 拆檔行數
wc -l tools_node/lib/dom-to-ui/draft-builder/*.js
# 期望每檔 ≤ 600

# 2. self-test 全綠
node tools_node/test/dom-to-ui-self-test.js

# 3. workflow 行為一致（用 css-semantics fixture 驗）
node tools_node/run-html-to-ucuf-workflow.js --source-dir fixtures/css-semantics/compound-selector --main-html input.html --screen-id test --bundle test
# diff 重構前後輸出，期望無差異

# 4. compute-gate
node tools_node/compute-gate.js --profile standard --agent-feedback
```

## ROLLBACK_HINT

```bash
git checkout tools_node/lib/dom-to-ui/draft-builder.js
rm -rf tools_node/lib/dom-to-ui/draft-builder/
```

## 建議作法

1. **先建 traverser**：把純 DOM 遞迴與型別推理（最少耦合）抽出，驗 self-test 通過
2. **typography 與 backgrounds 並行**：兩者依 traverser 但互不影響，可獨立抽出
3. **interactions 與 motion 最後**：通常依賴前三者的 context，需小心 closure 傳遞
4. **每抽一個模組**：跑一次 self-test + workflow CLI 對比，避免後期一次大爆炸
5. **保留 index.js 作 thin orchestrator**：確保現有 `require('./draft-builder')` 不破

## 交付物

- `tools_node/lib/dom-to-ui/draft-builder/traverser.js`（新建）
- `tools_node/lib/dom-to-ui/draft-builder/typography.js`（新建）
- `tools_node/lib/dom-to-ui/draft-builder/backgrounds.js`（新建）
- `tools_node/lib/dom-to-ui/draft-builder/interactions.js`（新建）
- `tools_node/lib/dom-to-ui/draft-builder/motion.js`（新建）
- `tools_node/lib/dom-to-ui/draft-builder/index.js`（新建）
- `tools_node/lib/dom-to-ui/draft-builder.js`（刪除或改為 shim）

## 估時

3-4 hours
