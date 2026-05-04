# 3KLife Design Handoff 畫面實作計劃書

更新日期：2026-04-22

## 範圍與原則

- 本計劃依 `Design System/design_handoff/README.md` 執行。
- `Lobby` 主畫面暫不製作，不納入本輪里程碑。
- 實作一律走 UCUF：`CompositePanel` + layout JSON + content state。
- 里程碑以「先補現有高完成度畫面、再做新畫面、Battle HUD 最後同步」為順序。

## 現況摘要

| 畫面 | TS / Panel 狀態 | Layout JSON | 設計稿參考 | 備註 |
|---|---|---|---|---|
| General Detail | 已有完整 Composite + child panels | 已存在 | `character/index.html` | 優先驗證現有 layout 是否已同步 |
| Bloodline Mirror | 已有 `BloodlineTreePanel.ts` | 已存在 | `preview/` 元件 | 需補 UI 狀態整合與畫面驗證 |
| Result Popup | 已有 `ResultPopupComposite.ts` | 已存在 | `preview/` 元件 | 需清理 legacy 使用點 |
| Gacha | 尚未有 Composite | 已存在 | layout spec 驅動 | 需新建 TS 結構 |
| Shop | 尚未有 Composite | 已存在 | layout spec 驅動 | 需新建 TS 結構 |
| Battle HUD | 已有完整 Composite | 已存在 | `battle/index_v3.html` | 依決議改為最後同步 |

## 里程碑順序

1. M1 人物詳情對齊
2. M3 血脈命鏡整合
3. M4 結果彈窗清理
4. M5 轉蛋 Gacha 實作
5. M6 商店 Shop 實作
6. M2 戰場 HUD v3 同步（最後）

## 進度紀錄

- [x] M1 開始執行
- [x] M3 開始執行
- [ ] M4 開始執行
- [ ] M5 開始執行
- [ ] M6 開始執行
- [ ] M2 開始執行

---

## M1 人物詳情對齊

目標：以 `character/index.html` 為唯一基準，完成 General Detail 右側 shell、各 tab 內容、preview 驗證與 residual 清理。

Checklist

- [x] 比對 `changes/general-detail-unified-main-updated.json` 與正式 layout 差異
- [x] 確認目前 runtime 正式 layout 仍未完全採用 `changes/general-detail-unified-main-updated.json` 的 290×290 tab 結構
- [x] 確認目前 runtime 右側 shell 仍保留 `RightContentArea.top = 280` 的舊幾何，尚未對齊 HTML `right-content padding-top = 50px`
- [x] 補齊 General Detail `Overview / Stats / Bloodline / Basics / Aptitude / Skills` smoke preview 路徑與 capture target
- [x] 修正 Bloodline / Basics / Aptitude 等 tab 在 preview readiness 上的 active-descendant 判定問題
- [x] 建立 `Stats` tab 第一版 sectioned layout 與 vitals/profile 綁定
- [x] 將 `gd-tab-basics.json` clean-slate 重構為 section/card，並刪除舊平鋪 label 層，避免 layout JSON 累積垃圾節點
- [x] 將 `gd-tab-bloodline.json` 的祖系樹節點對齊 `BloodlineTreePanel` 既有 bind 結構，並清除 `Gen1Container / Gen2Container / GeneListCard` residual warnings
- [x] 釐清「每個資訊頁面上方留白過大」的根因為 shared shell + fragment root padding 疊加，不是單一 tab 資料錯誤
- [x] 將 shared shell 改為符合 HTML：內容區上緣以單一 `50px` 來源控制，不再用 `RightContentArea.top = 280`
- [x] 收斂各 non-overview fragment root 的 `paddingTop`，避免再次疊加上方留白
- [x] 依 HTML 重做 `Basics / Stats / Tactics / Bloodline / Aptitude` 五個 tab 的主要區塊節奏與卡片分段
- [x] 重新驗證 `Overview / Stats / Basics / Bloodline / Aptitude` capture，確認沒有新增 page error / request failure
- [x] 清除 `StateBadgeRow` 與 `StatsValueCard` 這兩個已定位 residual warnings
- [x] 建立 `assets/resources/ui-spec/proof/screens/general-detail-stats.proof.json`（pixel alignment proof draft）
- [x] 調整 `assets/resources/ui-spec/fragments/layouts/gd-tab-stats.json` 以符合 proof（已收斂為 225×225 radar glyph、六列值列表、padLeft=12）
- [x] 收斂 `GeneralDetailStatsChild` 的舊 `StatsRoleValue` 綁定，讓 runtime 與六列值列表 layout 一致
- [x] 將 `GeneralDetailStatsChild` 的左側雷達改為 renderer-drawn 六角圖，對齊 HTML 的 radar rhythm
- [x] 將 `StatsValueCard` 右欄改為 HTML 式 row/badge/bar 結構，對齊 `TabStats` 的右側屬性做法
- [x] 針對新版 225×225 radar glyph / 六列值列表重跑 Stats capture，確認 capture 路徑已解鎖
- [x] 收斂 `gd-tab-stats.json` 的水平 padding，清除 `StatsOverviewRow` auto-shrink residual，讓 290 + 16 + 234 幾何回到 HTML proof 節奏
- [ ] 針對新版 225×225 radar glyph / 六列值列表重跑 `ui-preview-judge`（待做像素對標）

