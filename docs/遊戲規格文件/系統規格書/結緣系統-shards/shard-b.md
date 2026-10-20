# 結緣系統（配種）規格（分片索引） — F–J 公式／劇本／字串／Data Schema／名詞

> 這是 `結緣系統（配種）.md` 的「F–J 公式／劇本／字串／Data Schema／名詞」分片。完整索引見 `docs/遊戲規格文件/系統規格書/結緣系統（配種）.md`。

## F. 公式相關

### 受孕率
```
Conception_Rate = Base(70%) × (1 + CHA_avg/200) × (1 + LUK_avg/200) × Vitality_Factor
Vitality_Factor: >50% → ×1.0; 30~50% → ×0.5; <30% → ×0.1

// 高齡與多次自然親傳只作 soft penalty，不另開新資源條：
// Age_Factor = Father_Age_Factor × Mother_Age_Factor
// Birth_Load_Factor = max(0.4, 1 - 0.15 × max(0, Mother_Previous_Births - 1))
// 最終受孕率上界限制（避免保底/特化組合出現不合理的 100% 成功率）：
// Final_Conception_Rate = min(Conception_Rate × Age_Factor × Birth_Load_Factor, 0.95)
```

### 子嗣因子繼承機率
| 來源 | 機率 |
|---|---|
| 父母（直系） | 100% 進入因子池 |
| 祖父母 | 50% 進入因子池 |
| 曾祖父母 | 25% 進入因子池 |

### 子嗣屬性決定
```
Base_Stat = (Father_Stat + Mother_Stat) / 2 × (EP / 100)
// EP = 爆發力，由血統共鳴+異脈+契合+天命波動決定
```

### 大器晚成（Is_Daqi）判定與效果（標準化說明）
```
// 判定時點：5 歲開獎時（Unveil）完成基礎判定並寫入 Is_Daqi
// 判定條件（需同時滿足）：
// 1) Unveil_Base_Stat <= 30（非常低的初始數值暗示）
// 2) 名士暗示或天象標記（Oracle_Hint == LATE_BLOOMER）
// 3) 隨機種子檢查通過（避免過度確定化，維持驚喜感）
Is_Daqi = (Unveil_Base_Stat <= 30 && Oracle_Hint == LATE_BLOOMER && Random() < 0.5)

// 效果：大器晚成不會在 0~5 歲立即提升屬性；其為一個長期成長 Modifier。
// 當角色年齡 >= 25 歲時，啟動成長加成：
if (Age >= 25 && Is_Daqi):
  Stat_Growth_Rate *= 1.5  // 長期成長速率×1.5（持續影響至角色壽命期）
```

// 備註：此處為標準化規範，其他文件（培育、轉職、名士預言）應以此邏輯為準。

### 近親劣化
```
if (Ancestor_14.contains(same Bloodline_ID)):
    Vitality_Max -= 30%
    Mutant_Rate(Negative) += 50%
```

---

## G. 劇本相關

| 情境 | 劇本需求 |
|---|---|
| 結緣確認 | 「{Father} 與 {Mother} 良緣天成，是否結緣？」 |
| 天象異變 | 「紅光滿室！」「百鳥朝鳳！」「流星入夢！」 |
| 大器晚成 | 名士：「此子雖木訥，然其志在遠。」+ 隱隱雷聲背景 |
| 5 歲開獎 | 五維數值亮出動畫 + 因子灰色鎖頭展示 |
| 近親警告 | 「同源血脈過於濃厚，後裔恐有天殤之虞！」 |

---

## H. 字串內容相關

| Key | 預設值 |
|---|---|
| UI_BREED_CONFIRM | 「消耗 {F_Name} 精力 50 與 {M_Name} 精力 100，確認結緣？」 |
| UI_PREG_STATUS | 「{M_Name} 已進入待產期，預計 {N} 季後誕下子嗣」 |
| UI_CHILD_BORN | 「恭喜主公！{Father} 與 {Mother} 喜獲 {Gender}！」 |
| UI_UNVEIL_5 | 「天命開獎！{ChildName} 五維資質揭曉：」 |
| UI_DAQI | 「名士嘆：此子潛龍在淵，天機不可洩漏。」 |
| UI_EP_DISPLAY | 「預估爆發力：{EP}（{Rating}）」 |

---

## I. Data Schema 需求

### 本機端 (Client)
```json
{
  "Breeding_Session": {
    "Father_UID": "G001",
    "Mother_UID": "G045",
    "Breeding_Mode": "Peace_Lineage",
    "EP_Estimate": 93,
    "Oracle_Hints": [
      {"Sage": "諸葛亮", "Comment": "此子眉宇有靈氣"},
      {"Sage": "華佗", "Comment": "壯如鐵牛"}
    ]
  },
  "Child": {
    "UID": "C201",
    "Father_ID": "G001",
    "Mother_ID": "G045",
    "Age": 0,
    "Status": "Mystery",
    "EP_Actual": 93,
    "Is_Daqi": false,
    "Omen_Type": "Meteor"
  }
}
```

### Server 端
| 欄位 | 型別 | 說明 |
|---|---|---|
| Child_UID | VARCHAR(16) PK | 子嗣唯一碼 |
| Father_UID | VARCHAR(16) FK | 父親 |
| Mother_UID | VARCHAR(16) FK | 母親 |
| Breeding_Mode | ENUM('Standard','Peace_Lineage') | 本次結緣是否屬保種優先的和平血統線 |
| EP_Actual | INT | 實際爆發力 |
| Is_Daqi | BOOLEAN | 是否大器晚成 |
| Birth_Season | INT | 出生季度 |
| Unveil_Season | INT | 開獎季度（出生+20 季） |

---

## J. 名詞定義

| 名詞 | 代碼/Key | 定義 |
|---|---|---|
| 結緣 | Breeding | 選擇父母產生子嗣的行為 |
| 受孕 | Conception | 結緣成功判定，消耗精力 |
| 神祕期 | Mystery_Phase | 0~5 歲，數值隱藏 |
| 開獎 | Unveiling | 5 歲揭曉五維與因子 |
| 大器晚成 | Late_Bloomer / Daqi | 初始數值低但具備隱藏爆發潛力 |
| 天象異變 | Omen | 出生時的視覺提示（流星/紫氣/鹿銜草） |
| 待產凍結 | Pregnancy_Lock | 女性受孕後精力回復凍結直到生產 |
| 門當戶對 | Compatibility | 結緣時雙方門第匹配的概念 |
| 血脈劣化 | Inbreeding_Penalty | 近親繁殖導致的 Vitality_Max 下降 |
| 精力值 | Vigor | 武將體力狀態，決定結緣冷卻與戰鬥出擊能力 |
| 生育上限 | Breeding_Cap | 武將一生最多 3~5 次親傳子嗣的自然限制 |
| 和平血統線 | Peace_Lineage | 不要求前線連續出征、以保種與家系延續為主的結緣路徑 |

---
