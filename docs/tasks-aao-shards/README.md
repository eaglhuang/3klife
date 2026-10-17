# AAO 任務閱讀分片

正式可編輯來源為 `../tasks/tasks-aao.json`。本目錄的 JSON 是按任務 ID
產生的唯讀閱讀分片；不得在這裡另行更新任務狀態。

修改來源後執行：

```powershell
node tools_node/shard-manager.js shard docs/tasks-aao-shards
node tools_node/shard-manager.js validate docs/tasks-aao-shards
node tools_node/check-doc-shard-health.js
```

設定使用 `keepSourceIntact: true`，產生分片時不覆寫來源總表與其 summary。
ID 字尾 A/B/C 與同一數字範圍放在一起；未匹配的相容 ID 依既有工具規則
落於最後一片。新增資料後應核對各片大小與逐筆完整性，必要時再細分範圍。

| 分片 | 範圍 |
|---|---|
| aao-0000-0099.json | 0000–0099 |
| aao-0100-0119.json | 0100–0119 |
| aao-0120-0139.json | 0120–0139 |
| aao-0140-0169.json | 0140–0169 |
| aao-0170-0199.json | 0170–0199 |
| aao-0200-plus.json | 0200 以上及相容 ID |

維護卡：PROG-2-0140。ATM 結案投影修復卡 TASK-AAO-0207 為後續獨立工作。
