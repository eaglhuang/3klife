<!-- doc_id: doc_other_0021 -->
# HTML-to-UCUF Plan5: Final Fidelity and Rule Decay Closure

## 目的

Plan5 接在 `docs/html_skill_plan4.md` 之後，專門處理「HTML source 到 Browser preview 已高相似，但 Cocos Editor final gate 仍大幅失真」的缺口。目標不是把 `gacha-ds3` 生成檔手修到過關，而是讓 HTML-to-UCUF 工具、runtime renderer、final gate 診斷與 skill 流程都回到通用 UI 轉換原則。

本計畫的正式驗收門檻：代表性 source package 的 Cocos Editor final gate `adjustedScore >= 0.95`，且 failure 時必須輸出可執行的 blocker taxonomy 與 `nextFixes`。

## 目前證據

- Formal workflow 來源：`gacha-ds3` source package；`debugOnly=false`、`runtimeAuthority=synced-final-runtime-json`、`ruleGuard=pass`、`interactionRuntime=pass`、`tokenGovernance=pass`。
- Browser HTML-to-UCUF preview：`adjustedCoverage ~= 0.9799`，表示 source-to-generated-preview 的幾何與基本覆蓋已接近通過。
- Cocos Editor final gate：baseline `adjustedScore ~= 0.5567`；`PROG-2-0005` Slice #2 後 fresh final compare 提升到 `adjustedScore ~= 0.6206`，仍低於 `0.95` threshold。
- Capture authority：`expectedScreenId == actualScreenId == gacha-ds3`，本輪不是舊 `GachaMain` route mismatch。
- 2026-05-04 新 implementation cut：`PROG-2-0009` 先補 formal capture/compare protocol guard。正式 capture 必須 full-size，report 必須含 PNG dimensions、viewport、Canvas/GameDiv rect、Cocos runtimeGeometry；compare 若遇到 resized 或尺寸不符截圖，必須輸出 capture-protocol blocker，不得宣稱 `adjustedScore`。
- 現行矛盾：final gate fail 時，流程仍可能出現 `visualFidelityRisk.status=pass` 且 `nextFixes=[]`；這表示診斷契約不足，而不只是某個畫面沒調好。

## Plan4 未完成且仍必要的項目

- Cocos final gate 未達 `0.95`，尚未能作為正式 HTML-to-UCUF pass gate。
- Legacy strict warnings / old Plan2-Plan3 fallback 尚未全數盤點，skill 與腳本仍可能存在過期流程入口。
- Default skin、old gradient spec、flat color fallback、raw sidecar fallback 等路徑需要明確封存或 blocker 化。
- CSS selector / token / background / block-flow capability 還沒有完整能力矩陣，無法判斷「不支援」與「支援但實作錯」的差異。
- Runtime renderer 與 HTML/CSS 的 gradient、radial、repeating、shadow、rounded rect、background layers 視覺語意仍有 parity gap。
- Update-mode / tab replay / local tokens / skinLayers preservation 需要 authority-chain 驗證，避免下次轉換覆蓋掉正確資料。
- Visual risk 與 final compare 沒有把 primary-zone 差異回寫成可分派任務，導致低分沒有下一步。
- Regression matrix 仍以單一畫面為主，不足以證明工具通用性。

## 非目標

- 不手改 `assets/resources/ui-spec/*/gacha-ds3*` 當 durable fix。
- 不加入 `screenId === "gacha-ds3"` 之類的 converter / runtime 分支。
- 不用降低 threshold、改 compare crop、關掉效果或改 source HTML 來製造 pass。
- 不把 debug-only 參數如 `--input`、`--skip-editor-compare`、`--no-runtime-sync` 視為 formal pass。

## 根因分類

| 類別 | 說明 | 主要處理卡 |
|---|---|---|
| R1 舊規則殘留 | skill、workflow、validator 中仍有舊入口、fallback、互斥流程或 debug-only 正式化 | `PROG-2-0002` |
| R2 final gate 診斷不足 | 低分時沒有 blocker taxonomy、primary-zone diff、nextFixes | `PROG-2-0003` |
| R3 CSS 語意抽取不足 | selector、token、layout、background layers 的通用解析能力不完整 | `PROG-2-0004` |
| R4 runtime renderer parity gap | Cocos renderer 無法準確呈現 source-derived skin 語意 | `PROG-2-0005` |
| R5 generated spec authority gap | optimizer / sync / update-mode / tab replay 可能遺失 final authority | `PROG-2-0006` |
| R6 回歸矩陣不足 | 缺少多畫面 95% final-gate fixture pack | `PROG-2-0007` |
| R7 skill 路由過期 | skill 仍以 Plan4 為 current execution spec，未納入 Plan5 gate | `PROG-2-0008` |

