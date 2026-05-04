<!-- doc_id: doc_other_0021 -->
# HTML-to-UCUF Plan5: Final Fidelity and Rule Decay Closure

## 目的

Plan5 接在 `docs/html_skill_plan4.md` 之後，專門處理「HTML source 到 Browser preview 已高相似，但 Cocos Editor final gate 仍大幅失真」的缺口。目標不是把 `gacha-ds3` 生成檔手修到過關，而是讓 HTML-to-UCUF 工具、runtime renderer、final gate 診斷與 skill 流程都回到通用 UI 轉換原則。

本計畫的正式驗收門檻：代表性 source package 的 Cocos Editor final gate `adjustedScore >= 0.95`，且 failure 時必須輸出可執行的 blocker taxonomy 與 `nextFixes`。

## 目前證據

- Formal workflow 來源：`gacha-ds3` source package；`debugOnly=false`、`runtimeAuthority=synced-final-runtime-json`、`ruleGuard=pass`、`interactionRuntime=pass`、`tokenGovernance=pass`。
- Browser HTML-to-UCUF preview：`adjustedCoverage ~= 0.9799`，表示 source-to-generated-preview 的幾何與基本覆蓋已接近通過。
- Cocos Editor final gate：`adjustedScore ~= 0.5567`，低於 `0.95` threshold。
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
| `PROG-2-0003` | **done** | final gate 診斷契約 | `assessVisualFidelityRisk()` 加入 Cocos score 偵測；`visualFidelityRisk.status` 正確反映 gate 失敗；diagnostic fixture 產出 |
| `PROG-2-0004` | open | CSS semantics extraction parity | selector/background/layout capability matrix 與非 gacha fixture |
| `PROG-2-0005` | open | runtime renderer parity closure | gradient/background/shadow/rounded rect 不再靜默降級 |
| `PROG-2-0006` | open | generated spec authority hardening | raw/final/synced/runtime hash 與 update-mode/tab replay 防回退 |
| `PROG-2-0007` | open | 95% regression matrix | 至少三個 source package 的 browser + Cocos final gate summary |
| `PROG-2-0008` | **done** | skill workflow rewrite | `rule-registry.json` 落地、registry-driven rule-guard、SKILL.md 改以 Plan5 為 current spec |

## 執行順序

1. `PROG-2-0001`: 完成 Plan5 bootstrap，建立本文件與後續任務卡。
2. `PROG-2-0002`: 先盤點舊規則，避免後續修補又接回不合理流程。
3. `PROG-2-0003`: 先讓 fail 能說清楚原因，否則後續 renderer / converter 修補無法被可靠驗收。
4. `PROG-2-0004` + `PROG-2-0005`: 分別處理 source extraction 與 Cocos renderer parity，可平行但需共用 fixture taxonomy。
5. `PROG-2-0006`: 補 authority chain，避免工具重新跑後把修補結果蓋掉。
6. `PROG-2-0007`: 將修補收斂成 95% regression matrix。
7. `PROG-2-0008`: 將穩定流程回寫 skill，Plan5 成為新預設路由。

## 95% 驗證矩陣

| Gate | 最低門檻 | Fail 時必備輸出 |
|---|---:|---|
| Browser HTML-to-UCUF preview | `adjustedCoverage >= 0.95` | source/CSS extraction blocker、zone summary |
| Cocos Editor final gate | `adjustedScore >= 0.95` | blocker taxonomy、primary-zone diff、`nextFixes` |
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
- `docs/tasks/tasks-prog.json`、`docs/agent-briefs/tasks/PROG-2-0001.md` 到 `PROG-2-0008.md`: Plan5 工作拆分真相。

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

## 收斂定義

Plan5 只有在以下條件全部成立時才能標記完成：

- `PROG-2-0002` 的 stale-rule audit 沒有未分類 blocker。
- `PROG-2-0003` 讓 low-score final gate 自動產出可分派 `nextFixes`。
- `PROG-2-0004` 到 `PROG-2-0006` 修補後，正式 fixtures 不依賴 screen-specific branch。
- `PROG-2-0007` 的 regression matrix 顯示代表性 fixture Cocos final gate `adjustedScore >= 0.95`。
- `PROG-2-0008` 已把 Plan5 寫回 skill，後續 Agent 不會再依 Plan4 舊路徑開工。