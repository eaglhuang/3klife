<!-- doc_id: doc_other_0009 -->
# HTML Skill Plan 3

> 2026-04-29 起，本檔是 HTML-to-UCUF 95% 推進的主工作入口，承接 `docs/html_skill_plan2.md`。Plan 2 已轉為歷史實作紀錄；一般 Agent 應先讀本檔，只在需要 R-1~R-30 證據時用 grep 查 Plan 2 局部段落。

## 1. 當前事實

- 目標畫面：Design System 3 character source package 轉出的 `character-ds3-main`。
- 最終 gate 仍是 Cocos Editor screenshot vs HTML source screenshot。
- raw `runtimeVsSource.score` 必須誠實保留，不得改寫。
- 已核准 runtime art 差異只能透過 rect-scoped art-authority waiver 進 `runtimeVsSource.adjustedScore`。
- R-29 已完成：6 個右側 tab `button-skin` slot 在 `--sync-existing --merge-mode html-authoritative` 下保留正式 runtime art，且已有 `existing-runtime-asset-preserved` 證據。
- R-30 是目前美術總監裁決：converter failure 與 approved art delta 必須分開稽核。這是審計，不是洗分。
- R-35 已完成：`html-to-ucuf-readiness` 會把剩餘工作轉成 blocker / warning / action unit，不再用主觀 checklist 追 95%。
- 2026-05-01 最新 final compare（r61）：`runtimeVsSource.score=0.8312056327160494`（`adjustedScore` 同值），來源為 `artifacts/ui-qa/r61-compare-a/character-ds3-main.html-cocos-verdict.json`；仍未達 `0.95`，不可宣稱通過。
- 2026-04-30 r53→r54 推進已驗證：score `0.7102 -> 0.8814`（`+17.1%`），主因是補齊血脈/傳記區塊的大色塊邊框與圓角。
- 最新 `zone-ownership` 來自 final compare pixel buckets：`converter-geometry=20`、`waiverEligibleCount=0`；目前沒有可用 waiver 路徑。
- 最新 readiness 報告：`verdict=not-ready`、`readinessScore=0.958`、`blockerUnits=1`、`actionUnits=1`；唯一 blocker 仍是 final gate。
- 2026-04-30 DS3 preview route（`previewTarget=18`）已改為通用 lazySlot tab 切換流程，tab click 互動恢復。
- 2026-04-30 `previewTarget=18` 根因已確認：該路由走 `UIScreenPreviewHost`（不是 `GeneralDetailComposite`）；已補 `switchLazySlot(slotId, fragmentId)` 通用 API 與 `LobbyScene` tab 綁定，並在 `showScreen('character-ds3-main')` 後重綁，避免重建節點後 click handler 遺失。
- 2026-04-30 DS3 右側 tab 現況：`Overview` 外的 `Stats/Tactics/Bloodline/Equip/Aptitude` 仍指向 `fragments/layouts/character-ds3-right-content-empty`；點擊可切換但內容為 placeholder，不可視為功能完成。

## 2. 通過規則

允許兩種通過模式：

1. `raw-pass`：未使用 art-authority 調整，且 `runtimeVsSource.score >= 0.95`。
2. `pass-with-approved-art-delta`：raw score 仍可見，`runtimeVsSource.adjustedScore >= 0.95`，且每個調整區域都有正式 asset 依據、明確 rect、reviewer 批准，並列在報告中。

禁止 waiver 的目標：

- 文字 label、數值、bind data、i18n 問題
- tab active / pressed / disabled 狀態錯誤
- mount failure、空 ChildPanel、內容缺失
- loading、timing、screenshot viewport mismatch
- 全螢幕或 blanket mask

## 3. 未完成工作板

### P0 - 95% 主路線