## Plan5 Rule Delta

從 Plan5 開始，正式規則真相已經移到 `tools_node/lib/html-to-ucuf/rule-registry.json`；本節只記錄 Plan5 相對 Plan4 新增或調整的治理焦點。

- `H2U-P5-001`: current execution spec 改為 Plan5，且 skill 必須明講 `rule-registry.json` 才是正式 rule source。
- `H2U-P5-002`: stale-rule audit 要把舊規則分類成 `remove / migrate / keep / blocker`；這是 Plan5 清舊帳的治理入口。
- `H2U-P5-003`: Cocos final gate `< 0.95` 不只是不通過，還必須讓 workflow summary fail 並附 `nextFixes`。
- `H2U-P5-004`: Browser coverage 高但 Cocos score 低時，必須分類 root cause，而不是只回一個低分數字。
- `H2U-P5-005` 到 `H2U-P5-010`: 將 Plan4 的 screen-agnostic、CSS capability、fallback、authority chain、regression matrix、context budget 原則，提升成 Plan5 的治理層要求。

每條 `H2U-P5-*` 的正式 `status / checkerId / aliasOf / replacedBy / fixAction` 一律讀 `rule-registry.json`；Plan5 文件本身只保留差異、動機與決策紀錄。

## 任務卡 Checklist

| 卡號 | 狀態 | 目標 | 驗收重點 |
|---|---|---|---|
| `PROG-2-0001` | **done** | 建立 Plan5、任務卡與 shard bootstrap | Plan5 文件、任務 shard、skill authority 更新、encoding pass |
| `PROG-2-0002` | **done** | 舊規則與衝突流程審計 | 產出 `docs/html-to-ucuf-plan5-stale-rule-audit.md`；7 項盤點，無未分類 blocker |
| `PROG-2-0003` | **done** | final gate 診斷契約 | low-score blocker 已落地；下一步需把 `nextFixes` 從 H2U-P5-003 自身升級為 source DOM / UCUF slot / runtime owner 對應 |
| `PROG-2-0004` | open | CSS semantics extraction parity | selector/background/layout capability matrix；優先補 banner title-block chip wrapper、padding/border/radius 與 pseudo/dynamic DOM capability |
| `PROG-2-0005` | **in-progress** | runtime renderer parity closure | 0009 r2 已證明大框/底部按鈕 geometry 對齊；下一刀回到 `runtime-renderer background-image`，優先決定 radial background runtime parity fixture 或 manual-art-asset |
| `PROG-2-0006` | open | generated spec authority hardening | raw/final/synced/runtime hash 與 update-mode/tab replay 防回退；formal summary 必須使用 full-size formal capture inputs，legacy product preview target 只能 diagnostic |
| `PROG-2-0007` | open | 95% regression matrix | 至少三個 source package 的 browser + Cocos final gate summary |
| `PROG-2-0008` | **done** | skill workflow rewrite | `rule-registry.json` 落地、registry-driven rule-guard、SKILL.md 改以 Plan5 為 current spec |
| `PROG-2-0009` | **in-progress** | final diff owner mapper / residual taxonomy hardening | Slice #4 已落地：formal capture guard + runtimeGeometry + source-vs-Cocos geometry report；pull-bar absolute child flex 錯位已修，r2 最大主要 rect 誤差 0.5px |

## 執行順序

1. `PROG-2-0001`: 完成 Plan5 bootstrap，建立本文件與後續任務卡。
2. `PROG-2-0002`: 先盤點舊規則，避免後續修補又接回不合理流程。
3. `PROG-2-0003`: 先讓 fail 能說清楚原因，否則後續 renderer / converter 修補無法被可靠驗收。
4. `PROG-2-0004` + `PROG-2-0005`: 分別處理 source extraction 與 Cocos renderer parity，可平行但需共用 fixture taxonomy。
5. `PROG-2-0006`: 補 authority chain，避免工具重新跑後把修補結果蓋掉。
6. `PROG-2-0007`: 將修補收斂成 95% regression matrix。
7. `PROG-2-0008`: 將穩定流程回寫 skill，Plan5 成為新預設路由。
8. `PROG-2-0009`: 補 final diff owner mapping，讓後續低分 case 能直接派工而不是只回抽象 taxonomy。

## 95% 驗證矩陣

