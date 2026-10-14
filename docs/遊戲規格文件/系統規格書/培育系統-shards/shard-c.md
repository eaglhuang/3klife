# 培育系統規格（分片索引） — G–J 劇本／字串／Data Schema／名詞

> 這是 `培育系統.md` 的「G–J 劇本／字串／Data Schema／名詞」分片。完整索引見 `docs/遊戲規格文件/系統規格書/培育系統.md`。

## G. 劇本相關

| 情境 | 劇本需求 |
|---|---|
| 入學 | 「{ChildName} 進入鏡像時空，開始 36 回合培育之旅。」|
| 教官見面 | 「{MentorName}：『哼，又一個毛頭小子。讓我看看你的資質。』」|
| 覺醒事件 | 「{ChildName} 在演武中，因子突然覺醒！{GeneName}！」|
| 受傷事件 | 「{ChildName} 訓練過度，本回合無法行動。」|
| 畢業 | 「{ChildName} 以 {Rating} 級畢業！五維寫入本體。」|

---

## H. 字串內容相關

| Key | 預設值 |
|---|---|
| UI_NURTURE_START | 「消耗入學令 ×1，送 {Name} 進入鏡像時空？」 |
| UI_ROUND_N | 「第 {N}/36 回合」 |
| UI_TRAIN_SELECT | 「選擇訓練方向：武力 / 智力 / 統率 / 政治 / 魅力 / 休息」 |
| UI_MENTOR_ASSIGN | 「指派教官：{MentorName}（TP加成 +{TP}）」 |
| UI_GRADUATION | 「培育完成！評級：{Rating}」 |
| UI_ADMISSION_LEFT | 「本季剩餘入學令：{N}」 |

---

## I. Data Schema 需求

### 本機端 (Client) — 培育會話
```json
{
  "Nurture_Session": {
    "Child_UID": "C201",
    "Revelation_Level": 2,
    "Phase_Block": "Midterm",
    "Snapshot_Stats": {"STR":30,"INT":45,"POL":20,"CHR":35,"LUK":10},
    "Child_Preview": {
      "Trend_Tags": ["偏武", "膽略型"],
      "Stat_Brackets": {"STR":"60-69", "INT":"40-49"},
      "Exact_Visible": false
    },
    "Current_Round": 12,
    "Total_Rounds": 36,
    "Mentor_ID": "MENTOR_015",
    "Mentoring_Mode_Log": [
      {"Round": 3, "Mode": "Support", "Source_ID": "MENTOR_015"},
      {"Round": 29, "Mode": "Legendary_Mentoring", "Source_ID": "SPIRIT_ZHAO_01"}
    ],
    "TP_Accumulated": 180,
    "Events_Log": [
      {"Round":5, "Type":"Awakening", "Gene":"GREEN_DRAGON_04"},
      {"Round":8, "Type":"Injury", "Penalty":"Skip_1_round"}
    ],
    "Skills_Learned": ["龍膽", "落雷"],
    "Graduation_Tags": ["槍將預備", "夜襲適性"]
  }
}
```

### Server 端 — 培育紀錄表
| 欄位 | 型別 | 說明 |
|---|---|---|
| Session_ID | VARCHAR(16) PK | 培育會話 ID |
| Child_UID | VARCHAR(16) FK | 培育目標子嗣 |
| Start_Season | INT | 培育開始季度 |
| End_Season | INT | 培育結束季度 |
| Mentor_ID | VARCHAR(16) FK | 教官 ID |
| Revelation_Level | TINYINT | 子嗣資訊揭露層級（0–3） |
| Phase_Block_History_JSON | TEXT | 36 回合三階段節點的推進紀錄 |
| Mentoring_Mode_Log_JSON | TEXT | 區分一般教官支援與英靈傳道的介入紀錄 |
| Reveal_Log_JSON | TEXT | 記錄哪些事件把揭露由傾向推進至區間或精確值 |
| Final_Stats_JSON | TEXT | 畢業後五維 |
| Graduation_Tags_JSON | TEXT | 畢業後可供關卡推薦使用的戰術標籤 |
| Rating | CHAR(1) | 評級 S/A/B/C |
| TP_Total | INT | 累積 TP |

---

## J. 名詞定義

| 名詞 | 代碼/Key | 定義 |
|---|---|---|
| 培育 | Nurture | 36 回合鏡像時空訓練模式 |
| 鏡像快照 | Snapshot | 進入培育時複製的數值分身 |
| 入學令 | Admission_Token | 培育名額的限量道具 |
| 回合 | Round | 培育中的最小時間單位（共 36 回合） |
| 畢業 | Graduation | 36 回合結束，數值寫回本體 |
| 評級 | Rating | 畢業五維總和對應的 S/A/B/C 等級 |
| 事件 | Event | 培育中隨機觸發的因子覺醒/受傷/好感 |
| 分層揭露 | Revelation_Level | 子嗣資訊依進度分為隱藏、傾向、區間、精確值四層 |
| 自動培育 | Auto_Nurture | 有條件解鎖的快速培育模式；需手動畢業 ≥30 次 + 世代 ≥5 + S 級成就；每次需消耗自動培育券；品質上限 A、無覺醒、無事件 |
| 自動培育券 | Auto_Nurture_Ticket | 解鎖自動培育後使用的消耗道具，透過商城、活動、成就獲得 |
| 三階段學年 | Phase_Block | 36 回合培育拆成基礎打底 / 中期專精 / 畢業衝刺的節奏區段 |
| 畢業標籤 | Graduation_Tags | 培育完成後輸出的戰術傾向摘要，供關卡推薦與戰前 intel 使用 |

---
