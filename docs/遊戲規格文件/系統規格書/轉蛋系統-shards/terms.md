# 轉蛋系統規格書 — J–K 名詞定義與傳承邊界

> 這是 `轉蛋系統.md` 的「J–K 名詞定義與傳承邊界」分片。完整索引見 `docs/遊戲規格文件/系統規格書/轉蛋系統.md`。

## J. 名詞定義

| 名詞 | 代碼/Key | 定義 |
|---|---|---|
| 三國名將池 | General_Pool | 武將本體抽取池 |
| 紅顏天香池 | Female_Heroine_Pool | 女性武將專屬抽取池，可立即結緣，詳見 FEM-03（doc_spec_0645） |
| 支援卡池 | Support_Pool | 教官 / 支援卡抽取池 |
| 轉生 | Rebirth | 重複抽到同名武將觸發的強化機制 |
| 轉數 | Rebirth_Count | 同名武將累計抽到次數 (1~5) |
| 保底 | Pity | 達到特定抽數保證出貨的機制 |
| 天命商店 | Destiny_Shop | 200 抽保底可兌換限定 SSR 的商店 |
| 結義金蘭卡 | Bonding_Card | 滿轉溢出碎片兌換的強力招降道具 |
| 忠誠度 | Loyalty | 名將池抽出的名將鎖定 100，戰場獲取的會下降 |
| 虎符卡 | Tiger_Tally_Card | 名將死亡後留下的虎符產物，詳見兵種（虎符）系統.md |
| 英靈卡 | Spirit_Card | 名將死亡後留下的祖靈產物，詳見英靈世家系統.md |
| 女性名將定位 | Female_Role_Type | 女性角色在名將池內的定位標籤，區分 `COMBAT` 與 `SUPPORT` |
| 血統種子 | Bloodline_Seed | 名將池提供的角色本體價值，代表可上陣、可培育、可繁衍的入口 |
| 培育深度 | Nurture_Depth | 支援卡池提供的培育上限、事件密度與成長體驗價值 |
| 靈玉 | Spirit_Jade | 付費貨幣，三個卡池均可使用 |
| 銅錢符 | Bronze_Charm | 免費貨幣，僅常設池可用 |
| 求籤令 | Divination_Token | 指定角色的定向保底道具（上限 100 抽) |
| 教官碎片 | Support_Fragment | 分解重複/多餘教官卡所得，可合成低稀有度支援卡 |
| 碎片庫 | Fragment_Vault | 玩家教官碎片的儲存倉庫 |
| 轉蛋主視覺 | Gacha_Key_Visual | `GachaMain` Banner 的商業主視覺，可為透明人物 PNG + soft mask，也可為完整不透明 key art |
| Banner 人物圖 | Banner_Character_Art | 卡池 Banner 的人物展示層；短期可重用去背 PNG，正式版可改為 pool-specific key visual |

---

## K. 與身後傳承系統的正式邊界

1. 名將池抽出的角色是**活體名將本體**，可上陣、培育、轉生與進入家族系統。
2. 名將死亡時，才會另外結算 `英靈卡` 與 `虎符卡`。
3. `英靈卡` 的祖靈 / 世家用途由 [英靈世家系統.md](C:\Users\User\3KLife\docs\系統規格書\英靈世家系統.md (doc_spec_0022)) (doc_spec_0022) 主責。
4. `虎符卡` 的兵種與戰場用途由 [兵種（虎符）系統.md](C:\Users\User\3KLife\docs\系統規格書\兵種（虎符）系統.md (doc_spec_0012)) (doc_spec_0012) 主責。
5. 本檔只負責抽卡、保底、重複名將轉生與支援卡商業邏輯，不負責死亡結算產卡本體。


---
