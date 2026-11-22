<!-- doc_id: doc_spec_1297 -->
# 兵種（虎符）系統（分片索引） — G–J 劇本、字串、Data Schema、名詞定義

> 這是 `兵種（虎符）系統.md` 的「G–J 劇本、字串、Data Schema、名詞定義」分片。完整索引見 `docs/遊戲規格文件/系統規格書/兵種（虎符）系統.md`。

## G. 劇本相關

| 情境 | 劇本需求 |
|---|---|
| 虎符產出 | 「{Name} 殞落沙場後留下了【虎符：{TallyName}】，精銳永存！」 |
| 虎符裝備 | 「{GeneralName} 裝備了【{TallyName}】，現可指揮 {TroopName}！」 |
| 虎符卸下 | 「{GeneralName} 卸下了【{TallyName}】。」 |
| 虎符升星 | 「【{TallyName}】升至 {Star}★！{TroopName} 戰力大幅提升！」 |
| 虎符突破 | 「【{TallyName}】突破成功——{Star}★ 之力覺醒！」 |
| 虎符突破失敗 | 「突破失敗……虎符完好，但精華已消耗。」 |
| 家族共鳴 | 「{GeneralName} 持{TallyName}——{ClanName}之魂共鳴！」 |
| 地形適性 | 「{TroopName} 在{TerrainName}如魚得水，戰力提升！」 |
| 忠誠度下降 | 「{GeneralName} 對被拔除虎符一事感到不滿，忠誠度下降。」 |
| 白馬義從 | 「白馬如雪、銀槍似霜——白馬義從，天下無敵！」 |
| 陷陣營 | 「陷陣之志，有死無生——高順的鐵軍重現人間！」 |
| 兵種剋制 | 「騎兵衝鋒弓陣——弓兵陣腳大亂！」 |
| 步兵剋騎 | 「步兵嚴陣以待，騎兵衝鋒被長矛陣擋下！」 |
| 血脈共鳴 | 「{GeneralName} 持有先祖之符——血脈共鳴，能力強化！」 |

---

## H. 字串內容相關

| Key | 預設值 | 備註 |
|---|---|---|
| UI_TROOP_CAVALRY | 「騎兵」 | |
| UI_TROOP_INFANTRY | 「步兵」 | |
| UI_TROOP_ARCHER | 「弓兵」 | |
| UI_TROOP_SHIELD | 「盾兵」 | |
| UI_TROOP_PIKE | 「長槍兵」 | |
| UI_TROOP_NAVY | 「水軍」 | |
| UI_TROOP_SIEGE | 「機械（投石車/弩車）」 | |
| UI_TALLY_GET | 「獲得虎符【{TallyName}】！」 | 死亡結算產出 |
| UI_TALLY_EQUIP | 「{GeneralName} 裝備了【{TallyName}】，可指揮【{TroopName}】！」 | 裝備虎符 |
| UI_TALLY_UNEQUIP | 「{GeneralName} 卸下了【{TallyName}】。」 | 卸下虎符 |
| UI_TALLY_TRANSFER | 「【{TallyName}】已轉交給 {GeneralName}。」 | 虎符轉交 |
| UI_TALLY_QUALITY | 「虎符品質：{Quality}」 | |
| UI_TALLY_RESONANCE | 「血脈共鳴！能力 +10%」 | 裝備者有血脈/史實羈絆 |
| UI_TALLY_STAR_UP | 「【{TallyName}】升至 {Star}★！」 | 戰鬥經驗升星 |
| UI_TALLY_BREAKTHROUGH | 「突破成功——{Star}★ 之力覺醒！」 | 4~5★ 突破 |
| UI_TALLY_BREAKTHROUGH_FAIL | 「突破失敗，虎符安然無恙。」 | |
| UI_TALLY_BREAKTHROUGH_COST | 「突破需要：黃金 {Gold}、虎符精華 {Essence}」 | |
| UI_TALLY_TERRAIN | 「地形適性：{TerrainName} {Grade}」 | 地形適性顯示 |
| UI_TALLY_CLAN | 「家族共鳴：{ClanName} +8%」 | 家族共鳴提示 |
| UI_TALLY_GENDER | 「性別偏好：{Gender} +6%」 | 性別加成提示 |
| UI_LOYALTY_DROP | 「{GeneralName} 忠誠度 {Change}」 | 虎符拔除時 |
| UI_LOYALTY_WARNING | 「警告：{GeneralName} 忠誠度過低，可能拒命或叛變！」 | |
| UI_COUNTER | 「兵種剋制！傷害 ×{Mod}」 | 戰場剋制提示 |
| UI_EFFICIENCY | 「指揮效率：{Pct}%」 | 適性加成 |
| UI_TALLY_CODEX | 「虎符圖鑑」 | |
| UI_SPIRIT_TALLY_CAST | 「英靈虎符回應召喚，軍勢殘響降臨戰場！」 | 插卡演出 |
| UI_BLOODLINE_FACE_REVEAL | 「{GeneralName} 的血脈之面現身！」 | 血脈面顯現 |

