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
  --capture-protocol <final-capture-protocol.json> \
  --capture-report <capture-report.json>
```

正式 source package 必須包含：

- `ui-design-tokens.json`
- `colors_and_type.css`
- 一個可解析的 main HTML

正式 final gate 也必須使用同一輪 formal capture 產出的 `capture-report.json`。該 report 至少要能證明：`expectedScreenId` 與 `actualScreenId` 都等於本輪 `--screen-id`、`captureMode=formal-html-to-ucuf`、含 `uiVersion / runtimeVersion`，並記錄 screen / layout / skin 的 runtime spec hash。沒有這些 metadata 時，final compare 只能算 capture authority blocker，不能算 converter fidelity 結果。

## Debug Entry

以下入口只能產生 `debugOnly=true`，不得有正式 pass verdict：

- `--input <html>`
- `--skip-editor-compare`
- `--no-runtime-sync`
- `--no-per-tab-replay`
- 缺 `--editor-screenshot`
- 缺 `--capture-protocol`
- 缺 `--capture-report`
- `capture-report` 來自 legacy product preview target，而不是 formal `UIScreenPreviewHost` route

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
- `H2U-P4-021 final-capture-target-must-match-screen-id`: formal final gate 的 capture target 必須符合本輪轉換的 screenId；`expectedScreenId` 或 `actualScreenId` 不一致時直接 blocker。
- `H2U-P4-022 final-capture-runtime-version-required`: formal capture 必須帶 `uiVersion / runtimeVersion` 與 screen / layout / skin runtime spec hash。
- `H2U-P4-023 no-legacy-preview-target-as-formal-gate`: legacy product preview target 只能做 regression / product smoke，不可當 HTML-to-UCUF formal gate 截圖來源。
- `H2U-P4-024 shared-source-package-root-resolution`: `--source-dir` 指到畫面資料夾時，resolver 必須能往上找到共用 token / CSS root，並在 manifest 記錄 root promotion。
- `H2U-P4-025 screen-local-token-regenerate-required`: 每次 workflow 都必須先清空舊的 screen-local token（replace-all-per-run），再由本輪 `*.token-suggestions.json` 全量重建，不可增量累加。
- `H2U-P4-026 screen-local-token-diff-required`: 每次 workflow 都必須輸出 screen-local token diff report，至少包含 `added / removed / persisted` 與計數，供治理追蹤。
- `H2U-P4-027 token-promotion-gate`: screen-local token 只有在「跨畫面出現次數 >= 2 且連續版本存活 >= 2」時才可升格到全域 token；否則維持 local。
- `H2U-P4-028 token-waiver-expiry-required`: literal color waiver 必須附 `owner / reason / expiresAtVersion`；過期後未處理不得宣稱治理通過。

## Validation Mechanism

新增守門器：

```bash
node tools_node/validate-html-to-ucuf-rule-guard.js --strict --report artifacts/html-to-ucuf-plan4-rule-guard.json
node tools_node/validate-html-to-ucuf-rule-guard.js --strict --capture-report <capture-report.json> --expected-screen-id <screen-id>
```

它會檢查：

- skill 文件與 Plan 4 入口是否一致。
- core workflow / converter / validator 是否殘留 screen-specific 分支。
- workflow summary 是否正確標記 `debugOnly`。
- tabbed source 是否完成 per-tab replay。
- runtime authority 是否為 synced final runtime JSON。
- radar composite 是否帶完整 SVG 幾何 payload。
- capture report 是否符合 H2U-P4-021~024 的 formal capture authority。
- screen-local token 是否每輪 replace-all 重建，並產出 diff report（H2U-P4-025/026）。
- waiver 是否有到期條件且未逾期（H2U-P4-028）。

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
  - formal final gate 是否使用 `captureMode=formal-html-to-ucuf`、同一張 screenshot hash、正確 `actualScreenId` 與 runtime spec hash。
  - token governance 是否有 `replace-all-per-run`、`added/removed/persisted` 差異與有效 waiver 到期資訊。
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
- `visualFidelityRisk.status`
- `visualFidelityRisk.blockerCount`
- `visualFidelityRisk.violations[]`
- `interactionRuntime.status`
- `interactionRuntime.actionsBound`
- `interactionRuntime.smokeResults[]`
- `captureAuthority.ok`
- `captureAuthority.captureMode`
- `captureAuthority.expectedScreenId`
- `captureAuthority.actualScreenId`
- `captureAuthority.runtimeSpecHash`
- `tokenGovernance.status`
- `tokenGovernance.mode`
- `tokenGovernance.localTokenPath`
- `tokenGovernance.diffReportPath`
- `tokenGovernance.diff.addedCount`
- `tokenGovernance.diff.removedCount`
- `tokenGovernance.diff.persistedCount`
- `nextFixes[]`

正式 pass 條件：

- converter pass
- preview diagnostic pass 或被允許略過
- Cocos Editor runtimeVsSource final gate pass
- Plan 4 rule guard pass
- visualFidelityRisk 無 blocker
- interactionRuntime pass
- captureAuthority pass，且 screenshot hash / screenId / runtime spec hash 都能對上同一輪 formal capture
- tokenGovernance 已完成 replace-all-per-run 且有 diff report（H2U-P4-025/026 blocker）
- 無 promotion-eligible 但未升格的 screen-local token（H2U-P4-027 blocker；promotion 條件：crossScreenCount >= 2 且 consecutiveVersions >= 2）
- 無過期 literal-color waiver（H2U-P4-028 blocker；waiver 必須附 owner/reason/expiresAtVersion）
- `debugOnly=false`

## Test Plan

固定驗收命令：

```bash
node --check tools_node/run-html-to-ucuf-workflow.js
node --check tools_node/render-html-tab-fragments.js
node --check tools_node/validate-html-to-ucuf-rule-guard.js
node tools_node/test/dom-to-ui-self-test.js --group html-to-ucuf-active-contract
node tools_node/validate-ui-specs.js --strict --rules tab-fragment-geometry-contract,composite-panel-tab-route-integrity,formal-skin-path,synced-runtime-path-freshness,background-layer-preservation,formal-visual-risk-path,runtime-interaction-smoke-path
node tools_node/validate-html-to-ucuf-rule-guard.js --strict --capture-report <capture-report.json> --expected-screen-id <screen-id>
node tools_node/validate-html-to-ucuf-rule-guard.js --strict --report artifacts/html-to-ucuf-plan4-rule-guard.json
node tools_node/run-html-to-ucuf-workflow.js --source-dir <source-package-dir> --main-html <relative-html> --screen-id <screen-id> --bundle <bundle> --skip-editor-compare --skip-compare
# 檢查 screen-local token 與 diff 是否存在
# assets/resources/ui-spec/screens/<screen-id>.local-tokens.json
# artifacts/skill-test-html-to-ucuf/<screen-id>/<screen-id>.local-token-diff.json
```

正式 Cocos Editor final gate 的 capture 必須先走資料驅動 route：

```bash
node tools_node/capture-ui-screens.js --formal-screen-id <screen-id> --uiVersion <workflow-uiVersion> --outDir <capture-out-dir> --maxWidth 0
node tools_node/compare-html-to-cocos-editor.js --source-dir <source-package-dir> --main-html <relative-html> --screen-id <screen-id> --editor-screenshot <capture-out-dir>/<screen-id>.png --capture-report <capture-out-dir>/capture-report.json --output <compare-out-dir>
```

若 `capture-report.json` 顯示 legacy target（例如 `Gacha` / `GachaMain`）或 `actualScreenId` 不等於本輪 screenId，該 compare 只能輸出 capture authority blocker，不可用來判斷 converter 是否達到 95%。

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
node tools_node/validate-ui-specs.js --strict --rules tab-fragment-geometry-contract,composite-panel-tab-route-integrity,formal-skin-path,synced-runtime-path-freshness,background-layer-preservation,formal-visual-risk-path,runtime-interaction-smoke-path
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
- `render-html-tab-fragments.js` 已支援 `data-tab`、`aria-controls`、`data-tab-content`，且 `.right-content` 只剩 `--allow-legacy-content-fallback` debug 入口；formal tab host 必須來自 data attribute / aria / contract。
- `UIScreenPreviewHost.ts` 已讓 `showScreen()` 自動載入 final synced interaction sidecar / tab-routing sidecar，並保留 `interactionRuntimeReport` 給 runtime smoke 讀取。
- `dom-to-ui-self-test.js` 已新增 `html-to-ucuf-fidelity-contract` 與六個實體 fixtures；nested spawn 若被 sandbox 擋住會標 `environment-blocked`。
- `validate-ui-specs.js` 已有 tab fragment geometry、formal skin path、synced runtime freshness，並補上 background layer preservation、formal visual risk path、runtime interaction smoke path。

### Progress Checklist

- [x] `docs/html_skill_plan4.md` 已建立 Plan 4.1 regression closure：semantic classifier、background fidelity、runtime interaction、formal gate。
- [x] `.github/skills/html-to-ucuf/SKILL.md` 已改成精簡 Plan 4.1 入口，移除舊 Phase B 長流程作為主入口。
- [x] 在 `rule-guard-rules.js` 登記 `H2U-P4-014` 到 `H2U-P4-020`，每條包含 `id / severity / scope / message / fixAction / owner / status`。
- [x] 在 `rule-guard.js` 補靜態掃描：裸 `story` regex、raw sidecar fallback、gradient-to-color downgrade、未執行 interaction sidecar、missing visual risk fields。
- [x] 在 `run-html-to-ucuf-workflow.js` 寫入 `visualFidelityRisk` 與 `interactionRuntime` summary contract，並把兩者納入 `workflowPass`。
- [x] 在 formal runtime sync 移除 raw sidecar fallback；final sidecar 缺失時直接 blocker，不能用 raw 代測。
- [x] 重寫 `draft-builder.js` story/story-strip classifier，改成 token-aware + attribute-aware + contract-aware，並新增 `history-not-story.html` 負向測試。
- [x] 擴充 background extraction，保留 `backgroundLayers[]`、`gradient.type=linear|radial`、stops、center、radius；unsupported layer 必須輸出 `unsupportedLayerRisk`。
- [x] 修改 `render-html-tab-fragments.js`，讓 `.right-content` fallback 只在 debug/warning 模式使用；formal tab host 必須來自 data attribute / aria / contract。
- [x] 修改 `UIScreenPreviewHost.ts`，讓 `showScreen()` 自動載入 final synced interaction sidecar / tab-routing sidecar，並輸出 runtime click smoke 結果。
- [x] 新增 `html-to-ucuf-fidelity-contract` self-test group 與 fixtures：`history-not-story.html`、`explicit-story-strip.html`、`radial-slide-background.html`、`multi-layer-background.html`、`interaction-carousel.html`、`non-ds3-tabbed.html`。
- [x] 擴充 `validate-ui-specs.js` strict rules：background layer preservation、formal visual risk path、runtime interaction smoke path。
- [ ] 最後跑正式驗收：`node --check` 主要工具、active contract、fidelity contract、`validate-ui-specs --strict`、`validate-html-to-ucuf-rule-guard --strict`、Cocos Editor final gate。已完成 `node --check`、active contract、fidelity contract、rule-guard strict；`validate-ui-specs --strict` 仍有 gacha 現況 blocker，Cocos Editor final gate 尚需實際 Editor 截圖與 capture report。

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
- [x] `render-html-tab-fragments.js` 已把 `.right-content` fallback 降為 debug-only：formal tab host 必須來自 attribute / aria / contract。
- [x] `UIScreenPreviewHost.ts` 已載入 final synced interaction sidecar / tab-routing sidecar，並提供 runtime smoke report。
- [x] `validate-ui-specs.js` 已補 background layer preservation、formal visual risk path、runtime interaction smoke path 等 strict rules。
- [x] 已新增實體 fixture 檔：`history-not-story.html`、`explicit-story-strip.html`、`radial-slide-background.html`、`multi-layer-background.html`、`interaction-carousel.html`、`non-ds3-tabbed.html`。
- [x] 修正 `dom-to-ui-self-test.js` 的 Plan4 runtime interaction smoke fixture：補齊 layout `canvas`（`designWidth=1920`、`designHeight=1080`），`html-to-ucuf-fidelity-contract` 再次全綠。
- [ ] Cocos Editor final gate 尚未在本輪重新跑 95% 相似度；目前缺本輪 Editor screenshot / capture protocol，不能宣稱 formal visual pass。
- [ ] 既有 runtime spec 仍有大量歷史 warning：舊 default skin 與舊 gradient slot 缺 `backgroundLayers[]`。新工具會防止新增，但舊產物需另排清理或重新轉換。

## Implementation Progress 2026-05-03 Rerun Closure

本節記錄這輪針對 gacha HTML rerun 暴露出的新缺口與修正結果。這些不是畫面補丁，而是工具鏈主流程的修正。

- [x] `dom-to-ui-json.js`：strict replay 現在可同時接 `--layout-input / --skin-input / --input`。layout/skin 仍以 optimized draft 為畫面權威，但 interaction、motion、tab-routing 等 sidecar 會由 source HTML 在 final replay 內重新產生，避免 final sidecar 被 strict replay 洗成空白。這不是 raw sidecar fallback。
- [x] `run-html-to-ucuf-workflow.js`：strict replay 正式傳入 `--input <ucuf-ready-html>`，讓 final authority 包含 source-derived sidecar。
- [x] `draft-builder.js`：`data-ucuf-tab-content`、`data-tab-content`、`role="tabpanel"` 會被視為 tab content host 並轉成 `lazySlot`；HTML `id` 也會保留為 layout `id`，讓 `openPanel / closeModal / aria-controls` 可以在 runtime 找到原始 target。
- [x] `render-html-tab-fragments.js`：tab fragment replay 改成優先使用 `data-ucuf-tab-content / data-tab-content / role=tabpanel`，再退到 `aria-controls / data-target`。這修掉 gacha dots 先抓到左側 banner slide、而不是右側 `RightPanel` 的錯誤。
- [x] `run-html-to-ucuf-workflow.js`：per-tab replay 在沒有可靠 final routing 時會直接由 source DOM discover tabs；若 routing 只包含 `pool-prev / pool-next` 這種 carousel sentinel，不會再拿它當內容 tab 清單。
- [x] `run-html-to-ucuf-workflow.js`：per-tab replay 會把成功產出的 fragments 回寫為 final `*.tab-routing.json`，並更新對應 lazySlot 的 `defaultFragment`。
- [x] `UIScreenPreviewHost.ts` 與 workflow smoke：interaction runtime smoke 已支援 carousel `pool-prev / pool-next` 與簡單 `openPanel / closeModal`。gacha runtime-sync debug run 顯示 `actionsBound=4/4`，`RightPanel` 可綁到 general / legendary / support fragments，history modal target 也可被找到。
- [x] `run-html-to-ucuf-workflow.js`：runtime sync 改為 source-authoritative；非 `--update-mode` 不再保留既有 runtime screen 欄位，避免舊 `content.source/state` 之類 preserve-human 殘留污染新 HTML 轉換。此點已改 code，但因本輪提權執行額度限制，尚待下一輪重跑 workflow 確認 runtime artifact 已清乾淨。
- [x] gacha debug rerun 驗證結果：per-tab replay 已從 `skipped:no-tab-routing` 修成 `fragmentCount=3`；fragment host 全部為 `RightPanel`；`ruleGuard.status=pass`；browser compare 約 `97.99%`；runtime sync 版本的 `interactionRuntime.status=pass`。
- [x] 已重跑 `--source-dir "Design System 3" --main-html "ui_kits/gacha/index.html"`（含 runtime sync）驗證 shared source package root：workflow summary 顯示 `tokens=source/ui-design-tokens.json`、`css=colors_and_type.css`、`warnings=[]`，`H2U-P4-009` 不再是 blocker。
- [ ] `validate-ui-specs --strict` 仍會掃到整個 repo 的歷史 default skin / 舊 gradient skin warnings；gacha 這輪真正需追的是重新跑 source-authoritative sync 後，`gacha-ds3.json` 不應再保留舊 content 欄位，且 tab route integrity 需決定 carousel sentinel 是否視為可接受替代 button contract。
- [ ] Cocos Editor final gate 尚未完成：仍需要本輪轉出的 synced runtime JSON、Editor screenshot、capture protocol，最後跑 `compare-html-to-cocos-editor` 驗 `runtimeVsSource.score >= 0.95`。

### Runtime Sync Follow-up（2026-05-03）

- 已執行：`node tools_node/run-html-to-ucuf-workflow.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --bundle lobby_ui --skip-editor-compare`
- 產出：`artifacts/skill-test-html-to-ucuf/gacha-ds3/gacha-ds3.workflow-summary.json`
- 核心結果：`ruleGuard.status=pass`、`plan4-rule-guard blockers=0`、`compare.adjustedCoverage=0.9798779899691358`
- 目前狀態：`debugOnly=true`（`editor-compare-skipped`、`editor-screenshot-missing`、`capture-protocol-missing`、`capture-report-missing`）
- readiness：`assets/resources/ui-spec/screens/gacha-ds3.readiness.json` 顯示 `readinessScore=0.708`、`verdict=not-ready`，主 blocker 為 final gate / zone ownership / node-count。

## Implementation Progress 2026-05-03 Formal Entry Closure

本節記錄本輪澄清「為什麼舊的 `--input` mode 讓 pixel-diff 卡在 98%」的根因，以及確認正式 source package 其實**不需要**逐一複製 tokens/css 的發現。

### 根因：`--use-computed-style` 只在 `--source-dir` 入口啟用

- `run-html-to-ucuf-workflow.js` 第 1094 行：`if (sourcePackage) baseArgs.push('--use-computed-style')`
- 使用 `--input <html>` 時 `sourcePackage=null`，瀏覽器不執行 JS，JS 動態建立的元素（如 banner slides）全部不可見。
- 使用 `--source-dir "Design System 3" --main-html "ui_kits/gacha/index.html"` 時，`resolveSourcePackage()` 解析成功，自動啟用 `--use-computed-style`，瀏覽器完整執行 JS，node count 從 38 提升到 76。
- **結論**：`--input` 永遠只能是 debug entry，任何 JS-generated element 存在的頁面都必須用 `--source-dir` 正式入口。

### DS3 共用 tokens/css 已在 DEFAULT candidates 中

- `resolveSourcePackage` 的 `DEFAULT_TOKEN_CANDIDATES`：`['ui-design-tokens.json', 'source/ui-design-tokens.json', ...]`
- `DEFAULT_CSS_CANDIDATES`：`['colors_and_type.css', 'design_handoff/colors_and_type.css']`
- 當 `sourceDir = "Design System 3"` 時，自動找到 `Design System 3/source/ui-design-tokens.json` 與 `Design System 3/colors_and_type.css`。
- DS3 下所有 HTML（gacha、character page 等）**共用這兩個檔案**，不需要在 `ui_kits/<screen>/` 下複製 per-page tokens/css。這不是 `H2U-P4-009` 的違規。

### gacha-ds3 本輪正式執行結果（2026-05-03）

- 指令：`node tools_node/run-html-to-ucuf-workflow.js --source-dir "Design System 3" --main-html "ui_kits/gacha/index.html" --screen-id gacha-ds3 --bundle lobby_ui --no-runtime-sync --skip-editor-compare`
- `--use-computed-style active: injected 123 computed snapshots`
- `raw.nodeCount=76`（前一輪 debug mode 為 38），`optimized.nodeCount=63`，`final.nodeCount=63`
- `BannerSlide_legendary`、`BannerSlide_support` JS-generated 節點已被正確捕捉
- `plan4-rule-guard=pass blockers=0`（從之前有 blocker 改善到 pass）
- `pixel-diff raw=98.0% adj=98.0%`（仍維持，說明 radial gradient 已進入 UCUF 但 preview renderer 的近似仍有 2% 差距）
- `readinessScore=0.792` verdict=not-ready，剩餘 blockers 均為 Cocos Editor final gate 流程
- `tabMounts 3/3 pass`（General / Legendary / Support tab fragments 均正常）

### 待解的 unmapped colors

下列顏色在 DS3 tokens 中查無對應，需補到 token 定義或補 art waiver：
- `rgb(206, 147, 216)` / `#CE93D8`（gacha 右側面板文字）
- `rgb(58, 48, 48)` / `#3a3030`（右側面板暗色背景）
- `rgb(200, 170, 255)` / `#c8aaff`（稀有度標籤色）
- `rgb(90, 62, 0)` / `#5a3e00`（傳奇色系深色）
- `rgb(104, 104, 104)`（進度條軌道色）

