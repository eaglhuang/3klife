<!-- doc_id: doc_other_0020 -->
# HTML-to-UCUF Plan 4: 權威重整、通用化與自我驗證計畫

## Summary

HTML-to-UCUF 的正式主線固定為：

`source package -> final replay -> per-tab replay -> runtime sync -> Cocos Editor final gate`

Plan 4 的目的不是再加一層補丁，而是把舊規則殘留清掉，並把「下次不要再犯」做成可執行守門器。任何偏離正式主線的流程，都必須標成 `debugOnly=true` 或 `blocker`，不得產生正式 pass。

Unity 對照：這相當於把 UI Toolkit importer、Prefab postprocessor、Scene route sync、Game View diff gate 分清楚。Importer 可以 debug，但不能用 debug output 當正式 Prefab 驗收。

## Plan 4.1 Regression Closure

這一段是 Plan 4 的補強層，專門封住這次找到的三個根因：

1. `history` 被誤判成 `story`，導致錯誤的 `story-strip`。
2. radial / multi-layer background 被降級成純色，主視覺直接失真。
3. interaction sidecar 有輸出，但 Preview runtime 沒有真的執行。

### A. Semantic Classifier

- `draft-builder.js` 的 story 推論改成 token-aware、attribute-aware、contract-aware。
- 禁止 `/story/` 這種裸 substring 命中；`history`、`historical` 必須是明確負向測試。
- `story-strip` 只允許在 explicit attribute、contract tag，或多訊號共同成立時產生。

### B. Background Fidelity

- 背景層必須保留順序：`background-color` -> gradient -> image -> overlay。
- radial gradient 要保留幾何與色標；若 renderer 暫時不支援，就標 `blocker`，不能靜默轉成純色。
- multi-layer 背景若有任何一層無法等價落地，要在 summary 寫入 `unsupportedLayerRisk`。

### C. Runtime Interaction

- Preview runtime 必須載入 final synced interaction sidecar 與 tab routing sidecar，建立通用 binder。
- `tabSwitch` / carousel / prev-next 按鈕要用 runtime click smoke 驗證，不能只看 JSON 有沒有輸出。
- `UIScreenPreviewHost.showScreen` 只要有 sidecar，就要接上事件綁定與 smoke，而不是只載 layout / skin。

### D. Contract Surface And Gate

- `*.workflow-summary.json` 要新增 `visualFidelityRisk` 與 `interactionRuntime`。
- background contract 要保留 `backgroundLayers[]`、`gradient.type = linear | radial`、`gradient.stops[]`、`gradient.center / radius`、`unsupportedLayerRisk`。
- formal pass 只在 `ruleGuard` pass、`visualFidelityRisk.blockerCount=0`、`interactionRuntime.status=pass`、`runtimeVsSource` pass、`debugOnly=false` 時成立。

## Current Authority

- Plan 2: 歷史證據，只用來理解舊 Phase B / preserve-human / runtime-screen-diff 的來源。
- Plan 3: 最新規則來源，定義 source-authoritative、runtime sync、per-tab replay 與 Cocos Editor final gate。
- Plan 4: 目前執行規格，負責清除衝突邏輯並加入自我驗證。

## Formal Entry

正式流程只能使用：

```bash
node tools_node/run-html-to-ucuf-workflow.js \
  --source-dir <source-package-dir> \
  --main-html <relative-html> \
  --screen-id <screen-id> \
  --bundle <bundle> \
  --editor-screenshot <cocos-editor-screenshot.png> \
  --capture-protocol <final-capture-protocol.json>
```

正式 source package 必須包含：

- `ui-design-tokens.json`
- `colors_and_type.css`
- 一個可解析的 main HTML

## Debug Entry

以下入口只能產生 `debugOnly=true`，不得有正式 pass verdict：

- `--input <html>`
- `--skip-editor-compare`
- `--no-runtime-sync`
- `--no-per-tab-replay`
- 缺 `--editor-screenshot`
- 缺 `--capture-protocol`

## Non-Negotiable Rules

