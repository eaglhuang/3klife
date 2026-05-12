<!-- doc_id: doc_index_0013 -->
# Keep Consensus

> **2026-04-26 最新共識補充**：戰鬥與治理正式收斂為 `人口 -> 城市兵源 -> 出征軍勢 -> 場上分隊`。初期戰鬥保底 `出征軍勢` 不低於 8,000，以保留召喚爽感；武將名聲 / 將階提高的是可見 `帶兵上限`。人物頁正式收斂為 `將 / 屬 / 命 / 技 / 寶 / 兵` 六頁：`將` 承接身份 / 天命週期 / 名聲官職 / 統領軍勢，`屬` 承接六色屬性與教官評價，`命` 承接 14 人祖先血統圖與英靈卡命槽，`技` 承接戰法習得狀態，`寶` 承接一般裝備 / 傳家寶 / 道具，`兵` 承接戰場適性與虎符槽。召喚式戰鬥每次部署同時扣 `出征軍勢` 與 `糧草`，部隊剩餘兵力退場返還，戰損回扣城市兵源並由治理補回。`戰備值 / Military_Readiness` 不再作為玩家主顯示資源。
> **2026-04-29 補充**：`武將人物介面規格書 2.0` 是人物頁母本。`命 / Bloodline` 頁底部正式加入可抽拉 `StoryDock`，完整故事條落在命頁，不再預設固定掛在將頁；頁面採左側隱藏立繪 + 14 人祖先血統圖、右側命格資訊欄、底部 StoryDock 的三區配置。`命紋靈獸` 必須與 `血脈傳承奧義` 五階能力樹綁定，作為深層人格區的核心符號。血脈成長採雙軸：`升星` 只開階段上限，`覺醒` 只點亮內容；覺醒主來源為 `名聲`，符合靈獸傾向的戰績 / 事件額外加速。史實名將升星吃同模板卡；子孫武將升星吃 `同家族卡轉化出的譜牒印記 / Lineage_Seal`。

> **⚠️ 已拆分為 4 個分片，本檔為索引入口。**
> Token 節流目的：避免整份讀入超過 6000 tokens。請**按需**讀對應分片。

1. **使用 UCUF 架構**：所有 UI 都通過 `CompositePanel` + JSON Layout 驅動，不要手動建立節點
2. **Token 優先**：顏色/尺寸用 `ui-design-tokens.json` 中的值，不要寫 hardcode
3. **9-slice sprites**：parchment、dark_metal、gold_cta 都需要 9-slice，邊框寬度見 token
4. **中文優先**：所有標籤用繁體中文，英文只用於微標籤（全大寫）
5. **輪廓文字**：場景上的文字必須加黑色輪廓（`outlineWidth: 2, outlineColor: #1A1A1A`）
6. **Claude Code skills**：所有 `SKILL.md` 必須使用 YAML frontmatter，至少包含 `name` 與 `description`；`description` 要寫出用途與觸發情境，`name` 只能用小寫字母 / 數字 / `-`。

## 三 repo 正式定位（2026-05-13）

- `3klife`（本 repo，本機資料夾 `3KLife`）：主遊戲 repo，負責 Cocos 遊戲本體、規格、資料與工具鏈。
- `AI-Atomic-Framework`：ATM 原子框架 repo，負責 Agent 治理與開源框架，不是遊戲主內容真相來源。
- `npc-brain`：NPC Brain repo，負責人物知識/檢索/對話/LangGraph 服務，不是 Cocos 主遊戲 repo。

## Pre-flight 補充

- 任何任務先判斷當前工作屬於哪個 repo，再讀對應文件與執行命令；禁止把 `3klife / ATM / npc-brain` 的責任邊界混用。

## 分片索引

| 分片 | 路徑 | 大小 |
|------|------|------|
| Core（P0 · §0–§2c） | `docs/keep-shards/keep-core.md` | 115 行 / ~7 KB |
| Workflow（§3–§6 · §13） | `docs/keep-shards/keep-workflow.md` | 186 行 / ~5 KB |
| UI Architecture（§7–§12 · §19–§23） | `docs/keep-shards/keep-ui-arch.md` | 719 行 / ~24 KB |
| Current Status（§14–§18 · §24 · MCP） | `docs/keep-shards/keep-status.md` | 210 行 / ~9 KB |

## 使用說明

- 先讀 `docs/keep.summary.md`（必讀，33 行）
- 依工作內容選對應分片讀取
- 搜尋特定內容：`grep_search` 搜尋 `docs/keep-shards/` 目錄
- 修改分片後重建索引：
  ```
  node tools_node/shard-manager.js rebuild-index docs/keep-shards
  ```