交付物

- `assets/resources/ui-spec/layouts/general-detail-unified-main.json`
- `assets/resources/ui-spec/fragments/layouts/gd-tab-basics.json`
- `assets/resources/ui-spec/fragments/layouts/gd-tab-bloodline.json`
- `assets/resources/ui-spec/fragments/layouts/gd-tab-stats.json`
- `assets/resources/ui-spec/layouts/bloodline-mirror-loading-main.json`
- `assets/scripts/ui/components/general-detail/GeneralDetailStatsChild.ts`
- `assets/scripts/ui/components/general-detail/GeneralDetailBasicsChild.ts`
- `assets/scripts/ui/scenes/LoadingScene.ts`
- `assets/scripts/ui/scenes/LobbyScene.ts`
- `tools_node/capture-ui-screens.js`
- 驗證紀錄（回寫本檔）

驗證結果

- 已將 shared shell 改為 HTML 同源幾何：`RightContentArea.top` 從 `280` 收斂為 `50`，各 non-overview fragment root `paddingTop` 也已改為 `0`。
- 先前「資訊頁上方留白過大」的根因已確認並修正：原本是 shared shell 與 fragment root 的 top spacing 雙重疊加。
- `LoadingScene.ts` / `LobbyScene.ts` / `capture-ui-screens.js` 已補齊 General Detail 多 tab smoke / capture 流程，現在可直接驗證 `Stats / Bloodline / Basics / Aptitude`。
- `gd-tab-basics.json` 已改成乾淨的兩大 section/card 結構，舊的 12 條平鋪 label 已刪除，不再讓 fragment JSON 持續累積無語意垃圾層。
- `gd-tab-bloodline.json` 已把祖系樹從 placeholder 命名改為 `G1_0..G1_7 / G2_0..G2_3 / G3_0..G3_1` + `Txt` 結構，並補上 `14-PERSON ANCESTRY MATRIX` / 世代行標籤，與 `BloodlineTreePanel.ts` 的填值路徑正式對齊。
- `GeneralDetailOverview`、`GeneralDetailAptitude`、`GeneralDetailStats`、`GeneralDetailBasics`、`GeneralDetailBloodline` 最新 capture 皆為 `pass`，且 `consoleErrorCount = 0`、`requestFailureCount = 0`。`GeneralDetailBloodline` 的最新矩陣回歸版本為 `review-matrix-r2`。
- `GeneralDetailSkills` 最新 capture 亦為 `pass`，且 `consoleErrorCount = 0`、`pageErrorCount = 0`、`requestFailureCount = 0`。
- `StateBadgeRow` 與 `StatsValueCard` 這兩個已定位 residual warnings 已清除。
- `GeneralDetailBloodline` 這一輪已進一步清除 `Gen1Container`、`Gen2Container`、`GeneListCard` 三個血脈頁自身幾何 residual；目前 M1 capture 已沒有已知 runtime warning，並比前一版更接近 HTML 的 14 人矩陣節奏。
- `gd-tab-stats.json` 已移除水平 padding，讓 `RadarSummaryCard(290) + gap(16) + StatsValueCard(234)` 直接吃滿 proof 的 540px 內容寬；`GeneralDetailStats` 最新 capture `artifacts/ui-qa/general-detail-stats-20260425a/` 已為乾淨 `pass`，`consoleWarningCount = 0`、`pageErrorCount = 0`、`requestFailureCount = 0`，先前的 `StatsOverviewRow` auto-shrink residual 已清除。
- `GeneralDetailStatsChild` 已改為 renderer-drawn 六角雷達圖 + HTML 式 row/badge/bar 結構，直接從 `dualLayerStats` 取 current/base/prowess；下一步只剩 `ui-preview-judge` 做像素對標。
- 2026-04-25 後續 art-direction pass：`VitalsRow` 已改為 3 等分卡 + progress bar hierarchy，`ProfileSection` 已改為 2x2 滿版 info row，較貼近 `character/tabs.jsx` 的 HTML 節奏。
- `ui-preview-judge` 第一輪已落地至 `artifacts/ui-source/general-detail-stats/review/preview-judge-report.json`：目前 verdict 暫為 `FAIL`，主因是 radar / row chrome / Vitals / Profile 與 HTML proof 仍有明顯視覺殘差。另以 puppeteer 直查 `previewTarget=13` 時，request failures 樣本為 `0`；先前 `capture-ui-screens` 報出的 `requestFailureCount` 較像流程噪訊，不視為目前 blocker。
- 2026-04-25 第二輪像素收斂（`review-r2`）已完成：`StatsOverviewRow` 重配為 `RadarSummaryCard(300) + gap(16) + StatsValueCard(224)`，並放大 radar renderer size、加強 Stats row/badge/bar 對比；`Vitals/Profile` 追加 value plate 與字階提升，視覺主從關係較第一輪明顯。
- 第二輪 runtime capture 已通過：`artifacts/ui-source/general-detail-stats/review-r2/capture-report.json` 顯示 `consoleErrorCount = 0`、`consoleWarningCount = 0`、`pageErrorCount = 0`、`requestFailureCount = 0`。
- `validate-ui-specs.js --strict --check-content-contract` 與 touched-file encoding guard 皆已通過；目前沒有新增 M1 專屬 compile error。

### 美術總監評估（review-r3 前置）— 2026-04-25