| Gate | 最低門檻 | Fail 時必備輸出 |
|---|---:|---|
| Browser HTML-to-UCUF preview | `adjustedCoverage >= 0.95` | source/CSS extraction blocker、zone summary |
| Cocos Editor final gate | `adjustedScore >= 0.95` | blocker taxonomy、primary-zone diff、`nextFixes`、`source DOM selector -> UCUF node/slot -> runtime owner` 對應 |
| Runtime interaction smoke | pass | failing route / tab / sidecar id |
| Rule guard strict | pass | violated H2U-P4/H2U-P5 rule id |
| Authority chain | pass | raw/final/synced/runtime hash mismatch |

## 後續回寫點

- `.github/skills/html-to-ucuf/SKILL.md`: authority order 改成 Plan5 current execution spec。
- `tools_node/lib/html-to-ucuf/rule-registry.json`: 作為唯一 machine-readable rule source。
- `tools_node/lib/html-to-ucuf/rule-checkers.js`: 各條規則的 checker 實作。
- `tools_node/run-html-to-ucuf-workflow.js`: summary 必須整合 Plan5 final-gate diagnosis 與 regression matrix。
- `tools_node/compare-html-to-cocos-editor.js`: 低分診斷輸出需足夠產生 `nextFixes`。
- `tools_node/lib/dom-to-ui/*`: CSS capability matrix 與 stage/ruleId registry。
- `assets/scripts/ui/core/UIPreviewStyleBuilder.ts`、`assets/scripts/ui/components/GradientBackground.ts`: renderer parity 與 blocker-safe fallback。
- `docs/tasks/tasks-prog.json`、`docs/agent-briefs/tasks/PROG-2-0001.md` 到 `PROG-2-0009.md`: Plan5 工作拆分真相。

## 審計追蹤

### PROG-2-0002 Stale Rule Audit（2026-05-04）

審計報告：`docs/html-to-ucuf-plan5-stale-rule-audit.md`

| 項目 | 分類 | 結論 |
|---|---|---|
| `sync-css-vars-to-tokens.js:2` Plan2 doc_id | migrate | 已修復：改為 Plan5 reference |
| `dom-to-ui-self-test.js:2177` Plan2 fixture | keep | 負向 fixture，驗證 H2U-P5-001；不移除 |
| `dom-to-ui-self-test.js:2461` Plan4 fixture | keep | 負向 fixture，驗證 Plan4 fidelity rules；不移除 |
| Plan4 inline 設計注解 | keep | 歷史 WHY 注解，不影響執行路徑 |
| `capture-ui-screens.js` gacha entries | keep | Screen registry，在正確位置，不是 core converter |
| `validate-ui-specs.js` default skin guard | keep | 這是 guard（blocker），不是 fallback 路徑 |
| debug-only CLI 旗標 | keep | `computeDebugOnly()` 已正確防護 |

**結論：無未分類 blocker，H2U-P5-002 由本審計滿足。**

### PROG-2-0003 Final Gate Diagnosis Contract（2026-05-04）

修復內容：`tools_node/run-html-to-ucuf-workflow.js`

- `assessVisualFidelityRisk(paths, metrics, opts)` 加入第三參數 `opts`（可攜帶 `finalScoreThreshold`）
- 當 `metrics.htmlCocos.runtimeVsSource.adjustedScore < threshold (0.95)` 時，發出 `H2U-P5-003` blocker violation
- `visualFidelityRisk.status` 正確反映 Cocos gate 失敗（不再靜默 pass）
- 新增 `htmlCocosAdjustedScore` 欄位到回傳物件
- Diagnostic fixture：`fixtures/html-to-ucuf-plan5/low-cocos-score-diagnosis.input.json / .expected.json`

**結論：Cocos adjustedScore < 0.95 時，`visualFidelityRisk.status = 'blocker'` 且 nextFixes 必含 H2U-P5-003 診斷條目。**

### PROG-2-0005 Runtime Parity Diagnostic Baseline（2026-05-04）

本輪重新以正式 source package + 新 runtime sync + 新 formal capture 重跑 `gacha-ds3`，目的是把舊 screenshot / 舊 hash 混用的疑慮排除，只留下目前工具鏈與 runtime 的真實差異。

- workflow rerun：`artifacts/skill-test-html-to-ucuf/gacha-ds3-rerun-20260504/gacha-ds3.workflow-summary.json`
- fresh formal capture：`artifacts/ui-qa/gacha-ds3-rerun-20260504/capture-report.json`
- final compare：`artifacts/skill-test-html-to-ucuf/gacha-ds3-rerun-20260504/final-gate/gacha-ds3.html-cocos-verdict.json`

