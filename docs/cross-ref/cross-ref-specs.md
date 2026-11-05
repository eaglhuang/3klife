<!-- doc_id: doc_index_0002 -->
# Cross-Reference: 規格書索引（文件 → 相關文件）

> 這是 doc_index_0007 的 A 節分片。完整索引見 `docs/cross-reference-index.md (doc_index_0007)` (doc_index_0007)。
> 最後更新請參考母檔 Header。
>
> **doc_id 查詢**：用 `node tools_node/resolve-doc-id.js <搜尋詞>` 查文件代號，或瀏覽 `docs/doc-id-registry.md (doc_other_0006)` (doc_other_0006)。
> ⚠️ **壓縮版（doc_id 索引）**：中文名稱已移除，查詢名稱請用 resolve-doc-id.js。人類可讀進度 → `docs/cross-ref/cross-ref-進度.md (doc_index_0017)` (doc_index_0017)

## A. 規格書索引（文件 → 相關文件）

> 只列出明確的依賴 / 引用關係，不列模糊的主題重疊。
>
> **2026-04-26 兵源鏈補充**：`doc_spec_0037`（領地治理）、`doc_spec_0032`（經濟）、`doc_spec_0014`（官職）、`doc_spec_0040`（戰場部署）、`doc_spec_0012`（虎符）、`doc_ui_0001`（主戰場 UI）、`doc_ui_0012`（武將人物介面）、`doc_tech_0014`（Data Schema）共同採用 `人口 -> 城市兵源 -> 出征軍勢 -> 場上分隊`。

### 核心基礎系統

| 規格書 |被依賴（下游系統）|依賴（上游系統）|
|---|---|---|
| doc_data_0001 |doc_spec_0012、doc_spec_0016、doc_data_0002、doc_spec_0041、doc_spec_0040、doc_spec_0043|—|
| doc_spec_0016 |doc_spec_0043、doc_spec_0029、doc_spec_0018、doc_spec_0017、doc_spec_0021、doc_ui_0012、doc_spec_0038、doc_spec_0030、doc_spec_0174|doc_data_0001、doc_spec_0034、doc_spec_0008、doc_spec_0038、doc_spec_0030、doc_spec_0174|
| doc_spec_0008 |全系統（UID/Bloodline_ID/Gene/Status/ATM Atomic ID 統一定義）|—|

### 血統 + 因子系統族群

| 規格書 |被依賴|依賴|
|---|---|---|
| doc_spec_0011 |doc_spec_0010、doc_spec_0026、doc_spec_0028、doc_spec_0005、doc_spec_0024、doc_spec_0012、doc_spec_0022、doc_ui_0012、doc_spec_0031、doc_ui_0027、doc_spec_0181、doc_spec_0184|—|
| doc_spec_0181 |doc_spec_0182、doc_spec_0184、doc_spec_0185、doc_spec_0183|doc_spec_0011、doc_spec_0009、doc_spec_0028|
| doc_spec_0182 |doc_spec_0184|doc_spec_0181、doc_spec_0026、doc_spec_0042|
| doc_spec_0184 |doc_spec_0185|doc_spec_0181、doc_spec_0182、doc_spec_0011、doc_spec_0027|
| doc_spec_0185 |doc_spec_0183|doc_spec_0181、doc_spec_0184、doc_spec_0028、doc_spec_0018|
| doc_spec_0183 |—|doc_spec_0181、doc_spec_0185、doc_spec_0022、doc_spec_0006|
| doc_spec_0186 |doc_spec_0187、doc_spec_0188、doc_spec_0189、doc_spec_0190、doc_spec_0191、doc_spec_0192、doc_spec_0193、doc_spec_0198、doc_spec_0240|doc_spec_0181、doc_spec_0196、doc_spec_0197|
| doc_spec_0187 |doc_spec_0201、doc_spec_0202、doc_spec_0203、doc_spec_0204、doc_spec_0205|doc_spec_0186|
| doc_spec_0188 |doc_spec_0206、doc_spec_0207、doc_spec_0208、doc_spec_0209、doc_spec_0210|doc_spec_0186、doc_spec_0187|
| doc_spec_0189 |doc_spec_0216、doc_spec_0217、doc_spec_0218、doc_spec_0219、doc_spec_0220、doc_spec_0221、doc_spec_0222、doc_spec_0223|doc_spec_0186、doc_spec_0187|
| doc_spec_0190 |doc_spec_0237、doc_spec_0238|doc_spec_0186|
| doc_spec_0191 |doc_spec_0211、doc_spec_0212、doc_spec_0213|doc_spec_0186|
| doc_spec_0192 |doc_spec_0229、doc_spec_0230、doc_spec_0231、doc_spec_0232、doc_spec_0233、doc_spec_0234、doc_spec_0235、doc_spec_0236|doc_spec_0186|
| doc_spec_0193 |doc_spec_0227、doc_spec_0228|doc_spec_0186|
| doc_spec_0194 |doc_spec_0186、doc_spec_0198、doc_spec_0199、doc_spec_0244|doc_spec_0186|
| doc_spec_0195 |doc_spec_0242、doc_spec_0243|doc_spec_0186|
| doc_spec_0196 |doc_spec_0186|doc_spec_0011|
| doc_spec_0197 |doc_spec_0186|doc_spec_0011|
| doc_spec_0198 |doc_spec_0199、doc_spec_0244|doc_spec_0186、doc_spec_0194|
| doc_spec_0199 |doc_spec_0244|doc_spec_0198|
| doc_spec_0244 |—|doc_spec_0199、doc_spec_0198|
| doc_spec_0010 |doc_spec_0038、doc_spec_0041、doc_spec_0009、doc_spec_0035、doc_spec_0024|doc_spec_0011|
| doc_spec_0009 |doc_spec_0006|doc_spec_0010、doc_spec_0026|
| doc_spec_0005 |doc_spec_0012|doc_spec_0011、doc_spec_0042|
| doc_spec_0024 |—|doc_spec_0011、doc_spec_0010|
| doc_spec_0022 |doc_spec_0012、doc_spec_0027、doc_ui_0012|doc_spec_0011、doc_spec_0018、doc_spec_0042|
| doc_spec_0035 |—|doc_spec_0010|

