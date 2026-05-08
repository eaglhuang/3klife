---
doc_id: doc_task_0227
id: "H2U-REFACTOR-0004"
priority: "P2"
owner: "vs-insiders-gpt-5.4-mini"
status: "done"
type: "refactoring"
phase: "G"
created: "2026-05-05"
created_by_agent: "ClaudeCode_claude-sonnet-4-6"
started_at: "2026-05-06T13:39:27.5799745+08:00"
started_by_agent: "vs-insiders-gpt-5.4-mini"
completed_at: "2026-05-06T13:39:27.5799745+08:00"
related_cards: []
depends: []
notes: "2026-05-06 | 狀態: done | 驗證: node --check tools_node/run-vfx-browser-qa.js；compute-gate standard 9/9 pass | 變更: 3 支 Phase B 工具移至 .deprecated，run-vfx-browser-qa.js 改接 core registry | 阻塞: none"
---

# [H2U-REFACTOR-0004] 隔離 Phase B 工具與修補死引用

## 開單原因

`.github/skills/html-to-ucuf/SKILL.md:115` 明文禁用 Phase B 工具，但下列 3 個檔案仍在 repo 且無 deprecation 標記：
- `tools_node/cutover-screen-variant.js`
- `tools_node/generate-tab-childpanels.js`
- `tools_node/runtime-screen-diff.js`

另有死引用：
- `tools_node/run-vfx-browser-qa.js` 仍 require `assets/scripts/tools/vfx-block-registry`，但該檔已刪（git status D）

新 agent 容易誤用這些工具或在執行 vfx-browser-qa 時遭遇 crash。

## INPUT_CONTRACT

- 3 支 Phase B 工具當前無人使用（grep 確認 0 import 來自 active workflow）
- vfx-block-registry 已從 `assets/scripts/tools/` 刪除

## OUTPUT_CONTRACT

- [x] 移 3 支 Phase B 工具到 `tools_node/.deprecated/`：
  - `cutover-screen-variant.js`
  - `generate-tab-childpanels.js`
  - `runtime-screen-diff.js`
- [x] 在 `.deprecated/` 加 `README.md` 說明：來源、棄用原因、復活路徑
- [x] 修補 `run-vfx-browser-qa.js`：移除 vfx-block-registry require，或刪除整個檔案（視該工具是否還活著）
- [x] grep 全 repo 確認 3 支被搬走的工具 0 個 active import
- [x] compute-gate standard 6/6 pass

## VALIDATION_CMD

```bash
# 1. 確認檔案已搬走
ls tools_node/.deprecated/
# 期望: 3 個檔 + README.md

# 2. grep 0 active import
grep -rn "cutover-screen-variant\|generate-tab-childpanels\|runtime-screen-diff" tools_node/ --exclude-dir=.deprecated
# 期望: 0 行

# 3. vfx-block-registry 死引用清理
grep -rn "vfx-block-registry" tools_node/
# 期望: 0 行（或指向新位置）

# 4. compute-gate
node tools_node/compute-gate.js --profile standard --agent-feedback
```

## ROLLBACK_HINT

```bash
git mv tools_node/.deprecated/cutover-screen-variant.js tools_node/
git mv tools_node/.deprecated/generate-tab-childpanels.js tools_node/
git mv tools_node/.deprecated/runtime-screen-diff.js tools_node/
git checkout tools_node/run-vfx-browser-qa.js
```

## 建議作法

1. 先 grep 確認沒有 active workflow 引用這 3 支工具
2. `git mv` 而非 `mv`，保留歷史
3. `.deprecated/README.md` 寫清楚：「這些工具已被 Plan5 主流程取代，僅保留歷史；若未來要復活，請先讀 plan5.md §X」
4. `run-vfx-browser-qa.js` 若 vfx-block-registry 真的不再需要，整個 require 段可刪；若需要，補新路徑
5. 完成後重跑 compute-gate

## 交付物

- `tools_node/.deprecated/cutover-screen-variant.js`（搬移）
- `tools_node/.deprecated/generate-tab-childpanels.js`（搬移）
- `tools_node/.deprecated/runtime-screen-diff.js`（搬移）
- `tools_node/.deprecated/README.md`（新建）
- `tools_node/run-vfx-browser-qa.js`（修改：移除死引用）

## 估時

0.5-1 hour