核心結果：

- Browser HTML-to-UCUF preview 仍維持高分，`adjustedCoverage ~= 0.9799`
- 新的 Cocos Editor formal compare 仍為 `adjustedScore ~= 0.5567`
- `captureAuthority.ok = true`，且 `expectedScreenId == actualScreenId == gacha-ds3`
- 新 capture 帶出的 `uiVersion/runtimeVersion` 與 runtime spec hashes 一致，這輪失真不是 route/capture authority mismatch

目前判讀：

- `PROG-2-0006` 不是本輪主嫌；authority chain 與 capture authority 目前皆正常
- `PROG-2-0004` 仍有殘差，但不是第一主嫌；Browser 端接近通過，代表 source extraction 不是整頁失真的主因
- `PROG-2-0005` 為目前主軸：workflow warnings 主要集中在 `css-effect-needs-art-review`、`css-transform-manual-layout-risk`、`node-opacity-washes-children-risk`、`overflow-hidden-clipping-risk`、`z-index-manual-zorder-risk`
- `zone-ownership` 自動分類目前將前 20 個熱區都落到 `converter-geometry`；這個 taxonomy 對 gacha case 仍過粗，需結合 renderer warning 一起判讀，不可單看 taxonomy 就把問題全部歸給 0004

**結論：gacha-ds3 現在最應優先進入 `PROG-2-0005` 的 runtime parity 修補，次要才是 `PROG-2-0004` 的 converter geometry 殘差。**

### PROG-2-0005 Runtime Parity Slice #2（2026-05-04）

本輪先補 `repeating-linear-gradient(...)` 在 converter → skin → runtime 之間遺失週期資訊的缺口，再解除 formal capture 被舊 `UCUFLogger` import 卡死的 preview blocker，確認修補已經進入最新 synced runtime。

- workflow rerun：`artifacts/skill-test-html-to-ucuf/gacha-ds3-rerun-20260504-r3/gacha-ds3.workflow-summary.json`
- fresh formal capture：`artifacts/ui-qa/gacha-ds3-rerun-20260504-r3/capture-report.json`
- final compare：`artifacts/skill-test-html-to-ucuf/gacha-ds3-rerun-20260504-r3/final-gate/gacha-ds3.html-cocos-verdict.json`

核心結果：

- `tools_node/lib/dom-to-ui/snapshot-to-slots.js` 與 `tools_node/lib/dom-to-ui/draft-builder.js` 現在保留 `repeatSpanPx` / `repeatSpanRatio`；正式 `gacha-ds3.skin.json` 已寫入 `repeatSpanPx: 12`
- `assets/scripts/ui/components/GradientBackground.ts` 已按 repeat span 做 repeating linear gradient sample；`assets/scripts/ui/core/UIPreviewStyleBuilder.ts` 不再把 repeating gradient 降成 flat color fallback
- `assets/scripts/core/config/vfx-usage-table.ts`、`assets/scripts/core/managers/UIManager.ts`、`assets/scripts/ui/core/CompositePanel.ts` 的舊 `UCUFLogger` import 已改到 `core/utils/UCUFLogger`；fresh capture `pageErrorCount = 0`
- fresh final compare 為 `adjustedScore ~= 0.6206`，較 baseline `0.5567` 上升，但距離 `0.95` gate 仍遠

目前判讀：

- 本輪證明 repeating gradient 與 preview 啟動 blocker 確實是 runtime parity 缺口的一部分，但不是唯一主因
- 後續仍需沿著 final compare 熱區，繼續拆 shadow/filter/opacity/overflow/z-order 與 geometry ownership 的責任邊界

**結論：`PROG-2-0005` 已完成第 2 輪縮口修補；下一輪應以上述 fresh final compare 熱區為依據繼續收斂。**

### PROG-2-0005 Difference Source Analysis（2026-05-04）

本段把目前 skill 轉換後的 `gacha-ds3` Cocos 畫面與原始 HTML 的差異，拆成可分派的責任區。最新可引用 evidence 是 `artifacts/skill-test-html-to-ucuf/gacha-ds3-rerun-20260504-r3/final-gate/gacha-ds3.html-cocos-verdict.json`，`adjustedScore ~= 0.6206`，且 `captureAuthority.ok = true`；因此本輪主問題不再是 route/capture authority mismatch。