- [x] R-30A：正式化 `<screen>.art-authority-waivers.json` schema，欄位至少含 `id`、`zoneId`、`rect`、`assetPath`、`assetKind`、`authority`、`reason`、`approvedBy`、`approvedAt`、`scope`、`mayAffectScore`。
- [x] R-30B：更新 compare / workflow summary，輸出 raw score、adjusted score、waiver coverage、art delta score、converter residual score、unwaived diff top list。
- [x] R-30C：在 sync-report 加入 asset replacement audit；preserved runtime assets 與 explicit replace approvals 必須能在同一份清單 review。
- [x] DS3 初版 waiver 裁決：本輪不建立 waiver file。最新 final compare zone ownership 全為 `converter-geometry` pixel buckets，`waiverEligibleCount=0`；不得用舊 sync-report 的 tab art 證據洗分。
- [x] 重新截取 Cocos Editor screenshot，並用 raw / adjusted 雙軌 report 跑 final compare；最新 raw `0.8559490740740741`，adjusted 同值，verdict 仍 fail（`2026-04-30-plan3-r37-sprite-trim`）。
- [x] 將 unwaived top diff 分類為 `art-authority`、`manual-art-asset`、`converter-geometry`、`source-html-fix`、`runtime-bug`。
- [x] R-53 checkpoint：`overview-crop` 比對基線已入檔（raw `0.7102`），作為後續大色塊修正前對照。
- [x] R-54 checkpoint：`r54-border-fix` compare 已執行（raw `0.8814`，仍 `<0.95`），結果已回流到 `R-37 follow-up` 的 geometry 收斂待辦。
- [x] R-60 checkpoint：已用最新 runtime capture（`artifacts/ui-qa/r60-capture/CharacterDs3.png`）重跑 final gate，並定位到 capture protocol 的 crop 異常（`sourceCrop/editorCrop.height=320` 導致比對縮放失真）。
- [x] R-61 checkpoint：修正 `character-ds3-main.final-capture-protocol.json`（`sourceCrop=0,0,1920,1080`；`editorCrop=0,24,1920,1080`）後，連跑兩次 final compare（`r61-compare-a` / `r61-compare-b`）分數一致，raw 均為 `0.8312`，確認 baseline 已穩定；目前主要差異聚焦在右側 tab-rail 與底部帶狀區域。
- [x] R-37 follow-up（R-55 切片 A）：Root-cause 分析完成；portrait_bg missing sprite（`sprites/ui_character_ds3/portrait_bg`）已確認為 converter bug；skin slot 已從 `sprite-frame`（路徑不存在）改為 `gradient-rect`（`surfaceSepia → etcrDeepBg`, 180°）。`geometry-correction-log.json` 入檔，通則規則 UCR-001/002/003 已寫入。Art-authority waiver 檔案建立（portrait illustration + tab rail sprites）。等待下一次 final compare 確認 score delta。
- [x] R-38A：`previewTarget=18` tab click 改為通用 lazySlot 切換（修復「tab 無法點擊」）。
- [x] R-38C：`UIScreenPreviewHost` 新增通用 `switchLazySlot` API，`LobbyScene` DS3 preview tab（button_4~9）改為資料映射綁定；`showScreen` 後重綁避免 handler 掉失。
- [x] R-54A：半透明邊框 panel 通則落地（`color-rect` 對應 HTML 有 border 時，必須同時配置 `borderColor + borderWidth + cornerRadius`）。
- [x] R-54B：HTML `rgba(color, alpha)` 邊框採 token 映射策略（允許輕微色差，不可回退成無邊框或硬編碼 hex 特例）。
- [x] R-38B：DS3 `Stats/Tactics/Bloodline/Equip/Aptitude` 已由正式 fragment 接回 `tabRouting`，5 個內容 fragment 皆標記 `contentContract.status=contract-ready`；`normalize-ucuf-fragment-geometry.js` 已把固定尺寸 wrapper 正規化為 fill-root，readiness `fragmentGeometry=pass`、`tabMounts=pass`。

### P1 - 視覺權責切分

- [x] R-31：對 DS3 做 zone ownership pass。
- [x] Tab rail audit：舊 sync-report 證明 runtime tab art 曾被保留，但最新 final gate 不給 waiver；已先修 source-derived tab label vertical centering，raw 從約 `0.8630` 提升到 `0.8658`。
- [x] 大背景 / 右欄紙紋：只走正式 JPG 或 family layer，不走全區 screenshot PNG。
- [ ] 58x58 repeating texture：先由美術總監 review；只有 source 標 `data-ucuf-bake="fragment"` 且仍是小型獨立 ornament 時才 bake。
- [ ] 5 個 cut-corner / clip-path card：優先走 converter geometry 或 Cocos mask/vector rule，預設不走 screenshot sidecar。
- [ ] 文字與資料區：禁止 waiver；應修 converter、binding、i18n 或 runtime rendering。

### P2 - 防護與工具補強

