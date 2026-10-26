# 教官系統（支援卡）規格（分片索引） — G–J 劇本／字串／Data Schema／名詞

> 這是 `教官系統（支援卡）.md` 的「G–J 劇本／字串／Data Schema／名詞」分片。完整索引見 `docs/遊戲規格文件/系統規格書/教官系統（支援卡）.md`。

## G. 劇本相關

| 情境 | 劇本需求 |
|---|---|
| 教官對談事件 | 轉為靈感事件：諸葛亮：「你在戰場上的應讌令老夫刺目——威充之設，使用得也該更寬廣。」 |
| 靈感事件觸發 | 「{SupportCardName} 帶著培育終章的靈感：【{SkillName}】的悟道在這一刻降臨了。」 |
| 突破解鎖 | 「{CardName} 突破一星——【{SkillName}】靈感事件已解鎖！」 |

---

## H. 字串內容相關

| Key | 預設值 | 備註 |
|---|---|---|
| UI_MENTOR_SLOT | 「教官席位 {N}/6」 | 培育模式教官選擇 |
| UI_SKILL_HINT | 「【靈感事件】{MentorName} 觸發了 {SkillName} 的靈感！」 | |
| UI_TP_PURCHASE | 「消耗 {TP} 點習得【{SkillName}】」 | |
| UI_LB_SUCCESS | 「{CardName} 突破成功！曉蔭加成提升至 ×{Bonus}」 | |
| UI_LB_UNLOCK_EVENT | 「天賦解鎖：{SkillName} 靈感事件已可用」 | 突破解鎖提示 |
| UI_SNAPSHOT | 「子嗣帶著 {MentorName} 的傳承錦囊入校」 | 教官鏡像包裝 |
| UI_CARD_TAB_EFFECTS | 「支援效果」 | 頁籤名稱 |
| UI_CARD_TAB_EVENTS | 「培育事件」 | 頁籤名稱 |
| UI_CARD_TAB_STORY | 「小插曲」 | 頁籤名稱 |
| UI_STAR_LOCKED | 「需達 ★{N} 才可發動」 | 戰法事件鎖頭提示 |

---

## I. Data Schema 需求

### 本機端 (Client)
```json
{
  "Support_ID": "SUP_ZHAO_SSR_01",
  "Name": "趙雲",
  "Rarity": "SSR",
  "Teaching_Style": "槍法",
  "Stat_Bonus": {
    "STR": 8,
    "AGI": 5
  },
  "Tactic_Inspire_Events": [
    {
      "Event_ID": "EVT_ZHAO_01",
      "Tactic_ID": "TAC_LANCE_THRUST",
      "Trigger_Window": [1, 12],
      "Base_Rate": 0.25,
      "Min_Star": 0
    },
    {
      "Event_ID": "EVT_ZHAO_02",
      "Tactic_ID": "TAC_CAVALRY_CHARGE",
      "Trigger_Window": [8, 20],
      "Base_Rate": 0.40,
      "Min_Star": 1
    },
    {
      "Event_ID": "EVT_ZHAO_05",
      "Tactic_ID": "TAC_DRAGON_GALL",
      "Trigger_Window": [28, 36],
      "Base_Rate": 0.15,
      "Min_Star": 4
    },
    {
      "Event_ID": "EVT_ZHAO_06",
      "Tactic_ID": "TAC_ZHAO_SPEAR",
      "Trigger_Window": [1, 36],
      "Base_Rate": 0.10,
      "Min_Star": 5,
      "Bloodline_Required": "ZHAO"
    }
  ],
  "Passive_Effects": [
    {"Effect": "TP_Bonus", "Value": 0.15, "Min_Star": 0},
    {"Effect": "Training_Rate", "Value": 0.05, "Min_Star": 0},
    {"Effect": "Initial_Friendship", "Value": 5, "Min_Star": 1},
    {"Effect": "TP_Bonus", "Value": 0.10, "Min_Star": 4}
  ],
  "Friendship_Bonus": [1.0, 1.1, 1.2, 1.3, 1.4, 1.5],
  "Training_Effect": [1.0, 1.05, 1.10, 1.15, 1.20, 1.30],
  "Training_Slot_Affinity": ["STR", "AGI"],
  "Slot_Burst_Rate": 0.55,
  "Synergy_Partners": ["SUP_ZHUGE_SR_01"],
  "Synergy_Event_ID": "SYN_ZHAO_ZHUGE_01",
  "Overflow_Reward": {"Type": "Score_Point", "Value": 500},
  "Current_Star": 0,
  "Source": "Gacha",
  "Role_Boundary": "TeachingOnly"
}
```