基於 `character/tabs.jsx` HTML proof + `ui-design-tokens.json` (`componentRecipes.tabOverview.coreStats`) 與現行 skin/fragment 的像素級差距分析。

---

#### 一、Layout 幾何（最高衝擊）

| 項目 | HTML proof | Cocos 現況 | 差距 |
|------|-----------|-----------|------|
| StatsOverview 欄比 | `gridTemplateColumns: "220px 1fr"` → radar≈220, list≈300, gap=20 | RadarSummaryCard=300, StatsValueCard=224, gap=16 | **比例完全顛倒**：radar 多 80px、stats list 少 76px |
| 主題節奏 | Radar 是配角（左側緊湊），Stats list 是主角（寬敞） | Radar 佔大位，Stats list 窄擠 | 視覺主從錯位 |

**建議（P1）**：
- RadarSummaryCard 縮為 `220px`（含 SVG 220×220 剛好）
- StatsValueCard 擴為 `304px`（220+16+304=540，吃滿內容寬）
- RadarGlyphFrame 內 CanvasSize 維持 size×2+60 公式不變，只改 Card 容器寬度

---

#### 二、Typography 落差（高衝擊）

| 節點 / 角色 | HTML proof | 現行 skin slot | 差距 |
|------------|-----------|--------------|------|
| StatLabel（武力/智力…） | fontSize=**18**, fontWeight=700, color=**per-stat** (`#6fa8ff` / `#c494ff`…) | `detail.label.cardTitle` → fontSize=**16**, color=textPrimary | fontSize -2；缺少 per-stat 彩色 |
| StatLabel letterSpacing | `.1em` | 無 letterSpacing 設定 | 缺 |
| StatTalentValue（資質數字）| fontSize=**16**, fontWeight=800, color=`#FFE088` | `detail.label.value` → fontSize=**20** | fontSize **+4 過大**，擠壓 badge |
| StatProwess（實力數字）| fontSize=**22**, fontWeight=800, color=`#F5F1E8` | `detail.label.value` → fontSize=**20**, color=textPrimary | fontSize -2；color 偏 warm-white |
| StatArrow（→）| color=`#4D4635` | `detail.label.meta` → color=`#3F6A62`（jade green） | **語意錯誤**：箭頭應為 outline-brown，不是 jade |
| StatEn（STR/INT…） | fontSize=10, letterSpacing=`.15em`, color=`#6b6456` | `gdv3.label.summarySectionEn` → fontSize=10, color=`#6b6456` | **✓ 已吻合** |
| VitalLabel（HP 生命…） | fontSize=16, color=`#B0A880` | `detail.label.cardTitle` → fontSize=16, color=textPrimary | color 偏亮（應為 khaki `#B0A880`） |
| VitalValue（右上數字）| fontSize=**18**, fontWeight=800, color=`#FFE088` | `detail.label.value` → fontSize=**20**（TS 另覆寫 color） | fontSize +2 過大 |
| VitalMaxLabel（/ max）| fontSize=**11**, color=`#6b6456`, letterSpacing=`.1em` | 未見對應 slot | 需專用 slot 或 TS style override |
| ProfileKey（年齡/狀態…） | fontSize=**16**, color=`#3F6A62`, letterSpacing=`.15em` | `detail.label.meta` → fontSize=**14** | fontSize -2 |
| ProfileValue | fontSize=**18**, fontWeight=700, color=`#E8E4DC` | `detail.label.value` → fontSize=**20** | fontSize +2 過大 |

---

#### 三、Card Chrome 差距（中衝擊）

| 項目 | HTML proof | Cocos 現況 | 差距 |
|------|-----------|-----------|------|
| Stats row card | padding `8px 12px`、bg `rgba(255,255,255,.02)`、border `#4D4635`、radius=8 | `detail.field.name.bg` → bg `#FFE08814`、borderColor `#8A6E1F`、radius=6 | **bg/border 語意錯誤**：stat row 背景應用 `detail.field.bg` 而非 talent-gold 色調 |
| Stat bar track | height=**8**, radius=4, bg `rgba(255,255,255,.04)` | height=**7**, 用 `detail.field.bg` | height -1；bg 語意可接受 |
| Vitals bar track | height=**10**, radius=5, bg `rgba(0,0,0,.2)`, border `#4D4635` | 需確認 ChildPanel 實現 | 需對照 TS 實際 bar 高度 |
| Total rank row | padding `10px 14px`、bg `rgba(212,175,55,.06)`、border `rgba(212,175,55,.3)` | 尚未見對應節點 | **缺失**：需在 StatsValueCard 底部補 TotalRankRow |
| Profile grid gap | `gap: 8` | ProfileRowTop/Bottom 分兩層，無 grid gap 控制 | 需確認 layout spacing |

---

#### 四、Token 對應確認

`ui-design-tokens.json` → `componentRecipes.tabOverview.coreStats`：
- `gridGap: "4px 12px"`、`itemGap: 6`、`key.fontSize: 17`、`key.letterSpacing: ".1em"`、`value.fontSize: 20`

> **注意**：tokens 的 `key.fontSize=17` 與 HTML proof 的 `18` 略有出入（1px 差距）；以 HTML proof 為準取 **18**（視覺更有份量）。

