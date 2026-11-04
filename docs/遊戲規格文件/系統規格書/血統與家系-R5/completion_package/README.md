<!-- doc_id: doc_index_1033 -->
# 血統遺傳與全玩法文件補全工作包

本包把已入庫R5與既有遊戲母規格接成可審核的文件：說清楚版本權威、每個玩法入口如何與人物家系互動、哪些原始契約還缺、由誰提交事件，以及如何驗收跨系統失敗與恢復。

它完成的是本次文件整合工作稿，不把缺失catalog、未採政策或未驗產品寫成完成。先文件，再核所需決策、真實consumer與正式治理，之後才評估產品程式。

## 基準與狀態

| 項目 | 結果 |
|---|---|
| Repository | eaglhuang/3klife |
| 固定起點 | b35b349c01e728358a8ef9a21cbcb8fbdd9dadfe |
| master觀測時點 | 2026-11-04 00:20 UTC，當時仍為此SHA |
| 文件狀態 | DRAFT_FOR_REVIEW_WITH_OPEN_DECISIONS |
| 正式文檔／工單身份 | 本包未登記正式doc_id或ATM工單 |
| implementationReady | false |
| 現行產品／consumer | NOT_VERIFIED／NOT_RECHECKED；僅特別標出的入口與版本漂移diff做過靜態核查 |
| 產品測試／驗收 | NOT_RUN／NOT_ASSESSED |
| 執行邊界 | 只寫本環境工作文件；沒有改產品、原repo、資料表或存檔，沒有提交、推送、上傳 |

