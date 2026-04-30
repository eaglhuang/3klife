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
- 2026-04-30 最新 final compare：`runtimeVsSource.score=0.8559490740740741`（`adjustedScore` 同值），來源為 `2026-04-30-plan3-r37-sprite-trim`；仍未達 `0.95`，不可宣稱通過。
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
- [ ] R-37 follow-up：針對最新 top pixel buckets（header / tab rail / portrait-side）做 source-measured geometry 修正，至少先回到 raw `>= 0.8658`，再續推 `0.95` gate。
- [x] R-38A：`previewTarget=18` tab click 改為通用 lazySlot 切換（修復「tab 無法點擊」）。
- [x] R-38C：`UIScreenPreviewHost` 新增通用 `switchLazySlot` API，`LobbyScene` DS3 preview tab（button_4~9）改為資料映射綁定；`showScreen` 後重綁避免 handler 掉失。
- [x] R-54A：半透明邊框 panel 通則落地（`color-rect` 對應 HTML 有 border 時，必須同時配置 `borderColor + borderWidth + cornerRadius`）。
- [x] R-54B：HTML `rgba(color, alpha)` 邊框採 token 映射策略（允許輕微色差，不可回退成無邊框或硬編碼 hex 特例）。
- [ ] R-38B：DS3 `Stats/Tactics/Bloodline/Equip/Aptitude` 由 empty fragment 過渡到可驗收內容（至少要有非空內容 contract 與 smoke-ready 標記）。

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

## 4. 下一個執行切片

1. 每輪先跑 `node tools_node/html-to-ucuf-readiness.js --screen-id character-ds3-main --final-verdict <latest-verdict> --output assets/resources/ui-spec/screens/character-ds3-main.readiness.json`。
2. 目前 DS3 readiness：`readinessScore=0.958`、`actionUnits=1`、`blockerUnits=1`；剩餘 blocker 仍是 final gate raw `0.8559 < 0.95`。
3. R-38A + R-38C 已完成：`previewTarget=18` tab click 已恢復且重建後不掉 handler；但 R-38B 尚未完成（5 個 tab 仍是 empty fragment placeholder）。
4. M13 tab mount 已過關：6/6 tab mounts resolve to real layout nodes；M10 text binding 已過關：0/1 dynamic text candidates missing contract。最新 zone ownership 已對齊 final compare：20 個 converter-geometry pixel buckets、0 個 waiver-eligible art zone。
5. 下個高價值動作是雙軌並行：先完成 R-38B（tab 非空內容 contract），再針對 top pixel buckets 做 source-measured geometry / runtime rendering 修正；不可回到 blanket waiver，也不可用舊 tab sync-report 當 adjusted score 依據。

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

DS3 目前報告位於 `assets/resources/ui-spec/screens/character-ds3-main.readiness.json`：`verdict=not-ready`、`readinessScore=0.958`、`actionUnits=1`、`blockerUnits=1`。M13 仍維持 6/6 tab mounts resolve to real layout nodes；M10 目前是 0/1 dynamic text candidates missing contract；loading gate 也已是 pass（含 performance sidecar freshness 與 node count blocker 清空）。目前唯一 blocker 仍是 final compare：最新 raw `0.8559490740740741`、adjusted 同值、`waiverEligibleCount=0`。這表示下一輪要聚焦 top pixel buckets 的通用 geometry / runtime rendering 修正，而不是新增 waiver checklist。

## 14. 2026-04-29 source-measured geometry checkpoint

本輪新增通用 source DOM 測量工具 `tools_node/measure-html-selectors.js`，支援 local React/Babel HTML、base href、自動 inline local `text/babel` script、`--selector` / `--selectors-file` 與 fixed viewport。這讓 HTML-to-UCUF 後續修正可先量 source rect，再回寫 layout / fragment，避免用目測或 DS3 專用 magic number。

已驗證的 DS3 增益：

- source-derived overview mini-card geometry 修正後，`CharacterDs3Main_div_15` runtime overflow warning 消失。
- `CharacterDs3Main_img_1_CssShadow` 保持停用；全關 generated shadows 實驗分數較差，已撤回。
- `CharacterDs3Main_div_53` tab rail padding 採 source-derived 值後，raw 最佳進入約 `0.8631`。
- tab button label vertical centering 採 source flex-center 推導：128px 圓鈕內 `32 + 6 + 17 = 55px`，`paddingTop=36`、`spacingY=6`，最新 raw 提升到 `0.8658`。

已測試但撤回的方向：header CJK font fallback、header source rect patch、全關 generated shadows。這些實驗都未提升 raw，不應再次重複，除非有新的 source measurement 或 renderer 證據。