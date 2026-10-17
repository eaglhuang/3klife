# ATM backlog 唯讀分片

原始 `../ATM_BUG_OPTIMIZATION_BACKLOG.md` 是唯一可編輯來源。分片保留原始章節文字，不取代任務卡或 ledger。

- [用途與維護](overview.md)
- [開放問題](open-items.md)
- [嚴重度分類](triage.md)
- [AAO 歷史](aao-history.md)（大型歷史請先讀 aao-history/ 下的三個子分片）
- [並行與結案](parallel.md)
- [記憶與跨專案](mem.md)
- [Plan 3.1](plan31.md)
- [處理順序](sequencing.md)

更新來源後依序執行：

```powershell
node tools_node/shard-manager.js shard docs/ai_atomic_framework/backlog-shards
node tools_node/shard-manager.js auto-split docs/ai_atomic_framework/backlog-shards
node artifacts/PROG-2-0141/verify-backlog.js
```

`keepSourceIntact: true` 保留原檔；禁止直接修改生成分片。
