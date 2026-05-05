---
doc_id: doc_task_0229
id: "H2U-REFACTOR-0006"
priority: "P2"
owner: "Unassigned"
status: "open"
type: "rule-governance"
phase: "G"
created: "2026-05-05"
created_by_agent: "ClaudeCode_claude-sonnet-4-6"
related_cards:
  - "H2U-REFACTOR-0002"
  - "PROG-2-0007"
depends: []
notes: "2026-05-05 | 狀態: open | 來源: html_skill_postmortem (doc_other_0026) §B2 / §E1 / §E2 | 阻塞: 無"
---

# [H2U-REFACTOR-0006] rule-registry 補 fidelityThresholds + knownGaps + draftBuilderStageRules 自動驗證

## 開單原因

`tools_node/lib/html-to-ucuf/rule-registry.json` 是 skill 的「正式真相來源」，但目前缺三個關鍵欄位導致：

1. **§E1**：`compare-html-to-cocos-editor.js:178` 的 `pixelDiff` 算法不透明，「95% fidelity」是 pixel coverage？SSIM？bucket coverage？SKILL.md 提到 0.95 但 registry 無公開定義
2. **§E2**：SKILL.md:120 列出 `history-not-story` / `radial-slide-background` / `interaction-carousel` 為已知 regression，但 registry 無 `knownGaps` 結構化欄位，自動驗證會誤判失敗
3. **§B2**：`draft-builder.js:11` require `DRAFT_BUILDER_STAGE_RULES` from registry，但 rule-checkers 並未遍歷檢查此段。等於 declared 但 unenforced — draft-builder 內部規則錯了不會被 rule-guard 抓到

## INPUT_CONTRACT

- `rule-registry.json` 當前已有 `currentExecutionSpec` 與 H2U-P5-* 規則
- `validate-html-to-ucuf-rule-guard.js` 已在 active 路徑
- 已知 regression 三個（history-not-story / radial-slide-background / interaction-carousel）

## OUTPUT_CONTRACT

- [ ] `rule-registry.json` 新增 `fidelityThresholds` 段：
  ```json
  "fidelityThresholds": {
    "pixelDiff": { "target": 0.95, "interim": 0.85, "metric": "adjustedScore" },
    "browserCoverage": { "target": 0.95, "metric": "adjustedCoverage" },
    "structuralSimilarity": { "target": 0.92, "metric": "ssim", "status": "future" }
  }
  ```
- [ ] `rule-registry.json` 新增 `knownGaps` 段：
  ```json
  "knownGaps": [
    {
      "id": "history-not-story",
      "category": "semantic-classifier",
      "screenIds": ["*"],
      "status": "acceptable-regression",
      "reason": "history container 容易被 /story/ regex 誤分類；P4 已修但仍有 edge case"
    },
    {
      "id": "radial-slide-background",
      "category": "runtime-renderer",
      "screenIds": ["gacha-ds3"],
      "status": "blocker-pending-asset",
      "reason": "radial-gradient 在 Cocos runtime 無原生路徑；改 blocker 等待 asset 解決"
    },
    {
      "id": "interaction-carousel",
      "category": "runtime-interaction",
      "screenIds": ["*"],
      "status": "smoke-only",
      "reason": "carousel 互動目前僅 smoke test 驗，formal 不要求 100% 對標"
    }
  ]
  ```
- [ ] `rule-checkers` 新增 `validateDraftBuilderStageRules()` checker，遍歷 registry 的 `draftBuilderStageRules` 並驗證 draft-builder.js 的階段標記
- [ ] `validate-html-to-ucuf-rule-guard.js` 自動驗證新三段
- [ ] 自動驗證時 knownGaps 不再被誤判失敗

## VALIDATION_CMD

```bash
# 1. registry 新三段存在且為合法 JSON
node -e "const r=require('./tools_node/lib/html-to-ucuf/rule-registry.json'); console.log('fidelity:', !!r.fidelityThresholds, 'gaps:', Array.isArray(r.knownGaps), 'stage:', Array.isArray(r.draftBuilderStageRules))"

# 2. rule-guard validator
node tools_node/validate-html-to-ucuf-rule-guard.js
# 期望: status=pass blockers=0

# 3. self-test
node tools_node/test/dom-to-ui-self-test.js

# 4. compute-gate
node tools_node/compute-gate.js --profile standard --agent-feedback
```

## ROLLBACK_HINT

```bash
git checkout tools_node/lib/html-to-ucuf/rule-registry.json
git checkout tools_node/lib/html-to-ucuf/rule-checkers.js  # 或 rule-checkers/ 視 0002 是否已先做
git checkout tools_node/validate-html-to-ucuf-rule-guard.js
```

## 建議作法

1. 先在 rule-registry.json 加 `fidelityThresholds` 與 `knownGaps` 兩段（純資料），跑 JSON.parse 確認格式正確
2. 在 rule-checkers 中加 `validateDraftBuilderStageRules()` checker（可用 base.js 的 helper）
3. validate-html-to-ucuf-rule-guard.js 加新檢查呼叫
4. self-test 補一個 fixture：故意違反一條 stage rule，期望 validator 抓到
5. 若 H2U-REFACTOR-0002 已先完成（rule-checkers 拆目錄），新檢查直接放 `rule-checkers/draft-builder.js`

## 交付物

- `tools_node/lib/html-to-ucuf/rule-registry.json`（新增三段）
- `tools_node/lib/html-to-ucuf/rule-checkers.js` 或 `rule-checkers/draft-builder.js`（新增 validator）
- `tools_node/validate-html-to-ucuf-rule-guard.js`（新增檢查呼叫）
- `tools_node/test/dom-to-ui-self-test.js`（新增 fixture 測試）

## 估時

2-3 hours