### 下一步

- [ ] 補上述 unmapped colors 到 `Design System 3/source/ui-design-tokens.json` 或 `colors_and_type.css`，或對這些顏色開 art waiver。
- [x] 執行 runtime sync（移除 `--no-runtime-sync`）把本輪產物部署到 `assets/resources/ui-spec/`。
- [ ] 產出 capture protocol + zone ownership + 觸發 Cocos Editor final gate，使 readiness 邁向 `ready`。
- [ ] 重跑 `--update-mode` 確認 tab fragment 寫入正確路徑。

## Implementation Progress 2026-05-03 Editor Final Gate Mismatch Closure

本節的裁決已回寫到主規則 `H2U-P4-021` 到 `H2U-P4-024`。後續 Agent 不需要再從案例段落推導規則，直接以 Non-Negotiable Rules 與 rule guard registry 為準。

本輪檢查 `artifacts/ui-qa/gacha-ds3-agent-review/gacha-ds3.html-cocos-compare.png` 後，判斷 8.95% 分數不是「最新版 converter 只剩一點 CSS 差異」的問題，而是正式 final gate 拿錯 runtime 入口在比對。HTML source package 已解析為 `Design System 3 / ui_kits/gacha/index.html`，並且有 `source/ui-design-tokens.json` 與 `colors_and_type.css`；但 `capture-report.json` 實際截圖為 `target=Gacha / screenId=GachaMain`，不是本輪轉換產物 `gacha-ds3` 的 final synced runtime screen。