### 養成流水線

| 規格書 |被依賴|依賴|
|---|---|---|
| doc_spec_0028 |doc_spec_0003、doc_spec_0027|doc_spec_0011、doc_spec_0010、doc_spec_0006、doc_spec_0033、doc_spec_0018|
| doc_spec_0026 |doc_spec_0038、doc_spec_0027、doc_spec_0044|doc_spec_0010、doc_spec_0009、doc_spec_0033|
| doc_spec_0027 |—|doc_spec_0026、doc_spec_0042、doc_spec_0018、doc_spec_0022、doc_spec_0029、doc_spec_0028|
| doc_spec_0018 |doc_spec_0028、doc_spec_0027、doc_spec_0022、doc_spec_0012|doc_spec_0034、doc_spec_0033|
| doc_spec_0042 |doc_spec_0005、doc_spec_0027、doc_spec_0029、doc_spec_0028|doc_spec_0016、doc_spec_0026|
| doc_spec_0043 |doc_spec_0012|doc_data_0001、doc_spec_0010、doc_spec_0026|
| doc_spec_0030 |doc_ui_0012、doc_ui_0001、doc_spec_0040|doc_spec_0042、doc_spec_0016|

### 戰場系統族群

| 規格書 |被依賴|依賴|
|---|---|---|
| doc_spec_0040 |doc_spec_0007、doc_spec_0044、doc_ui_0001|doc_spec_0032、doc_spec_0012、doc_data_0001、doc_spec_0019、doc_spec_0039|
| doc_spec_0012 |doc_spec_0040、doc_spec_0007、doc_ui_0012、doc_ui_0001、doc_spec_0174|doc_spec_0043、doc_spec_0038、doc_spec_0011、doc_spec_0022、doc_spec_0005、doc_spec_0174|
| doc_spec_0041 |—|doc_spec_0010、doc_spec_0038、doc_data_0001|
| doc_spec_0038 |doc_spec_0041、doc_spec_0039（格子戰法定義）、doc_spec_0016、doc_ui_0012、doc_ui_0001、doc_spec_0040|doc_spec_0010、doc_spec_0026、doc_spec_0027、doc_spec_0016|
| doc_spec_0019 |doc_spec_0040|doc_spec_0042|
| doc_data_0002 |—|doc_data_0001、doc_spec_0040|
| doc_spec_0007 |doc_spec_0002、doc_ui_0027|doc_spec_0040、doc_spec_0044、doc_spec_0012、doc_spec_0041、doc_spec_0032|
| doc_spec_0020 |doc_spec_0002、doc_spec_0039|doc_spec_0032、doc_spec_0037、doc_spec_0014、doc_spec_0022、doc_spec_0018|
| doc_spec_0039** |—|doc_spec_0038、doc_spec_0041、doc_spec_0030、doc_spec_0044、doc_spec_0040、doc_ui_0001、doc_spec_0020（E-4/E-5 場景戰法觸發）|
| doc_spec_0044 |doc_spec_0007、doc_ui_0001|doc_spec_0040、doc_spec_0039、doc_spec_0026、doc_spec_0032|
| doc_spec_0002 |doc_spec_0039、doc_ui_0012、doc_spec_0015、doc_other_0011、doc_spec_0178|doc_spec_0037、doc_spec_0014、doc_spec_0032、doc_spec_0034、doc_spec_0020、doc_tech_0014|