- [x] R-32：新增 waiver validator，拒絕 text / data / mount failure，也拒絕單一 waiver 覆蓋超過 viewport 8%。
- [x] R-33：建立 final capture protocol，固定 source screenshot 與 Cocos Editor screenshot 的 viewport、DPR、crop、safe area、settle time、共用 waiver sidecar。
- [x] R-34：建立 skin kind 與 CSS capability classifier 的 mapping test，避免 runtime 已支援能力漂回 assetize，也避免 classifier 假樂觀造成無聲 pixel gap。
- [x] R-35：新增 readiness gate，統一量化 final compare、zone rect、tab mount、text binding、visual policy、preload/performance freshness。
- [x] M13 carry-over：tab-routing mount 必須由真實 layout node 推導，不再硬碼名稱。
- [x] M10 carry-over：替 text node 做 i18n / bindPath 抽取。
- [x] M14 carry-over：performance sidecar freshness 與 node count blocker 已清空；loading gate 目前為 pass，無額外 blocker。
- [x] R-38B-G1（通則）: 已建立 `tab-fragment-geometry-contract` 檢查；凡被 `defaultFragment` / `fragments` / `tabRouting` 引用的 fragment，root 或第一層 mount wrapper 若以固定 `width/height` 鎖死會列 blocker。
- [x] R-38B-G2（通則）: 已落地 `normalize-ucuf-fragment-geometry.js` 與 workflow 自動步驟 `normalize-fragment-geometry-contract`，正規化只讀 screen/layout/tabRouting 資料，不依賴 screenId、節點名或 button id 特判。
- [x] R-38B-G3（驗收）: `validate-ui-specs.js --strict --rules tab-fragment-geometry-contract,composite-panel-tab-route-integrity` 通過；`html-to-ucuf-readiness` 新增 `fragmentGeometry` gate，DS3 目前 9/9 referenced fragments pass。

## 4. 下一個執行切片

1. 每輪先跑 `node tools_node/html-to-ucuf-readiness.js --screen-id character-ds3-main --final-verdict <latest-verdict> --output assets/resources/ui-spec/screens/character-ds3-main.readiness.json`。
2. 目前 DS3 readiness：`readinessScore=0.958`、`actionUnits=1`、`blockerUnits=1`；剩餘 blocker 仍是 final gate raw `0.8312 < 0.95`。
3. R-38A + R-38C + R-38B 已完成：tab click、lazySlot route 與 5 個 tab content fragment contract 均已接回；不再是 empty placeholder。
4. M13 tab mount 已過關：6/6 tab mounts resolve to real layout nodes；M10 text binding 已過關：0/1 dynamic text candidates missing contract；fragment geometry gate 已過關（9/9 pass）。
5. 下個高價值動作是先鎖定 final compare 基線一致性（固定 Cocos Editor capture protocol + target screen），再做 top pixel buckets 的 source-measured geometry / runtime rendering 收斂；不可回到 blanket waiver，也不可用舊 tab sync-report 當 adjusted score 依據。

## 5. Context Budget 政策

- 不再把新的 R-history 長段落追加到 Plan 2。
- Plan 3 是 active working list，維持在約 300 行以內。
- 完成項目時只保留一行結果；深層證據移到工具報告或 git commit。
- 只有需要舊證據時才對 Plan 2 做 targeted grep。
- 大型 handoff 前先跑 `node tools_node/check-context-budget.js --changed --emit-keep-note`，回報 changed-file summaries 即可。
- 2026-04-29 checkpoint：上一輪大型 commit / amend / push 後，`check-context-budget --changed` 已回到 `status=ok`、changed files = 0；後續若再次 hard-stop，優先檢查是否又累積了大型 generated JSON、screenshot report 或長篇 plan diff。

### 為什麼 changed files 也要估算 token

changed-file token 不是說那些檔案已經被完整送進 LLM；它是保守的風險代理指標。dirty file 最容易在下一步被要求做 diff、review、handoff、validation、衝突排查或最終摘要，因此工具先估算「如果 Agent 需要處理目前未提交變更，可能碰到的上下文上限」。這個估算的用途是提早提醒：不要整份讀大型 JSON / Markdown、不要把 compare board 或 generated report 塞進對話、先用結構化摘要與 targeted grep。commit 或 stash 後風險下降，不是因為 LLM 忘了內容，而是因為工作範圍變成可由 git history / commit subject / targeted diff 精準索引，不必把整包 dirty diff 當作待處理現場。

## 6. 工作樹清理建議

目前 hard-stop 主要是大量大型文字檔處於 changed 狀態，不是模型本身壞掉。不要做一個混雜巨型 commit；請切成語意清楚的小批次：

1. 先驗證目前 HTML-to-UCUF 批次。
2. 將已完成且同主題的變更分批 commit 或 stash，例如 HTML-to-UCUF 工具、DS3 generated UI specs、文件更新、無關的 Sanguo RAG 變更分開處理。
3. 實驗用 scratch / generated files 除非是必要證據，否則不要進 commit。
4. Plan 3 被接受後，Plan 2 可保留為歷史紀錄但停止讀取；若要把 Plan 2 改成 stub，請先確認目前 Plan 2 歷史已安全提交。

## 7. 美術總監立場