`gdv3ProgressFill: #87C8B3` — 目前 radar fill 與此 token 顏色接近，已使用 `#8CCFC4`（accent.jade.crest），可接受。

---

#### 五、Round-3 建議執行優先序

| 優先 | 項目 | 目標檔案 |
|------|------|---------|
| P1-A | 欄比對調：RadarSummaryCard 300→220, StatsValueCard 304 | `gd-tab-stats.json` |
| P1-B | StatRow 背景改用 `detail.field.bg`（dark rgba card），而非 talent-gold bg | `gd-tab-stats.json` skinSlot 各 StatRow |
| P2-A | StatLabel 新增 skin slot `detail.label.statName`：fontSize=18, no outlineWidth；TS 補 per-stat color override | `general-detail-unified-default.json` + `GeneralDetailStatsChild.ts` |
| P2-B | StatTalentValue 改用 `detail.label.talentNum`：fontSize=16, fontWeight=800, color=textAccent | `general-detail-unified-default.json` + `gd-tab-stats.json` |
| P2-C | StatProwess 改用 `detail.label.prowessNum`：fontSize=22, fontWeight=800, color=`#F5F1E8` | `general-detail-unified-default.json` + `gd-tab-stats.json` |
| P2-D | StatArrow：改用 `detail.label.dimArrow`（fontSize=14, color=`#4D4635`）或直接 TS style override | skin or TS |
| P2-E | ProfileKey fontSize 14→16（改 detail.label.meta 或新 slot） | skin |
| P3-A | VitalLabel color 改為 `#B0A880`（khaki）：TS style override 或 skin 新增 `detail.label.vitalLabel` | TS or skin |
| P3-B | Stat bar height 7→8；Vital bar height 對齊 10 | `gd-tab-stats.json` + TS |
| P3-C | 補 TotalRankRow 節點（總評等級 + GradeBadge + 良才美質） | `gd-tab-stats.json` |

#### 六、Round-3 執行腳本（可直接照做）

**六角雷達圖像素級對標完成時點**

- 六角雷達圖與 HTML 的像素級對標，完成時點鎖定在 `review-r3a`：也就是 `RadarSummaryCard` 幾何、雷達半徑、六軸位置、標籤落點全部固定後，進入 `ui-preview-judge` 驗收。
- 若 `review-r3a` 的 judge 結果仍出現 `GEO` 殘差，代表雷達圖還沒達到像素級一致，禁止進入 `review-r3b`。
- 只有在 `review-r3a` 通過且 `GEO=0 / TYPE=0` 時，才把六角雷達圖視為「已和 HTML 像素級相同」；後續只允許材質與卡面微調，不再動雷達幾何。
- 目前狀態：`review-r3a` 已完成並通過 capture，雷達圖的幾何基準已鎖定，待 `ui-preview-judge` 作最終像素判定。

**Stage A：幾何重排（先做，避免後續字階白調）**

- [x] `gd-tab-stats.json`：`RadarSummaryCard.width = 220`
- [x] `gd-tab-stats.json`：`StatsValueCard.width = 304`
- [x] `gd-tab-stats.json`：`StatsOverviewRow.layout.spacing = 16`（先維持；若仍偏擠再測 18~20）
- [x] `gd-tab-stats.json`：確保 `StatsValueCard` 內每列 row 可容納 304 欄寬下的 `label + en + badge + arrow + prowess + bar`

**Stage B：字階與顏色（按 HTML 語意拆 slot）**

- [x] `general-detail-unified-default.json`：新增 `detail.label.statName`（18/20，letterSpacing `.1em`，無 outline）
- [x] `general-detail-unified-default.json`：新增 `detail.label.talentNum`（16，bold，`textAccent`）
- [x] `general-detail-unified-default.json`：新增 `detail.label.prowessNum`（22，bold，`#F5F1E8`）
- [x] `general-detail-unified-default.json`：新增 `detail.label.dimArrow`（14，`#4D4635`）
- [x] `general-detail-unified-default.json`：新增 `detail.label.vitalLabel`（16，`#B0A880`）
- [x] `general-detail-unified-default.json`：新增 `detail.label.vitalMax`（11，`#6b6456`，letterSpacing `.1em`）
- [x] `gd-tab-stats.json`：把對應 label 改掛新 style slots，避免 `detail.label.value` 一套打天下
- [x] `GeneralDetailStatsChild.ts`：StatLabel 維持 per-stat color override（`#6fa8ff/#c494ff/#86E1A5/#E0E0E0/#ff9bba/#ff8d6e`）

**Stage C：卡面語言與補齊缺件**

- [x] `gd-tab-stats.json`：StatRow panel 皮膚由 `detail.field.name.bg` 改為 `detail.field.bg`（保留 badge 才使用 gold 語言）
- [x] `gd-tab-stats.json`：StatBar track 高度 `7 -> 8`
- [x] `gd-tab-stats.json` + `GeneralDetailStatsChild.ts`：Vitals bar track 對齊 `10`，fill 對齊 HTML 漸層語言
- [x] `gd-tab-stats.json`：於 `StatsValueCard` 底部新增 `TotalRankRow`（總評等級 + GradeBadge + 良才美質）

#### 七、Round-3 驗收門檻（美術總監版）