---

## I. Data Schema 需求

### 本機端 (Client)

```json
{
  "TroopDef": {
    "Troop_ID": "string",
    "Name": "string",
    "Base_Type": "CAVALRY | INFANTRY | ARCHER | SHIELD | PIKE | NAVY | SIEGE | MECHANICAL",
    "Is_Special": "boolean (是否特殊兵種)",
    "Stats": {
      "Attack": "number",
      "Defense": "number",
      "Move": "number",
      "Range": "number"
    },
    "Special_Ability": {
      "Name": "string",
      "Description": "string",
      "Effect": "string (效果公式描述)"
    },
    "Skin_Key": "string (外觀資源 Key)",
    "Required_Tally": "string | null (需要的虎符 ID)",
    "Bloodline_Beast_ID": "string",
    "Sigil_Pattern_ID": "string",
    "Spirit_Face_Style": "HALF_SPIRIT | FULL_SPIRIT | DOUBLE_FACE",
    "Troop_Visual_Tags": ["string"]
  }
}
```

```json
{
  "TigerTally": {
    "Tally_ID": "string",
    "Name": "string",
    "Quality": "UR | SSR | SR | R",
    "TigerTallyScore": "number (0~100，品質唯一映射分數)",
    "Star": "number (1~5，預設 1)",
    "Star_Exp": "number (當前星級累積經驗，僅 1~3★ 使用)",
    "Source_Template": "string (產出來源武將 Template_ID)",
    "Source_Type": "DeathSettlement | Recruitment | WarConquest (Q61=C 三進路補充)",
    "Source_Event": "DeathSettlement | Recruitment | WarConquest",
    "Grain_Cost_Base": "number (查 TALLY_GRAIN_COST[quality][star]，Q62=A)",
    "Linked_Troop_ID": "string (對應的特殊兵種 ID)",
    "Equipped_General_UID": "string | null (目前裝備此虎符的武將 UID，null=未裝備)",
    "Death_Battle_Score": "number (死亡快照戰績主分數)",
    "Legacy_Quality_Score": "number (傳承品質次分數)",
    "Lore_Text": "string (虎符故事文本)",
    "Resonance_Template": "string | null (血脈共鳴原名將 Template_ID)",
    "Clan_ID": "ClanID (所屬家族 ID)",
    "Gender_Pref": "NONE | MALE | FEMALE",
    "Bloodline_Beast_ID": "string",
    "Sigil_Pattern_ID": "string",
    "Spirit_Face_Style": "HALF_SPIRIT | FULL_SPIRIT | DOUBLE_FACE",
    "Terrain_Affinity": {
      "PLAIN": "S|A|B|C|D",
      "MOUNTAIN": "S|A|B|C|D",
      "FOREST": "S|A|B|C|D",
      "RIVER": "S|A|B|C|D",
      "CITY": "S|A|B|C|D",
      "DESERT": "S|A|B|C|D"
    }
  }
}
```

```json
{
  "PlayerTallyCollection": {
    "Player_ID": "string",
    "Tallies": [
      {
        "Tally_ID": "string",
        "Quality": "UR | SSR | SR | R",
        "TigerTallyScore": "number (0~100)",
        "Star": "number (1~5)",
        "Star_Exp": "number (當前累積經驗)",
        "Source_General_UID": "string (產出武將 UID)",
        "Equipped_General_UID": "string | null (裝備中的武將 UID)",
        "Acquired_Season": "number",
        "Is_Displayed": "boolean (是否展示在主城)"
      }
    ]
  }
}
```