| 差異來源 | 觀察 | 主要處理卡 |
|---|---|---|
| D1 generated DOM structure loss | 原 HTML 的 `banner-event-chip` / `banner-guarantee-chip` 是帶背景、border、padding、radius 的 chip wrapper；目前 generated layout 多數落成 plain label，視覺重量與邊界都消失 | `PROG-2-0004`，協作 `PROG-2-0005` |
| D2 runtime renderer parity gap | repeating-gradient 已修，且單層 linear/radial/repeating gradient classifier 已對齊 runtime；剩餘主戰場收斂到 multi-layer text-shadow glow、box-shadow、filter、backdrop-filter 與 title-block 熱區 | `PROG-2-0005` |
| D3 stacking / overflow semantics gap | HTML banner stage 依賴 absolute positioning、z-index、overflow hidden 與 fade edge layers；UCUF skinLayers/children 順序不等於完整 CSS stacking context | `PROG-2-0004` / `PROG-2-0005` |
| D4 final-gate taxonomy gap | 舊版 `zone-ownership` 會把 top 20 diff zones 全歸 `converter-geometry`；Slice #1 已補 `runtime-renderer` owner bucket、`nextFixes` 與 compact residual summary，Slice #2 再把 bake-manifest + layout trace 接進 `sourceDomSelectors` / `ucufNodeSlots`，讓 nav-arrow / pool-brief / banner-bg-fill 類熱區可直接派工 | `PROG-2-0009` |
| D5 authority / route workflow confusion | fresh final compare authority OK，但 r3 workflow summary 仍可呈現 `debugOnly=true`、`htmlCocosAdjustedScore=null`；debug summary 不得被當 formal final evidence | `PROG-2-0006` |
| D6 assetization boundary | 若 glow、blur、complex shadow 無法以 runtime 等價呈現，Plan5 應標 `assetization-required` 或 blocker，而不是 silent downgrade / pass | `PROG-2-0005` / `PROG-2-0007` |

已排除或降權的項目：手補 `GachaDs3_div_6/16/26` banner art placeholder skinLayers 後，runtime screenshot hash 有變但 score 仍約 `0.6206`，代表 banner art placeholder 已進入 runtime，但不是當前最大瓶頸。這個 patch 只能作為假設驗證證據，durable fix 仍必須落在 converter/layout generation 或 runtime renderer，而不是手修 generated JSON。

下一個最小 renderer parity slice 仍以 banner title-block 為主，但現在不再盲修：先用 Slice #2 trace 對照 `div.nav-arrow.prev[2]`、`div.nav-arrow.next[3]`、`div#pool-brief.pool-brief[5]`、`div.banner-bg-fill[0]` 這批 bake-manifest-backed 熱區，區分哪些是 `backdrop-filter` / runtime blur 問題、哪些已因 gradient classifier stale 被誤送進 bake-manifest。之後再處理 chip wrapper、`banner-hero-name` glow/text-shadow 與剩餘 filter/shadow parity。完成後重跑 formal workflow，要求 final verdict 的 top residual 能指回具體 source selector、UCUF node/slot 與 runtime owner。

### Skill / Tool Flow Cleanup Analysis（2026-05-04）

stale-rule audit 已確認大多數舊機制不是未分類 blocker；本輪需要整理的是 formal failure 診斷與 debug/formal 邊界，而不是刪除所有 legacy 入口。

| 項目 | 判定 | Plan5 整理要求 |
|---|---|---|
| Debug-only workflow flags | keep | `--skip-editor-compare`、`--no-runtime-sync`、`--no-per-tab-replay` 等可保留，但 `computeDebugOnly()` 必須讓 summary 明確不可作 formal pass evidence |
| capture target registry | keep with guard | `Gacha` / `GachaFromLobby` 等 legacy product targets 可留作 diagnostic；formal gate 只認 `captureMode=formal-html-to-ucuf`、`actualScreenId=screenId` 與 runtime/version hash evidence |
| `visualFidelityRisk` status | fix | 若 final compare 缺失或 `htmlCocosAdjustedScore=null`，不得顯示一般 pass；應標 pending/debugOnly/blocker，避免誤讀 |
| `nextFixes` generation | fix | low-score `nextFixes` 不得只指向 H2U-P5-003 自身；必須帶 top residual owner bucket 與下一個可實作修補點 |
| `zone-ownership` taxonomy | in-progress | Slice #1 已落 `runtime-renderer` owner bucket、`nextFixes`、compact residual summary；下一刀要把 source DOM selector / UCUF node/slot trace 接進 final gate |

### PROG-2-0009 Owner Mapping Slice #1（2026-05-04）

