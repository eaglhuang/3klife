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
| doc_spec_1236（年終守城戰） |—|doc_spec_0049、doc_spec_0376、doc_spec_0525、doc_spec_1182、doc_spec_1184、doc_spec_1186|
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
| doc_spec_0302 | ACAD_CORE_學府培育總控與防SL確定性引擎規格書.md | docs/遊戲規格文件/系統規格書/血統與家系-R5/academies/ACAD_CORE_學府培育總控與防SL確定性引擎規格書.md | 學府培育總控與防 SL 確定性引擎功能規格書（36回合、三態代管、PRNG種子鏈、WAL原子落盤） |
| doc_spec_0303 | ACAD_01_潁川書院_名士清談與策論牌組規格書.md | docs/遊戲規格文件/系統規格書/血統與家系-R5/academies/ACAD_01_潁川書院_名士清談與策論牌組規格書.md | 潁川書院：名士清談與策論牌組功能規格書（天地人三才牌型、清談大會大彩圈） |
| doc_spec_0304 | ACAD_02_幽州演武_沙盤巡哨與煞氣突破規格書.md | docs/遊戲規格文件/系統規格書/血統與家系-R5/academies/ACAD_02_幽州演武_沙盤巡哨與煞氣突破規格書.md | 幽州演武：沙盤巡哨與煞氣突破功能規格書（邊塞巡哨、煞氣突破Surge、負傷代價） |
| doc_spec_0305 | ACAD_03_江東督府_水文天時與陣型火攻規格書.md | docs/遊戲規格文件/系統規格書/血統與家系-R5/academies/ACAD_03_江東督府_水文天時與陣型火攻規格書.md | 江東督府：水文天時與陣型火攻功能規格書（水文氣候預報、陣型天候匹配、風火連鎖） |
| doc_spec_0306 | ACAD_04_洛陽太學_五經注疏與九品官聲規格書.md | docs/遊戲規格文件/系統規格書/血統與家系-R5/academies/ACAD_04_洛陽太學_五經注疏與九品官聲規格書.md | 洛陽太學：五經注疏與九品官聲功能規格書（五經注疏、拜謁公卿、九品官聲、世家遺物） |
| doc_spec_0307 | ACAD_05_隆中草廬_奇門生剋與機巧工造規格書.md | docs/遊戲規格文件/系統規格書/血統與家系-R5/academies/ACAD_05_隆中草廬_奇門生剋與機巧工造規格書.md | 隆中草廬：奇門生剋與機巧工造功能規格書（八門羅盤生剋、木牛流馬連弩組裝、神工天成） |
| doc_spec_0308 | MVP核心循環貫通與遊玩動線功能規格書.md | docs/遊戲規格文件/系統規格書/MVP核心循環貫通與遊玩動線功能規格書.md | MVP 核心循環貫通與遊玩動線功能規格書（5階段狀態機、潁川賽馬娘培育、斬將即時晉升、老將教官傳承） |
| doc_spec_0309 | 戰場策略相剋與即時將階晉升功能規格書.md | docs/遊戲規格文件/系統規格書/戰場策略相剋與即時將階晉升功能規格書.md | 戰場策略相剋與即時將階晉升功能規格書（兵種動態相剋、Ghost Preview、斬將即時升階特寫、全軍士氣拉滿） |
| doc_spec_0310 | 世代功業傳承與退役教官轉化功能規格書.md | docs/遊戲規格文件/系統規格書/世代功業傳承與退役教官轉化功能規格書.md | 世代功業傳承與退役教官轉化功能規格書（老將60歲退役轉教官卡、門閥家族祠堂聲望、雙柱血脈跨代雙奧義共鳴） |

### 共用 base 框架（PROG-2-9200，總綱 ↔ 系統規格書 ↔ 既有規格 ↔ 伺服器文件）

> 總綱 doc_spec_1182；六份系統規格書 doc_spec_1183～1188。「既有規格」＝將降為該框架「包裝差異設定」的規格；「上游」＝該框架要引用的既有規格與伺服器文件。

