# 3KLife WBS 全量功能進度盤點矩陣 (v16.9) — 3.3 大廳開場生涯（4/4）

> 這是 `wbs-progress-inventory-matrix.md` 的「3.3 大廳開場生涯（4/4）」分片。完整索引見 `docs/cross-ref/wbs-progress-inventory-matrix.md`。

## 3.3 3. 大廳、開場與生涯 (Lobby, Onboarding & Journey) · 第 4/4 段

> 續上段（表頭重複）。工作包 COPY-04 起。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **COPY-04** | M10 | 紅顏趕路與商業化提示(0.99/29.99/倒數)文案資料化 | content | 1 | 🟢 已接線 | COPY-01 | 趕路、0.99、29.99、倒數四段文案由配置表讀取，與彈窗一致 | [v16.8 核對 2026-10-28] master #1219–#1251 已接上（已接線）；待 QA／實機驗收 |  |
| **COPY-05** | M10 | 趣味台詞彩蛋庫與使用規則（個人語音/彩蛋） | content | 1 | 🟢 已接線 | COPY-01 | 趣味台詞標註使用場景與觸發條件，僅用於開場信與初登場 | [v16.4 第三批核對 2026-10-27] master #1102–#1143 已接上（已接線）；待 QA／實機驗收 |  |
| **COPY-06** | M10 | 文案審核與驗收（語氣一致性/手機可讀長度） | test | 1 | 📄 僅資料 | COPY-02, COPY-03, COPY-04 | 所有正式文案通過文風原則審核，手機畫面無截斷 | docs 正式版文案人工審稿清單；PROG-2-0947（#1000） | [v17.2 更正 2026-11-07] 未開始→僅資料；審核本身待人工進行 |
| **LT-01** | M10 | Tips 四池資料結構與權重設定檔 | data | 1 | 📄 僅資料 | - | JSON 含四池與持有/未持有兩套權重 | assets/resources/ui-spec/content/bloodline-mirror-loading-tips-v1.json（keys: id/version/categories/weights） |  |
| **LT-02** | M10 | Tips 選取邏輯（1~2 條、依持有狀態加權、不重複） | logic | 2 | 🟢 已接線 | LT-01 | 依權重抽 1~2 條，持有/未持有分布符合規格且有單測 | [v16.8 核對 2026-10-28] master #1219–#1251 已接上（已接線）；待 QA／實機驗收 |  |
| **LT-03** | M10 | Tips 接入 TipPanel 與 Loading 流程 | ui | 1 | 🟢 已接線 | LT-02 | Loading 畫面顯示隨機 tips | [v16.8 核對 2026-10-28] master #1219–#1251 已接上（已接線）；待 QA／實機驗收 |  |
| **LT-04** | M10 | 四池文案量產與審稿（含角色誘惑） | content | 5 | 📄 僅資料 | LT-01 | 每池達約定條數並過審 | tips JSON 52 行，條數偏少 |  |
| **LT-05** | M0 | Tips 內容 schema 與驗證納入 validate-ui-specs | test | 1 | 🟡 純邏輯 | LT-01 | schema 校驗權重鍵與四池一致 | tools_node/validate-loading-tips.js、LoadingTips.ts；PROG-2-1382（#1260） | [v17.2 更正 2026-11-07] 未開始→純邏輯；尚未併入 validate-ui-specs |
