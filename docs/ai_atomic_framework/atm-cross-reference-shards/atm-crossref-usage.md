# ATM Cross Reference — 使用說明

> 這是 `ATM_cross_reference.md` 的「使用說明」分片。完整索引見 `docs/ai_atomic_framework/ATM_cross_reference.md`。

<!-- doc_id: doc_other_0037 -->
# ATM 知識路由索引（ATM Cross-Reference）

> 目的：AI 讀此單一文件後，可精準跳到對應文件的對應段落，無需通讀 9 份文件（5,400+ 行）。
> 維護：§快查路由表 與 §doc_refs 欄位規範 為手工維護；§Section Inventory 由 `node tools_node/rebuild-atm-crossref.js` 自動更新。
> 位置：`docs/ai_atomic_framework/ATM_cross_reference.md`

---

## 使用說明

1. 看當前任務觸發的關鍵字，查下方「快查路由表」找到對應 Domain
2. 用 `doc_id + §段落` 定位目標文件段落（見 §Section Inventory 中的行號）
3. 只讀需要的段落，不要通讀整份文件
4. 重大任務卡需在 frontmatter 加 `doc_refs` 欄位（格式見 §doc_refs 欄位規範）

**如需讀大型文件（AI_Atomic_Framework_Roadmap.md，2808 行）**：
→ 優先讀 `docs/ai_atomic_framework/shards/` 下對應分片（H2 level 分割）

名詞定位：`D1~D11` 是本索引的文件路由 Domain，不是開發 phase；`D2` 表示 ATM 版本政策、`D3` 表示 3KLife 消費策略。`ATM-7` 目前只保留為 DB/vector/advanced orchestrator 類後置討論名稱，不屬於 alpha0/alpha1 任務 shard。

---