目標不是讓 Cocos 不惜代價模仿過期 CSS 草稿；目標是讓 Cocos 在保留動態 UI 行為的前提下，達成已核准產品美術方向的 95%+。正式 runtime art 高於 draft CSS，但每個差異都必須可稽核。

## 8. 2026-04-29 ~ 2026-04-30 美術總監推進裁決

本輪不再擴大 waiver 範圍，也不再回頭把 HTML CSS 草稿當最高權威。95% 推進要先把「可稽核的正式美術差異」與「真正 converter / runtime 缺口」切乾淨。

- [x] 先做 R-30A schema，不做整頁視覺修補；sidecar 是稽核契約，不是遮罩工具。
- [x] DS3 waiver 裁決更新：最新 final compare 仍是 `waiverEligibleCount=0`，本輪維持不建立 waiver file；所有差異留在 unwaived diff。
- [x] compare 報告必須把 `raw score`、`adjusted score`、`artDeltaScore`、`converterResidualScore` 並列；若 raw < 0.95，只能標 `pass-with-approved-art-delta`，不能標 raw pass。
- [ ] 美術修正順序：先處理最新 top pixel buckets（右欄 header / tab rail / portrait-side geometry），再右欄紙紋 / 背景正式 JPG 或 family layer，再 clip-path geometry，最後才判斷 58x58 texture 是否需要 fragment bake。
- [ ] 任何想新增 waiver 的 diff，必須先回答三件事：它是不是正式 runtime art？是否有 asset path？是否能用小 rect 描述？任一答案為否，就回到 converter / runtime 修正。

## 9. 通則優先原則

所有接下來的 95% 推進都必須先問「這條規則能不能服務下一個 HTML-to-UCUF 畫面」。DS3 只能當 pilot fixture，不得把 implementation 寫成 DS3 專用特例。

- [x] R-30A schema 必須 screen-agnostic：欄位描述 zone、asset、rect、authority、score impact，不得含 `character-ds3-main` 專用欄位。
- [x] R-30B report 必須接受任何 `<screen>.art-authority-waivers.json`；DS3 的 6 個 tab 只能是測試資料，不是程式分支。
- [x] R-30C asset audit 必須掃所有 `sprite-frame`、`button-skin`、named runtime asset slot；不能只掃 right tab。
- [x] R-31 zone ownership 分類必須輸出通用 taxonomy：`art-authority`、`manual-art-asset`、`converter-geometry`、`source-html-fix`、`runtime-bug`。
- [x] 門檻值要成為命名 policy：例如 `maxWaiverViewportRatio=0.08`、`fragmentBakeMaxSize=256`；禁止散落 magic number。
- [x] 任何 screen-specific path、node name、button id 只能放在 fixture / sidecar / input JSON；converter、compare、validator 只能讀資料，不寫死邏輯。

## 10. R-30A 通用 Sidecar 契約草案

`<screen>.art-authority-waivers.json` 是審核契約，不是遮罩清單；它的功能是把「正式美術權威差異」從 converter failure 中分離，並讓 reviewer 可追溯每個 adjusted score 區域。

**Top-level 欄位**：

- `schemaVersion`：例如 `1.0.0`，供 validator 做相容檢查。
- `screenId` / `sourcePackageId`：只描述輸入來源，不作程式分支條件。
- `coordinateSpace`：`editor-screenshot`、`source-screenshot` 或 `normalized-viewport` 三選一。
- `viewport`：`width`、`height`、`dpr`，用於 rect 轉換與覆蓋率計算。
- `policy`：集中放 `maxWaiverViewportRatio`、`allowedScopes`、`allowedAssetKinds`，禁止在工具內散落 magic number。
- `waivers[]`：每筆 waiver 的稽核資料。

**waiver entry 欄位**：

- `id` / `zoneId`：穩定識別；可由 visual zone、layout node 或 sidecar entry 生成。
- `rect`：`x`、`y`、`width`、`height`、`unit`，必須是小範圍明確矩形。
- `scope`：`chrome`、`background`、`ornament`、`approved-illustration` 等通用類別。
- `assetRefs[]`：正式 runtime asset path 與 kind，例如 `sprite-frame`、`button-skin`、`font`；沒有 asset reference 不得 waiver。
- `authority`：`approvedBy`、`approvedAt`、`source`、`decisionId`，用於審核追溯。
- `reason`：說明 HTML draft 與正式 runtime art 為何刻意不同。
- `expectation`：`sourceHtmlExpectation` 與 `runtimeExpectation`，讓 reviewer 知道差異是預期而非漏轉。
- `scoreImpact`：`mayAffectScore`、`channel`、`notes`，只允許影響 visual diff，不得掩蓋 logic / data / interaction。

**validator invariants**：

