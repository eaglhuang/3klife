<!-- 分片：cross-ref-進度 / d2-d3-pending-ui -->
# 進度索引分片：D-2 待建 UI Spec／D-3 待定 Contract

> 入口：[cross-ref-進度.md](../cross-ref-進度.md)（PROG-2-1614 拆出）

### D-2. 待建 UI Spec 檔案（待辦）

> 原 `cross-ref-ui-spec.md C-3`。優先級：P0 = 阻擋功能開發 / P1 = 下週目標 / P2 = 月底目標。
> 狀態欄（PROG-2-1355，2026-10-28 依 repo 檔案回寫）：✅ 已建 11 個、⬜ 待建 10 個；PROG-2-1422（2026-10-28）查出其中 4 個已用其他檔名建成，改標 ✅，實際已建 15 個、待建 6 個；PROG-2-1424 建成 rank-progress 三件後為已建 18 個、待建 3 個；PROG-2-1428 建成血統小傳三件後全部 21 個已建。

| 優先級 | 檔案 | 依賴規格書 | 狀態 |
|---|---|---|:-:|
| P0 | `layouts/nurture-session-main.json` | 培育系統.md (doc_spec_0026) | ✅ 已建 |
| P1 | `skins/nurture-session-default.json` | 培育系統.md (doc_spec_0026) | ✅ 已建 |
| P1 | `screens/nurture-session-screen.json` | 培育系統.md (doc_spec_0026)、教官系統（支援卡）.md (doc_spec_0027) | ✅ 已建 |
| P2 | `layouts/general-detail.json` | 武將人物介面規格書.md (doc_ui_0012) | ✅ 已建（實際檔名 `general-detail-main` / `general-detail-unified-main` / `character-ds3-main`） |
| P2 | `layouts/general-bloodline-vignette-main.json` | 武將人物介面規格書.md (doc_ui_0012)、血統理論系統.md (doc_spec_0011) | ✅ 已建（PROG-2-1428 血統小傳開窗，由人物頁總覽「血統小傳」打開；使用者 2026-10-28 裁定做） |
| P2 | `skins/general-bloodline-vignette-default.json` | 武將人物介面規格書.md (doc_ui_0012)、UI 規格書.md (doc_ui_0027) | ✅ 已建（PROG-2-1428 血統小傳開窗，由人物頁總覽「血統小傳」打開；使用者 2026-10-28 裁定做） |
| P2 | `screens/general-bloodline-vignette-screen.json` | 武將人物介面規格書.md (doc_ui_0012)、UI 規格書.md (doc_ui_0027) | ✅ 已建（PROG-2-1428 血統小傳開窗，由人物頁總覽「血統小傳」打開；使用者 2026-10-28 裁定做） |
| P2 | `layouts/spirit-tally-detail-main.json` | 兵種（虎符）系統.md (doc_spec_0012)、武將人物介面規格書.md (doc_ui_0012) | ✅ 已建 |
| P2 | `skins/spirit-tally-detail-default.json` | 兵種（虎符）系統.md (doc_spec_0012)、UI 規格書.md (doc_ui_0027) | ✅ 已建 |
| P2 | `screens/spirit-tally-detail-screen.json` | 兵種（虎符）系統.md (doc_spec_0012)、UI 規格書.md (doc_ui_0027) | ✅ 已建 |
| P2 | `layouts/world-sandtable-main.json` | 大廳系統.md (doc_spec_0002)、官職系統.md (doc_spec_0014) | ✅ 已建（實際檔名 `layouts/sandtable-territory-main.json`，PROG-2-0967） |
| P2 | `skins/world-sandtable-default.json` | 大廳系統.md (doc_spec_0002)、UI 規格書.md (doc_ui_0027) | ✅ 已建（實際檔名 `skins/sandtable-territory-default.json`，PROG-2-0967） |
| P2 | `screens/world-sandtable-screen.json` | 大廳系統.md (doc_spec_0002)、官職系統.md (doc_spec_0014) | ✅ 已建（實際檔名 `screens/sandtable-territory-screen.json`，PROG-2-0967） |
| P2 | `layouts/rank-progress-main.json` | 官職系統.md (doc_spec_0014) | ✅ 已建（PROG-2-1424 官職進度小開窗，由官職頁「階位總覽」打開） |
| P2 | `skins/rank-progress-default.json` | 官職系統.md (doc_spec_0014)、UI 規格書.md (doc_ui_0027) | ✅ 已建（PROG-2-1424 官職進度小開窗，由官職頁「階位總覽」打開） |
| P2 | `screens/rank-progress-screen.json` | 官職系統.md (doc_spec_0014)、UI 規格書.md (doc_ui_0027) | ✅ 已建（PROG-2-1424 官職進度小開窗，由官職頁「階位總覽」打開） |
| P2 | `layouts/bloodline-mirror-loading-main.json` | 血脈命鏡過場載入規格書.md (doc_ui_0005)、UI 規格書.md (doc_ui_0027) | ✅ 已建 |
| P2 | `skins/bloodline-mirror-loading-default.json` | 血脈命鏡過場載入規格書.md (doc_ui_0005)、UI 規格書.md (doc_ui_0027) | ✅ 已建 |
| P2 | `screens/bloodline-mirror-loading-screen.json` | 血脈命鏡過場載入規格書.md (doc_ui_0005)、UI 規格書.md (doc_ui_0027) | ✅ 已建 |
| P2 | `content/bloodline-mirror-states-v1.json` | 血脈命鏡過場載入規格書.md (doc_ui_0005)、UI 規格書.md (doc_ui_0027) | ✅ 已建 |
| P2 | `contracts/bloodline-mirror-state-content.schema.json` | 血脈命鏡過場載入規格書.md (doc_ui_0005)、UI 規格書.md (doc_ui_0027) | ✅ 已建 |