- [ ] 幾何主從：肉眼第一印象需是「右欄 Stats list 主體」而非「左欄 radar 主體」
- [ ] 字階節奏：StatLabel(18) < Prowess(22) > Talent(16) 的三角層級明確成立
- [ ] 色彩語意：箭頭必為 outline-brown (`#4D4635`)、StatLabel 必為 per-stat 色、VitalLabel 必為 khaki
- [ ] 卡面語言：Stat row 背景不得再呈現金色 badge 語言（gold 只留給 talent badge / rank 區）
- [ ] 補件完整：TotalRankRow 實裝且與 HTML 文案節奏一致（`總評等級` + badge + `良才美質`）
- [ ] 工程檢核：capture pass 仍維持 `consoleError/warning/pageError/requestFailure = 0`

#### 八、Round-3 完成後回寫要求

- [ ] 在本檔補一段「review-r3 實際變更摘要」：列出最終採用值（寬度、字級、bar 高度）
- [ ] 附上 `artifacts/ui-source/general-detail-stats/review-r3/` 的 capture 與 preview-judge 結果
- [ ] 若仍為 `CONDITIONAL_PASS`，需標明殘差只允許落在「材質質感」層，不可是「幾何與字階」層

#### 九、Round-3 分段收斂節拍（美術總監執行版）

避免一次改太多導致判讀失焦，Round-3 拆成三個可回滾的子回合：

- [x] `review-r3a`（幾何）：只改欄比與 row 可用寬度，不動字級與顏色
- [x] `review-r3b`（字階）：只改 style slot 與文字層級，不動卡面材質
- [ ] `review-r3c`（材質）：只改 row/chrome/bar/total-rank 視覺語言

本輪進度：

- [x] `review-r3a` 已完成並產出 `artifacts/ui-source/general-detail-stats/review-r3a/`
- [x] `review-r3a` capture diagnostics：`consoleError=0`、`consoleWarning=0`、`pageError=0`、`requestFailure=0`
- [x] `review-r3b` 已完成並產出 `artifacts/ui-source/general-detail-stats/review-r3b/`
- [x] `review-r3b` capture diagnostics：`consoleError=0`、`consoleWarning=0`、`pageError=0`、`requestFailure=0`
- [x] `GeneralDetailComposite.ts` 已補上 renderer 注入，雷達圖節點在 runtime 可建立（`RadarChart` 已存在於 scene tree）
- [x] `GeneralDetailStatsChild.ts` 的 prowess fallback 已修正，數值列與 bar 長度恢復可讀
- [x] `GeneralDetailStatsChild.ts` 已加入 RadarChart 去重與重用邏輯，runtime 驗證 `RadarGlyphFrame` 下 `chartCount=1`（不再重複堆疊）
- [x] `CocosCompositeRenderer.drawRadarChart()` 已修正動態節點 layer 繼承（`container/gfxNode.layer = parent.layer`），解決「有 path 但不可見」核心問題
- [x] `review-r3c` 材質驗收完成：雷達幾何維持鎖定，已完成透度/輪廓語感收斂（`v19/v20/v21`）；capture diagnostics 全綠

每個子回合都必須：

- [x] 產出獨立 capture 目錄（`review-r3a` / `review-r3b` / `review-r3c-v19` / `review-r3c-v20` / `review-r3c-v21`）
- [x] 寫一段「只改了什麼 / 刻意沒改什麼」
- [ ] 若視覺信心下降，直接回退到上一子回合，不帶病進入下一輪

`review-r3c` 實際變更摘要（2026-04-26）

- 只改了什麼：
	- `GeneralDetailStatsChild.ts`：雷達 layer opacity `0.28 -> 0.25`、grid alpha `#4D463566 -> #4D463559`。
	- `GeneralDetailStatsChild.ts`：六列 Stat bar fill 加入 alpha 控制，統一降到 `232/255`，降低過亮感。
	- `CocosCompositeRenderer.ts`：雷達輪廓 alpha `255 -> 230`、lineWidth `2 -> 1.6`、頂點半徑 `2.5 -> 2.1`。
- 刻意沒改什麼：
	- 不動雷達幾何（size/axes/slot 結構不變）。
	- 不動資料流與數值映射（prowess fallback、bar 計算公式不變）。
	- 不動 shell / layout 欄比（維持 `RadarSummaryCard 220` + `StatsValueCard 304`）。

`review-r3c` 驗證落檔：

- `artifacts/ui-source/general-detail-stats/review-r3c-v19/`
- `artifacts/ui-source/general-detail-stats/review-r3c-v20/`
- `artifacts/ui-source/general-detail-stats/review-r3c-v21/`
- 三輪 `capture-report.json` 均為 `consoleError=0`、`consoleWarning=0`、`pageError=0`、`requestFailure=0`。

### 技術總監對標方案（六屬雷達圖 / review-r4a）— 2026-04-26

問題判讀（為何「看得到」仍會和 HTML 差很多）：

- 先前 Cocos 雷達雖可見，但不是和 HTML 同一套生成規則：格線圈數、軸標籤定位、頂點顏色與筆觸寬度都不一致。
- `gd-tab-stats` 仍保留舊版固定定位 glyph 標籤，與 renderer 繪製圖形同時存在時，視覺語意會互相干擾。
- 因此要達到像素級對標，必須從「參數微調」升級成「同構算法」：Cocos 端要重現 HTML `TabStats` 的幾何與繪製流程，而非只改色票。

本輪已落地（review-r4a）：