### 經濟 & 資源系統

| 規格書 |被依賴|依賴|
|---|---|---|
| doc_spec_0032 |doc_spec_0040、道具系統、doc_spec_0007、doc_spec_0002、doc_spec_0174|doc_spec_0033、doc_spec_0037、doc_spec_0174|
| doc_spec_0174 |doc_spec_0036、doc_spec_0017、doc_spec_0012、doc_spec_0016、doc_spec_0032、doc_tech_0014、doc_ui_0012|doc_spec_0036、doc_spec_0017、doc_spec_0012、doc_spec_0016、doc_spec_0032、doc_spec_0001、doc_data_0001、doc_ui_0012、doc_tech_0014、doc_spec_0155、doc_spec_0119、doc_spec_0061、doc_spec_0104、doc_spec_0107、doc_spec_0117、doc_spec_0118、doc_spec_0111、doc_spec_0115、doc_spec_0106、doc_spec_0063|
| doc_spec_0037 |doc_spec_0032|doc_spec_0034|
| doc_spec_0014 |doc_spec_0002、doc_spec_0020|doc_spec_0037、doc_spec_0034|
| doc_spec_0033 |doc_spec_0028、doc_spec_0026、doc_spec_0032|doc_spec_0018|
| doc_spec_0036 |doc_spec_0174|doc_spec_0032、結緣系統、傭兵系統、doc_spec_0026、doc_spec_0037、doc_spec_0174|
| doc_spec_0034 |doc_spec_0018、doc_spec_0037、doc_spec_0026|—|

### 社交 & 留存

| 規格書 |被依賴|依賴|
|---|---|---|
| doc_spec_0029 |doc_spec_0027、doc_spec_0003|doc_spec_0042|
| doc_spec_0025 |—|doc_spec_0029、doc_spec_0027|
| doc_spec_0015 |doc_tech_0014、doc_ui_0027、doc_spec_0176、doc_spec_0177|doc_spec_0002、doc_spec_0025、doc_spec_0040|
| doc_spec_0176 |doc_spec_0177、doc_tech_0014|doc_spec_0015、doc_spec_0016、doc_spec_0026、doc_tech_0014、doc_spec_0177|
| doc_spec_0177 |doc_spec_0176、doc_tech_0014、doc_ui_0012、doc_tech_0080|doc_spec_0176、doc_spec_0015、doc_tech_0012、doc_tech_0014、doc_spec_0170、doc_spec_0171、doc_spec_0172、doc_tech_0080、doc_other_0085|
| doc_spec_0006 |doc_spec_0028|doc_spec_0009|
| doc_spec_0003 |—|doc_spec_0028、doc_spec_0029、doc_spec_0021、doc_spec_0026|
| doc_spec_0021 |doc_spec_0003|doc_spec_0032、doc_spec_0016|
| doc_spec_0017 |doc_spec_0174|doc_spec_0043、doc_spec_0029、doc_spec_0174|

### 樞紐 & 規劃文件