### Server 端

| 欄位 | 型別 | 說明 |
|---|---|---|
| tally_record_id | VARCHAR(32) PK | 虎符記錄 ID |
| player_id | VARCHAR(32) FK | 玩家 |
| tally_id | VARCHAR(32) FK | 虎符定義 ID |
| quality | ENUM | UR/SSR/SR/R |
| tally_score | INT | `TigerTallyScore`（0~100） |
| star | TINYINT | 虎符星級 (1~5，預設 1) |
| star_exp | INT | 當前星級累積經驗 |
| clan_id | VARCHAR(16) | 所屬家族 ID |
| gender_pref | ENUM | NONE/MALE/FEMALE |
| terrain_affinity | JSON | 6 地形適性（S~D） |
| source_uid | VARCHAR(32) FK | 產出武將 UID |
| equipped_general_uid | VARCHAR(32) FK NULL | 目前裝備此虎符的武將 UID |
| acquired_at | DATETIME | 取得時間 |
| is_displayed | BOOLEAN | 是否展示 |

---

## J. 名詞定義

| 名詞 | 定義 |
|---|---|
| 基礎兵種 | 遊戲內七大通用部隊：騎兵、步兵、弓兵、盾兵、長槍兵、水軍、機械（加上智將、攻城為特殊分類） |
| 特殊兵種 | 需武將裝備對應虎符後才可指揮的精銳部隊，具有獨特能力與外觀 |
| 虎符 | 名將死亡結算時產出的稀有裝備道具，裝備在武將身上後該武將方可指揮對應特殊兵種；同一枚虎符同時只能由一名武將持有，可卸下轉交 |
| 兵種剋制 | 五角剋制：騎剋盾、盾剋弓、弓剋步、步剋槍、槍剋騎，決定兵種間的傷害倍率 |
| 兵種適性 | 武將指揮特定兵種的效率等級（S~D），由粉色因子決定 |
| 指揮效率 | 武將兵種適性等級轉換為的數值倍率（S=1.2 到 D=0.8） |
| 虎符主分數 | TigerTallyScore，綜合死亡戰績與傳承品質後得到的單一品質權威分數 |
| 死亡戰績分數 | Death_Battle_Score，佔虎符品質 70% 權重的戰場表現評分 |
| 傳承品質分數 | Legacy_Quality_Score，佔虎符品質 30% 權重的傳承敘事 / 家族品質評分 |
| 虎符星級 | 虎符養成階段（1★~5★），每★提升特殊兵種攻防 +8%，受品質封頂；1~3★ 戰鬥經驗升星，4~5★ 虎符精華突破 |
| 虎符精華 | Tally_Essence，4~5★ 突破所需消耗材料，透過戰場掉落、商城、活動獲得 |
| 虎符經驗 | Tally_Star_Exp，1~3★ 階段透過裝備虎符上場戰鬥累積的經驗值 |
| 地形適性 | 虎符對 6 種地形（平原/山地/森林/河川/城池/沙漠）的適應等級（S~D），影響特殊兵種在對應地形的攻防 |
| 家族共鳴 | 虎符所屬家族與武將家族一致時的額外加成（+8%），反映世家傳承概念 |
| 性別偏好 | 部分虎符對特定性別武將有正向加成（+6%），不匹配不懲罰 |
| 血脈卡 | 名將留下的英靈 / 血脈載體，可轉化為英靈虎符或插卡演出來源 |
| 英靈面 | 名將死後保留下來、於戰鬥或介面中顯現的血脈一面 |
| 命紋靈獸 | 與該名將血脈綁定的祖靈圖騰，亦是特種軍隊符號母題 |
| 祖紋命篆 | 用於虎符、卡面、軍旗與演出的古老血脈符號語言 |
| 忠誠度 | 武將對主君的忠誠程度（0~100），拔除虎符會降低，過低將導致拒命或叛變 |
| 反洗忠誠機制 | 防止玩家透過開廳拔插虎符來操控忠誠度的限制：每季僅能變更 1 次，連續變更加倍懲罰 |
| 虎符圖鑑 | 收集與展示所有已獲虎符的系統 |
| 親衛隊 | SSR 名將專屬虎符裝備後可指揮的最高級特殊兵種 |


---