- `H2U-P4-001 formal-entry-source-package-only`: 正式流程必須用 `--source-dir --main-html --screen-id --bundle`；`--input` 只能 debug。
- `H2U-P4-002 editor-final-gate-required`: `--skip-editor-compare`、缺 editor screenshot 或缺 capture protocol 時，一律 debugOnly。
- `H2U-P4-003 runtime-sync-required`: `--no-runtime-sync` 一律 debugOnly。
- `H2U-P4-004 per-tab-replay-required-for-tabbed-source`: tabbed source 必須完成 per-tab replay 並產生本輪 fragment JSON。
- `H2U-P4-005 no-screen-specific-core-logic`: core workflow / converter / validator 不得硬寫 `character-ds3`、`CharacterDs3`、`gacha-ds3`、`div_6`、`div_8`、`button_4~9` 或 DS3 CSS fallback。
- `H2U-P4-006 no-raw-sidecar-repair`: strict replay 後不得把 raw interaction / fragment-routes / tab-routing 複製回 final。
- `H2U-P4-007 no-default-skin-formal-fallback`: readiness / formal validator 不得接受 `<screenId>-default` skin fallback。
- `H2U-P4-008 synced-final-runtime-authority-only`: final gate 與 readiness 只能讀 synced final runtime JSON。
- `H2U-P4-009 source-css-token-authority-required`: 正式流程缺 source CSS/tokens 必須 fail。
- `H2U-P4-010 data-driven-tab-routing`: tab id、fragment、mount、childPanelClass 只能由 HTML attributes、contract、screen package 或 naming policy 推導。
- `H2U-P4-011 svg-radar-chart-full-geometry`: `svg-radar-chart` 必須包含 `viewBox / center / axisLines / gridPolygons / valuePolygon / labels / textBox`。
- `H2U-P4-012 draft-builder-rule-registry-required`: 新增 draft-builder 規則前必須登記 stage、status、ruleId 與 test tag。
- `H2U-P4-013 skill-doc-current-entry`: skill 文件必須指向 Plan 4 作為目前執行規格。

- `H2U-P4-014 no-substring-semantic-classifier`: classifier scope 不可使用無邊界 substring regex；`history` 不能命中 `story`，要改成 token-aware 或 attribute-aware 判斷。
- `H2U-P4-015 story-strip-explicit-or-multi-signal`: `story-strip` 必須來自明確 attribute / contract，或至少兩個獨立訊號，不可只靠單一名稱相似度。
- `H2U-P4-016 no-gradient-to-color-downgrade`: gradient / image background 不可靜默降級成純色；若無法等價渲染，要保留風險或直接 blocker。
- `H2U-P4-017 radial-background-preserved-or-blocked`: radial gradient 必須保留幾何摘要與色標；若 runtime 不支援，要明示 blocker 或 assetization-required。
- `H2U-P4-018 runtime-interaction-sidecar-executed`: 只要有 interaction sidecar，formal flow 就必須在 Preview runtime 綁定並 smoke，不可只同步 JSON。
- `H2U-P4-019 visual-risk-blocks-formal-pass`: 主視覺區有 unmapped / fallback / downgrade 風險時，不可因為 CSS coverage 高就宣稱正式通過。
- `H2U-P4-020 formal-sidecar-authority-no-raw-fallback`: formal runtime sync 不得從 raw sidecar fallback 代測 final；缺資料要 fail，不能補洞洗過。

## Validation Mechanism

新增守門器：

```bash
node tools_node/validate-html-to-ucuf-rule-guard.js --strict --report artifacts/html-to-ucuf-plan4-rule-guard.json
```

它會檢查：

- skill 文件與 Plan 4 入口是否一致。
- core workflow / converter / validator 是否殘留 screen-specific 分支。
- workflow summary 是否正確標記 `debugOnly`。
- tabbed source 是否完成 per-tab replay。
- runtime authority 是否為 synced final runtime JSON。
- radar composite 是否帶完整 SVG 幾何 payload。

Report 固定欄位：

- `status`
- `blockerCount`
- `warningCount`
- `violations[]`

每筆 violation 必須包含：

- `ruleId`
- `severity`
- `summary`
- `evidence`
- `fixAction`