| 規格書 |被依賴|依賴|
|---|---|---|
| doc_spec_0045 |—|doc_spec_0016、doc_spec_0028、doc_spec_0026、doc_spec_0011、doc_spec_0010、doc_spec_0040|
| doc_spec_0178 |—|doc_spec_0002、doc_spec_0017、doc_tech_0012、doc_tech_0014|
| doc_tech_0014 |doc_spec_0174、doc_spec_0176、doc_spec_0177|全系統（匯總所有 I 區 Schema）、doc_spec_0002、doc_spec_0020、doc_spec_0014、doc_spec_0015、doc_spec_0007、doc_spec_0032、doc_spec_0039、doc_spec_0026、doc_spec_0022、doc_ui_0012、doc_spec_0174、doc_spec_0176、doc_spec_0177|
| doc_spec_0031 |doc_spec_0004、doc_ui_0027|doc_spec_0042、doc_spec_0011、doc_spec_0009、doc_spec_0036|
| doc_spec_0004 |—|doc_spec_0031、doc_ui_0027|
| doc_ui_0005 |doc_ui_0027|doc_spec_0011、doc_ui_0012|

### Docs 層級文件

| 文件 |被依賴|依賴|
|---|---|---|
| doc_index_0011 |全專案（最高執行準則）|—|
| doc_ai_0025 |doc_index_0011、doc_ai_0018、doc_ai_0015、doc_ai_0013|doc_index_0011|
| doc_spec_0161 |doc_tech_0007、doc_ui_0001|doc_spec_0040、doc_spec_0012、doc_data_0001|
| doc_tech_0015 |—|doc_data_0001、doc_spec_0038、doc_spec_0033、doc_spec_0039|
| doc_tech_0007 |—|doc_spec_0161|
| doc_spec_0159 |doc_index_0011|doc_index_0007|
| doc_spec_0001 |doc_index_0011|doc_spec_0159、doc_index_0007|
| doc_tech_0008 |—|doc_spec_0031、doc_spec_0011、doc_spec_0042|
| doc_tech_0009 |doc_tech_0015、doc_tech_0014、doc_spec_0008、doc_spec_0010、doc_spec_0011| — |
| doc_ui_0027 |doc_spec_0004、doc_ui_0049、doc_ui_0012、doc_ui_0009|doc_spec_0031、doc_tech_0008、doc_spec_0011、doc_spec_0012、doc_spec_0015、doc_spec_0007、doc_spec_0032|
| doc_ui_0012 |doc_ui_0049、doc_spec_0016、doc_spec_0011、doc_spec_0038、doc_spec_0041、doc_spec_0012、doc_spec_0026、doc_spec_0022、doc_tech_0014、doc_spec_0174|doc_spec_0030、doc_spec_0174|
| doc_ui_0011 |doc_ui_0012、doc_ui_0049|—|
| doc_ui_0001 |doc_ui_0049|doc_spec_0161、doc_spec_0040、doc_spec_0012、doc_spec_0038、doc_spec_0030、doc_spec_0039（§ 6 場景視覺主題）、doc_art_0002|
| doc_art_0003 |doc_ui_0049、doc_tech_0015|doc_index_0011|
| doc_ui_0051 |doc_ui_0049、doc_ui_0027、doc_art_0003、doc_ui_0035、doc_art_0002、doc_agentskill_0011|doc_index_0011 § 4.1|
| doc_art_0002 |doc_ui_0049、doc_ui_0027、doc_art_0003、doc_ui_0012、doc_ui_0001|doc_ui_0051、doc_ui_0050|
| doc_ui_0032 |doc_ui_0036、doc_ui_0045|doc_index_0012、doc_ui_0049、doc_ui_0050、doc_art_0002|
| doc_ui_0045 |doc_ui_0032、doc_agentskill_0023、doc_agentskill_0031|doc_index_0012、doc_ui_0049、doc_ui_0050、doc_art_0003|
| doc_ui_0037 |doc_ui_0045、doc_ui_0032|doc_index_0012、doc_ui_0049、doc_ui_0050、doc_art_0003、doc_ui_0036|
| doc_ui_0033 |doc_ui_0032|doc_index_0012、doc_ui_0049、doc_ui_0050、doc_art_0002、doc_ui_0034|
| doc_ui_0034 |doc_ui_0032、doc_ui_0033|doc_index_0012、doc_ui_0033、doc_ui_0050|
| doc_ui_0036 |doc_ui_0032|doc_index_0012、doc_ui_0049、doc_ui_0050、doc_art_0002、doc_ui_0001|
| doc_ui_0035 |—|doc_ui_0051 § 8、doc_index_0011、doc_art_0003|
| doc_ui_0049 |doc_agentskill_0022、doc_agentskill_0029、doc_agentskill_0027、doc_agentskill_0011|doc_index_0011、doc_ui_0027、doc_ui_0001、doc_art_0003、doc_ui_0012、doc_ui_0011|
| doc_tech_0012 |doc_spec_0177|doc_tech_0014|
| doc_tech_0080 |doc_spec_0177|doc_other_0085、doc_other_0086、doc_other_0087、doc_other_0088|
| doc_other_0011 |—|doc_spec_0002、doc_tech_0014、doc_ui_0012|

