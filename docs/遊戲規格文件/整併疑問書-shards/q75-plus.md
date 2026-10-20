# 整併疑問書 — Q75 起

> 這是 `整併疑問書.md` 的「Q75 起」分片。完整索引見 `docs/遊戲規格文件/整併疑問書.md`。

## Q75. 智慧NPC對話系統：MVP 範疇與系統定位

來源衝突：`doc_spec_0168`、`doc_spec_0169`、`doc_spec_0170`、`doc_spec_0171`、`doc_spec_0172`  20260415 討論（doc_spec_0168–0172）提出「Utility AI + <1.5B LLM 語言層 + Vector RAG 記憶層」的智慧NPC架構，描述了 200 個具情緒與長期記憶的武將 NPC 對話系統。然而，現行的「武將日誌與離線互動系統.md」(doc_spec_0015) 已定義 NPC 互動為「輕量但有記憶點的角色互動，使用靜態離線事件模板」，明確排除了 LLM 推論框架，屬於輕量靜態方案。這兩種方向技術棧完全不同：靜態模板方案零 GPU 依賴、低開發成本；LLM 混合方案需要 llama.cpp/Ollama 服務、SQLite-vec 向量庫、FastAPI 中台，工程量至少 3–5 個月。若不拍板，後續 Data Schema、服務層架構、UI 規格都無法確定是否需要 NPC 對話入口。

A. 列入MVP核心：新建「智慧NPC對話系統規格書」，本版就實作 Utility AI + 小型 LLM 混合架構

B. 新建「智慧NPC對話系統規格書」,但作為第二階段里程碑：先用純模板佔位（武將日誌現有靜態事件框架），待核心結緣/培育閉環驗證後才升級為 LLM 混合

C. 輕量整合：結論只補到武將日誌與離線互動系統.md，不另開新規格書，LLM 相關決策延後

D. 完全擱置：本批討論先歸封存，不回寫任何正式規格

👉 **請在此填寫你的決策**：[B]

<!-- mcq-sources: doc_spec_0168,doc_spec_0169,doc_spec_0170,doc_spec_0171,doc_spec_0172 -->
<!-- mcq-rewrite-targets: doc_spec_0015,doc_tech_0013 -->
<!-- mcq-opt-A: 列入MVP核心：新建「智慧NPC對話系統規格書」，本版就實作 Utility AI + 小型 LLM 混合架構 -->
<!-- mcq-opt-B: 作為第二階段里程碑：先用純模板佔位（武將日誌現有靜態事件框架），待核心結緣/培育閉環驗證後才升級為 LLM 混合 -->
<!-- mcq-opt-C: 輕量整合：結論只補到武將日誌與離線互動系統.md，不另開新規格書，LLM 相關決策延後 -->
<!-- mcq-opt-D: 完全擱置：本批討論先歸封存，不回寫任何正式規格 -->
<!-- mcq-conflict: 20260415 討論（doc_spec_0168–0172）提出「Utility AI + <1.5B LLM 語言層 + Vector RAG 記憶層」的智慧NPC架構，描述了 200 個具情緒與長期記憶的武將 NPC 對話系統。然而，現行的「武將日誌與離線互動系統.md」(doc_spec_0015) 已定義 NPC 互動為「輕量但有記憶點的角色互動，使用靜態離線事件模板」，明確排除了 LLM 推論框架，屬於輕量靜態方案。這兩種方向技術棧完全不同：靜態模板方案零 GPU 依賴、低開發成本；LLM 混合方案需要 llama.cpp/Ollama 服務、SQLite-vec 向量庫、FastAPI 中台，工程量至少 3–5 個月。若不拍板，後續 Data Schema、服務層架構、UI 規格都無法確定是否需要 NPC 對話入口。 -->

---
✅ **已回寫到**：doc_spec_0015, doc_tech_0013
✅ **回寫時間**：2026-04-13 16:30
✅ **裁決選項**：B

---

## Q76. NPC AI 架構路線：Utility AI + LLM 混合 vs 純靜態模板

來源衝突：`doc_spec_0168`、`doc_spec_0169`、`doc_spec_0170`  doc_spec_0168（NPC 行為決策系統優化）主張「Utility AI 做骨架、LLM 做皮膚」的混合架構，明確說明純向量搜尋（RAG）不適合做行為決策；doc_spec_0169（NPC 遞增演化架構設計）提出離線模板 + 連網演化的漸進方案，優先以 JSON 語法樹插值實現多樣性；doc_spec_0170（ChromaDB + llama.cpp 技術棧）則具體推薦 Qwen2-0.5B/1.5B、Phi-3-mini、ChromaDB + FastAPI 整合。三份文件隱含不同的「起點複雜度」：0169 傾向先純模板後升級，0168/0170 傾向直接上 LLM 混合。此決策將決定 Data Schema 是否需要 NPC_Memory 表、FastAPI 中台是否列入技術棧、Cocos 端是否需要 NPC 對話 UI 入口。

