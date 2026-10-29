<!-- doc_id: doc_index_0001 -->
# Cross-Reference: 代碼索引（代碼 ↔ 規格書 雙向映射）

> 這是 doc_index_0007 的 B 節分片。完整索引見 `docs/cross-reference-index.md (doc_index_0007)` (doc_index_0007)。
> 最後更新請參考母檔 Header。
>
> **doc_id 查詢**：用 `node tools_node/resolve-doc-id.js <搜尋詞>` 查文件代號，或瀏覽 `docs/doc-id-registry.md (doc_other_0006)` (doc_other_0006)。
> ⚠️ **壓縮版（doc_id 索引）**：中文名稱已移除，查詢名稱請用 resolve-doc-id.js。人類可讀進度 → `docs/cross-ref/cross-ref-進度.md (doc_index_0017)` (doc_index_0017)

## B. 代碼索引（代碼 ↔ 規格書 雙向映射）

### B-1. 代碼 → 規格書

> 每個 .ts 檔對應的規格書來源，標示資料結構(D) / 公式(F) / 常數(C) / 概念(概) 的引用類型。

> **已拆分（PROG-2-1613）**：B-1 表格依目錄分到 `docs/cross-ref/code/` 分片；本檔只留入口。找某個 .ts 檔：先看下表挑分片，或 `grep -rn 檔名 docs/cross-ref/code/`。

| 分片 | 涵蓋目錄 | 大小 |
|---|---|---|
| `code/core-systems-1.md` | Core Systems（NurtureSystem.ts ～ JournalLog.ts） | 174 行 / ~21 KB |
| `code/core-systems-2.md` | Core Systems（JournalReaction.ts ～ YearReport.ts） | 174 行 / ~20 KB |
| `code/core-shared.md` | Core Models、Shared Contracts、Core Data、Core Config、Core Utils、Core Managers、Core Storage、Core Services、Core Serialization、Core / Dialogue、Shared、Shared / Interfaces | 155 行 / ~12 KB |
| `code/battle.md` | Battle Controllers、Battle Models、Battle Views、Battle Views / Effects、Battle、Battle / Orchestrators、Battle / Runtime、Battle / Runtime / Phases、Battle / Runtime / Tempo、Battle / Shared、Battle / Skills、Battle / Skills / Adapters、Battle / Skills / Resolvers | 167 行 / ~12 KB |
| `code/ui.md` | UI Components、UI Core、UI Core Panels、UI Panels、UI Layers & Scenes、Ui / Components / Character-Ds3、Ui / Components / Gacha-Ds3、Ui / Components / General-Detail、Ui / Components / Portrait、Ui / Dev、Ui / Platform / Cocos、Ui / Platform / Unity、UI Core Interfaces、UI Platform Adapters | 283 行 / ~29 KB |
| `code/ui-spec-json.md` | UI Spec JSON | 77 行 / ~11 KB |
| `code/tools.md` | Tools、Build Tools、UCUF Compiler / Orchestrator、Agent Skills | 87 行 / ~7 KB |