- validation 要額外掃：
  - classifier scope 是否還有無邊界 `story` regex。
  - formal runtime sync 是否還在吃 `rawLayout` sidecar fallback。
  - background parser 是否把 radial / multi-layer fallback 成純色。
  - Preview runtime 是否真的載入並執行 interaction sidecar。
- 任何 violation 都要把 `ruleId / evidence / fixAction` 寫完整，CLI 末尾再輸出 `nextFixes[]` 前三項，讓下一個 Agent 直接知道先修哪裡。

## Workflow Summary Contract

`*.workflow-summary.json` 必須包含：

- `debugOnly`
- `debugOnlyReasons[]`
- `runtimeAuthority.authority`
- `ruleGuard.status`
- `ruleGuard.blockerCount`
- `ruleGuard.warningCount`
- `ruleGuard.violations[]`
- `nextFixes[]`

正式 pass 條件：

- converter pass
- preview diagnostic pass 或被允許略過
- Cocos Editor runtimeVsSource final gate pass
- Plan 4 rule guard pass
- `debugOnly=false`

- `visualFidelityRisk.status`
- `visualFidelityRisk.blockerCount`
- `visualFidelityRisk.violations[]`
- `interactionRuntime.status`
- `interactionRuntime.actionsBound`
- `interactionRuntime.smokeResults[]`

甇?? pass 璇辣嚗?
- converter pass
- preview diagnostic pass ?◤?迂?仿?
- Cocos Editor runtimeVsSource final gate pass
- Plan 4 rule guard pass
- visualFidelityRisk 無 blocker
- interactionRuntime pass
- `debugOnly=false`

## Test Plan

固定驗收命令：

```bash
node --check tools_node/run-html-to-ucuf-workflow.js
node --check tools_node/render-html-tab-fragments.js
node --check tools_node/validate-html-to-ucuf-rule-guard.js
node tools_node/test/dom-to-ui-self-test.js --group html-to-ucuf-active-contract
node tools_node/validate-ui-specs.js --strict --rules tab-fragment-geometry-contract,composite-panel-tab-route-integrity,formal-skin-path,synced-runtime-path-freshness
node tools_node/validate-html-to-ucuf-rule-guard.js --strict --report artifacts/html-to-ucuf-plan4-rule-guard.json
```

若 sandbox 阻擋 nested spawn 或 browser compare，報告必須標 `environment-blocked`，不可把未執行誤判為 pass。

- 新增 regression fixtures：
  - `history-not-story.html`
  - `explicit-story-strip.html`
  - `radial-slide-background.html`
  - `multi-layer-background.html`
  - `interaction-carousel.html`
  - `non-ds3-tabbed.html`

驗收命令再補一個 group：
```bash
node tools_node/test/dom-to-ui-self-test.js --group html-to-ucuf-active-contract
node tools_node/test/dom-to-ui-self-test.js --group html-to-ucuf-fidelity-contract
node tools_node/validate-ui-specs.js --strict --rules tab-fragment-geometry-contract,composite-panel-tab-route-integrity,formal-skin-path,synced-runtime-path-freshness
node tools_node/validate-html-to-ucuf-rule-guard.js --strict --report artifacts/html-to-ucuf-plan4-rule-guard.json
```

若環境阻擋 nested spawn 或 browser compare，測試報告要明確標 `environment-blocked`，不能把它算成 pass 或 fail。

## Plan 4.2 Skill Flow Audit

本段是 2026-05-03 對 `html-to-ucuf` skill 入口與主要腳本的流程體檢。結論：文件與 skill 入口已經轉向 Plan 4.1，但 code 層還有幾個守門器沒有追上，不能把目前狀態視為真正完成。

### Audit Findings