- waiver 必須有 asset-backed evidence；只有顏色、漸層或主觀描述不夠。
- 單筆 waiver 覆蓋率不得超過 `policy.maxWaiverViewportRatio`。
- `scope` / `assetKind` 必須在 policy 白名單內。
- rect 不得覆蓋文字 label、數值、動態資料、互動狀態或 ChildPanel mount failure。
- DS3 的 6 個 tab button-skin 只能作 fixture；validator 不得檢查 `character-ds3-main`、`button_4` 這類畫面專名。

Unity 對照：這份 sidecar 比較像「Editor 驗收用的 ScriptableObject metadata」，不是 Prefab 內容本身；它描述哪些畫面差異已由 art director 批准，不能替代 UI 轉換器或 runtime renderer。

## 11. R-30 實作 checkpoint

2026-04-29 已落地通用工具層：`tools_node/lib/dom-to-ui/art-authority-waivers.js` 負責 sidecar discovery / schema validation / rect-to-pixel / adjusted score adapter；`compare-html-to-cocos-editor.js`、`dom-to-ui-compare.js`、`run-html-to-ucuf-workflow.js` 已接上 `--art-authority-waivers` 與自動 discovery。

報告契約目前保留 raw `runtimeVsSource.score`，另輸出 `adjustedScore`、`passMode`、`waiverCoverageRatio`、`artDeltaScore`、`converterResidualScore`、`unwaivedDiffTopList`。raw 未達標但 approved art delta 達標時，verdict 為 `pass-with-approved-art-delta`。

R-30C 已在 `smart-merge` / `sync-report` 增加 `assetReplacementAudit`：`existing-runtime-asset-preserved` 與 `explicit-runtime-asset-replace-approved` 會在同一份 report 內 review。Self-test 已覆蓋 validator、approved art delta final gate、asset audit，結果 `ALL PASS`。

## 12. R-31 / R-33 / R-34 實作 checkpoint

2026-04-29 已新增通用 `zone-ownership` taxonomy：final compare 會輸出 `<screen>.zone-ownership.json`，把 art-authority waiver、sync-report runtime asset、CSS offender、unwaived pixel bucket 都歸到同一套 `art-authority` / `manual-art-asset` / `converter-geometry` / `source-html-fix` / `runtime-bug` 權責分類。DS3 目前正式 sidecar 已同步最新 final compare：20 個 top pixel buckets 全部歸 `converter-geometry`，`waiverEligibleCount=0`，所以本輪不建立 waiver。

R-33 已新增 `<screen>.final-capture-protocol.json` discovery / validation / CLI 串接；`compare-html-to-cocos-editor.js` 可讀 protocol 套用 viewport、DPR、crop、safe area、settle time 與共用 waiver sidecar。DS3 pilot protocol 位於 `assets/resources/ui-spec/screens/character-ds3-main.final-capture-protocol.json`。

R-34 已新增 CSS capability 到 skin kind 的契約測試，覆蓋 `linear-gradient`、`radial-gradient`、`url(...)`、shadow、filter、clip-path、blend 等樣本，防止 classifier 與 bake/runtime slot routing 再漂移。

## 13. R-35 readiness checkpoint

2026-04-29 已新增通用 readiness gate：`tools_node/lib/dom-to-ui/readiness-gate.js` 與 CLI `tools_node/html-to-ucuf-readiness.js`。它不做 DS3 特例，只讀 layout / skin / screen sidecar，輸出 `<screen>.readiness.json`，把 95% 前的剩餘工作拆成 final gate、capture protocol、zone ownership / waiver、tab routing mount、text binding、visual policy、loading / performance freshness。

DS3 目前報告位於 `assets/resources/ui-spec/screens/character-ds3-main.readiness.json`：`verdict=not-ready`、`readinessScore=0.958`、`actionUnits=1`、`blockerUnits=1`。M13 維持 6/6 tab mounts resolve to real layout nodes；M10 是 0/1 dynamic text candidates missing contract；loading gate 為 pass（含 performance sidecar freshness 與 node count blocker 清空）；fragment geometry gate 也已 pass（9/9 referenced fragments）。目前唯一 blocker 仍是 final compare：最新 raw `0.6993788580246914`、adjusted 同值、`waiverEligibleCount=0`。這表示下一輪要先穩定 Cocos Editor final capture baseline，再聚焦 top pixel buckets 的通用 geometry / runtime rendering 修正，而不是新增 waiver checklist。

## 14. 2026-04-29 source-measured geometry checkpoint

本輪新增通用 source DOM 測量工具 `tools_node/measure-html-selectors.js`，支援 local React/Babel HTML、base href、自動 inline local `text/babel` script、`--selector` / `--selectors-file` 與 fixed viewport。這讓 HTML-to-UCUF 後續修正可先量 source rect，再回寫 layout / fragment，避免用目測或 DS3 專用 magic number。