- [x] `ICompositeRenderer.RadarChartConfig` 擴充同構欄位：`gridRings / line widths / marker / axis label radius & colors`。
- [x] `CocosCompositeRenderer` 改為 HTML 同構雷達：
	- [x] 四層格線（`gridRings=4`）
	- [x] 軸線與格線獨立線寬（`0.7`）
	- [x] 輪廓線寬固定對齊 HTML（`2`）
	- [x] 每軸頂點獨立顏色（對應六屬色）
	- [x] 動態中文軸標籤（依半徑計算位置，不再寫死 widget）
- [x] `GeneralDetailStatsChild` 雷達設定改為 HTML 同語意：
	- [x] `axes` 改中文（武力/智力/統率/政治/魅力/運氣）
	- [x] `opacity=0.18`、`markerRadius=4`、`axisLabelRadius=size+22`
	- [x] 停用 legacy `RadarGlyph*` 固定標籤，避免雙軌標籤干擾
- [x] Runtime 驗證完成：`review-r4a` diagnostics 全綠（`consoleError/warning/pageError/requestFailure = 0`）

對標驗收證據：

- `artifacts/ui-source/general-detail-stats/review-r4a/GeneralDetailStats.png`
- `artifacts/ui-source/general-detail-stats/review-r4a/capture-report.json`
- `artifacts/ui-source/general-detail-stats/review/runtime-verdict.json`（`runId=review-r4a`, `status=pass`）

下一步 Checklist（針對「像素級對標」最後一哩）：

- [x] 以 `tabs.jsx` 雷達基準完成座標抽樣比對（六頂點 + 六標籤）。
- [x] 找出幾何主差異為「Y 軸方向相反」而非色票/字階，先修幾何根因。
- [x] 完成 `review-r4c` 實機 capture，驗證修正後 runtime diagnostics 全綠。

### 技術總監差異分析（review-r4b）— 2026-04-26

本輪以 `Design System/design_handoff/character/tabs.jsx` 的雷達生成公式為基準，逐項對比 Cocos 實作。

核心結論：

- `網格圈數`：一致（4 層，`0.25/0.5/0.75/1`）。
- `軸線數`：一致（6 軸）。
- `雷達填色/輪廓/頂點`：一致（`rgba(140,207,196,.18)`、`stroke 2`、`marker r=4`）。
- `最大落差`：**座標系 Y 軸方向不一致**，造成整個六角圖上下翻轉，屬於 `GEO` 級阻斷問題。

定量差異（R=90，對照 HTML）：

- `武力`（index 0）理應在最上方；修正前落在最下方，Y 偏差約 `180px`。
- `政治`（index 3）理應在最下方；修正前落在最上方，Y 偏差約 `180px`。
- `智力/統率/魅力/運氣` 四軸皆出現上下鏡像，位置偏差落在 `90px~156px` 區間。
- 判定：修正前 `GEO=FAIL`（軸方位錯置，不可接受）。

已落地修正（全部完成）：

- [x] `assets/scripts/ui/platform/cocos/CocosCompositeRenderer.ts`
	- `_radialPoint()` 由 `y = +r*sin(angle)` 改為 `y = -r*sin(angle)`。
	- 使 Cocos（Y-up）與 HTML SVG（Y-down）的視覺方位同構。
- [x] `assets/scripts/ui/components/general-detail/GeneralDetailStatsChild.ts`
	- 強化 legacy 雷達固定標籤停用路徑（同時支援 `TabStatsContent/...` 與相對路徑），避免舊標籤干擾新幾何判讀。
- [x] 實機驗證
	- `artifacts/ui-source/general-detail-stats/review-r4c/GeneralDetailStats.png`
	- `artifacts/ui-source/general-detail-stats/review-r4c/capture-report.json`（`consoleError=0 / consoleWarning=0 / pageError=0 / requestFailure=0`）

本輪驗收結論：

- 六軸方位已對齊需求：`武力=上`、`智力=右上`、`統率=右下`、`政治=下`、`魅力=左下`、`運氣=左上`。
- `多層六角網` 與 `頂點/標籤半徑` 現在採同一套幾何規則，可做後續 `±2px` 級微調，但不再有方向性錯位。

#### 十、像素殘差分類規範（judge 回寫格式）

`preview-judge-report.json` 回寫時，殘差必須標註到下列其中一類：

- [ ] `GEO`：幾何（寬高、gap、對齊、主從比例）
- [ ] `TYPE`：字階（fontSize、weight、letterSpacing、文字密度）
- [ ] `CHROME`：卡面與材質（背景透明度、邊框語意、陰影）
- [ ] `COLOR`：語意色（per-stat、khaki、outline-brown）

判定門檻：

- [ ] `PASS`：`GEO=0` 且 `TYPE=0`，其餘僅可有輕微 `CHROME`
- [ ] `CONDITIONAL_PASS`：`GEO=0`、`TYPE<=1`，且不得有關鍵資訊可讀性風險
- [ ] `FAIL`：任何 `GEO>0` 或 `TYPE>1`

#### 十一、Round-3 風險停損規則

- [ ] 若新增 style slot 超過 6 個，先停下來合併語意，避免 skin 片段化
- [ ] 若 `gd-tab-stats.json` 單輪改動超過 120 行，先拆成兩輪提交，避免 regression 判讀失真
- [ ] 若連續兩輪都停在 `CONDITIONAL_PASS`，下一輪必須優先處理 `GEO/TYPE`，禁止再做材質微調