- `rule-guard-rules.js` 目前只登記到 `H2U-P4-013`；Plan 4.1 已要求 `H2U-P4-014` 到 `H2U-P4-020`，registry / rule guard / self-test 還沒有同步。
- `rule-guard.js` 目前主要掃 screen-specific、default skin、raw repair、tab routing、radar geometry；尚未掃 `story` 裸 substring、gradient-to-color downgrade、radial geometry preservation、runtime interaction sidecar execution、visual risk gate。
- `run-html-to-ucuf-workflow.js` 的 `workflowPass` 仍只看 converter / preview diagnostic / editor final / rule guard / debugOnly；尚未把 `visualFidelityRisk` 與 `interactionRuntime` 納入正式 pass 條件。
- `run-html-to-ucuf-workflow.js` 的 runtime sync 仍有 `finalLayout sidecar -> rawLayout sidecar` 的 fallback；這和 `H2U-P4-020 formal-sidecar-authority-no-raw-fallback` 衝突，正式流程應缺 final sidecar 就 fail。
- `draft-builder.js` 仍有 `/story|chronicle|storydock|story-strip|strip-wrap/` 這類 substring semantic classifier，`history` 仍可能被誤判成 `story`。
- `draft-builder.js` 的 gradient slot 目前只接受 linear gradient；radial 或 multi-layer 仍可能被轉成風險、unmapped 或純色 fallback，尚未形成完整 `backgroundLayers[]` contract。
- `render-html-tab-fragments.js` 已支援 `data-tab`、`aria-controls`、`data-tab-content`，但仍把 `.right-content` 當 fallback host；正式流程要把此 fallback 標為 warning/debugOnly，避免非 DS3 畫面抓錯 content host。
- `UIScreenPreviewHost.ts` 已有手動 `installTabSwitchHook()`，但 `showScreen()` 尚未自動載入 final synced interaction sidecar / tab-routing sidecar，也沒有 runtime click smoke result。
- `dom-to-ui-self-test.js` 目前只有 `html-to-ucuf-active-contract`；Plan 4.1 要求的 `html-to-ucuf-fidelity-contract` 與 fixtures 尚未落地。
- `validate-ui-specs.js` 已有 tab fragment geometry、formal skin path、synced runtime freshness；尚未驗 `visualFidelityRisk`、`interactionRuntime`、backgroundLayers / radial preservation。

### Progress Checklist

- [x] `docs/html_skill_plan4.md` 已建立 Plan 4.1 regression closure：semantic classifier、background fidelity、runtime interaction、formal gate。
- [x] `.github/skills/html-to-ucuf/SKILL.md` 已改成精簡 Plan 4.1 入口，移除舊 Phase B 長流程作為主入口。
- [ ] 在 `rule-guard-rules.js` 登記 `H2U-P4-014` 到 `H2U-P4-020`，每條包含 `id / severity / scope / message / fixAction / owner / status`。
- [ ] 在 `rule-guard.js` 補靜態掃描：裸 `story` regex、raw sidecar fallback、gradient-to-color downgrade、未執行 interaction sidecar、missing visual risk fields。
- [ ] 在 `run-html-to-ucuf-workflow.js` 寫入 `visualFidelityRisk` 與 `interactionRuntime` summary contract，並把兩者納入 `workflowPass`。
- [ ] 在 formal runtime sync 移除 raw sidecar fallback；final sidecar 缺失時直接 blocker，不能用 raw 代測。
- [ ] 重寫 `draft-builder.js` story/story-strip classifier，改成 token-aware + attribute-aware + contract-aware，並新增 `history-not-story.html` 負向測試。
- [ ] 擴充 background extraction，保留 `backgroundLayers[]`、`gradient.type=linear|radial`、stops、center、radius；unsupported layer 必須輸出 `unsupportedLayerRisk`。
- [ ] 修改 `render-html-tab-fragments.js`，讓 `.right-content` fallback 只在 debug/warning 模式使用；formal tab host 必須來自 data attribute / aria / contract。
- [ ] 修改 `UIScreenPreviewHost.ts`，讓 `showScreen()` 自動載入 final synced interaction sidecar / tab-routing sidecar，並輸出 runtime click smoke 結果。
- [ ] 新增 `html-to-ucuf-fidelity-contract` self-test group 與 fixtures：`history-not-story.html`、`explicit-story-strip.html`、`radial-slide-background.html`、`multi-layer-background.html`、`interaction-carousel.html`、`non-ds3-tabbed.html`。
- [ ] 擴充 `validate-ui-specs.js` strict rules：background layer preservation、formal visual risk path、runtime interaction smoke path。
- [ ] 最後跑正式驗收：`node --check` 主要工具、active contract、fidelity contract、`validate-ui-specs --strict`、`validate-html-to-ucuf-rule-guard --strict`、Cocos Editor final gate。

