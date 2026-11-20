<!-- doc_id: doc_spec_1239 -->
# 年終守城戰規格書（分片索引） — 7–10 HUD 城寨血條、共用框架、數值檔、測試驗收

> 這是 `年終守城戰規格書.md` 的「7–10 HUD 城寨血條、共用框架、數值檔、測試驗收」分片。完整索引見 `docs/遊戲規格文件/系統規格書/年終守城戰規格書.md`。

## 7. HUD：我方城寨血條

- 只在守城戰顯示我方城寨血條；一般關卡不顯示。來源：PROG-2-9430。
- 數值跟著 `FortressDamaged` 事件（`{ faction, hp }`）更新；事件在工兵合併一次扣血後發出。來源：PROG-2-9430；PROG-2-9429 Q1。
- 新版 HUD 版面沒有城寨血條節點，執行期在頂欄正下方建立；畫面未建好前只記旗標與數值，建好後補畫。對外介面：`BattleHUDComposite.setDefenseFortressBarVisible(visible)`、`setFortressHp(faction, hp)`。來源：PROG-2-9430。
- 血量上限取 `FORTRESS_MAX_HP`（500）。

## 8. 底層共用框架對應

總綱：`doc_spec_1182`。守城屬「第 1 年已能玩、且不依賴新框架」的系統，總綱 shard-e 12.1 明定 MVP **不遷移**，維持現狀；下表是日後遷移時的對應關係，不是本版實作要求。

| 守城規則 | 對應框架 | 說明 |
|---|---|---|
| 勝利民心、戰利品、敗北懲罰（民心、人口） | 獎勵系統 RWD（`doc_spec_1186`） | 勝利戰利品已列於總綱 §4 對照（戰場戰利品 `doc_spec_0603` 主＝獎勵）；敗北懲罰對應獎勵系統的「懲罰表」。 |
| 戰損回扣城市兵源、出征軍勢 | 物品庫存 ITM（`doc_spec_1184`） | 城市兵源是帶庫存觀念的資源；出征帳本寫回兵源屬庫存的 `deduct`／`grant`。 |
| 年報（結算展示） | 見 `doc_spec_0525` | 不屬 RWD 與 ITM。 |
| 單機版重要數值（民心、人口、兵源、守城年份存檔） | 共通 API 層 | 總綱規定走 API（本機 adapter）；本版仍直接寫 `GameSession`，遷移卡放 MVP 之後。 |

## 9. 數值檔與欄位（數值放 JSON）

| 檔案 | 欄位 | 值 | 來源 |
|---|---|---|---|
| `assets/resources/data/defense-battle.json` | `turnLimit` | 12 | PROG-2-9425 |
|  | `moraleOnVictory` | 2 | PROG-2-9425 |
|  | `engineerBombardDamage` | 15（每隊每回合，合併一次扣） | PROG-2-9429 |
|  | `engineerReinforcePerTurn` | 1 | PROG-2-9429 |
| `assets/resources/data/year-end-defense.json` | `tiers[].encounterId` / `fromYear` | defense-tier-1／2／3 起用年度 1／3／5（暫定） | PROG-2-9426 |
| `assets/resources/data/encounters.json` | `defense-tier-1/2/3` 的 `battleKind`、`enemyInitialDeployment`、`turnLimit`（選填，覆蓋設定檔） | 見第 2 節 | PROG-2-9425、9426、9429 |

程式對應：`assets/scripts/core/systems/DefenseBattle.ts`（設定解析、守方陣營、回合上限、結果分級）、`assets/scripts/core/systems/YearEndDefense.ts`（年度選檔、欠守城判定、最強鄰國）、`assets/scripts/core/managers/GameSession.ts`（`applyDefenseDefeat`、`recordBattle`）。

現況不在 JSON 的數值（見第 11 節）：敗北民心 −3（`CityEconomy.ts` `MORALE_DELTA.defenseDefeat`）、大敗人口 −3%（`DEFENSE_ROUT_POPULATION_LOSS`）、城寨 500（`FortressBarView.ts` `FORTRESS_MAX_HP`）。

## 10. 測試與驗收

- 單元：`tests/DefenseBattle.test.ts`、`tests/YearEndDefense.test.ts`、`tests/YearEndSaveLoad.test.ts`、`tests/YearEndSession.test.ts`（守方鏡像、一般攻城不變、結算民心與大敗判定、設定解析、依年度選檔、最強鄰國、存讀檔保留年份）。
- 實機（7456）：守城開場、撐滿 12 回合勝利（民心 +2）、城寨失守（民心 −3）、大敗（人口 −3%）、第 4 季直接進守城、結算無再戰鈕、返回後換年；三檔模擬回合數（第 7／6／5 回合失守、清工兵守滿剩 320）。
- 來源：PROG-2-9425、9426、9429。