#### 總綱 ↔ 系統規格書（雙向）

| 規格書 | 被依賴（下游） | 依賴（上游） |
|---|---|---|
| doc_spec_1182（共用框架總綱） | doc_spec_1183、doc_spec_1184、doc_spec_1185、doc_spec_1186、doc_spec_1187、doc_spec_1188、doc_spec_1247、doc_spec_1248 | doc_spec_1181、doc_spec_1180、doc_spec_1179、doc_spec_0655、doc_tech_0010、doc_tech_0013、doc_spec_0334、doc_spec_0469、doc_spec_0656、doc_spec_0683、doc_spec_0662 |
| doc_spec_1183（買賣商店） | doc_spec_1186 | doc_spec_1182、doc_spec_1184、doc_spec_1186 |
| doc_spec_1184（物品庫存） | doc_spec_1183、doc_spec_1185、doc_spec_1186、doc_spec_1187、doc_spec_1188 | doc_spec_1182 |
| doc_spec_1185（任務） | doc_spec_1186、doc_spec_1188 | doc_spec_1182、doc_spec_1184、doc_spec_1186、doc_spec_1188 |
| doc_spec_1186（獎勵） | doc_spec_1183、doc_spec_1185、doc_spec_1187、doc_spec_1188 | doc_spec_1182、doc_spec_1184、doc_spec_1188 |
| doc_spec_1187（技能） | doc_spec_1186、doc_spec_1188 | doc_spec_1182、doc_spec_1184、doc_spec_1186 |
| doc_spec_1188（劇情演出） | doc_spec_1185、doc_spec_1186、doc_spec_1187 | doc_spec_1182、doc_spec_1185、doc_spec_1186 |
| doc_spec_1248（人員占用，第 7 個共用框架） | doc_spec_1181、doc_spec_1180、doc_spec_1179、doc_spec_1182 | doc_spec_1182 |
| doc_spec_1247（貨幣與資源總規格） | doc_spec_1181、doc_spec_1184、doc_spec_1183、doc_spec_1186、doc_spec_0404、doc_spec_0033 | doc_spec_1182、doc_spec_1184 |

#### 各框架 ↔ 依賴它的既有規格（框架 → 既有規格）