### Root Cause

- `compare-html-to-cocos-editor.js` 目前只驗 PNG 與 capture protocol，沒有驗證 Editor screenshot 是由哪個 runtime screen / uiVersion / runtime spec hash 產生。
- `capture-ui-screens.js` 的 `Gacha` target 混用 `screenId: gacha-ds3` 與 `runtimeScreenId: GachaMain`；這會讓等待 ready 與報告 metadata 分裂，formal gate 看起來在驗 `gacha-ds3`，實際截到舊 `GachaMain` route。
- `capture-report.json` 也出現 `LoadingScene gacha preview: button not found` 系列 warning，代表此截圖路徑仍在走既有 Gacha 預覽程式，而不是 HTML-to-UCUF 產出的通用 `UIScreenPreviewHost.showScreen(gacha-ds3)` 正式入口。
- Unity 對照：這等同於用新 UI Toolkit document 產出 prefab 後，Play Mode test 卻還開舊的 `GachaMain` prefab；Game View diff 的結果只能證明測試入口錯，不應被歸因成 converter fidelity。

### New Non-Negotiable Rules

- `H2U-P4-021 final-capture-target-must-match-screen-id`: formal Cocos Editor final gate 的 capture report 必須明確記錄 `expectedScreenId` 與 `actualScreenId`，兩者不一致時直接 blocker。
- `H2U-P4-022 final-capture-runtime-version-required`: formal final gate 必須比對本輪 workflow `uiVersion / runtimeVersion / sourcePackage.hashes`，缺失或不一致時不可宣稱 pass。
- `H2U-P4-023 no-legacy-preview-target-as-formal-gate`: `Gacha`、`GachaMain` 這類產品舊 route 只能作 regression / product smoke，不可當 HTML-to-UCUF formal gate 的正式截圖入口。
- `H2U-P4-024 shared-source-package-root-resolution`: `--source-dir` 可指向畫面資料夾，但 resolver 必須能往上找到同一 source package root 的 tokens/css，並在 manifest 記錄 root promotion；找不到才觸發 `H2U-P4-009`。

