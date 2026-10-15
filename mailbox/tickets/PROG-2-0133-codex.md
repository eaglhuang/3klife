# 工單 PROG-2-0133：實機驗收新玩家開場一路走通（0645、0646、0647）
- 派給：Codex
- 任務卡：docs/agent-briefs/tasks/PROG/PROG-2-0133.md（已在 master 登錄，PR #460 已合併）
- 依賴：PR #447、#455、#456（均已合併）
- 類型：acceptance（只做實機驗收，不改 assets/scripts/core/**）
- 狀態：ATM 活動任務 TASK-TEAM-0088 解除前擱置

## 步驟摘要（完整 13 步見任務卡）
1. 清除 localStorage／IndexedDB 進大廳：第一幕「1 / 4」，按「繼續」。
2. 翻 2／4、3／4、4／4，第 4 頁「進入宿命」。
3. 宿命轉蛋面板出現，只有「轉蛋」可按。
4. 轉蛋出六列，重置後可重抽，無上限。
5. 點「選擇」後進大廳，主將為所選武將，3 段式引導接著出現。
6. 打贏第一場回大廳：紅顏池自動展示一次；關閉後重整不再彈。
7. 打輸首戰、舊存檔：不彈。
8. 重新整理：不再出現 intro 與宿命轉蛋。
9. 三種比例（phone-16-9、19.5-9、tablet-4-3）版面在畫面內。

## 驗收
- 13 步皆有截圖或錄影；PR 說明寫明 Before/After 與 HEAD。
- 只微調 destiny-opening-main.json 與 opening-intro-main.json 座標，不改邏輯。
- 任一步不符：記錄截圖、節點座標與 HEAD，回報 PM 另開卡。
