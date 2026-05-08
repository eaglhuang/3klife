---
doc_id: doc_task_0229
id: "H2U-REFACTOR-0006"
priority: "P2"
owner: "vs-insiders-gpt-5.4-mini"
status: "done"
started_at: "2026-05-05T12:00:00+08:00"
started_by_agent: "ClaudeCode_claude-sonnet-4-6"
completed_at: "2026-05-06T14:46:11.0367124+08:00"
completed_by_agent: "vs-insiders-gpt-5.4-mini"
type: "rule-governance"
phase: "G"
created: "2026-05-05"
created_by_agent: "ClaudeCode_claude-sonnet-4-6"
related_cards:
  - "H2U-REFACTOR-0002"
  - "PROG-2-0007"
depends: []
notes: "2026-05-06 | 狀態: done | 延續: ClaudeCode 先前已補入 fidelityThresholds / exemptCategories / knownGaps / draftBuilderStageRules registry data；本次補完 rule-guard enforcement、四維度 gate 與 zone-ownership known-gap 檢查、CLI help、self-test coverage | 驗證: node tools_node/test/dom-to-ui-self-test.js --group html-to-ucuf-fidelity-contract；node tools_node/test/dom-to-ui-self-test.js --group html-to-ucuf-active-contract（ALL PASS） | 阻塞: 無"
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

### 1. `fidelityThresholds`（四維度量化閘門）

舊的「adjustedScore >= 0.95」是單一數字，分責不清。新架構改為四個獨立維度，**全部同時達標才算 pass**：

```json
"fidelityThresholds": {
  "_schema": "v2-four-dimension",
  "_rationale": "Single adjustedScore mixes converter responsibility with platform limits. Split into 4 independent gates to assign blame correctly.",
  "dimensions": {
    "structural": {
      "metric": "zone_presence_rate",
      "formula": "presentRequiredZones / totalRequiredZones",
      "gate": "== 1.0",
      "tolerance": "±3px bbox match counts as present",
      "scope": "all required zones in layout-json",
      "note": "Hard gate — any missing required node = fail, regardless of other scores"
    },
    "colorFill": {
      "metric": "delta_e_pass_rate",
      "formula": "count(zones where mean_deltaE_CIE76 <= 5) / scorableZoneCount",
      "gate": ">= 0.92",
      "colorspace": "CIE76 delta-E",
      "thresholdPerZone": 5,
      "scope": "scorable zones only (excludes exemptCategories)",
      "interim": 0.85
    },
    "layoutGeometry": {
      "metric": "bbox_tolerance_pass_rate",
      "formula": "count(nodes where max(|Δw|,|Δh|,|Δx|,|Δy|) <= 3) / scorableNodeCount",
      "gate": ">= 0.90",
      "tolerancePx": 3,
      "scope": "scorable nodes only (excludes exemptCategories)",
      "interim": 0.80
    },
    "interactionSmoke": {
      "metric": "boolean",
      "formula": "all registered smoke routes return exit code 0",
      "gate": "== true",
      "scope": "interaction sidecar smoke routes listed in source package"
    }
  },
  "compositeScore": {
    "_note": "Kept for backward-compat reporting; does NOT alone determine pass/fail",
    "formula": "Σ(zone.colorPassBit * zone.areaWeight) / Σ(zone.areaWeight) over scorable zones",
    "weights": "proportional to zone pixel area in formal capture screenshot",
    "reportedAs": "cocosFinalGate.adjustedScore",
    "legacyTarget": 0.95,
    "legacyInterim": 0.85
  },
  "scorableAreaFormula": "totalViewportArea - Σ(exemptCategoryZone.area)",
  "interimNote": "interim thresholds apply while PROG-2-0010 multi-fixture matrix is incomplete"
}
```

**為什麼這樣設計**：`adjustedScore = 0.62` 時，若背景佔 25% viewport 面積且屬 EC-004（radial-gradient exempt），排除後轉換器負責的 UI 元素可能已有 0.92+ 的 colorFill。現行 metric 讓美術決策（複雜背景）決定工具鏈的成敗，分責不正確。

---

### 2. `exemptCategories`（11 項絕對排除）

以下 CSS 屬性 / 條件在計算 `colorFill` / `layoutGeometry` 時從分子和分母**同時排除**（不計分也不視為失敗）：