### Tool Change Plan

- [x] 修正 `source-package.js`：當 `--source-dir` 指到 `Design System 3/ui_kits/gacha` 時，會自動提升 source package root 到 `Design System 3`，並解析 `source/ui-design-tokens.json` 與 `colors_and_type.css`。
- [x] 擴充 `capture-ui-screens.js`：新增 `--formal-screen-id <screenId>` 資料驅動入口，formal capture 不再依賴硬寫 `Gacha` target alias。
- [x] `capture-report.json` 增補 `expectedScreenId / actualScreenId / uiVersion / runtimeVersion / runtimeSpecHash / screenshotHash / captureMode=formal-html-to-ucuf`。
- [x] `compare-html-to-cocos-editor.js` 新增 `--capture-report`，比對 screenshot hash 與 screen metadata；若 screenshot 不屬於 `opts.screenId`，輸出 `H2U-P4-021` blocker，並把 verdict 標成 `invalid-gate-target-mismatch`。
- [x] `run-html-to-ucuf-workflow.js` 在 final gate 串入 `--capture-report`，缺 capture report 時 formal run 會變成 `debugOnly=true`，不可宣稱 pass。
- [x] `validate-html-to-ucuf-rule-guard.js` 可掃描 workflow summary / capture report，新增 `H2U-P4-021` 至 `H2U-P4-024` 的 artifact rules。
- [x] 新增 negative 驗證輸出：`artifacts/html-to-ucuf-plan4-capture-mismatch-rule-guard.json` 與 `artifacts/html-to-ucuf-plan4-capture-mismatch-compare/`，確認舊 `target=Gacha / screenId=GachaMain` 會被 blocker 擋下。
- [x] Cocos runtime 端補通用 formal preview route：`LoadingScene` 支援 `formalScreenId` query/localStorage，直接讓 `UIScreenPreviewHost.showScreen(screenId)` 載入本輪 synced final runtime JSON，避開產品舊流程。

