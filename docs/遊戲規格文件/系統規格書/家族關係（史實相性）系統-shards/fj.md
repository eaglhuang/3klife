# 家族關係（史實相性）系統 — F–J

> 這是 `家族關係（史實相性）系統.md` 的「F–J」分片。完整索引見 `docs/遊戲規格文件/系統規格書/家族關係（史實相性）系統.md`。

## F. 公式相關

### 相性計算公式

**血脈共鳴**：
```
if (countSharedTags(ancestors_14, tag_pool) >= 3):
    EP += 15
```

**名將契合**：
```
if (HISTORICAL_PAIR_TABLE[father.Template_ID][mother.Template_ID]):
    EP += 25
```

**宿敵排斥**：
```
if (ENEMY_PAIR_TABLE[father.Template_ID][mother.Template_ID]):
  conception_rate *= 0.7  // 受孕率降 30%
  // 注意：宿敵配對僅降低受孕率並可能引入「狼性」因子，
  // 不再直接給予固定 EP 加成（不自動 +5 EP）。
```

### 標籤共鳴加成表

| 共享標籤數 | 效果 | 說明 |
|---|---|---|
| 0~2 | 無加成 | 基礎配對 |
| 3 | 血脈共鳴 +15 EP | 基本門檻 |
| 5+ | 血脈共鳴 +15 EP + 家風傳承 Buff | 三代以上累積 |
| 14 人全同族 | 純血加成 +30 EP | 極端純種路線 |

### 史實關係類型定義

| 關係代碼 | 名稱 | EP 效果 | 其他效果 |
|---|---|---|---|
| COUPLE | 史實夫妻 | +25 | 受孕率 +20% |
| SWORN | 義兄弟 | +15 | 合攻觸發率 +30% |
| MASTER_STUDENT | 師徒 | +10 | 子嗣繼承教官戰法機率 +20% |
| RIVAL | 宿敵 | -10 | 受孕率 -30%、後代具「狼性」白色因子 |
| LORD_VASSAL | 主從 | +10 | 忠誠度永久 +20 |

---

## G. 劇本相關

| 情境 | 劇本需求 |
|---|---|
| 名將契合 | 「周瑜與小喬，天作之合！爆發力大幅提升！」 |
| 血脈共鳴 | 「趙雲的後代與馬雲騄的後裔——白馬義從的血脈再度覺醒！」 |
| 宿敵配種 | 「諸葛亮與司馬懿的血脈交融？天意難測……」 |
| 義兄弟合攻 | 「桃園結義之魂，於此刻甦醒！」 |
| 關係圖鑑完成 | 「五虎上將齊聚——蜀漢之榮光重現！」 |
| 家風傳承觸發 | 「三代忠義傳承，{FamilyName}家風已成！」 |

---

## H. 字串內容相關

| Key | 預設值 | 備註 |
|---|---|---|
| UI_REL_COUPLE | 「史實夫妻」 | 關係類型標籤 |
| UI_REL_SWORN | 「義兄弟」 | |
| UI_REL_RIVAL | 「宿敵」 | |
| UI_REL_MASTER | 「師徒」 | |
| UI_REL_LORD | 「主從」 | |
| UI_REL_COMRADE | 「戰友」 | 動態關係 |
| UI_AFFINITY_HIGH | 「相性極佳——天作之合！」 | 配對模擬器顯示 |
| UI_AFFINITY_LOW | 「相性不和——宿敵之血恐生波瀾」 | |
| UI_RESONANCE_TRIGGER | 「血脈共鳴觸發！{TagName} 共享 {Count} 人」 | |
| UI_FAMILY_TRADITION | 「【家風傳承】{FamilyName} 家：{TraitName}」 | |

---

## I. Data Schema 需求

### 本機端 (Client)

```json
{
  "HistoricalRelation": {
    "Relation_ID": "string (唯一 ID)",
    "Template_A": "string (武將 A Template_ID)",
    "Template_B": "string (武將 B Template_ID)",
    "Type": "COUPLE | SWORN | MASTER_STUDENT | RIVAL | LORD_VASSAL",
    "EP_Bonus": "number",
    "Extra_Effects": {
      "Conception_Rate_Mod": "number (倍率)",
      "Combo_Attack_Rate_Mod": "number (倍率)",
      "Loyalty_Bonus": "number"
    },
    "Lore_Key": "string (劇本字串 Key)"
  }
}
```

```json
{
  "DynamicRelation": {
    "UID_A": "string (武將A UID)",
    "UID_B": "string (武將B UID)",
    "Type": "COMRADE | DYNAMIC_SWORN | SPOUSE | PARENT_CHILD",
    "Intimacy": "number (0~100 親密度)",
    "Created_Season": "number (建立時的遊戲季度)",
    "Decay_Rate": "number (每季衰減值)"
  }
}
```

### Server 端

| 欄位 | 型別 | 說明 |
|---|---|---|
| relation_id | VARCHAR(32) PK | 關係唯一 ID |
| player_id | VARCHAR(32) FK | 所屬玩家 |
| uid_a | VARCHAR(32) FK | 武將 A |
| uid_b | VARCHAR(32) FK | 武將 B |
| type | ENUM | 關係類型 |
| intimacy | INT | 親密度 (0~100) |
| created_at | DATETIME | 建立時間 |
| last_interact | DATETIME | 最後互動時間 |

---

## J. 名詞定義

| 名詞 | 定義 |
|---|---|
| 相性 | 兩名武將之間的關係匹配程度，分為史實相性（靜態資料）與動態相性（遊玩中累積） |
| 血脈共鳴 | 14 人祖先矩陣中有 ≥3 個相同標籤時觸發的爆發力加成 |
| 名將契合 | 史實關係配對（如夫妻、義兄弟）時觸發的高額爆發力加成 |
| 宿敵排斥 | 歷史上互為敵對的武將配種時，受孕率降低但後代可能獲得「狼性」因子 |
| 親密度 | 動態關係的強度值（0~100），透過戰場共鬥、治理互動等方式提升 |
| 關係圖鑑 | 記錄玩家已解鎖的所有史實與動態關係的收集系統 |
| 家風傳承 | 同族三代以上共享 5+ 標籤時觸發的永久被動 Buff |
| 合攻觸發 | 具有特定關係的武將在棋盤相鄰格時可發動的聯合攻擊 |