- `tools_node/lib/dom-to-ui/zone-ownership.js` 已新增 `runtime-renderer` taxonomy、`ownerBucket`、`nextFixes` 與 `compactResidualSummary`。
- `tools_node/compare-html-to-cocos-editor.js` 的 verdict 現在會帶出 `zoneOwnership.nextFixes` 與 `zoneOwnership.compactResidualSummary`，讓 final gate 不再只回抽象 summary。
- 針對 `gacha` source package 做最小 offender 驗證時，`backdrop-filter` / `filter` 會把 pixel diff bucket 導向 `runtime-renderer-owner`，不再被預設壓成 `converter-geometry`。
- 本 slice 仍是 heuristic owner mapping：`traceability.sourceDomSelectors` / `ucufNodeSlots` 目前先留空並明確標 `selectorTracePending=true`；下一輪才補 selector / slot 的實線接點。

**結論：`PROG-2-0009` 已從「只有開卡」進入「可輸出 owner bucket 與 compact residual summary」階段；下一輪應接 selector / UCUF slot trace，讓 `PROG-2-0005` 的熱區能直接派工到具體 node/slot。**

### PROG-2-0009 Owner Mapping Slice #2（2026-05-04）

- `tools_node/compare-html-to-cocos-editor.js` 現在會自動讀取 `assets/resources/ui-spec/layouts/<screen>.layout.bake-manifest.json` 與對應 layout JSON，建立 final-gate trace catalog。
- `tools_node/lib/dom-to-ui/zone-ownership.js` 已支援 `traceCatalog`，會依 property + rect overlap 把 bake-manifest-backed residual 回填到 `traceability.sourceDomSelectors` 與 `traceability.ucufNodeSlots`。
- 目前 trace 可覆蓋的範圍是 bake-manifest-backed zones；以 `gacha-ds3` 來看，至少 `div.nav-arrow.prev[2]`、`div.nav-arrow.next[3]`、`div#pool-brief.pool-brief[5]`、`div.banner-bg-fill[0]` 這類 selector 已有現成 sidecar 真相可接線。
- compare verdict 也會帶出 trace catalog 來源路徑，方便之後追 `bake-manifest` / layout 真相，而不是只看抽象 taxonomy。
- 仍待補的範圍：尚未進 bake-manifest 的 partial-supported renderer gap（例如 multi-layer text-shadow）不會自動拿到 selector trace，仍需後續擴充。

**結論：`PROG-2-0009` 已進入「可把 bake-manifest-backed residual 指回 source selector / UCUF slot」階段；下一步是重跑 formal gacha workflow，產 fresh zone report，讓 0005 的修補從 heuristics 升級為 trace-backed 派工。**

### PROG-2-0009 Owner Mapping Slice #3（2026-05-04）

- `tools_node/lib/dom-to-ui/zone-ownership.js` 已收緊 `scoreTraceEntry()`：非重疊 bucket 現在必須通過更嚴格的 size-aware distance gate，避免把遠距 residual 誤貼到 `div.nav-arrow.prev[2]`、`div.nav-arrow.next[3]`、`div#pool-brief.pool-brief[5]` 這類 bake-manifest entry。
- `tools_node/test/dom-to-ui-self-test.js` 已補 near/far regression：近距 `backdrop-filter` bucket 仍可被正確 retarget 成 `runtime-renderer`，遠距 bucket 則必須維持 unmatched / `converter-geometry`。
- fresh compare 需看新的輸出目錄 `artifacts/skill-test-html-to-ucuf/gacha-ds3-rerun-20260504-r4/final-gate-tight/`；該份 zone report 顯示 top 20 zones 全數回到 `converter-geometry`，代表先前把 top residual 派給 blur/filter 的 heuristic 已被排除。
- 這也代表目前 bake-manifest-backed trace 只適合處理真正重疊的 blur/filter zone；對 `gacha-ds3` 這種 top residual 大多來自 non-bake 區域的 case，下一步需要新的 trace source（例如 css-coverage/source path 對 layout node 的映射），而不是再把 matching 放寬。

**結論：`PROG-2-0009` 本輪已把「錯誤派工」降到可接受範圍；接下來的重點不是再多抓幾個 blur selector，而是補 non-bake residual 的 source trace，讓 converter-geometry 熱區也能被準確指回 source DOM / generated node。**

### PROG-2-0005 Runtime Parity Slice #3（2026-05-04）