已驗證的 DS3 增益：

- source-derived overview mini-card geometry 修正後，`CharacterDs3Main_div_15` runtime overflow warning 消失。
- `CharacterDs3Main_img_1_CssShadow` 保持停用；全關 generated shadows 實驗分數較差，已撤回。
- `CharacterDs3Main_div_53` tab rail padding 採 source-derived 值後，raw 最佳進入約 `0.8631`。
- tab button label vertical centering 採 source flex-center 推導：128px 圓鈕內 `32 + 6 + 17 = 55px`，`paddingTop=36`、`spacingY=6`，最新 raw 提升到 `0.8658`。

已測試但撤回的方向：header CJK font fallback、header source rect patch、全關 generated shadows。這些實驗都未提升 raw，不應再次重複，除非有新的 source measurement 或 renderer 證據。

## 15. Bucket Cluster Analysis 通則（美術總監診斷第一步）

> 本節是任何 HTML-to-UCUF 畫面的通則診斷方法，不是 DS3 專用。

當 `zone-ownership.json` 顯示多個 `converter-geometry` bucket 時，第一步是**叢集分析**，而不是逐一修 bucket。修法步驟：

1. **座標叢集化**：把 20 個 64×64 bucket 依 x 或 y 軸接近度分群，通常 3 個以內的主叢集就佔 70%+ mismatch pixels。
2. **從座標反推 UI 區域**：對照 source HTML viewport（`final-capture-protocol.json` 記載的 `width / height`），換算哪個 UI 元素對應哪個叢集。
3. **優先修 mismatch ratio > 0.60 的叢集**：ratio 代表該 64px 格內壞掉的像素比例，ratio > 0.60 通常表示整個元素完全偏移或完全消失，不是微調問題。

**DS3 pilot 兩大叢集（2026-04-30）**：

| 叢集 | 座標範圍 | bucket 數 | 總 mismatch px | 平均 ratio | 推斷 UI 元素 |
|------|----------|-----------|---------------|-----------|------------|
| Tab-Rail | y=64, x=1216~1664 | 5 | ~14,884 | 0.727 | 右側 tab rail 按鈕 |
| Portrait-Edge | x=768~832, y=128~768 | 9 | ~20,029 | 0.530 | 左右面板分隔 border/edge |

**通則工具**：
```bash
# 步驟 1：自動叢集化，輸出 cluster-map
node tools_node/html-to-ucuf-readiness.js --screen-id <screen-id> --cluster-mode proximity --output <screen>.cluster-map.json

# 步驟 2：用 measure-html-selectors.js 對最高 mismatch ratio 叢集量 source rect
node tools_node/measure-html-selectors.js --input <source.html> --selectors-file <screen>.cluster-selectors.json --viewport <W>x<H>
```

## 16. Per-Cluster Root-Cause 修正協定（通則）

每個叢集對應一種 CSS→UCUF 轉換失誤類型，診斷路徑如下：

| 叢集特徵 | 最可能根因 | 修正動作 |
|----------|------------|----------|
| y≈頂部固定行，多個 x | tab/button `active` skin slot 未輸出 | 補 `button-skin` active state 欄位；確認 skin kind 為 `button-skin` 而非 `color-rect` |
| 單 x 列、多個 y（垂直條紋） | panel edge / `border-right` 未轉換 | 在 layout node 加 `borderWidth + borderColor`；對照 §3 R-54A 通則 |
| 散佈多處低 ratio（< 0.30） | background fill / gradient classifier 差異 | 先查 CSS capability matrix，確認 skin kind 是否為 `linear-gradient-rect` |
| 中央大塊 | 元素尺寸（width/height）嚴重偏離 | 跑 `measure-html-selectors.js` 取 source rect，直接 patch layout JSON |

**核心原則**：每次修正必須對應一個明確的 CSS property ↔ UCUF property mapping 差距，且修正後立刻用 `readiness.js` 重跑 final compare 驗證 score delta。不允許同時修多個叢集後才驗分。

## 17. Converter Rule Gap Log 通則（跨畫面可重用）

每次修正完一個叢集，必須把根因記錄到 `<screen>.geometry-correction-log.json`，格式：

```jsonc
{
  "schemaVersion": "1.0.0",
  "screenId": "<screen-id>",
  "entries": [
    {
      "clusterId": "tab-rail-y64",
      "cssProperty": "button:active background",
      "ucufProperty": "button-skin.activeSlot",
      "sourceValue": "rgba(255,200,100,0.9)",
      "runtimeValue": "missing",
      "fixAction": "add activeSlot to button-skin family",
      "scoreDeltaActual": 0.023,
      "status": "applied"
    }
  ]
}
```