| 框架 | 既有規格（將降為包裝差異設定，細節見各框架書「現有程式盤點與遷移」章） |
|---|---|
| doc_spec_1183（商店） | doc_spec_0420（百寶閣）、doc_spec_0628（玉璧定價）、doc_spec_0407（精元定價）、doc_spec_0410（加速卡定價）、doc_spec_0463／0466（天命商店）、doc_spec_0635（太守府商業化）、doc_spec_0634（官職俸祿）、doc_spec_0629（背包擴容）、doc_spec_0644（天命重置卷）、doc_spec_0042（轉蛋扣款）、doc_spec_1181（家業商店） |
| doc_spec_1184（庫存） | doc_spec_0421（InventoryService）、doc_spec_0438（DisplayBucket）、doc_spec_0412（ItemDef）、doc_spec_0413（五大分類）、doc_spec_0414（使用效果引擎）、doc_spec_0417（限時過期）、doc_spec_0431（主城倉庫）、doc_spec_0017（武將背包）、doc_spec_0423（六槽裝備）、doc_spec_0427（退役回庫）、doc_spec_0432（鎖定分解）、doc_spec_0433（寶物圖鑑）、doc_spec_0036（道具系統）、doc_spec_0631（英靈卡虎符庫存）、doc_spec_0439（伺服端裝備記錄表）、doc_spec_1181（家業庫房／公庫）、doc_spec_1180（歷練寶物道具） |
| doc_spec_1185（任務） | doc_spec_1178（大廳任務完整循環）、doc_spec_0453（雙牆任務板）、doc_spec_0454（情報度與 AI 委任）、doc_spec_0668（任務適合度）、doc_spec_0500（領地治理任務）、doc_spec_0415（極限任務）、doc_spec_0627（季度通行證）、doc_spec_0582（戰鬥里程碑成就）、doc_spec_0478（世代成就）、doc_spec_1179（學府）、doc_spec_1180（歷練格子事件）、doc_spec_1181（家業） |
| doc_spec_1186（獎勵） | doc_spec_0042（轉蛋系統）、doc_spec_0462（抽取引擎）、doc_spec_0463（雙重保底）、doc_spec_0467（同名轉換）、doc_spec_0645（紅顏天香池）、doc_spec_0471（開場宿命轉蛋）、doc_spec_0603（戰場戰利品）、doc_spec_0429（俘虜搜繳）、doc_spec_0415（極限任務掉落）、doc_spec_0478（傳承獎）、doc_spec_0481（日報獎勵結算）、doc_spec_1180（寶路、擲骰）、doc_spec_1181（家業季產出） |
| doc_spec_1187（技能） | doc_spec_0038（戰法系統）、doc_spec_0614（四類技能原型）、doc_spec_0368（場景戰法）、doc_spec_0365（虎符戰法）、doc_spec_0318（教官被動）、doc_spec_0558（戰法學習 TP）、doc_spec_0344（戰法 TP 消耗）、doc_spec_0360（天賦自動施放）、doc_spec_0367（AI 選技）、doc_spec_0569（好友教官借用）、doc_spec_1179（學府戰法習得）、doc_spec_1180（職業屬性專長）、doc_spec_1181（家業專長家風） |
| doc_spec_1188（劇情演出） | doc_spec_0031（新手開場）、doc_spec_0470（開場引導流程）、doc_spec_0471（開場宿命轉蛋）、doc_spec_0618（開場資料契約）、doc_spec_0176（NPC 人性化）、doc_spec_0480／0481（日報）、doc_spec_1171（季報市井奇遇）、doc_spec_0584（傭兵羈絆）、doc_spec_0678（五格命運故事帶）、doc_spec_1179（學府打斷彈窗）、doc_spec_1180（生日事件、抓周）、doc_other_2703（大招分鏡規範） |

#### 共通網路協定層 ↔ 既有伺服器規格（總綱第 5 章；各系統規格書第 11 章）

| 既有伺服器文件 | doc_id | 對應的新規格 |
|---|---|---|
| 同步 API 規格書（/sync/delta、/sync/full） | doc_tech_0010 | doc_spec_1182 5.7；各書第 11 章 |
| 同步 API 契約型別與錯誤碼 E001～E099 | doc_spec_0655 | doc_spec_1182 5.3（E1xx～E7xx 分段，需回寫該文件） |
| Data Schema（本機與 Server） | doc_tech_0013 | 各框架 schema 草案（第 3 章） |
| 伺服端存檔快照與靜態配置同步 | doc_spec_0334 | `save.load`；doc_spec_1182 5.7 |
| 伺服端裝備記錄表與客端同步協議 | doc_spec_0439 | doc_spec_1184 第 11 章 |
| 伺服端數值配表熱更新下發 | doc_spec_0662 | 獎池、貨架、任務定義以配表下發（doc_spec_1182 5.12） |
| 抽卡伺服端同步記錄與離線防回撥 | doc_spec_0469 | doc_spec_1186 第 11 章；doc_spec_1182 5.11 |
| 同步限流 429／5MB 413 | doc_spec_0656 | doc_spec_1182 5.3、5.11 |
| HTTPS 強制與 PII 遮蔽 | doc_spec_0683 | doc_spec_1182 5.11 |
| 官職權限快照 API | doc_spec_0591 | 權限檢查範例 |
| SYNC-06 補丁白名單（server/schema/sync06-patch-whitelist.ts） | 見 PROG-2-1396 | doc_spec_1182 5.7（clientOwned／critical 拆分） |

### 首子與開場流程（PROG-2-9212）

| doc_id | 規格書 | 說明 |
|---|---|---|
| doc_spec_1233 | 首子誕生與少年名將開場流程規格書.md | 開場總順序、少年名將三選一、首子與貂蟬結緣關係、取名、出生禮、周歲抓周、存檔與 API（上游：doc_spec_1180、1172、0470、0031、0618、1182；已回寫註記：0031、0470、0618、0003、1180 shard-b） |

