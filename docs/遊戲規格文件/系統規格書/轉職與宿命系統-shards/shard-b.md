# 轉職與宿命系統規格（分片索引） — F–J 公式／劇本／字串／Data Schema／名詞

> 這是 `轉職與宿命系統.md` 的「F–J 公式／劇本／字串／Data Schema／名詞」分片。完整索引見 `docs/遊戲規格文件/系統規格書/轉職與宿命系統.md`。

## F. 公式相關

### 5 歲宿命推薦
```
if (Blue_STR + Blue_POW > Blue_INT + Blue_POL):
    Recommend = "武官"
else:
    Recommend = "文官"
```

### 抗命懲罰
```
if (Player_Choice != Recommend):
    Growth_Rate × 0.8  // 成長率降 20%
    // 但若觸發「大器晚成」，25 歲後 Growth_Rate × 1.5
```

### 轉職條件
```
if (General.Age >= 20 && has(轉職令)):  // 子嗣走成人禮名單；現成武將走武將詳情頁入口（2026-11-19 裁決 89）
    Add_Sub_Class(target_class)
    // 副職能力 = 主職能力 × 0.6
    // 2026-11-19 裁決 89：成人禮名單只列本家子嗣；現成武將（轉蛋、傭兵、俘虜等）改在武將詳情頁用轉職令轉職（PROG-2-9166）
```

### 退役分流
| 主職能 | 退役產物 | 教官類型 |
|---|---|---|
| 武官 | 虎符 | 戰技教官（藍粉因子加成） |
| 文官 | 竹簡 | 智識教官（白綠因子加成） |
| 雙職能 | 虎符+竹簡 | 全能教官（稀有） |

---

## G. 劇本相關

| 情境 | 劇本需求 |
|---|---|
| 宿命揭曉 | 「天命指引：{ChildName} 天生{武骨/文才}，建議走{武官/文官}之路。」 |
| 玩家抗命 | 「主公逆天而行！{ChildName} 的成長之路將更加艱難…」 |
| 轉職 | 「{Name} 在 20 歲成人禮上，選擇了{Sub_Class}作為副業。」 |
| 退役（武） | 「{Name} 卸下兵刃，化作虎符，戰技永傳。」 |
| 退役（文） | 「{Name} 放下竹簡，智慧化為墨香，傳承後世。」 |

---

## H. 字串內容相關

| Key | 預設值 |
|---|---|
| UI_FATE_REVEAL | 「天命分流：{Recommend}」 |
| UI_FATE_ACCEPT | 「順應天命（成長率正常）」 |
| UI_FATE_DEFY | 「逆天而行（成長率 -20%，有機率大器晚成）」 |
| UI_JOB_CHANGE | 「消耗轉職令 ×1，追加副職能：{SubClass}」 |
| UI_RETIRE_WEAPON | 「獲得虎符：{Name}」 |
| UI_RETIRE_SCROLL | 「獲得竹簡：{Name}」 |

---

## I. Data Schema 需求

### 本機端 (Client)
```json
{
  "General_Career": {
    "UID": "G201",
    "Primary_Class": "Warrior",
    "Sub_Class": null,
    "Fate_Recommend": "Warrior",
    "Fate_Defied": false,
    "Growth_Modifier": 1.0,
    "Job_Change_Available": true,
    "Retirement_Product": "Tiger_Tally"
  }
}
```

### Server 端
| 欄位 | 型別 | 說明 |
|---|---|---|
| General_UID | VARCHAR(16) FK | 武將 |
| Primary_Class | ENUM('Warrior','Scholar') | 主職能 |
| Sub_Class | ENUM('Warrior','Scholar',NULL) | 副職能 |
| Fate_Defied | BOOLEAN | 是否抗命 |
| Growth_Modifier | FLOAT | 成長率修正 |

---

## J. 名詞定義

| 名詞 | 代碼/Key | 定義 |
|---|---|---|
| 宿命分流 | Fate_Assignment | 5 歲時系統建議的職能方向 |
| 抗命 | Defiance | 玩家不接受宿命建議 |
| 轉職 | Job_Change | 20 歲追加副職能 |
| 轉職令 | Job_Change_Token | 轉職所需道具 |
| 武官 | Warrior | 偏武力/統率的職能路線 |
| 文官 | Scholar | 偏智力/政治的職能路線 |
| 雙職能 | Dual_Class | 同時擁有主副職能 |
| 虎符 | Tiger_Tally | 武官退役產物，武將私人裝備，裝備後可指揮對應特殊兵種 |
| 竹簡 | Bamboo_Scroll | 文官退役產物 |
| 大器晚成 | Late_Bloomer | 抗命後成長率在 25 歲後逆轉提升 |


---