### Checklist Impact

- [x] 目前 `gacha-ds3-agent-review` 的舊 capture report 已被 rule guard / compare gate 標記為 `invalid-gate-target-mismatch`，不可拿來評估 converter 95% fidelity。
- [ ] 下一次正式驗收要重新截取 `actualScreenId=gacha-ds3` 的 Cocos screenshot，再跑 `compare-html-to-cocos-editor`。
- [ ] 若 browser preview compare 仍約 97.99%，但 Cocos Editor final gate 低於 95%，分類必須改為 runtime renderer / capture route / Cocos UI feature gap，而不是 source converter 原始解析失敗。

### gacha-ds3 Residual Taxonomy

- spec residual：`gacha-ds3.readiness.json` 仍需以本輪 formal capture 重算；canonical zone ownership / bake manifest / visual sidecar 要與 final compare artifact 對齊；18 個動態文字需補 node-local bind / i18n / content contract；`node-count-blocker: 63 (>60)` 應優先從 inactive `historyModal` lazy/deferred 化處理。
- converter residual：zone ownership 若仍落在 `converter-geometry`，需回到 CSS mapper、background layer、token color、radial / multi-layer background 或 geometry mapping 修正；不可用 blanket waiver 洗分。
- runtime residual：formal capture 必須走 `--formal-screen-id gacha-ds3` 並驗 `actualScreenId=gacha-ds3`；若 browser compare 約 98% 但 Editor final gate 低於 95%，優先歸類為 Cocos renderer / runtime route / capture protocol gap。

## Implementation Notes

- 在 `draft-builder.js`、`UIScreenPreviewHost.ts`、`validate-html-to-ucuf-rule-guard.js` 的關鍵邊界，補簡短而有意義的繁體中文註解，說明為什麼不能再回到舊 fallback。
- radial gradient 若暫時只能近似渲染，必須在 summary 與 rule guard 中明示，不可默默當成 color pass。

- DS3 character page 可以保留為 fixture，但不得進入 core logic。
- `--update-mode` 只代表更新既有 runtime spec，正式新轉換預設仍是 source-authoritative。
- runtime asset preserve 只可在 update-mode 生效，且必須留下 asset audit。
- 關鍵程式碼註解使用繁體中文，說明「為什麼有這道守門」，不要只描述語法動作。