> 「依 11/20 裁決修訂」清掃（PROG-2-9212）：doc_spec_1168、0308、1130、1172、0182、0580、0033、0260、1181（shard-e／i）。

### 家族、子嗣、配偶、教官與學府（PROG-2-9224，依 11/21 裁決）

| doc_id | 規格書 | 說明 |
|---|---|---|
| doc_spec_1241 | 家族子嗣與血統總規格書.md | 總綱：配偶三來源與上場、待產哺乳 OCC、子嗣、繼承與家門奇才、主角不死、分家外嫁、義子、家臣子嗣、共用框架對應、JSON、實作卡切分（上游：doc_spec_1233、1180、1179、1181、1182；分規格：0268、0530、0531、0580、0011、0181~0185、0446、0532） |
| doc_spec_1179（第 13、14 章） | 學府修業畫面與接線設計.md | 學府新版規則（人源只收自家子嗣、入學加分、修業變化、失敗與結業影響）、教官就是武將（教官卡退場）；shard-h、shard-i |

### 學府支援卡與教官池（PROG-2-9230，11/21 下午裁決，恢復並改寫教官卡）

| doc_id | 規格書 | 說明 |
|---|---|---|
| doc_spec_1264 | 學府支援卡與教官池規格書.md | 連線卡（支援卡）：三類同池、等級＋傳承、效果欄、到場與促膝論道、57 段連續事件、點撥、師門牌組與師承組合、風格加權、四池轉蛋與 `POOL_SUPPORT`、共用框架對應、實作卡 SUP-1～15；shard-a～h（doc_spec_1265～1272，e～g 為 25 張卡附錄） |
| doc_spec_1273 | 世界觀與故事總綱規格書.md | 「AI 武將覺醒」世界觀：一頁版故事大綱、史境公司與頭盔、不死不老與時間流速說法、三條主線鉤子（公司祕密、AI 越來越像人、天命之人）、各系統說法、14 位核心人設、時事梗規範、10 則文案；與開場信原稿並列待決；shard-a、b（doc_spec_1274～1275） |
| doc_spec_1280 | 武將私塾補習班系統規格書.md | 在世武將下班開私塾（補習班）：開班與學生資格、學費 escrow 與推薦卡、一期 6 堂與教室、專長／戰法／家傳奧義課與幼幼班；友誼分數（−100～100、7 級）＝即時推算 prior＋稀疏偏移量（只存與我方接觸者，AI–AI 不存）；OCC 新增 tutorTeach／tutorLearn 與 yield 讓位規則；與學府、支援卡區隔；JSON 草案、TC、待決 Q-T1～10、實作卡 PS-1～10；shard-a～c（doc_spec_1281～1283） |
| doc_spec_1287 | 史境天下風雲榜與年終頒獎典禮系統規格書.md | 世界級年度五大排行榜（殺敵、治理、紅顏魅力、教官樹人、最佳新人）＋四層可插拔獨立擴充架構（含私塾人氣名師擴充範例）＋純年度歸零重算＋心智與血統白因子連動＋AI 全真實沙盤前置＋每年年末頒獎典禮（雙主持動態傳承、君王 3D 全息投影、大合照快照 DTO 變背景、歷年風雲史冊永久查詢）＋W1a～W3 拆卡；shard-a～c（doc_spec_1284～1286） |
| doc_spec_1179（14.11） | 學府修業畫面與接線設計.md | 支援卡接線點 |
| doc_spec_1186（12.8） | 獎勵系統Base框架規格書.md | 第四池教官池 |

> 「依 11/21 裁決修訂」註記（PROG-2-9224）：doc_spec_1179（shard-d／e／f／g）、1233（shard-a／b）、1181（shard-g）、1180（shard-k／n）、0310、0482、0318、0562、0563、0569 及教官卡相關規格（教官系統（支援卡）、教官支援卡四大原型／詞條 Schema、教官訓練格爆發、教官精力欄位、教官靈感戰法六招、名將身後傳承）。
