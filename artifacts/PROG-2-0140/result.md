# PROG-2-0140 驗證

為 AAO 任務總表增加六個按 ID 範圍產生的唯讀閱讀分片，保留原 aggregate
作為唯一可編輯來源。未修改遊戲程式、ATM 框架或原有任務欄位。

- 原總表：32 筆；分片合計：32 筆，每個 ID 恰好一次，逐筆完整 JSON 相同。
- 來源 SHA-256：`3F90903C2FE5ED225C0ACEC5DDC8EFF01D82F7FC400528AC2B7EA6E88D564F0E`，產生前後一致。
- 最大分片：19,017 bytes；重跑產生程序後六個檔案雜湊均一致。
- `node tools_node/shard-manager.js validate docs/tasks-aao-shards`：通過。
- `node tools_node/check-doc-shard-health.js`：通過。
- `git diff --check`：通過。
- 隔離保存本對話先前 ATM 修復變更後，standard 計算型閘門 9/9 通過；保存後的變更已還原。
- 完整性與冪等驗證可重跑：`node artifacts/PROG-2-0140/verify-shards.js`，輸出 `verification.json`。

原總表內既有 summary 未在本卡改寫。TASK-AAO-0207 草稿與其登錄另案保留；
將草稿回復後，必須依 README 再產生閱讀分片並重新核對資料。

`keepSourceIntact` 與型別、陣列欄位及 ID 規則均沿用既有 shard-manager 支援，
沒有新增驗證豁免或放寬文件門檻。