這份 log 有兩個用途：
1. **DS3 完成後**：把 `fixAction` 欄位的規則直接升格為 converter 的自動轉換規則，下次同類型 CSS 不再需要手修。
2. **下個畫面**：新畫面做叢集分析時，先 grep 既有 log 的 `cssProperty` 看有沒有已知解法，避免重複診斷。

**工具補強待辦（P2）**：
- [ ] 在 `zone-ownership.js` 的 `recommendation` 欄位新增 `knownFix: <fixAction>` lookup（比對 geometry-correction-log registry），讓 zone-ownership 報告直接提示已知解法。

## 18. Score Recovery 估算通則（修前必做）

任何叢集修正前，先估算最大可回收分數，避免花大力氣卻在精度誤差範圍內：

```
可回收像素上限 = Σ(cluster bucket area × mismatch ratio)
score 回收上限 ≈ 可回收像素 / total viewport pixels
```

DS3 當前計算（viewport 以 final-capture-protocol 為準）：
- Tab-Rail 叢集：5 × 4096 × 0.727 ≈ **14,884 px** 可回收
- Portrait-Edge 叢集：9 × 4096 × 0.530 ≈ **19,558 px** 可回收

若要從 `0.8814 → 0.95`，缺口 = `0.0686`。若 viewport 設為 1920×1080 = 2,073,600 px，需回收約 **142,239 px**。

> 這說明光靠 20 個 64px bucket 所代表的區域（81,920 px 量測範圍）的完美修正，理論上能回收 ~34,442 px，只約 0.0166 score delta。所以仍有大量 diff 來自 bucket 外的整面漸層差、背景色差等 **低 ratio 廣面積區域**。
> **美術總監裁決**：bucket 修正是必要的，但 95% gate 的最後幾個百分點必須同時確認：①右欄大背景是否已接正式 JPG/family layer、②portrait zone overlay/gradient 是否對齊 DS3 design token。

## 19. R-37 DS3 執行切片（美術總監版）

> 上述通則第一次在 DS3 pilot 落地。

**切片 A：Tab-Rail 叢集（優先 1）**

1. 對 source HTML 量 tab button active state 的 `background-color / border / font-size / padding`：
   ```bash
   node tools_node/measure-html-selectors.js --input "Design System 3/Lobby.html" --selector ".tab-button.active, [data-tab].active" --viewport 1920x1080
   ```
2. 比對 DS3 `button-skin` family 的 `activeSlot` 是否輸出了 `background + borderColor + borderRadius`。
3. 若 `activeSlot` 缺失或色值偏差 > 15%，直接 patch `assets/resources/ui-spec/skins/` 對應 family，不重跑全量 converter。
4. 截 Cocos Editor screenshot → 跑 final compare → 確認 score delta > 0。

**切片 B：Portrait-Edge 叢集（優先 2）**

1. x=768~832 bucket 叢集對應右側 panel 左 border 或 portrait zone 右 border。先量 source：
   ```bash
   node tools_node/measure-html-selectors.js --input "Design System 3/Lobby.html" --selector ".portrait-panel, .right-content-panel" --viewport 1920x1080
   ```
2. 確認 layout JSON 中 portrait zone / content zone 的 `borderRight` / `borderLeft` 是否已走 §3 R-54A 通則（`borderColor + borderWidth + cornerRadius`）。
3. 若遺漏，比照 R-54A 通則補上；不可用截圖 sidecar 取代 geometry 修正。

**切片 C（可選，待 A+B 完成後評估）**：右欄大背景正式 JPG 升格（`artifacts/ui-library/` → runtime）是否能補剩餘廣面積低 ratio diff。只有升格路徑通過 §8 JPG 大背景規則才執行。

## 20. R-38B Tab Content Contract 通則

> 適用於任何 HTML-to-UCUF 畫面中的 tab 面板。

Tab 面板從 empty placeholder 過渡到可驗收狀態的最小 contract：

```jsonc
{
  "tabId": "stats",
  "fragmentId": "character-ds3-right-stats",
  "status": "smoke-ready",       // empty | contract-ready | smoke-ready | qa-pass
  "contentContract": {
    "requiredNodes": ["stat-row-list"],
    "bindPaths": ["general.stats.str", "general.stats.agi"],
    "minNonEmptyNodes": 3
  },
  "smokeRoute": "showScreen('character-ds3-main', { tab: 'stats' })"
}
```

