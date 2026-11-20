# 學府修業畫面與接線設計（分片索引） — 5–8 外界凍結、驗收、任務拆分、未決事項

> 這是 `學府修業畫面與接線設計.md` 的「5–8 外界凍結、驗收、任務拆分、未決事項」分片。完整索引見 `docs/遊戲規格文件/系統規格書/學府修業畫面與接線設計.md`。

## 5. 外界凍結（依 doc_spec_0524）

規則（引用規格）：修業 36 回合期間外界宏觀時間凍結；結業結算點 `GameClock.advanceSeason()` **恰好 1 次**；退學或放棄也推進 1 季；讀檔偵測到未完成修業，外界時間還原為進入時快照。

接線做法：

| 項目 | 做法 |
| --- | --- |
| 大廳「下一季」鈕 | `academyRecord` 存在且未結業時，按鈕灰顯或點擊 toast「學府修業中，外界時間靜止」，不呼叫 `advanceSeason` |
| 修業中換季事件 | 不會發生（沒有人呼叫 `advanceSeason`） |
| 外界時鐘快照 | `AcademySaveRecord` 另存進入當下的 `GameTimeState`（對應規格的 `frozenGameTime`）；`recover()` 後若時鐘與快照不同，以快照為準（防刷） |
| 結業推季 | D 流程步驟 3；用既有 `_advanceSeasonWithSalaries()`，確保季報、俸祿、年齡 +0.25 歲一起發生 |
| 大廳小人／任務牆 | 以「季」為單位的計時隨外界凍結而不動；以真實時間倒數的項目（如任務牆加速卡）不在 0524 範圍，不處理，由 9189 驗證並在 notes 記錄是否有漏洞 |
| 季節模式 | 學府入學是否仍要求 `GameTimeMode.Nurture`，見 Q3 |

doc_spec_0524 的 TC-TIME-13 到 TC-TIME-16 是本案時間驗收測資，9191 單元測試須涵蓋（TC-TIME-14 結業推季一次、TC-TIME-15 年齡 +0.25）。

---

## 6. 驗收方式與 playtest（PROG-2-9192）

**方案：兩者並用。**

1. **完整路徑步驟**（主要）：`tools_node/playtest-online.js` 新增 `--academy` 選用旗標。新玩家開局（PROG-2-9194）送 14 歲投靠的少年名將（趙雲、關羽、諸葛亮三選一，不是自家子嗣），第 1 年年末滿 15 歲，第 2 年第 1 季入學（doc_spec_1180 第 1.3 節；PROG-2-9198 取代舊 4 歲幼苗流程）。步驟：新玩家開場選少年名將 → 大廳連點「下一季」4 次（第 2 年第 1 季，名將滿 15 歲，彈出及冠入學通知）→ 底欄「培育」→「送入學府」→ 入學畫面選潁川、教官、入學 → 36 回合（每回合點第一個可按訓練鈕；清談阻擋時點出牌或略過；打斷彈窗依序選第一項）→ 結業彈窗 → 回大廳確認季數加 1。關鍵點截圖：入學、第 1 回合、期中打斷、弱冠打斷、第 36 回合、結業彈窗、回大廳。自家子嗣的周歲抓周（1 歲）與開蒙揭曉（5 歲）另走子嗣成長試玩（doc_spec_1180 第 13 章卡 20）。
2. **QA 快進入口**（輔助，截圖打斷彈窗省時）：新增網址參數 `qaAcademy=<回合>`（例如 `qaAcademy=11`），沿用 `QaTimeScale`「沒有 qa* 參數時不介入」的慣例，入學後以引擎快進（連續 commit 訓練到指定回合）。注意：現有 `QaTimeController`／`QaTimeScale` 只做慢動作與定格，無法推進學府回合，所以快進入口是學府專用小函式，放在 `ui/core` 的 academy 宿主旁，不污染 battle。

每張卡共通驗收硬條件：實機（playtest 無頭瀏覽器）截圖、console error 0、`npx tsc -p tsconfig.test.json --noEmit` 0 錯、`tests/run-cli.ts` 全過、`compute-gate standard` 通過。