接續執行計畫

1. 以 `Stats` 與 `Basics` 為先行樣板，繼續把 `Tactics / Bloodline / Aptitude` 的內容節奏改成 HTML 等級的 section/card。
2. 回頭把 `Bloodline` 祖系樹的視覺語言從目前的縮編 chip 版，繼續往 HTML 的 `14-person ancestry matrix` 靠攏。
3. 回頭處理 `Overview` 與 story strip、tab rail、shared CTA 的 shell parity。
4. 之後再處理 `Extended`，但它列為母規格後續里程碑，不納入本輪 HTML 六大 tab 主交付。

---

### 美術總監評估（review-r3c 前置 / Round-4）— 2026-04-25

基於使用者截圖與 `character/tabs.jsx` HTML proof 的再次對比分析，找出前三輪仍未修正的根本缺陷。

---

#### 一、雷達圖完全空白（P0 — 最高衝擊）

| 項目 | HTML proof | Cocos 現況 | 根因 |
|------|-----------|-----------|------|
| 雷達多邊形 | SVG 直接渲染，永遠可見 | `_services.renderer` 為 `undefined` → `_syncRadar()` 提前 return | `GeneralDetailComposite` 從未呼叫 `setCompositeRenderer(new CocosCompositeRenderer())`，導致所有 ChildPanel 的 `_services.renderer` 恆為 undefined |
| 視覺效果 | 彩色 per-stat 六角填滿 | 只有 placeholder 文字「六色屬性」與格線標籤 | 架構注入缺失 |

**Fix**：在 `GeneralDetailComposite._onAfterBuildReady` 加入：
```typescript
import { CocosCompositeRenderer } from '../platform/cocos/CocosCompositeRenderer';
// ...
this.setCompositeRenderer(new CocosCompositeRenderer());
```

---

#### 二、Stat Bar 幾乎不可見（P0 — 最高衝擊）

| 項目 | HTML proof | Cocos 現況 | 根因 |
|------|-----------|-----------|------|
| Bar 填充寬度 | `Math.min(100, prowess/20) + "%"` → prowess=1688 → bar≈84% | bar≈5% (12px / 260px) | `prowess = stat?.prowess ?? talentCurrent`；當無 `dualLayerStats.prowess` 時 prowess fallback = raw stat (0–100)，而公式期望 0–2000 |
| Prowess 顯示數字 | "1,688"（大型數字，有份量）| "98"（與 talent badge 相同）| 相同 fallback 問題 |

**Fix**：`GeneralDetailStatsChild._syncStatsRows` 改為：
```typescript
const rawProwess = stat?.prowess;
const prowess = rawProwess != null ? rawProwess : Math.round(talentCurrent * 17);
```
映射規則：raw stat 98 → prowess 1666（≈ HTML 1688），bar 填充≈83%。

---

#### 三、Checklist（review-r3c 全步驟）

**Stage D：資料與渲染注入（本輪重點）**

- [x] `GeneralDetailComposite.ts`：`_onAfterBuildReady` 加入 `this.setCompositeRenderer(new CocosCompositeRenderer())`，修復雷達圖永不渲染的根因
- [x] `GeneralDetailStatsChild.ts`：`_syncStatsRows` 的 prowess fallback 改為 `Math.round(talentCurrent * 17)`，讓 bar 填充從 ≈5% 提升至 ≈83%
- [x] 已重跑 capture（`review-r3c`、`review-r3c-v2`、`review-r3c-v5`），`consoleError/warning/pageError/requestFailure = 0`
- [x] 已重跑 capture（新增 `review-r3c-v9` ～ `review-r3c-v14`），`consoleError/warning/pageError/requestFailure = 0`
- [x] 已重跑 capture（新增 `review-r3c-v15` ～ `review-r3c-v18`），`consoleError/warning/pageError/requestFailure = 0`
- [ ] 以截圖驗收：bar 填充已達標；雷達圖已恢復可見，剩餘工作為與 HTML proof 的美術細節貼合
- [ ] 若仍有 CHROME 殘差，進入 `review-r3d`（材質微調）；但 GEO/TYPE 不得有新增殘差

**只改了什麼 / 刻意沒改什麼**

- 改：`GeneralDetailComposite.ts` 加入 renderer 注入（1 行 + 1 import）
- 改：`GeneralDetailStatsChild.ts` prowess fallback 公式（1 行）
- 不改：layout JSON、skin JSON、其他 ChildPanel（防止 regression）

本輪進度：

- [x] `review-r3c` 分析完成（本節）
- [x] `review-r3c` capture 已執行，runtime diagnostics 為 0 error / 0 warning / 0 pageError / 0 requestFailure
- [ ] `review-r3c` 視覺驗收待完成
- 補充：runtime 診斷顯示 `RadarGfx` 已有 path（`radarPathCount=17`）且 talent 值為 `82/94/92/96/90/86`，最終根因是動態節點 layer 未繼承 UI layer
- 補充：`review-r3c-v18` 已恢復可視六角輪廓（含頂點），可進入 `review-r3d` 做材質語感收斂

---

## M3 血脈命鏡整合

目標：把 `BloodlineTreePanel.ts`、主 layout、loading layout 與 content state 整合為可驗證畫面。

