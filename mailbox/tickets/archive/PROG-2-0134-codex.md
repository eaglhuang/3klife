# 工單 PROG-2-0134：在本機重爬 24 筆武將 lore（截斷與消歧義修復後）
- 派給：Codex
- 任務卡：docs/agent-briefs/tasks/PROG/PROG-2-0134.md（已在 master 登錄，PR #460 已合併）
- 依賴：PR #451（已合併）、PROG-2-0807
- 類型：data（需要能連 wiki 的本機環境）
- 狀態：ATM 活動任務 TASK-TEAM-0088 解除前擱置

## 步驟
1. 用最新 master 建置，記下 HEAD；確認本機能連 wiki。連不上（403）就記錄錯誤後停止，不要繞過代理。
2. 清除待辦檔「武將 lore 截斷與消歧義」那 24 筆的快取。
3. 執行 `tools_node/ingest-generals-wiki.js` 重爬。
4. 逐筆檢查：≤ 200 字；句末（。！？）結尾；沒有「可以指：」消歧義文字。
5. 產出差異報告（筆數、佔位文字筆數、需人工審閱筆數）到 artifacts/PROG-2-0134/。
6. 開 PR，PR 說明寫明 Before/After 與 HEAD。

## 不要做
- 不手動編輯 lore 文字；所有內容由腳本產出。
- 不改腳本的截斷規則；有錯誤回報輸出與 HEAD。