- `tools_node/lib/dom-to-ui/css-capability-matrix.js` 已把單層 `linear-gradient`、`radial-gradient`、`repeating-linear-gradient`、`repeating-radial-gradient` 在 `background` / `background-image` 的 classifier 對齊現有 runtime + `buildGradientRectSlot` 能力。
- 這刀的目的不是直接宣告 gacha 過關，而是先消除 classifier 舊規則造成的假 blocker：既然 `GradientBackground` 已支援 radial/repeating，而 draft builder 也能保留 `gradient.repeating` / `repeatSpan*`，single-layer radial/repeating 就不應繼續被算成 bake-only gap。
- 受這刀影響，下一次重跑 workflow 後，像 `banner-bg-fill` 的 radial background、`banner-art-placeholder` 的 repeating-linear gradient、以及 pull cost chip icon 的 radial gradient，不應再被舊 classifier 誤送進 bake-manifest。
- 這也讓 `PROG-2-0005` 的剩餘工作更乾淨：真正還要打的是 `backdrop-filter` / runtime blur、multi-layer glow/shadow，以及 title-block chip wrapper / text shadow 這些未等價項，而不是已經有 runtime path 的 gradient subtype。

**結論：`PROG-2-0005` Slice #3 先把 gradient subtype classifier 與 runtime 真相對齊，避免 formal residual 被舊 capability 假訊號污染；下一步要重跑 gacha formal workflow，確認 residual 是否收斂到 `backdrop-filter`、glow/shadow 與 title-block wrapper。**

### PROG-2-0005 Runtime Parity Slice #4（2026-05-04）

- fresh formal rerun 以 `artifacts/skill-test-html-to-ucuf/gacha-ds3-rerun-20260504-r4/final-gate-tight/` 為準：`adjustedScore` 仍約 `0.6206`，而 top residual 已被 `0009` 證明並不屬於 bake-manifest-backed blur/filter 區。
- 本輪已把 `tools_node/lib/dom-to-ui/css-capability-matrix.js` 的 gradient capability 邊界重新收斂：只把單層 `linear-gradient` / `repeating-linear-gradient` 視為 parity-safe，`radial-gradient` / `repeating-radial-gradient` / `conic-gradient` 一律回到 `assetize`。
- 這刀同時讓 `dom-to-ui-self-test.js` 的 R-24 自測重新對齊 fresh evidence；full self-test 現在只剩既有的 `v2 workflow source-dir exit=1` 噪音，gradient capability 相關 case 已回到 pass。
- 新的 debug rerun 以 `artifacts/skill-test-html-to-ucuf/gacha-ds3-rerun-20260504-r5-gradient-blocker/` 為準：`gacha-ds3.final.layout.bake-manifest.json` 已重新長出 `8` 個 entries，其中 `3` 個是既有 `backdrop-filter`，另外 `5` 個 `background-image` 重新把 `div#banner-stage...>div.banner-bg-fill[0]` 與 pull cost chip radial icon 標回 blocker / review-only。
- 本輪做了兩個鄰近 probe，結果都被 fresh compare 反證並已回退：
	- hero-name style/glow probe：`gacha-ds3.skin.json` 只調 `auto.gacha-ds3.gachads3_div_9` 後，分數降到約 `0.6199`。
	- `GradientBackground` 取樣解析度 probe：把大面積 gradient texture cap 拉高後，分數進一步降到約 `0.5600`。
- 因此 `0005` 的下一刀不應再用「hero-name glow」或「單純提高 gradient 解析度」做盲修；現在的正式起點應改成這批已重新 blocker 化的 `banner-bg-fill` radial 背景，再決定它們要走 runtime parity fixture 還是明確 `manual-art-asset` 路徑。

**結論：`PROG-2-0005` 本輪已把「誤判為 supported 的 radial gradient」重新拉回 blocker 真相。下一個有效 slice 不再是盲修 blur 或 hero-name，而是針對 `banner-bg-fill` 這批已重回 bake-manifest 的 radial 背景，決定真正的 runtime parity 或 artization 路徑。**

### PROG-2-0009 Capture/Geometry Slice #4（2026-05-04）