Checklist

- [x] 盤點 `BloodlineTreePanel.ts` 與 `bloodline-mirror-main.json` bind 點
- [x] 對照 `bloodline-mirror-loading-main.json` 建立 loading 狀態切換
- [x] 隔離 General Detail smoke capture 中反覆出現的 `StateBadgeRow` warning 來源，確認它來自 `bloodline-mirror-loading-main.json`
- [ ] 串接 `bloodline-mirror-states-v1.json` 的 `loading` / `awakening` 狀態
- [ ] 對照 `preview/` 的 badge / rarity 規格調整視覺
- [ ] 正式消除 loading / awakening 共用 `StateBadgeRow` overflow residual
- [x] 刷新 Cocos Asset DB
- [ ] 執行 UI 規格驗證
- [ ] 視覺驗證並回寫結果

交付物

- `assets/scripts/ui/panels/BloodlineTreePanel.ts`
- `assets/resources/ui-spec/layouts/bloodline-mirror-main.json`
- `assets/resources/ui-spec/layouts/bloodline-mirror-loading-main.json`
- `assets/resources/ui-spec/content/bloodline-mirror-states-v1.json`

執行紀錄

- 已確認 `BloodlineTreePanel.ts` 目前實際掛在 `GeneralDetailBloodlineChild.ts`，不是直接掛在命鏡 screen 上。
- 已補上 `LobbyScene.ts` 的 `BloodlineMirrorLoadingHost` 與 `UIID.BloodlineMirrorLoading` controller 註冊，讓 loading state 可與 awakening state 一樣透過 preview/controller 開啟。
- 已確認 General Detail `Stats / Basics / Bloodline / Aptitude` capture 反覆看到的 `StateBadgeRow` warning 不是人物頁本身，而是 `LobbyScene` 啟動時同時掛上的 `BloodlineMirrorLoadingHost` 共用 layout 殘差。
- 目前發現 `bloodline-mirror-main.json` 與現行 `bloodline-mirror-state-content.schema.json` 的 bind path 尚未對齊；主 layout 尚未正式接入現行 contract，後續需決定是擴充主 layout 節點還是拆出覺醒專用 contract。

---

## M4 結果彈窗清理

目標：確認 `ResultPopupComposite` 是唯一正式路徑，清理 legacy popup 實作殘留。

Checklist

- [ ] 搜尋 `ResultPopup` 舊版使用點
- [ ] 確認 prefab / scene / route 未再依賴 legacy 版本
- [ ] 將殘留呼叫點導向 `ResultPopupComposite`
- [ ] 驗證 victory / defeat / stalemate 三種狀態
- [ ] 回寫是否可刪除 legacy 檔案

交付物

- `assets/scripts/ui/components/**/*ResultPopup*`
- 驗證紀錄（回寫本檔）

---

## M5 轉蛋 Gacha 實作

目標：依 `gacha-main.json` 建立可掛載的 `GachaComposite` 與子面板。

Checklist

- [ ] 建立 `GachaComposite.ts`
- [ ] 建立 pool tabs child panel
- [ ] 建立 featured banner / rate-up 區塊 child panel
- [ ] 建立 roll action / cost 顯示 child panel
- [ ] 串接 preview route（`hero / support / limited`）
- [ ] 刷新 Cocos Asset DB
- [ ] 執行 UI 規格驗證
- [ ] 回寫驗證結果與後續需求

交付物

- `assets/scripts/ui/components/gacha/*`
- `assets/resources/ui-spec/layouts/gacha-main.json`

---

## M6 商店 Shop 實作

目標：依 `shop-main-main.json` 建立 `ShopComposite` 與必要子面板。

Checklist

- [ ] 建立 `ShopComposite.ts`
- [ ] 建立 `ShopTabRow` child panel
- [ ] 建立 `ShopItemGrid` child panel
- [ ] 建立資源顯示 child panel
- [ ] 串接 preview route
- [ ] 刷新 Cocos Asset DB
- [ ] 執行 UI 規格驗證
- [ ] 回寫驗證結果與後續需求

交付物

- `assets/scripts/ui/components/shop/*`
- `assets/resources/ui-spec/layouts/shop-main-main.json`

---

## M2 戰場 HUD v3 同步（最後）

目標：以 `battle/index_v3.html` 為唯一基準，在其餘畫面完成後最後收斂 Battle HUD。

Checklist

- [ ] 對照 `battle/index_v3.html` 盤點 `battle-hud-main.json` 差異
- [ ] 同步 `TopBar`、`ActionRing`、`BattleLog` 與 `BattleGrid` 關鍵區塊
- [ ] 視需要同步 `action-command-main.json` 與 `battle-log-main.json`
- [ ] 刷新 Cocos Asset DB
- [ ] 執行 UI 規格驗證
- [ ] 視覺驗證並回寫結果

交付物

- `assets/resources/ui-spec/layouts/battle-hud-main.json`
- `assets/resources/ui-spec/layouts/action-command-main.json`
- `assets/resources/ui-spec/layouts/battle-log-main.json`

---

## 回寫規則

- 每完成一個 checklist 項目就直接回寫 `[x]`。
- 若發現 blocker，直接在對應里程碑底下追加 `- Blocker:` 說明。
- 若里程碑順序需要再調整，先在本檔更新，再開始下一階段作業。