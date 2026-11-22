<!-- doc_id: doc_spec_1305 -->
# 戰場適性系統（分片索引） — G–J 劇本、字串、Data Schema、名詞定義、MCQ 與變更記錄

> 這是 `戰場適性系統.md` 的「G–J 劇本、字串、Data Schema、名詞定義、MCQ 與變更記錄」分片。完整索引見 `docs/遊戲規格文件/系統規格書/戰場適性系統.md`。

## G. 劇本相關

| 情境 | 劇本需求 |
|---|---|
| 水戰適性 S | 「{Name} 如魚得水——水面之上，無人能敵！」 |
| 山地適性 S | 「{Name} 倚山而戰，一夫當關！」 |
| 大霧適性 | 「霧中行軍——{Name} 不受大霧影響，百步穿楊！」 |
| 夜戰適性 | 「月黑風高，正是{Name}的戰場！」 |
| 適性不足 | 「{Name} 對此地形十分不適——行動遲緩、攻勢受阻。」 |
| 天氣變化 | 「風向突變——大風來襲！火攻將更具威力！」 |

---

## H. 字串內容相關

| Key | 預設值 | 備註 |
|---|---|---|
| UI_APT_S | 「★★★ 極強」 | 適性等級 S |
| UI_APT_A | 「★★☆ 擅長」 | 適性等級 A |
| UI_APT_B | 「★☆☆ 普通」 | 適性等級 B |
| UI_APT_C | 「☆☆☆ 不擅長」 | 適性等級 C |
| UI_APT_D | 「✗ 極差」 | 適性等級 D |
| UI_TERRAIN_PLAIN | 「平原」 | |
| UI_TERRAIN_MOUNTAIN | 「山地」 | |
| UI_TERRAIN_WATER | 「水域」 | |
| UI_TERRAIN_FOREST | 「林地」 | |
| UI_TERRAIN_DESERT | 「沙漠」 | |
| UI_WEATHER_SUNNY | 「☀ 晴天」 | |
| UI_WEATHER_RAINY | 「🌧 雨天」 | |
| UI_WEATHER_FOG | 「🌫 大霧」 | |
| UI_WEATHER_WINDY | 「🌪 大風」 | |
| UI_WEATHER_NIGHT | 「🌙 夜戰」 | |
| UI_WEATHER_THUNDER | 「⚡ 雷暴」 | |
| UI_TROOP_CAVALRY | 「騎兵」 | |
| UI_TROOP_INFANTRY | 「步兵」 | |
| UI_TROOP_ARCHER | 「弓兵」 | |
| UI_TROOP_SIEGE | 「機械」 | |

---

## I. Data Schema 需求

### 本機端 (Client)

```json
{
  "GeneralAptitude": {
    "UID": "string (武將 UID)",
    "Troop_Aptitude": {
      "CAVALRY": "S | A | B | C | D",
      "INFANTRY": "S | A | B | C | D",
      "ARCHER": "S | A | B | C | D",
      "SIEGE": "S | A | B | C | D"
    },
    "Terrain_Aptitude": {
      "PLAIN": "S | A | B | C | D",
      "MOUNTAIN": "S | A | B | C | D",
      "WATER": "S | A | B | C | D",
      "FOREST": "S | A | B | C | D",
      "DESERT": "S | A | B | C | D"
    },
    "Weather_Aptitude": {
      "SUNNY": "S | A | B | C | D",
      "RAINY": "S | A | B | C | D",
      "FOG": "S | A | B | C | D",
      "WINDY": "S | A | B | C | D",
      "NIGHT": "S | A | B | C | D",
      "THUNDER": "S | A | B | C | D"
    }
  }
}
```

```json
{
  "BattlefieldEnv": {
    "Map_ID": "string",
    "Terrain_Grid": "2D Array of TERRAIN_TYPE",
    "Weather_Schedule": [
      {
        "Turn_Start": "number",
        "Turn_End": "number",
        "Weather": "SUNNY | RAINY | FOG | WINDY | NIGHT | THUNDER"
      }
    ]
  }
}
```

### Server 端

| 欄位 | 型別 | 說明 |
|---|---|---|
| aptitude_id | VARCHAR(32) PK | 適性記錄 ID |
| player_id | VARCHAR(32) FK | 玩家 |
| general_uid | VARCHAR(32) FK | 武將 |
| dimension | ENUM | TROOP / TERRAIN / WEATHER |
| sub_type | VARCHAR(16) | 子類型（如 CAVALRY、PLAIN、FOG） |
| grade | CHAR(1) | 等級 (S/A/B/C/D) |
| source_gene_id | VARCHAR(32) | 來源因子 ID |

---

## J. 名詞定義

| 名詞 | 定義 |
|---|---|
| 兵種適性 | 武將指揮騎/步/弓/機械部隊的效率等級（S~D） |
| 地形適性 | 武將在不同地形環境（平原/山地/水域/林地/沙漠）下的戰鬥效率等級 |
| 天氣適性 | 武將在不同天氣條件（晴/雨/霧/風/夜/雷）下的戰鬥效率等級 |
| 粉色因子（💗） | 決定兵種與地形適性的遺傳因子 |
| 白色因子（⚪） | 提供天氣抗性與特殊天賦的遺傳因子 |
| 適性等級 | S（極強）到 D（極差）的五級評定 |
| 環境偵察 | 出戰前查看戰場地圖地形分佈與天氣預報的功能 |
| 天氣變化 | 戰鬥進行中天氣隨回合自動切換的機制 |
| 適性修正 | 根據適性等級對攻防/移動/命中等數值的加減乘除調整 |


---
## 🗳 MCQ 決策記錄（Q35）

- **問題**：適性減益具體比例
- **衝突說明**：討論稿提出B級適性削弱30%，但正式戰場適性系統規格書各等級懲罰百分比未定，若不拍板關卡設計與數值系統將採用不同基準。
- **裁決**：**選項 A** — 硬核 (-30%)（對齊討論稿，B 級適性強力削弱）
- **回寫時間**：2026-04-12 11:28
- **來源**：由 `consolidation-doubt-mcq.js rewrite-all` 自動寫入

---

## 變更記錄

- 2026-11-22：新增「戰場天氣來源與戰前顯示」（使用者 2026-11-22 裁決：劇情關固定、其他依季節機率隨機、戰前顯示、機率放 JSON）。任務卡 PROG-2-9733。