- `tools_node/capture-ui-screens.js` 現在會在 `captureMode=formal-html-to-ucuf` 時忽略縮圖 `maxWidth`，保留 full-size PNG；這避免 view hygiene 的 125px 縮圖污染正式 95% gate。
- capture report 新增 `captureProtocol`，記錄 `finalCompareEligible`、PNG 尺寸、viewport、deviceScaleFactor、toolbar/clip、Canvas/GameDiv rect 與 resize 結果；同時輸出 Cocos `runtimeGeometry`，包含 Canvas / `UIScreenPreviewHost` / gacha 大框與底部按鈕節點的 UITransform、Widget、world position。
- `tools_node/compare-html-to-cocos-editor.js` 新增 capture protocol gate：formal report 若缺 metadata、被標為非 final-compare eligible、PNG 尺寸與 viewport 不符，或 `--editor-screenshot` 不是同尺寸 full-size 圖，就以 `H2U-P4-024` blocker 中止，不再產生可宣稱的 score。
- 這一刀不是視覺微調；它是把「圖一與圖二的大色塊/框體/底部按鈕差距」先放進同一座標系量測。若 fresh runtimeGeometry 顯示 Cocos rect 偏離 source DOM rect，下一刀應先修 `UIScreenPreviewHost` 的 design-space wrapper；若 rect 已對齊，才回到 `PROG-2-0005` 的 radial 背景、shadow/glow、chip wrapper 等 renderer parity。

**結論：Plan5 下一輪 evidence 必須同時帶 source DOM rect、full-size formal Cocos screenshot、captureProtocol 與 runtimeGeometry；沒有這些資料的低分 compare 只能當 debug，不可當 95% formal gate 判讀。**

### PROG-2-0009 Capture/Geometry Slice #4 Result（2026-05-04）

- fresh r1 formal capture：`artifacts/ui-qa/gacha-ds3-formal-geometry-20260504-r1/capture-report.json`，`finalCompareEligible=true`、PNG `1920x1080`、Canvas/GameDiv/visibleSize 均為 `1920x1080`。這排除縮圖污染、route mismatch、Preview host 整體 resolution drift。
- r1 source-vs-Cocos geometry：`banner-stage`、`right-panel`、`pull-bar`、`pool-brief` 均在 1px 內，但 `.pull-btn.pull-single` / `.pull-btn.pull-ten` 對 Cocos `GachaDs3_div_43` / `GachaDs3_div_48` 有 `dx=-371.31px`。也就是按鈕尺寸正確、位置錯，且錯在 pull-bar flow。
- 根因：source `.pull-bar-pool` 是 `position:absolute`，不參與 flex；Cocos Layout 先前把帶 Widget 的 child 納入 horizontal Layout flow，並且 custom `justifyContent:center` 未 freeze，導致後續按鈕從 padding 起點排列。
- runtime 修補：`assets/scripts/ui/core/UIPreviewLayoutBuilder.ts` 現在會把非 fill Widget child 視為 CSS out-of-flow，不納入 main-axis distribution；遇到 out-of-flow 或 custom main-axis alignment 時 freeze Cocos Layout，避免下一輪 layout update 覆蓋自訂 flex 對齊。
- fresh r2 formal evidence：`artifacts/skill-test-html-to-ucuf/gacha-ds3-formal-geometry-20260504-r2/source-vs-cocos-geometry.json` 顯示主要 rect 最大誤差 `0.5px`，兩顆 pull buttons 都回到 source DOM 座標；final compare 從約 `0.6206` 升到約 `0.6467`。

**結論：使用者指出的底部大按鈕差距確實不是單純美術/色塊問題，而是 CSS absolute child + flex layout participation 的轉譯缺口。這個幾何根因已修正；剩餘低分仍大，下一輪應回到 `PROG-2-0005` 的 runtime-renderer background-image / radial assetization 邊界。**
| formal capture image size | fix | `capture-ui-screens.js` 預設 `maxWidth=125` 可保留給 view hygiene；formal compare input 必須強制 full-size（例如 `--maxWidth 0`）或標為 invalid/debug |
| P5 advisory rules | harden | `H2U-P5-006/007/008` 在 high-browser/low-Cocos case 至少要成為 mandatory evidence section；必要時升為 blocker |

**結論：Plan5 的下一個工具面重點是把「低分」變成「可派工的責任圖」，而不是再多產一個總分數。**

## 收斂定義

Plan5 只有在以下條件全部成立時才能標記完成：

- `PROG-2-0002` 的 stale-rule audit 沒有未分類 blocker。
- `PROG-2-0003` 讓 low-score final gate 自動產出可分派 `nextFixes`。
- `PROG-2-0004` 到 `PROG-2-0006` 修補後，正式 fixtures 不依賴 screen-specific branch。
- `PROG-2-0007` 的 regression matrix 顯示代表性 fixture Cocos final gate `adjustedScore >= 0.95`。
- `PROG-2-0008` 已把 Plan5 寫回 skill，後續 Agent 不會再依 Plan4 舊路徑開工。