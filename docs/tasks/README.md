<!-- doc_id: doc_index_0015 -->
# tasks/

`docs/ui-quality-todo.json` 的拆分分片，依 ID 前綴分組。

任務卡本體 ID / 卡號格式請依 [名詞定義文件](C:\Users\User\3KLife\docs\遊戲規格文件\系統規格書\名詞定義文件.md (doc_spec_0008)) (doc_spec_0008)；本文件只定義 shard 分組與 aggregate 重建流程，不另寫卡號規則。

| 分片 | ID 前綴 | 說明 |
|------|---------|------|
| tasks-ui.json | UI-* | UI 設計/品質任務（~100 件）|
| tasks-prog.json | PROG-* | 程式任務（~16 件）|
| tasks-dc.json | DC-* | Data Center Phase 任務（~35 件）|
| tasks-data.json | DATA-* | 資料契約任務（~1 件）|
| tasks-atm.json | ATM-* | ATM 任務 thin index 入口；完整內容落在 docs/tasks/tasks-atm/ |

所有新任務一律先走 `task-card-opener` skill，先判斷對應分片、是否需要 Markdown 任務卡，以及是否要同步 UI shard / 協作卡；任務卡 ID 命名仍以名詞定義文件為準，不得直接手工開平行格式。

`tasks-atm.json` 現在是 thin index stub，不再保存完整 aggregate。ATM 任務真相來源改為 `docs/tasks/tasks-atm/` 內的 `tasks-atm-part-*.json` 與 `.shardrc.json`。

讀 ATM 任務時，先讀 `docs/tasks/tasks-atm.json` 看 summary / shard 索引；需要內容時再按需讀對應的 `tasks-atm-part-*.json`，不要把所有 part 一次整份載入。

重建 `tasks-atm` auto-parts：

```bash
node tools_node/rebuild-tasks-atm-auto-parts.js
```

官方驗證案例（固定順序）：

```bash
node tools_node/sync-atm-stabilization-milestone.js --check --strict
node tools_node/rebuild-tasks-atm-auto-parts.js
npm.cmd run validate:atm-task-store
```

- `--check --strict` 為 check-only、non-mutating：只驗證不寫入。
- 主路徑（架構鏈）為 `tasks-atm-shard-store.js -> sync-atm-stabilization-milestone.js -> rebuild-tasks-atm-auto-parts.js`。
- `validate:atm-milestone` 保留相容 alias，非主要入口。

預設門檻：單一 part 不超過 `300` 行、約 `10 KB`。

新增任務請直接編輯對應分片，再跑 `node tools_node/build-ui-task-manifest.js` 重建 aggregate。