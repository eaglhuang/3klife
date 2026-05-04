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
| `PROG-2-0005` | **in-progress** | runtime renderer parity closure | repeating-gradient + logger blocker slice 已落地；fresh final compare `adjustedScore=0.6206` 仍 fail；下一刀聚焦 title-block chip/glow、radial/filter/shadow parity |
| `PROG-2-0006` | open | generated spec authority hardening | raw/final/synced/runtime hash 與 update-mode/tab replay 防回退；formal summary 必須使用 full-size formal capture inputs，legacy product preview target 只能 diagnostic |
| `PROG-2-0007` | open | 95% regression matrix | 至少三個 source package 的 browser + Cocos final gate summary |
| `PROG-2-0008` | **done** | skill workflow rewrite | `rule-registry.json` 落地、registry-driven rule-guard、SKILL.md 改以 Plan5 為 current spec |
| `PROG-2-0009` | **in-progress** | final diff owner mapper / residual taxonomy hardening | Slice #1 已落地 `runtime-renderer` owner bucket、`nextFixes` 與 compact residual summary；selector / UCUF slot trace 仍 pending |

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
| D2 runtime renderer parity gap | repeating-gradient 已修，但 radial background、multi-layer text-shadow glow、box-shadow、filter、backdrop-filter 與 CSS 仍不等價 | `PROG-2-0005` |
| D3 stacking / overflow semantics gap | HTML banner stage 依賴 absolute positioning、z-index、overflow hidden 與 fade edge layers；UCUF skinLayers/children 順序不等於完整 CSS stacking context | `PROG-2-0004` / `PROG-2-0005` |
| D4 final-gate taxonomy gap | 舊版 `zone-ownership` 會把 top 20 diff zones 全歸 `converter-geometry`；Slice #1 已補 `runtime-renderer` owner bucket、`nextFixes` 與 compact residual summary，但 source DOM selector / UCUF slot trace 仍待後續接線 | `PROG-2-0009` |
| D5 authority / route workflow confusion | fresh final compare authority OK，但 r3 workflow summary 仍可呈現 `debugOnly=true`、`htmlCocosAdjustedScore=null`；debug summary 不得被當 formal final evidence | `PROG-2-0006` |
| D6 assetization boundary | 若 glow、blur、complex shadow 無法以 runtime 等價呈現，Plan5 應標 `assetization-required` 或 blocker，而不是 silent downgrade / pass | `PROG-2-0005` / `PROG-2-0007` |

已排除或降權的項目：手補 `GachaDs3_div_6/16/26` banner art placeholder skinLayers 後，runtime screenshot hash 有變但 score 仍約 `0.6206`，代表 banner art placeholder 已進入 runtime，但不是當前最大瓶頸。這個 patch 只能作為假設驗證證據，durable fix 仍必須落在 converter/layout generation 或 runtime renderer，而不是手修 generated JSON。

下一個最小 renderer parity slice 應以 banner title-block 為主：先保住 chip wrapper 的背景、border、padding、radius，再處理 `banner-hero-name` 的 glow/text-shadow 與 radial/filter/shadow runtime parity。完成後重跑 formal workflow，要求 final verdict 的 top residual 能指回具體 source selector、UCUF node/slot 與 runtime owner。

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