```json
"exemptCategories": [
  {
    "id": "EC-001", "name": "backdrop-filter",
    "cssProperties": ["backdrop-filter", "-webkit-backdrop-filter"],
    "reason": "No native compositor pass in Cocos runtime",
    "treatment": "exclude-from-score",
    "designGuidance": "Replace with opaque background layer or pre-baked asset"
  },
  {
    "id": "EC-002", "name": "box-shadow-inset-blur",
    "cssProperties": ["box-shadow"],
    "cssCondition": "inset === true AND blurRadius > 0",
    "reason": "Stencil/SDF rendering path unavailable in Cocos",
    "treatment": "exclude-from-score",
    "designGuidance": "Bake shadow into sprite or use solid border (mark as knownGap)"
  },
  {
    "id": "EC-003", "name": "text-shadow-multilayer",
    "cssProperties": ["text-shadow"],
    "cssCondition": "layerCount > 1",
    "reason": "Cocos Label supports single outline only",
    "treatment": "exclude-from-score",
    "designGuidance": "Use pre-rendered bitmapFont with glow effect"
  },
  {
    "id": "EC-004", "name": "non-linear-gradient",
    "cssProperties": ["background-image", "background"],
    "cssCondition": "gradientType IN [radial-gradient, conic-gradient]",
    "reason": "No non-uniform gradient shader in Cocos runtime",
    "treatment": "assetize-then-pass",
    "note": "Once assetization-required marker present AND runtimeAssetPath bound → counts as PASS, not exempt",
    "designGuidance": "Assetize to JPG/PNG at design resolution; bind via runtimeAssetPath"
  },
  {
    "id": "EC-005", "name": "pseudo-elements",
    "cssSelectors": ["::before", "::after"],
    "reason": "No Cocos node equivalent",
    "treatment": "mark-blocker-in-draft-builder",
    "designGuidance": "Convert to explicit child node or omit if purely decorative"
  },
  {
    "id": "EC-006", "name": "interactive-states",
    "cssSelectors": [":hover", ":focus", ":active", ":focus-visible"],
    "reason": "Static screenshot cannot capture interaction states",
    "treatment": "exclude-from-score",
    "designGuidance": "Verify via interaction smoke test dimension instead"
  },
  {
    "id": "EC-007", "name": "font-subpixel-antialiasing",
    "scope": "text rendering differences between browser FreeType/CoreText and Cocos FreeType",
    "reason": "Sub-pixel rendering is engine-specific, not controllable by converter",
    "treatment": "relaxed-threshold",
    "localDeltaETolerance": 10,
    "note": "Text zones use deltaE <= 10 (instead of default 5) in colorFill calculation"
  },
  {
    "id": "EC-008", "name": "clip-path-complex",
    "cssProperties": ["clip-path"],
    "cssCondition": "shape NOT IN [inset(), circle()]",
    "reason": "Cocos mask supports rectangle and circle only",
    "treatment": "exclude-from-score",
    "designGuidance": "Redesign to use rect/circle mask, or pre-clip in sprite asset"
  },
  {
    "id": "EC-009", "name": "css-animation-transition",
    "cssProperties": ["animation", "transition"],
    "cssAtRules": ["@keyframes"],
    "reason": "Static screenshot captures frame-0 only; full animation out of scope",
    "treatment": "exclude-from-score",
    "designGuidance": "Validate animated states via Cocos animation preview separately"
  },
  {
    "id": "EC-010", "name": "overflow-scroll-off-viewport",
    "cssProperties": ["overflow"],
    "cssCondition": "overflow IN [hidden, scroll] AND contentHeight > viewportHeight",
    "reason": "Only first-screen (non-scrolled) content captured in formal screenshot",
    "treatment": "exclude-from-score",
    "scope": "zones outside viewport rect only"
  },
  {
    "id": "EC-011", "name": "webfont-glyphs",
    "scope": "emoji, Noto edge cases, CJK extension characters",
    "reason": "Browser and Cocos font library differ in glyph coverage for uncommon characters",
    "treatment": "relaxed-threshold",
    "fallback": "compare font-size, line-height, color only; skip per-glyph pixel comparison"
  }
]
```

---

### 3. `knownGaps`（可接受的 gap，自動驗證時不視為失敗）

每個 entry 必須具備：`exemptCategoryRef` 或 `status = acceptable-regression`，且 `resolution` 非空。

```json
"knownGaps": [
  {
    "id": "KG-001", "slug": "history-not-story",
    "category": "semantic-classifier", "screenIds": ["*"],
    "status": "acceptable-regression", "exemptCategoryRef": null,
    "description": "history container 容易被 /story/ regex 誤分類；P4 已修但仍有 edge case",
    "scoreImpact": "structural — 最多 1 個 zone 誤分類",
    "maxAllowedOccurrences": 1,
    "resolution": "H2U-P4-014/015 active；further edge cases filed as new bugs"
  },
  {
    "id": "KG-002", "slug": "radial-slide-background",
    "category": "runtime-renderer", "screenIds": ["gacha-ds3"],
    "status": "blocker-pending-asset", "exemptCategoryRef": "EC-004",
    "description": "banner-bg-fill 1460x880 off-center radial gradient — assetization boundary confirmed",
    "scoreImpact": "colorFill + layoutGeometry 排除，不計分也不視為失敗",
    "resolution": "assetize 為 formal JPG；bind via runtimeAssetPath；排除後 score 重算為 pass"
  },
  {
    "id": "KG-003", "slug": "interaction-carousel",
    "category": "runtime-interaction", "screenIds": ["*"],
    "status": "smoke-only", "exemptCategoryRef": "EC-009",
    "description": "carousel 互動目前僅 smoke test 驗，formal 不要求 100% 像素對標",
    "scoreImpact": "interactionSmoke dimension only；colorFill / layoutGeometry 排除",
    "resolution": "by design — carousel frame-0 snapshot accepted；full animation out of scope"
  },
  {
    "id": "KG-004", "slug": "rarity-glow-multilayer",
    "category": "runtime-renderer", "screenIds": ["gacha-ds3"],
    "status": "acceptable-regression", "exemptCategoryRef": "EC-003",
    "description": "卡片稀有度光暈用 multi-layer text-shadow 實作；Cocos 降為 single outline",
    "scoreImpact": "colorFill — affected zones excluded from scoring",
    "resolution": "art-budget-constraint：single outline accepted；upgrade path is bitmapFont or pre-baked glow sprite"
  }
]
```

---

### 4. `validateDraftBuilderStageRules()` checker

- [ ] `rule-checkers` 新增 `validateDraftBuilderStageRules()`：遍歷 registry 的 `draftBuilderStageRules`，驗證 draft-builder.js 中每個 stage 的實作函式有對應的 rule ID 標記
- [ ] `validate-html-to-ucuf-rule-guard.js` 新增呼叫此 checker
- [ ] 自動驗證時 knownGaps 不再被誤判失敗（checker 讀 knownGaps.status 白名單）
- [ ] 新增 registry rule `H2U-P5-F001`（四維度閘門必須啟用）與 `H2U-P5-F002`（exempt 區域必須有 knownGaps entry 或 assetization-required 標記）

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