**四個狀態定義（通則）**：
- `empty`：placeholder fragment，不可視為功能完成，不計入 readiness score。
- `contract-ready`：已定義 `contentContract`，但 Cocos 實作尚未完成。
- `smoke-ready`：Cocos runtime 可走 `smokeRoute` 且顯示 `minNonEmptyNodes` 個有效節點。
- `qa-pass`：browser QA 截圖比對通過。

**DS3 待辦**：`Stats / Tactics / Bloodline / Equip / Aptitude` 5 個 tab 目前狀態為 `empty`，R-38B 目標是先推到 `contract-ready`（至少定義 `requiredNodes` 與 `bindPaths`），不要求一次到 `smoke-ready`。

**Fragment Geometry Contract（新增通則）**：
- lazySlot 消費的 fragment 必須遵守 fill-root contract：fragment root（或 root 下第一層內容容器）需可貼齊 mount slot，不得靠固定 `width/height` 包住整頁內容。
- 允許內容節點保留語義性尺寸（例如卡片、列項），但外層 mount 契約層不可鎖死尺寸。
- 任何修正必須以通則落地在 workflow/converter/validator，禁止 DS3 專用 node 名稱對照表。

**R-38B-G 完成回寫（2026-04-30）**：本次實作的判斷來源只有 UCUF 通用結構：`lazySlot/defaultFragment/fragments/tabRouting` 引用與 fragment root/first-child mount wrapper 的幾何屬性。工具不讀 `character-ds3-*`、不讀 `button_4~9`，也不使用 DS3 白名單；DS3 只是 fixture，與 Unity 中「所有掛到 slot 的子 prefab 外層 RectTransform 都要 stretch」同一類契約。美術上這代表外框先服從產品級 runtime 插槽，卡片與列項的固定尺寸才留在內層語義節點。

## 21. 交接給下一位 Agent（2026-04-30）

> 目的：把 R-38B 從「DS3 個案可用」提升為「所有 lazySlot/tab-routing 畫面可重用的通則」，禁止硬寫特判。

### 本次已完成（供接手者快速定位）

- 已確認根因：tab2~tab6 問題屬於 fragment 幾何契約不一致（固定尺寸 wrapper 破壞 mount slot 貼齊），不是 click 事件路徑。
- 已把通則方向寫入本檔 checklist：`R-38B-G1/G2/G3`。
- 已同步更新 `.github/skills/html-to-ucuf/SKILL.md` 驗收 checklist：加入 lazySlot fragment fill-root 幾何契約與 screen-agnostic 要求。

### 接手者必做任務（照順序）

1. 實作 `tab-fragment-geometry-contract` 檢查（validator/readiness gate 任一層，建議兩層都要有）：
  - 針對所有被 `defaultFragment` 或 `tab-routing` 引用的 fragment。
  - 若 fragment root（或 root 下第一層 mount 契約容器）出現整頁固定 `width/height` 鎖死且無法 fill slot，判定 blocker。
  - 錯誤訊息要給可執行建議：改為 fill-root contract、保留語義內容尺寸於內層節點。
2. 實作 fragment root 幾何正規化（workflow/converter 通則）：
  - 目標是 screen-agnostic，不可依賴 `character-ds3-*`、`button_4~9`、或任何 DS3 節點名。
  - 只修 mount 契約層（外層 root/wrapper），不得破壞內層內容語義節點（卡片、列項、文本容器）。
3. 對 DS3 做一次通則驗證（僅作 fixture，不寫特判）：
  - 重新產出 `Stats/Tactics/Bloodline/Equip/Aptitude` tab fragments。
  - 確認可切換且內容不再是 empty placeholder。
  - 跑 editor compare 與 readiness，回寫本檔 `R-38B` / `R-38B-G*` 狀態。

### 明確禁止

- 禁止在 converter/workflow/validator 中加入任何 DS3 專名判斷（screenId、node name、button id、fragment id 白名單）。
- 禁止用 waiver 迴避幾何契約問題。
- 禁止以手改單一 fragment 當最終解（可暫時驗證，但最終必須回到通則）。

### 交付物（PR 最少要有）

- 程式：geometry contract gate + 通則正規化邏輯。
- 測試：至少一個會 fail（舊固定尺寸 wrapper）與一個會 pass（fill-root contract）的自動化案例。
- 證據：DS3 fixture 重跑結果（readiness / compare / 相關 summary）。
- 文件：更新本檔 checklist 勾選狀態與一段「為何仍屬通則、非特判」說明。

### 完成定義（DoD）

- `R-38B-G1/G2/G3` 全數可驗證（不是口頭描述）。
- 同一套規則能套用到非 DS3 的 tab/lazySlot 畫面，不需改程式碼分支。
- `R-38B` 從 empty/placeholder 推進到至少 `contract-ready`，並有 editor compare + readiness 證據。