### Tracking Notes

- `DS3` / `gacha-ds3` 只能保留為 fixture 與 regression case，不能進 core converter / workflow / validator。
- CSS coverage 高不代表 formal pass；只要主視覺區存在 downgraded background、unmapped layer、未執行 interaction，都必須先 blocker。
- Unity 對照：這份 checklist 是把 importer、Prefab/Scene sync、Play Mode interaction smoke、Game View final compare 拆成獨立 gate，避免其中一層成功掩蓋另一層失敗。

## Implementation Progress 2026-05-03

以下進度以本節為最新狀態；上方稽核清單保留原始盤點脈絡。

- [x] `rule-guard-rules.js` 已登記 `H2U-P4-014` 到 `H2U-P4-020`，包含 severity、scope、message、fixAction、owner、active status。
- [x] `rule-guard.js` 已新增第一批 Plan 4.1 靜態掃描：無邊界 story regex、story-strip 非明確來源、gradient 降級、radial 未保留、raw sidecar fallback、visual risk summary、interaction runtime summary。
- [x] `run-html-to-ucuf-workflow.js` 已把 `visualFidelityRisk` 與 `interactionRuntime` 寫進 workflow summary，並納入 formal `workflowPass` 條件。
- [x] formal runtime sync 已移除 raw sidecar fallback；final sidecar 缺漏不再用 raw 產物補洞。
- [x] `draft-builder.js` 已把 story/story-strip 推論改成 token-aware / attribute-aware / contract-aware，避免 `history`、`historical` 誤中 `story`。
- [x] `draft-builder.js` 已開始保留 radial / multi-layer background contract，輸出 `backgroundLayers[]` 與 gradient metadata，不再把非 linear gradient 靜默丟掉。
- [x] 新增 `html-to-ucuf-fidelity-contract` self-test group，會抓 `H2U-P4-014`、`015`、`016`、`017`、`018`、`019`、`020` 的 seeded regression。
- [x] 已跑過 `node --check`、`html-to-ucuf-active-contract`、`html-to-ucuf-fidelity-contract`、`validate-html-to-ucuf-rule-guard --strict`，目前全部通過。
- [ ] `render-html-tab-fragments.js` 尚待把 `.right-content` fallback 降為 debug/warning，formal tab host 必須來自 attribute / aria / contract。
- [ ] `UIScreenPreviewHost.ts` 尚待載入 final synced interaction sidecar / tab-routing sidecar，並產出實際 runtime click smoke 結果。
- [ ] `validate-ui-specs.js` 尚待補 background layer preservation、formal visual risk path、runtime interaction smoke path 等 strict rules。
- [ ] 尚待新增實體 fixture 檔：`history-not-story.html`、`explicit-story-strip.html`、`radial-slide-background.html`、`multi-layer-background.html`、`interaction-carousel.html`、`non-ds3-tabbed.html`。
- [ ] Cocos Editor final gate 尚未在本輪重新跑 95% 相似度；必須等 runtime interaction smoke 與 validate-ui-specs 新規則完成後再宣稱 formal pass。

## Implementation Notes

- 在 `draft-builder.js`、`UIScreenPreviewHost.ts`、`validate-html-to-ucuf-rule-guard.js` 的關鍵邊界，補簡短而有意義的繁體中文註解，說明為什麼不能再回到舊 fallback。
- radial gradient 若暫時只能近似渲染，必須在 summary 與 rule guard 中明示，不可默默當成 color pass。

- DS3 character page 可以保留為 fixture，但不得進入 core logic。
- `--update-mode` 只代表更新既有 runtime spec，正式新轉換預設仍是 source-authoritative。
- runtime asset preserve 只可在 update-mode 生效，且必須留下 asset audit。
- 關鍵程式碼註解使用繁體中文，說明「為什麼有這道守門」，不要只描述語法動作。