### Server 端
| 欄位 | 型別 | 說明 |
|---|---|---|
| Support_ID | VARCHAR(24) PK | 教官卡唯一碼 |
| Player_ID | VARCHAR(32) FK | 所屬玩家 |
| Base_Template | VARCHAR(16) | 教官模板（如 ZHAO_SSR_01） |
| Current_Star | INT (0~5) | 當前星等（突破次數） |
| Source | ENUM('Gacha','Retire','Capture','Mercenary','Offspring') | 來源 |
| Role_Boundary | ENUM('TeachingOnly') | 固定標記教官只負責教學，不具血統親傳資格 |
| Is_Locked_In_Training | BOOLEAN | 是否正在培育鏡像中 |

---

## J. 名詞定義

| 名詞 | 代碼/Key | 定義 |
|---|---|---|
| 教官 | Mentor / Support | 培育模式中提供屬性加成與戰法傳授的支援卡 |
| 支援卡 | Support_Card | 教官的卡片化形式 |
| 教學流派 | Teaching_Style | 如醫療、槍法、計略、魅力、火攻 |
| 戰法靈感事件 | Tactic_Inspire_Event | 教官卡在培育特定回合觸發的事件，使武將獲得戰法靈感 |
| TP | Tactics_Point | 戰法點數，用於畢業時購買戰法 |
| 突破 | Limit_Break / Star_Up | 重複教官卡合成提升星等（★0~★5），解鎖更多戰法事件與加成 |
| 鏡像快照 | Snapshot | 進培育時凍結教官屬性的機制 |
| 入學令 | Enrollment_Ticket | 控制培育啟動頻率的門檻道具 |
| 曉蔭加成 | Friendship_Bonus | 突破後教官事件觸發率提升的倍率 |
| 曉蔭訓練 | Friendship_Training | 武將與教官一起訓練時發生的高效特訓，靈感率大幅提升 |
| 師友羈絆 | Synergy_Bond | 兩張指定教官卡同時放入培育所觸發的組合加成事件 |
| 借用教官 | Borrow_Mentor | 從好友清單中借入其 SSR 教官一次性使用 |
| 訓練格 | Training_Slot | 培育 36 回合中可選擇的訓練項目格（力量/智力/速度/武藝/體力/心靈）|
| 訓練格爆發 | Slot_Burst | 教官站在自己擅長的訓練格時觸發的強化狀態（亮彩），點數×1.5、友情+10% |
| 溢出轉化 | Overflow_Convert | 支援卡已 ★5 滿突破，再抽到重複卡時自動轉化為積分的機制 |
| 點數商店 | Score_Shop | 溢出積分可兌換道具、培育素材的商店入口 |
| 教學職能分離 | Teaching_Line_Only | 教官只負責培育事件、TP 與友情訓練，不介入血統親傳 |

> **實作狀態（2026-10-26，PROG-2-1134，PR #927）**
> - 「戰法靈感事件」與「TP」的實作依 §F-3：靈感先累積，結業後以 TP 兌換，兌換入口由 `GameSession.learnTactic` 把關。
> - 「入學令／入學需帶教官」以入學前至少 1 位教官為準（見 §F-3 實作狀態）。

---
