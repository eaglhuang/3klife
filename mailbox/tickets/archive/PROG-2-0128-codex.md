# 工單 PROG-2-0128：實機驗收天氣禁用計謀可點擊並彈 Toast（#396）
- 派給：Codex
- 任務卡：docs/agent-briefs/tasks/PROG/PROG-2-0128.md（已在 master 登錄，PR #398 已合併）
- 依賴：PR #396（已合併）
- 類型：acceptance（只做實機驗收，不改 assets/scripts/core/**）

## 背景
天氣禁用的計謀按鈕字色變灰但保留點擊，點擊後由既有天氣檢查彈出「當前天氣不符合施放限制」Toast，不進入選目標、不扣計點與 SP。計點不足與 SP 不足維持不可點。

## 步驟
1. `git fetch origin`，用最新 master 建置 Web 版，記下 HEAD。
2. 雨天：火計按鈕字色灰、但可點擊。截圖。
3. 雨天點擊火計：彈出天氣 Toast，不進選目標，計點與 SP 不變。截圖與數值前後對照。
4. 晴天：同一計謀顏色與點擊行為正常，可進入選目標。截圖。
5. 計點不足或 SP 不足：仍不可點，不彈 Toast。截圖。

## 驗收
- 步驟 2 到 5 皆有截圖或錄影；PR 說明寫明 Before/After 與 HEAD。
- 任一步不符：記錄現象與 HEAD，回報 PM 另開卡。

## 不要做
- 不使用緊急授權、Quick Fix 或 backend import。
