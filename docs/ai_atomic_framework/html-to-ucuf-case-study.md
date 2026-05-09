---
doc_id: doc_other_0081
title: html-to-ucuf reference case study
audience: downstream-adopter
phase: ATM-4
purpose: reference case study plan
---
# html-to-ucuf Reference Case Study

這份文件只定義 3KLife / html-to-ucuf 的 reference case study 邊界，不把 domain 規則塞回 ATM core。

## Scope

- 目標是把 html-to-ucuf 當成第一個可替換的 legacy case study。
- 第一輪只做 birth / dry-run injection 與 regression baseline，先證明替換管道能跑通。
- 案例中的 helper / plugin 只能存在於 downstream case study、adapter 文件或 regression baseline。
- 所有 case study 變更都要維持「core neutral」，不能反向污染上游框架。
- 啟動條件是 self-hosting alpha0 deterministic gate 全綠，否則一律維持 planning-only。

## Start Gate（強制）

以下條件未同時成立前，不得啟動任何 H2U case injection：

1. self-hosting alpha0 deterministic gate 全綠。
2. rule-guard、encoding、context-budget 三道基礎守衛都可重播通過。
3. 已產出當前版 regression baseline 與對應 evidence。

若任一條件失敗，case study 只能停留在 spec/plan 更新，不可執行 injection。

## Non-Goals

- 不重寫整個 `draft-builder.js` 主幹。
- 不追 pixel parity，也不直接靠畫面感覺調參。
- 不在這一卡同時推 H2U-REFACTOR 的拆檔與 ATM case atom 抽取。
- 不把 html-to-ucuf 直接升格成 ATM core 的預設 domain。
- 不把這份文件變成 H2U-REFACTOR 的替代規格。
- 第一輪不允許替換 `draft-builder.js` 主幹路徑，只允許 dry-run 注入與回退演練。

## Domain Plugin List

這一輪先收斂成最小、低風險的 plugin / atom 清單：

| Layer | Plugin / Atom | Role |
|---|---|---|
| Case boundary | `legacyDraftBuilderAdapter` | 包住舊系統輸出入，先保持行為穩定 |
| Primitive extractor | `normalizeCssColor` | 顏色正規化，低風險第一顆 atom |
| Primitive extractor | `parseCssLength` | CSS 長度解析 |
| Primitive extractor | `parseFontWeight` | font-weight 解析 |
| Primitive extractor | `extractTypographyStyle` | 字體與排版樣式抽出 |
| Primitive extractor | `mapBorderRadius` | border-radius 對應與轉換 |
| Signal detector | `classifyBackgroundLayer` | 區分背景層，決定可否切成資產 |
| Signal detector | `detectAssetizationRequired` | 判斷是否需要 assetization |
| Regression support | `buildKnownGapRecord` | 把已知缺口結構化 |
| Regression support | `computeFidelityScore` | 估算 fidelity 分數 |
| Regression support | `assignResidualOwnerBucket` | 把殘差分配到 owner bucket |

## Reference Workflow

1. Freeze active spec。
2. 建立 regression baseline。
3. 先包 `legacyDraftBuilderAdapter`，不要直接拆主幹。
4. 每次只抽一個 helper / atom。
5. 每次抽完都跑 regression。
6. 所有 gap 都要落成可讀的 evidence / owner 記錄。
7. 只在 dry-run 驗證通過後，才進入下一步 injection。

## Injection Safety Contract（ATM-4-0006）

第一輪注入只允許 `dry-run injection + rollback plan`：

- 每次 injection 前先輸出可回放計畫（input hash、target hash、預期輸出路徑）。
- 注入結果必須落在可清除的暫存輸出，不可覆寫正式主幹產物。
- 若 regression 指標下降或 gate 失敗，立即執行 rollback，回到上一個已驗證 baseline。
- rollback 計畫必須包含：回復命令、受影響檔案列表、驗證命令與成功判定條件。
- 未完成 rollback 可重播驗證前，不得升級為下一輪注入。

## Success Criteria

- 能產出第一份可回放的 dry-run injection plan。
- 能把第一批低風險 helper 抽成獨立 atom。
- 能保持 domain-specific 規則在 case study 層，不外溢到 core framework。
- 能用 regression baseline 證明替換前後的行為差異。

## Notes

- 這份文件是 ATM-4 的 reference case study manifest，不是 core 規格。
- 如果後續要做演化 pilot，請另外開 ATM-4-0003 以後的卡，不要在這份 plan 裡偷改範圍。
- 對應的 regression baseline 文件會由 ATM-4-0002 承接。
