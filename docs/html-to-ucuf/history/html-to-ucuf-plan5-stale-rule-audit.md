<!-- doc_id: doc_other_0016 -->
# HTML-to-UCUF Stale Rule Audit (Plan5)

**Generated:** 2026-05-04  
**Task:** PROG-2-0002  
**Auditor:** ClaudeCode_claude-sonnet-4-6 (co-executor, owner: GitHubCopilot)

## 審計範圍

審計對象：`tools_node/` 下所有 html-to-ucuf 相關腳本、lib、測試；`.github/skills/html-to-ucuf/SKILL.md`；`docs/html_skill_plan4.md`；`docs/html_skill_plan5.md`。

查找項目：
- Plan2 / Plan3 規則殘留
- 互相衝突或重複流程
- Screen-specific shortcut / hardcode
- Default skin fallback 未被 blocker 化
- Debug-only 路徑被正式化

---

## 審計結果

### 1. `tools_node/sync-css-vars-to-tokens.js:2` — 過期 doc_id 標頭

| 欄位 | 值 |
|---|---|
| 位置 | `tools_node/sync-css-vars-to-tokens.js` line 2 |
| 內容 | `// doc_id: doc_other_0011 — html_skill_plan2 M11` |
| 類型 | 過期 doc 參考（Plan2 → Plan5） |
| **分類** | **migrate** |
| 行動 | 移除 Plan2 doc_id 標頭；同一檔案仍適用於 Plan5（功能不變，只是文件參考過期） |
| 已修復 | ✓ 同次 commit |

---

### 2. `tools_node/test/dom-to-ui-self-test.js:2177` — Plan2 字串常量

| 欄位 | 值 |
|---|---|
| 位置 | `tools_node/test/dom-to-ui-self-test.js` line 2177 |
| 內容 | `skill: 'Plan 2 docs/html_skill_plan2.md is the formal execution spec.\n'` |
| 類型 | 負向測試 fixture（刻意注入舊內容以驗證規則偵測） |
| **分類** | **keep** |
| 原因 | 這是 `seedPlan4Repo()` 負向 fixture，植入舊 Plan2 字串目的是觸發 `H2U-P5-001`（execution-spec 非 Plan5）。移除會讓 self-test 的 negative case 失效。 |

---

### 3. `tools_node/test/dom-to-ui-self-test.js:2461` — Plan4 字串常量

| 欄位 | 值 |
|---|---|
| 位置 | `tools_node/test/dom-to-ui-self-test.js` line 2461 |
| 內容 | `skill: 'Plan 4 docs/html_skill_plan4.md is the current execution spec.\n'` |
| 類型 | 負向測試 fixture（驗證 Plan4 fidelity contract 規則偵測） |
| **分類** | **keep** |
| 原因 | 此 fixture 觸發 `H2U-P4-014/015/016/017/020`。Plan4 fidelity rules 仍 active，此 negative fixture 是必要的回歸保護。 |

---

### 4. `tools_node/*.js` — `Plan 4` / `Plan 4.1` inline 注解

| 欄位 | 值 |
|---|---|
| 位置 | `dom-to-ui-json.js:443`、`draft-builder.js:76,760,853,1032`、`run-html-to-ucuf-workflow.js:751,811,1133,1713`、`sidecar-emitters.js:270`、`validate-ui-specs.js:799,809` |
| 類型 | 設計決策歷史注解（記錄 Plan4 引入的原則） |
| **分類** | **keep** |
| 原因 | 這些是 `// Plan 4.1：...` 格式的 WHY 注解，說明為何採用當前邏輯。它們不是 enforced rule 也不會影響執行路徑。移除反而會讓未來維護者失去上下文。 |

---

### 5. `tools_node/capture-ui-screens.js:36-43` — gacha-ds3 screen 硬編條目

| 欄位 | 值 |
|---|---|
| 位置 | `tools_node/capture-ui-screens.js` lines 36-43 |
| 內容 | 多條 `{ id: 'GachaDs3Formal', screenId: 'gacha-ds3', ... }` |
| 類型 | Capture tool 的 screen registry（screen-specific，但在正確位置） |
| **分類** | **keep** |
| 原因 | `capture-ui-screens.js` 本身就是 screen registry，此處為設計，不是 core converter 的 screen-specific shortcut。規則 `H2U-P4-005` 的範圍是 `DEFAULT_CORE_FILES`（run-html-to-ucuf-workflow / render-html-tab-fragments / sidecar-emitters / readiness-gate / draft-builder / validate-ui-specs），不包含 capture-ui-screens.js。 |

---

### 6. `tools_node/validate-ui-specs.js:799-801` — default skin fallback check

| 欄位 | 值 |
|---|---|
| 位置 | `tools_node/validate-ui-specs.js` lines 799-801 |
| 內容 | `// Plan 4: 正式 HTML-to-UCUF 畫面不可再回退到舊的 <screenId>-default skin。` + 偵測邏輯 |
| 類型 | Default skin fallback 偵測（這是 guard，不是 fallback） |
| **分類** | **keep** |
| 原因 | 這是防護規則（blocker when `/-default$/`），不是允許 fallback 的程式碼。此 guard 在 Plan5 下仍需保留。 |

---

### 7. `tools_node/run-html-to-ucuf-workflow.js` — debug-only 旗標

| 欄位 | 值 |
|---|---|
| 位置 | CLI 旗標 `--skip-editor-compare`、`--no-runtime-sync`、`--no-per-tab-replay` |
| 類型 | Debug-only 旗標（已被 `computeDebugOnly()` 正確防護） |
| **分類** | **keep** |
| 原因 | `computeDebugOnly()` 追蹤這些旗標並設 `debugOnly: true`，阻止 `workflowPass = true`。Debug 路徑已被正式防護，無需移除。 |

---

## 行動摘要

| 項目 | 分類 | 已修復 |
|---|---|---|
| `sync-css-vars-to-tokens.js:2` Plan2 doc_id | migrate | ✓ |
| `dom-to-ui-self-test.js:2177` Plan2 fixture | keep | — |
| `dom-to-ui-self-test.js:2461` Plan4 fixture | keep | — |
| Plan4 inline 設計注解 | keep | — |
| `capture-ui-screens.js` gacha entries | keep | — |
| `validate-ui-specs.js` default skin guard | keep | — |
| debug-only CLI 旗標 | keep | — |

**結論：無未分類 blocker。唯一 migrate 項（Plan2 doc_id）已於同次 commit 修復。**

## 未修復但需追蹤的 open 項目

- `H2U-P5-002` (stale-rule-audit-artifact-required) 現在已由本審計滿足。
- 後續 PROG-2-0004/0005 若引入新 capability rule，需回來重跑審計。
