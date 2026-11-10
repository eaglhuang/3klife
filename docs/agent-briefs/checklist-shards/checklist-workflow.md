# Agent Briefs CheckList — 協作流程與新手修復追蹤

> 這是 `CheckList.md` 的「協作流程與新手修復追蹤」分片。完整索引見 `docs/agent-briefs/CheckList.md`。

<!-- doc_id: doc_ai_0022 -->
# Agent Briefs CheckList

## ATM 獨立審核減負試行（2026-09-16）

- 計畫：[獨立審核試行](../ai_atomic_framework/atm-product-proof/independent-review-pilot-plan.md)
- ATM-0-0016～ATM-0-0025：10 張卡已於 2026-09-16 完成審核試行與停止規則結案；卡片及狀態真相見 `docs/tasks/tasks-atm.json` 指向的既有分片。結案不代表 npm、CI 或外部 A/B 產品證明完成。
- 先完成目標、校準、基線，再執行三張既有 PRF 工作的審核試行；禁止把本批開卡當成產品交付。

## UI 量產新增檢查

- 新 UI 任務預設必須走：`template family -> content contract -> skin fragment -> smoke route -> docs backwrite`
- 開卡或接卡時，先對照 [UI-task-card-template.md](C:\Users\User\3KLife\docs\agent-briefs\UI-task-card-template.md (doc_task_0132)) (doc_task_0132)
- 若任務卡沒有 `template_family / content_contract / skin_fragments / smoke_route / docs_backwritten`，視為尚未收斂完成，不應直接進入大量實作

本表是任務卡總覽。狀態更新時，必須同步修改：
- 任務卡本身
- 對應 docs/tasks/*.json 或 docs/ui-quality-tasks/*.json shard
- 需要時重建 docs/ui-quality-todo.json aggregate 與 	asks_index.md (doc_task_0002)
- 本檔

共通硬規則以 [keep.md](C:\Users\User\3KLife\docs\keep.md (doc_index_0011)) (doc_index_0011) 為準。

## 新手季報修復

- [PROG-2-2208](tasks/PROG/PROG-2-2208.md)：新手開場與季報互斥；cursor-grok-bot，blocked；單測通過，文件分片／ATM 准入阻擋提交，Windows 視覺驗證待建置。

## 執行前檢查

1. 這次工作是否已有任務卡。
2. 若沒有，而且不是小錯字或一次性查詢，先開卡。
3. 若決定開始做，先鎖卡：`status=in-progress`、補 `started_at` / `started_by_agent`、更新 `notes`。
4. 若是 bug 修復，可以先做最小修補，但仍要保留可追蹤性與單一問題範圍。
5. 若範圍擴大，先更新 `related / depends / notes`，必要時補開新卡。
6. 準備 commit 前，確認這批變更能對回單一卡號、單一主題或單一 bug。

## 依賴維護原則

- 依賴的單一真相是任務卡本身與對應 shard；docs/ui-quality-todo.json 只作為生成用 aggregate manifest。
- 本檔只保留總覽，不再複製過長的依賴敘事。
- 若新增 blocker 或前後置關係，請同步更新任務卡與 manifest。

## 更新流程

1. 更新任務卡 frontmatter 與 notes。
2. 更新對應 task shard，必要時執行
`node tools_node/build-ui-task-manifest.js` 重建 aggregate manifest.
3. 更新本表狀態。
4. 若要正式 commit，確認 commit message 已帶任務卡號與 Agent 標籤。
5. 若是 bug commit，確認 message 也寫了系統代碼、問題描述與修改描述。

## 鎖卡最小欄位

- `status: in-progress`
- `started_at: <RFC3339>`
- `started_by_agent: AgentX`
- `notes` 第一筆寫開始時間、目前處理範圍與是否有 blocker