---

## 7. 任務拆分與依賴順序

```
9189 修業主畫面＋入學（宿主、存檔、layout）
   ├──► 9190 打斷宿主與四種彈窗（依賴 9189 的宿主與存檔）
   │        └──► 9191 結業與入口串接＋舊培育下線（依賴 9189、9190）
   └──────────────► 9192 academy playtest 步驟（依賴 9189；跑到結業需 9190、9191 完成）
```

9192 可與 9190 並行開發入學與修業段，結業段待 9191 後補驗收截圖。

| 卡 | 大小估計 | 主要檔案 |
| --- | --- | --- |
| 9189 | 一個 AI 一天：宿主 controller、存檔實作、2 組 layout、LobbyScene 掛載 | `AcademyFlowController.ts`、`GameAcademySaveStore.ts`、`GameSession.ts`、`PlayerSaveService.ts`、`LobbyScene.ts`、`academy-enroll-*`、`academy-session-*`、i18n 四語 |
| 9190 | 一個 AI 一天：1 組 layout、打斷狀態機、開獎呼叫 | `academy-interrupt-*`、`AcademyFlowController.ts`、`LobbyScene.ts` |
| 9191 | 一個 AI 一天：結業串接、季推進、入口改接、舊存檔遷移、舊路徑隱藏 | `LobbyScene.ts`、`NurtureFlowController.ts`、`GameSession.ts`、`LineageMilestonePopupController.ts` |
| 9192 | 半天到一天：playtest 步驟、QA 快進入口 | `tools_node/playtest-online.js`、QA 入口 |

---

## 8. 規格衝突與未決事項（詳見回報選擇題）

| # | 衝突或缺口 | 文件 | 暫採 |
| --- | --- | --- | --- |
| Q1 | 舊存檔遷移方式 | 無規格 | 依進度折算（見 1.3） |
| Q2 | 學府最低入學年齡：已由使用者裁決為 15 歲（PROG-2-9198；`ENROLL_AGE = 15`）；5 歲只是開蒙揭曉（`UNVEILING_AGE=5`，不再是入學年齡） | 1130 舊稿 5 歲，與 1172、總綱 15 歲 | **已裁決 15 歲入學**；`NurtureService` 的 `child-underage` 檢查改用 `ENROLL_AGE`（實作卡） |
| Q3 | 入學令（`admissionsPerSeason=2`）與「僅培育季可入學」（`requireNurtureMode`）是否沿用；0524 的凍結加推 1 季是否仍需培育季 | 0524、`NurtureService` | 暫採不限季節、入學令沿用 |
| Q4 | 舊流程獨有功能去留：補元散、家學、借將、學戰法 TP、自動培育券 | 無 | 暫採：控制模式取代自動培育；其餘第一版隱藏 |
| Q5 | 打斷時機：1127 寫「第 12／24 回合結束」，引擎 `scheduledInterruptAt` 是「回合開始前」；階段名 1127 為啟蒙／發奮／衝刺，引擎為建基期／造詣期／大成期 | 1127 對 `AcademyTypes.ts` | 暫採引擎行為與名詞 |
| Q6 | 修業中途退學：是否開放；退學結算與推季（0524：視同結業並推 1 季） | 0524 | 暫採第一版不開退學，只開暫離 |
| Q7 | 教官槽數：1130 `NURTURE_MENTOR_SLOTS=6`、引擎潁川 3（祠堂 Lv.4 起 +1）、舊 deck 5 槽 | 三者不同 | 暫採引擎（3，祠堂 +1） |
| Q8 | 訓練公式：1127 的 `TrainingBase` 依階段 10~40 加教官乘區，對引擎 `trainBaseGain=12` 加變動加學府特化（暫定數值） | 1127 對 `ACADEMY_TUNING` | 暫採引擎，不在本卡調數值 |

> 第二輪待決選擇題 Q9~Q12（教官歸屬、9189 回補、base 未完成退路、TP 與戰法商店）見第 11 章。