A. 純靜態模板（JSON 語法樹插值）：零 GPU，最低開發成本，可在現有武將日誌框架內實作，對話多樣性靠排列組合

B. Utility AI + LLM 語言層（< 1.5B，Qwen2.5-1.5B / Phi-3-mini）：CPU 跑決策，GPU 只做語言修飾，推薦 Ollama 封裝 REST API 與 Cocos 介接

C. 完整 RAG + LLM：向量記憶庫 + 大型 LLM，最自然但顯存與開發成本最高，手機端可能不可行

D. 雲端 LLM + 本地模板回退：伺服器跑強力 LLM，離線降級為靜態模板，需穩定網路連線

👉 **請在此填寫你的決策**：[B]

<!-- mcq-sources: doc_spec_0168,doc_spec_0169,doc_spec_0170 -->
<!-- mcq-rewrite-targets: doc_spec_0015,doc_tech_0013,doc_spec_0171 -->
<!-- mcq-opt-A: 純靜態模板（JSON 語法樹插值）：零 GPU，最低開發成本，可在現有武將日誌框架內實作，對話多樣性靠排列組合 -->
<!-- mcq-opt-B: Utility AI + LLM 語言層（< 1.5B，Qwen2.5-1.5B / Phi-3-mini）：CPU 跑決策，GPU 只做語言修飾，推薦 Ollama 封裝 REST API 與 Cocos 介接 -->
<!-- mcq-opt-C: 完整 RAG + LLM：向量記憶庫 + 大型 LLM，最自然但顯存與開發成本最高，手機端可能不可行 -->
<!-- mcq-opt-D: 雲端 LLM + 本地模板回退：伺服器跑強力 LLM，離線降級為靜態模板，需穩定網路連線 -->
<!-- mcq-conflict: doc_spec_0168（NPC 行為決策系統優化）主張「Utility AI 做骨架、LLM 做皮膚」的混合架構，明確說明純向量搜尋（RAG）不適合做行為決策；doc_spec_0169（NPC 遞增演化架構設計）提出離線模板 + 連網演化的漸進方案，優先以 JSON 語法樹插值實現多樣性；doc_spec_0170（ChromaDB + llama.cpp 技術棧）則具體推薦 Qwen2-0.5B/1.5B、Phi-3-mini、ChromaDB + FastAPI 整合。三份文件隱含不同的「起點複雜度」：0169 傾向先純模板後升級，0168/0170 傾向直接上 LLM 混合。此決策將決定 Data Schema 是否需要 NPC_Memory 表、FastAPI 中台是否列入技術棧、Cocos 端是否需要 NPC 對話 UI 入口。 -->

---
✅ **已回寫到**：doc_spec_0015, doc_tech_0013, doc_spec_0171
✅ **回寫時間**：2026-04-13 16:30
✅ **裁決選項**：B

---

## Q77. NPC 向量記憶存儲方案：ChromaDB vs SQLite-vec vs 暫緩

來源衝突：`doc_spec_0170`、`doc_spec_0171`  doc_spec_0170（ChromaDB + llama.cpp）明確推薦 ChromaDB 作為向量庫，並配套 FastAPI 中台；doc_spec_0171（智慧NPC技術架構與風險）則評估了跨平台方案，指出 Web 端必須用 wa-sqlite，Native 端才能用 SQLite-vec，並列出資料量（200 NPC × 1000 模板 → 數百 MB）、跨裝置同步、性格走鐘、效能降級等四大風險。兩份文件在技術路線上有實質差異：ChromaDB 需要 Python 中台（增加服務部署複雜度）；SQLite-vec 可與現有 Data Schema 共存但維護困難。此決策直接影響 Data Schema 是否新增 npc_memory 表、後端架構是否引入 Python/FastAPI、以及 Web 版玩家是否能享有相同功能。

A. SQLite-vec（Native Cocos 整合）：與現有 Data Schema 同一資料庫，無額外中台，是 Web/Mobile/PC 通用方案，但向量查詢效能略低