最新分支後續若前進，須比較差異後同步本包，不拿此固定版本冒充未來的最新版本。[起點提交](https://github.com/eaglhuang/3klife/commit/b35b349c01e728358a8ef9a21cbcb8fbdd9dadfe)

**成稿前同步：** 00:47 UTC直接讀master，已前進至bd2a5a4c（3提交／13檔）。任務牆與祭壇已有真實資料映射、節慶ID已有接線；本包不把b35的示意內容觀察延用為最新缺實作。規格目錄及R5未在該比較中變更，固定起點不變。詳[版本漂移記錄](validation/版本漂移記錄.md)。

## 文件索引

| 文件 | 讀者及用途 | 主要內容 |
|---|---|---|
| [01 權威與衝突帳](specs/01_權威與衝突帳.md) | 規格作者與審核者 | 權威層級、歷史記錄保留、28項文件修訂卡、來源缺口、版本與實作分帳 |
| [02 全玩法接口矩陣](specs/02_全玩法接口矩陣.md) | 各領域owner與後續工程者 | 12組玩法、53具體入口、身份及數值、成本時鐘、正常流程、失敗／取消／pending／重入、公開知識與跨季 |
| [03 38功能與待決補件追蹤](specs/03_38功能與待決補件追蹤.md) | 文件整合者與決策提供者 | 每份R5功能的既有契約、owner、操作級依賴、缺catalog/profile、可獨立能力、19DEC及17缺件 |
| [04 共同資料事件時鐘契約](specs/04_共同資料事件時鐘契約.md) | 資料及領域設計者 | 身份、精確量尺、五類時鐘、事件owner、冪等／CAS、RNG、知識、生命週期、遷移閉包與同步 |
| [05 跨玩法驗收案例](specs/05_跨玩法驗收案例.md) | 測試設計及後續實作者 | 有fixture、Given/When/Then、錯誤注入、禁止副作用、來源及NOT_RUN狀態的新跨域案例 |

建議先讀01，再用02找到玩法入口，進03確認所需功能／缺件，以04核接口，最後用05準備驗收。

## 覆蓋與完成率分母

- 系統規格目錄180檔，其中157 Markdown：73頂層規格／入口文件、21舊分片、63 R5文件。R5含80檔，63份正式ID；這是文件盤點數，不是玩法通過數。
- R5有38功能：C01–C05、U01–U02、E01–E03、B01–B10、G01–G08、S01–S08、A01–A02。
- 36項為主體／基線責任；S07門閥與S08海外幻想為未採提案，保留規格但不算已採產品需求。
- 19項既有DEC、17項來源／決策輸入／證據缺件仍保持原身份；17不是17個新增玩法決策。
- 外圍涵蓋戰鬥部署、戰法奧義適性格子關卡、物件與資產、經濟資源留存、治理官職、AI外交人口、俘虜傭兵、挑戰賽、大廳任務、結局跨季再起，以及人物取得／知識、培育教養入口。
- 原346文件案例、129歷史索引及本包61條新跨玩法案例分帳。新案例直接引用38功能，全部NOT_RUN；這不代表38功能所有行為皆已覆蓋。文件02另有44項接口驗收期待，不再加到05案例數當產品測試通過數。
- [功能JSON](evidence/feature_tracker.json)與[案例JSON](evidence/cross_gameplay_cases.json)是本包的可機讀追蹤；實際數量及結構檢查見[驗證結果](validation/validation_result.json)。

## 可機讀證據與索引

| 檔案 | 意義 |
|---|---|
| [system_inventory.json](evidence/system_inventory.json) | 起點系統目錄全部180檔、Git blob SHA、大小與永久URL |
| [authority_issues.json](evidence/authority_issues.json) | 28項權威／衝突修訂卡與來源行 |
| [feature_tracker.json](evidence/feature_tracker.json) | 38功能、19DEC及17缺件追蹤 |
| [cross_gameplay_cases.json](evidence/cross_gameplay_cases.json) | 本包新跨域驗收設計，不含產品執行結果 |
| [case_feature_matrix.json](evidence/case_feature_matrix.json) | 38功能到新案例的直接引用反向索引；有引用不代表每個行為均覆蓋 |
| [source_catalog.json](evidence/source_catalog.json) | 已取回來源的bytes/hash/行數與固定URL；不代表每行都已語義審完 |
| [source_citations.json](evidence/source_citations.json) | Markdown引用定位與相應來源片段，供人工回讀 |
| [validation_result.json](validation/validation_result.json) | 本包結構、來源行號與清單完整度的實際檢查結果 |
| [內容審核記錄](validation/內容審核記錄.md) | 本輪修正並複核的具體歧義與保留的未決事項 |
| [head_drift.json](evidence/head_drift.json) | 成稿前實際HEAD、3提交／13檔比較與patch；與固定規格來源分帳 |
| [package_manifest.json](package_manifest.json) | 本次工作包檔案SHA256，與原R5來源manifest不同 |

來源片段只為核對引用，不替代完整來源或變成新玩法權威。若同內容分處歷史原件及當前登錄副本，保留其各自hash與適用時點。

## 重要審核注意

1. 本包新schema、命令／事件標籤和adapter是整合設計提案，待現行consumer核對；不能直接宣稱產品已有此API。
2. 不用0、舊R3／R4值、最新表值或看似合理的平均數填未採政策。來源缺件必須取得真實catalog／profile／fixture，批准本身不會產生缺失原件。
3. 不改歷史決策記錄與PASS。對過時說法加版本／後續覆寫關係，當前流程另明示。
4. 不因一個待決封鎖全部功能。既有公開讀取、已知資料、不變量和完整legacy能力可保持其適用範圍；待決只阻相應操作。
5. 退休不直接產雙卡；死亡、虎符生成、既有物件移交是不同事件。
6. 生物家系、姓氏、政治陣營、模板與鏡像人物不可混同；祖位可重複同UID。
7. 所有UI／預言／故事／排序／錯誤／匯出共用公開知識邊界。
8. 結局觀看、獎勵結算與季切各有owner，不能點開畫面就發獎或清世界。

## 已知限制及未完成事項

- 所需出生LUK／peakType、alias、因子／技能／功業catalog等原始資料仍有缺口；詳03。
- 年齡職務、K／h、研習、查券以及十項主題季政策仍有未決欄位；詳03，不因本包產生而採定。
- 血脈符號slot文件宣稱repo外Windows完整稿優先；本輪未讀該完整稿，只核repo摘要，未猜測差異。
- 舊v3根README未在現80檔原樣保留，當前root為v4README；manifest與現件的來源綁定須另補，沒有重試舊傳送或重複匯入。
- 未逐招核驗65奧義、未做純視覺補遺逐像素檢查、未遍歷所有產品caller、未驗外部npc-brain實作。
- b35大廳diff可證四場景入口靜態接線；當時動態內容仍示意。成稿前bd2a5a4c已有任務牆／祭壇資料刷新與節慶ID接線，但Cocos仍未驗，不能聲稱整套大廳或R5通過，詳版本漂移記錄。
- 文件驗證程式只檢結構、行號、來源bytes/hash與數量，不證明引用語義全部正確，也不執行任何產品案例。

## 後續回寫與同步

1. 人工審01的28項修訂卡及本包新接口提案，補真正來源與已採決策證據。
2. 先確認目標repo最新HEAD相對本起點的變化，保留本包固定版本。
3. 經正常治理選既有正式文件、文檔task、適用doc_id與索引owner，不把工作包標籤當正式配號。
4. 回寫當前規格與registry/cross-ref，保歷史manifest及原案例來源；新增現況hash/locator綁定。
5. 再核真consumer、fixture、runner與正式施工條件；文件齊備不等可立即改產品。