---

### 血統與家系 R5 補全包與遊戲性強化規格增補

| Doc ID | 標題 | 相對路徑 | 摘要說明 |
|---|---|---|---|
| doc_spec_0245 | 01_權威與衝突帳.md | docs/遊戲規格文件/系統規格書/血統與家系-R5/completion_package/specs/01_權威與衝突帳.md | 權威層級、歷史記錄保留與版本分帳 |
| doc_spec_0246 | 02_全玩法接口矩陣.md | docs/遊戲規格文件/系統規格書/血統與家系-R5/completion_package/specs/02_全玩法接口矩陣.md | 12組玩法、53具體入口與身份數值契約 |
| doc_spec_0247 | 03_38功能與待決補件追蹤.md | docs/遊戲規格文件/系統規格書/血統與家系-R5/completion_package/specs/03_38功能與待決補件追蹤.md | 38功能既有契約與缺件追蹤 |
| doc_spec_0248 | 04_共同資料事件時鐘契約.md | docs/遊戲規格文件/系統規格書/血統與家系-R5/completion_package/specs/04_共同資料事件時鐘契約.md | 共同資料事件、時鐘契約與生命週期 |
| doc_spec_0249 | 05_跨玩法驗收案例.md | docs/遊戲規格文件/系統規格書/血統與家系-R5/completion_package/specs/05_跨玩法驗收案例.md | 跨玩法Given/When/Then驗收案例 |
| doc_spec_0250 | 內容審核記錄.md | docs/遊戲規格文件/系統規格書/血統與家系-R5/completion_package/validation/內容審核記錄.md | 工作包內容審核記錄 |
| doc_spec_0251 | 版本漂移記錄.md | docs/遊戲規格文件/系統規格書/血統與家系-R5/completion_package/validation/版本漂移記錄.md | 固定起點與版本漂移比對記錄 |
| doc_index_1033 | README.md (completion_package) | docs/遊戲規格文件/系統規格書/血統與家系-R5/completion_package/README.md | 血統遺傳與全玩法文件補全工作包總索引 |
| doc_index_1034 | README.md (validation) | docs/遊戲規格文件/系統規格書/血統與家系-R5/completion_package/validation/README.md | 工作包驗證說明索引 |
| doc_spec_0288 | C2_R5_遊戲性決策拍板與體驗強化增補規格書.md | docs/遊戲規格文件/系統規格書/血統與家系-R5/C2_R5_遊戲性決策拍板與體驗強化增補規格書.md | DEC決策編號校正、已核基線與候選設計分帳、體驗強化提案 |
| doc_spec_0289 | C2_R5_待補數據表與Catalog定案總表.md | docs/遊戲規格文件/系統規格書/血統與家系-R5/C2_R5_待補數據表與Catalog定案總表.md | 17項缺口真實狀態分帳、childLUK/peakType/近親與查券候選表 |
| doc_spec_0290 | C2_R5_本地AI回覆更正與證據分帳報告.md | docs/遊戲規格文件/系統規格書/血統與家系-R5/C2_R5_本地AI回覆更正與證據分帳報告.md | 血統公式驗證器、Q00-Q12、關聯玩法與全玩法盤點之更正與證據分帳報告 |
| doc_index_1035 | README.md (all_gameplay_inventory_v1) | docs/遊戲規格文件/系統規格書/血統與家系-R5/all_gameplay_inventory_v1/README.md | 3KLife全玩法盤點第一階段索引（42玩法域+4共同關卡） |
| doc_spec_0291 | 全玩法覆蓋清單.md | docs/遊戲規格文件/系統規格書/血統與家系-R5/all_gameplay_inventory_v1/全玩法覆蓋清單.md | 42個玩法域（G01-G42）與4個共同關卡（X01-X04）分母與未驗缺口清單 |
| doc_spec_0292 | 跨系統待驗邊界.md | docs/遊戲規格文件/系統規格書/血統與家系-R5/all_gameplay_inventory_v1/跨系統待驗邊界.md | 14條優先跨系統驗收邊界（抽卡/出生/時鐘/退役競爭等）待跑案例 |
| doc_spec_0293 | 總覽與驗收界線.md | docs/遊戲規格文件/系統規格書/血統與家系-R5/gameplay_reviewed_batch2_v1/總覽與驗收界線.md | 全玩法研究第二批（招募/名冊/治理/精力167案）總覽與驗收界線 |
| doc_index_1036 | README.md (recruitment-prophecy) | docs/遊戲規格文件/系統規格書/血統與家系-R5/gameplay_reviewed_batch2_v1/packages/recruitment-prophecy/README.md | G10/G11名士預言與傭兵有界驗證包索引 |
| doc_spec_0294 | 名士與傭兵驗證報告.md | docs/遊戲規格文件/系統規格書/血統與家系-R5/gameplay_reviewed_batch2_v1/packages/recruitment-prophecy/名士與傭兵驗證報告.md | G10名士預言與G11傭兵試用永久招募38案有界驗證報告 |
| doc_index_1037 | README.md (rival-governance) | docs/遊戲規格文件/系統規格書/血統與家系-R5/gameplay_reviewed_batch2_v1/packages/rival-governance/README.md | G23他國治理外交與盛衰有界驗證包索引 |
| doc_spec_0295 | 他國治理外交與盛衰報告.md | docs/遊戲規格文件/系統規格書/血統與家系-R5/gameplay_reviewed_batch2_v1/packages/rival-governance/他國治理外交與盛衰報告.md | G23他國治理外交與盛衰45案有界驗證報告（含雙向盟友折扣套利分析） |
| doc_index_1038 | README.md (roster-identity) | docs/遊戲規格文件/系統規格書/血統與家系-R5/gameplay_reviewed_batch2_v1/packages/roster-identity/README.md | G02/G14武將名冊與重複轉生有界驗證包索引 |
| doc_spec_0296 | 名冊與重複流轉報告.md | docs/遊戲規格文件/系統規格書/血統與家系-R5/gameplay_reviewed_batch2_v1/packages/roster-identity/名冊與重複流轉報告.md | G02/G14武將名冊與重複流轉44案有界驗證報告 |
| doc_index_1039 | README.md (vitality) | docs/遊戲規格文件/系統規格書/血統與家系-R5/gameplay_reviewed_batch2_v1/packages/vitality/README.md | G07精力疲勞恢復與加速卡有界驗證包索引 |
| doc_spec_0297 | REPORT.md (vitality) | docs/遊戲規格文件/系統規格書/血統與家系-R5/gameplay_reviewed_batch2_v1/packages/vitality/REPORT.md | G07精力疲勞恢復與加速卡40案有界驗證報告 |
| doc_index_1040 | README.md (nation_fall_save_v1) | docs/遊戲規格文件/系統規格書/血統與家系-R5/nation_fall_save_v1/README.md | 原生出征→零領地→滅亡→保存讀回與出生20季覆蓋驗證包索引 |
| doc_spec_0298 | REPORT.md (nation_fall_save_v1) | docs/遊戲規格文件/系統規格書/血統與家系-R5/nation_fall_save_v1/REPORT.md | 原生出征→零領地→滅亡→保存讀回（NF01/NF02）有界驗證報告 |
| doc_spec_0299 | INDEPENDENT_REVIEW.md (nation_fall_save_v1) | docs/遊戲規格文件/系統規格書/血統與家系-R5/nation_fall_save_v1/INDEPENDENT_REVIEW.md | 出征滅亡保存鏈獨立複核與6組負向控制驗證報告 |
| doc_spec_0300 | REPORT.md (prior-birth-coverage) | docs/遊戲規格文件/系統規格書/血統與家系-R5/nation_fall_save_v1/provenance/prior-birth-coverage/REPORT.md | 原出生→20季增齡→5歲開獎宿命→育成入場（BN01-BN04）有界驗證報告 |
| doc_index_1052 | README.md (handoff_2983a19f_v1) | docs/遊戲規格文件/系統規格書/血統與家系-R5/handoff_2983a19f_v1/README.md | 最新版血統與出生驗證交接包索引（Commit 2983a19f） |
| doc_spec_0301 | REPORT.md (handoff_2983a19f_v1) | docs/遊戲規格文件/系統規格書/血統與家系-R5/handoff_2983a19f_v1/REPORT.md | 3KLife 最新版血統與出生驗證報告（含純化改星違規反例） |
