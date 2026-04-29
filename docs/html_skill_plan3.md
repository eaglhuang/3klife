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

- [ ] R-30A：正式化 `<screen>.art-authority-waivers.json` schema，欄位至少含 `id`、`zoneId`、`rect`、`assetPath`、`assetKind`、`authority`、`reason`、`approvedBy`、`approvedAt`、`scope`、`mayAffectScore`。
- [ ] R-30B：更新 compare / workflow summary，輸出 raw score、adjusted score、waiver coverage、art delta score、converter residual score、unwaived diff top list。
- [ ] R-30C：在 sync-report 加入 asset replacement audit；preserved runtime assets 與 explicit replace approvals 必須能在同一份清單 review。
- [ ] 建立 DS3 初版 waiver file：只列 R-29 已證實的 6 個 tab button-skin zone，不把其他低分區域藏進 waiver。
- [ ] 重新截取 Cocos Editor screenshot，並用 raw / adjusted 雙軌 report 跑 final compare。
- [ ] 將 unwaived top diff 分類為 `art-authority`、`manual-art-asset`、`converter-geometry`、`source-html-fix`、`runtime-bug`。

### P1 - 視覺權責切分

- [ ] R-31：對 DS3 做 zone ownership pass。
- [ ] Tab rail：歸 art-authority，因為正式 `button-skin` 是已核准 runtime chrome。
- [ ] 大背景 / 右欄紙紋：只走正式 JPG 或 family layer，不走全區 screenshot PNG。
- [ ] 58x58 repeating texture：先由美術總監 review；只有 source 標 `data-ucuf-bake="fragment"` 且仍是小型獨立 ornament 時才 bake。
- [ ] 5 個 cut-corner / clip-path card：優先走 converter geometry 或 Cocos mask/vector rule，預設不走 screenshot sidecar。
- [ ] 文字與資料區：禁止 waiver；應修 converter、binding、i18n 或 runtime rendering。

### P2 - 防護與工具補強

- [ ] R-32：新增 waiver validator，拒絕 text / data / mount failure，也拒絕單一 waiver 覆蓋超過 viewport 8%。
- [ ] R-33：建立 final capture protocol，固定 source screenshot 與 Cocos Editor screenshot 的 viewport、DPR、crop、safe area、settle time、共用 waiver sidecar。
- [ ] R-34：建立 skin kind 與 CSS capability classifier 的 mapping test，避免 runtime 已支援能力漂回 assetize，也避免 classifier 假樂觀造成無聲 pixel gap。
- [ ] M13 carry-over：tab-routing mount 必須由真實 layout node 推導，不再硬碼名稱。
- [ ] M10 carry-over：替 text node 做 i18n / bindPath 抽取。
- [ ] M14 carry-over：preload 與 frame-spread mount 等 visual gate 不再是主 blocker 後再處理。

## 4. 下一個執行切片

1. 實作 R-30A schema，並建立 `character-ds3-main.art-authority-waivers.json`，只放 6 個已證實 tab button zone。
2. 串接 R-30B report output，讓 reviewer 看得到 raw vs adjusted score 與 unwaived diff list。
3. 在 sync-report 加上 R-30C asset replacement audit。
4. 取得新的 Cocos Editor screenshot 後重跑 compare。
5. 只把美術時間花在 unwaived top diff；預期順序是 tab rail audit、右欄紙紋 / 背景正式美術、clip geometry、小型 texture review。

## 5. Context Budget 政策

- 不再把新的 R-history 長段落追加到 Plan 2。
- Plan 3 是 active working list，維持在約 300 行以內。
- 完成項目時只保留一行結果；深層證據移到工具報告或 git commit。
- 只有需要舊證據時才對 Plan 2 做 targeted grep。
- 大型 handoff 前先跑 `node tools_node/check-context-budget.js --changed --emit-keep-note`，回報 changed-file summaries 即可。

## 6. 工作樹清理建議

目前 hard-stop 主要是大量大型文字檔處於 changed 狀態，不是模型本身壞掉。不要做一個混雜巨型 commit；請切成語意清楚的小批次：

1. 先驗證目前 HTML-to-UCUF 批次。
2. 將已完成且同主題的變更分批 commit 或 stash，例如 HTML-to-UCUF 工具、DS3 generated UI specs、文件更新、無關的 Sanguo RAG 變更分開處理。
3. 實驗用 scratch / generated files 除非是必要證據，否則不要進 commit。
4. Plan 3 被接受後，Plan 2 可保留為歷史紀錄但停止讀取；若要把 Plan 2 改成 stub，請先確認目前 Plan 2 歷史已安全提交。

## 7. 美術總監立場

目標不是讓 Cocos 不惜代價模仿過期 CSS 草稿；目標是讓 Cocos 在保留動態 UI 行為的前提下，達成已核准產品美術方向的 95%+。正式 runtime art 高於 draft CSS，但每個差異都必須可稽核。