---

### D-3. 待定 Contract（尚未決定是否拆成獨立 screen）

> 原 `cross-ref-ui-spec.md C-4`。

| 概念 | 暫定 contract / state | 實作狀態（PROG-2-1346 回寫，2026-10-28） | 目前掛點 | 規格來源 |
|---|---|---|---|---|
| 晨報摘要 | `pending: morning-report-content` | ✅ DailyReportController.ts（PROG-2-1170/1174） | `LobbyMain` 登入後摘要層 | 武將日誌與離線互動系統.md (doc_spec_0015)、UI 規格書.md (doc_ui_0027) |
| 武將日誌抽屜 | `pending: general-journal-content` | ✅ GeneralJournalController.ts（PROG-2-1183） | `LobbyMain` / `GeneralDetail` 抽屜層 | 武將日誌與離線互動系統.md (doc_spec_0015)、武將人物介面規格書.md (doc_ui_0012) |
| 派遣整備掛點 | `pending: dispatch-board-content` | ✅ DispatchCatalog.ts＋LobbyScene 日誌樞紐（PROG-2-1179） | `LobbyMain` 任務 / 生活感入口 | 武將日誌與離線互動系統.md (doc_spec_0015)、UI 規格書.md (doc_ui_0027) |
| 挑戰賽賽季卡 | `pending: tournament-season-card` | ✅ TournamentPanelController.ts 賽季列（PROG-2-1191）；天下沙盤彈窗右側賽季次卡（PROG-2-1431，共用 tournamentSeasonCardLines） | `LobbyMain` 世界沙盤旁次卡 | 名將挑戰賽系統.md (doc_spec_0007)、UI 規格補遺_2026-04-11_大廳晨報與人物日誌pending.md (doc_ui_0030) |
| 經濟補貼提示 | `pending: economy-subsidy-banner` | ✅ 許願祭壇 waSubsidyLabel（PROG-2-1343）、登入 toast（PROG-2-1340）、戰敗地窖提示（PROG-2-1342）；規格定位為「資源列或許願祭壇附近」，許願祭壇已滿足（PROG-2-1431 確認） | `LobbyMain` 資源列 / 許願祭壇提示條 | 經濟系統.md (doc_spec_0032)、UI 規格補遺_2026-04-11_大廳晨報與人物日誌pending.md (doc_ui_0030) |
| 虎符戰記摘要 | `pending: general-tally-summary` | 🟡 GeneralTallySummary.ts 純邏輯與 overview tallySummary（PROG-2-1344/1345）；畫面位置待定 | `GeneralDetail` overview 次卡 / peek | 兵種（虎符）系統.md (doc_spec_0012)、武將人物介面規格書.md (doc_ui_0012)、UI 規格補遺_2026-04-11_大廳晨報與人物日誌pending.md (doc_ui_0030) |
| 結緣模式摘要 | `pending: bonding-lineage-mode-chip` | ✅ BondingSetupController.ts modeChip（Standard / Peace_Lineage） | `BondingSetup` 父母摘要列 / 結果預估卡 | 結緣系統（配種）.md (doc_spec_0028)、UI 規格補遺_2026-04-11_培育戰場轉蛋pending.md (doc_ui_0031) |
| 培育學年階段列 | `pending: nurture-phase-block-header` | ✅ NurtureFlowController.ts nurturePhase（Phase_Block 1-12/13-24/25-36） | `NurtureSession` 頂部進度列 | 培育系統.md (doc_spec_0026)、UI 規格補遺_2026-04-11_培育戰場轉蛋pending.md (doc_ui_0031) |
| 畢業戰術標籤條 | `pending: graduation-tags-strip` | ✅ NurtureSessionMapper.ts graduationTags | `NurtureSession` 畢業摘要 / `GeneralDetail` peek | 培育系統.md (doc_spec_0026)、UI 規格補遺_2026-04-11_培育戰場轉蛋pending.md (doc_ui_0031) |
| 軍師 HUD 摘要 | `pending: strategist-hud-summary` | 🟡 StrategistHud.ts 純邏輯（PROG-2-1313）；戰場資料來源 StrategistHudSource.ts 已由 PROG-2-1599 補上（落石／營帳／陷阱、本回合危害、回收累計）；BattleScene HUD 畫面未接 | `BattleScene` Top HUD 次層 / 右側可收合抽屜 | 關卡設計系統.md (doc_spec_0049)、主戰場UI規格書.md (doc_ui_0001)、UI 規格補遺_2026-04-11_培育戰場轉蛋pending.md (doc_ui_0031) |
| 關卡回收摘要 | `pending: stage-salvage-summary` | 🟡 StrategistHud.ts SalvageTotals（PROG-2-1313）；回收累計已接（落石擊破 PROG-2-1583、火攻掠奪 PROG-2-1462 寫入 stageSalvage，戰後入帳 PROG-2-1571），StrategistHudSource 可組摘要（PROG-2-1599）；戰中提示條／戰後摘要卡畫面未接 | `BattleScene` 戰中提示條 / 戰後摘要卡 | 關卡設計系統.md (doc_spec_0049)、主戰場UI規格書.md (doc_ui_0001)、UI 規格補遺_2026-04-11_培育戰場轉蛋pending.md (doc_ui_0031) |
| 雙池定位導覽 | `pending: gacha-pool-positioning-brief` | ✅ GachaPoolGuide.ts＋GachaPoolGuidePresenter.ts（PROG-2-0563/0565） | `GachaMain` tab header / pity 區旁說明帶 | 轉蛋系統.md (doc_spec_0042)、UI 規格補遺_2026-04-11_培育戰場轉蛋pending.md (doc_ui_0031) |
| 轉蛋 Banner 主視覺 | `pending: gacha-banner-hero-art-policy` | ⬜ 美術政策待定 | `GachaMain` BannerStage 人物主視覺 / pool-specific key visual | 轉蛋系統.md (doc_spec_0042)、UI 規格補遺_2026-04-11_培育戰場轉蛋pending.md (doc_ui_0031) |

---
