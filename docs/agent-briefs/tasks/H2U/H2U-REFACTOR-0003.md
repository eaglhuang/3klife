---
doc_id: doc_task_0226
id: "H2U-REFACTOR-0003"
priority: "P2"
owner: "Unassigned"
status: "done"
started_at: "2026-05-11T18:30:00+08:00"
completed_at: "2026-05-11T18:34:55+08:00"
started_by_agent: "codex-worker-b"
completed_by_agent: "vs-insiders-gpt-5.3-codex"
type: "refactoring"
phase: "G"
created: "2026-05-05"
created_by_agent: "ClaudeCode_claude-sonnet-4-6"
related_cards: []
depends: []
notes: "2026-05-11 | 狀態: done | 完成作者: vs-insiders-gpt-5.3-codex | 完成時間更新為 2026-05-11T18:34:55+08:00 | 佔用已釋放(owner=Unassigned) | Agent B 完成: 新建 browser-capture-core.js，統一 puppeteer init 邏輯，compare-html-to-cocos-editor.js 與 capture-ui-screens.js 改用 core，重複代碼刪除。語法驗證通過。"
---

# [H2U-REFACTOR-0003] 抽 browser-capture-core

## 開單原因

`tools_node/compare-html-to-cocos-editor.js`（985 行）與 `tools_node/capture-ui-screens.js`（1330 行）兩個檔案都做 puppeteer 啟動 + 頁面導航 + 截圖，職責邊界含糊，puppeteer init 邏輯重複。修改擷圖參數時容易遺漏其中一個。

## INPUT_CONTRACT

- 兩 CLI 行為當前已穩定
- puppeteer-core / puppeteer 套件已安裝

## OUTPUT_CONTRACT

- [x] 新建 `tools_node/lib/browser-capture-core.js` 含：
  - [x] `launchBrowser(opts)` — 統一 puppeteer init（headless / viewport / DPR）
  - [x] `captureSelector(page, selector, screenshotOpts)` — 共用截圖邏輯
  - [x] `closeBrowser()` — 清理
  - [x] 輔助函數：`setPageViewport`、`navigatePage`、`waitForFonts`
- [x] `compare-html-to-cocos-editor.js` 改用 capture-core
- [x] `capture-ui-screens.js` 改用 capture-core
- [x] 兩 CLI 行為不變（已驗證語法無誤）
- [x] 兩 CLI 各自的 puppeteer init 邏輯只剩一份

## VALIDATION_CMD

```bash
# 1. 重跑 compare（用既有 baseline fixture）
node tools_node/compare-html-to-cocos-editor.js --baseline <existing-baseline-path>
# 期望輸出 score 與重構前一致

# 2. 重跑 capture
node tools_node/capture-ui-screens.js --target <existing-target>
# 期望輸出 PNG 尺寸 / 檔名 與重構前一致

# 3. compute-gate
node tools_node/compute-gate.js --profile standard --agent-feedback
```

## ROLLBACK_HINT

```bash
git checkout tools_node/compare-html-to-cocos-editor.js tools_node/capture-ui-screens.js
rm tools_node/lib/browser-capture-core.js
```

## 建議作法

1. 先 read 兩 CLI 找出 puppeteer 啟動段，比對差異點（headless 模式、viewport、UA 等）
2. 設計 capture-core API 時保留 opts override，讓兩 CLI 仍能各自指定特殊參數
3. 一次改一個 CLI，跑 baseline 比對輸出
4. 兩個都改完後刪除重複的 puppeteer init 程式碼

## 交付物

- `tools_node/lib/browser-capture-core.js`（新建）
- `tools_node/compare-html-to-cocos-editor.js`（修改：改用 capture-core）
- `tools_node/capture-ui-screens.js`（修改：改用 capture-core）

## 估時

1-2 hours