B. ChromaDB + FastAPI Python 中台：高效向量檢索，開源生態完整，但需維護額外的 Python 服務層，Cocos 用 fetch 呼叫 REST API

C. wa-sqlite（Wasm Web 通用）：Web 端用 wa-sqlite，Native 端用 SQLite-vec，架構一致但需維護兩套適配層

D. 暫不實作向量存儲：先用關鍵字匹配與靜態觸發條件代替，向量功能視 Q75/Q76 決議結果再補

👉 **請在此填寫你的決策**：[A]

<!-- mcq-sources: doc_spec_0170,doc_spec_0171 -->
<!-- mcq-rewrite-targets: doc_tech_0013,doc_spec_0171,doc_spec_0015 -->
<!-- mcq-opt-A: SQLite-vec（Native Cocos 整合）：與現有 Data Schema 同一資料庫，無額外中台，是 Web/Mobile/PC 通用方案，但向量查詢效能略低 -->
<!-- mcq-opt-B: ChromaDB + FastAPI Python 中台：高效向量檢索，開源生態完整，但需維護額外的 Python 服務層，Cocos 用 fetch 呼叫 REST API -->
<!-- mcq-opt-C: wa-sqlite（Wasm Web 通用）：Web 端用 wa-sqlite，Native 端用 SQLite-vec，架構一致但需維護兩套適配層 -->
<!-- mcq-opt-D: 暫不實作向量存儲：先用關鍵字匹配與靜態觸發條件代替，向量功能視 Q75/Q76 決議結果再補 -->
<!-- mcq-conflict: doc_spec_0170（ChromaDB + llama.cpp）明確推薦 ChromaDB 作為向量庫，並配套 FastAPI 中台；doc_spec_0171（智慧NPC技術架構與風險）則評估了跨平台方案，指出 Web 端必須用 wa-sqlite，Native 端才能用 SQLite-vec，並列出資料量（200 NPC × 1000 模板 → 數百 MB）、跨裝置同步、性格走鐘、效能降級等四大風險。兩份文件在技術路線上有實質差異：ChromaDB 需要 Python 中台（增加服務部署複雜度）；SQLite-vec 可與現有 Data Schema 共存但維護困難。此決策直接影響 Data Schema 是否新增 npc_memory 表、後端架構是否引入 Python/FastAPI、以及 Web 版玩家是否能享有相同功能。 -->

---
✅ **已回寫到**：doc_tech_0013, doc_spec_0171, doc_spec_0015
✅ **回寫時間**：2026-04-13 16:30
✅ **裁決選項**：A

---

## Q78. `道具 / 一般裝備 / 虎符` 的資料層要不要正式收斂成單一 Inventory Service？

來源衝突：`道具系統（付費免費道具）.md` (doc_spec_0036) 以 `ItemDef + PlayerInventory` 表達一般道具；`武將背包（倉庫）系統.md` (doc_spec_0017) 以 `GeneralEquipment + Warehouse` 表達武將個人裝備；`兵種（虎符）系統.md` (doc_spec_0012) 與 `Data Schema文件（本機端與Server端）.md` (doc_tech_0013) 又把虎符放進 `Talisman_Inventory` / `TigerTally` 專屬讀模型。概念上三者都屬「武將可持有物件」，但資料層目前是三套讀模型並存。若未先拍板，後續新增交易、篩選、收藏、鎖定與 UI 接線時，容易再長出第四套 inventory 實作。

A. 收斂成單一 Inventory Service：一般道具、一般裝備、虎符都掛在同一主表或同一服務，透過類別與槽位區分。

B. 維持三套讀模型：概念上統一，實作上維持 `道具 / 裝備 / 虎符` 三域分流，僅做 cross-ref 對齊。

C. 只收斂一般道具與一般裝備，虎符維持獨立特例，不納入統一 inventory service。

D. 先不改資料層，維持現況，等到正式做 schema 重構或後端服務整併時再拍板。

👉 **請在此填寫你的決策**：[A]

<!-- mcq-sources: doc_spec_0036,doc_spec_0017,doc_spec_0012,doc_tech_0013 -->
<!-- mcq-rewrite-targets: doc_spec_0174,doc_tech_0013 -->
<!-- mcq-conflict: 原始衝突為：一般道具、一般裝備與虎符分別由三套 read model 管理，概念上相近但實作分流；Q78 已拍板為單一 Inventory Service。 -->

✅ **已回寫到**：doc_spec_0174, doc_tech_0013
✅ **回寫時間**：2026-04-22 20:01
✅ **裁決選項**：A

---
