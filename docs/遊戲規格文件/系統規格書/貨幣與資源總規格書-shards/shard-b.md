<!-- doc_id: doc_spec_1307 -->
# 貨幣與資源總規格書（分片索引） — 4–9 糧草改名、持有者、欄位對照、驗收、實作卡、待決，與變更記錄

> 這是 `貨幣與資源總規格書.md` 的「4–9 糧草改名、持有者、欄位對照、驗收、實作卡、待決，與變更記錄」分片。完整索引見 `docs/遊戲規格文件/系統規格書/貨幣與資源總規格書.md`。

## 4. 糧食改名為糧草（全面）

- **玩家可見文字**（UI 字串、劇情、任務、說明書）一律「糧草」。`ResourceCap.ts` 的 `RESOURCE_LABELS.food` 已是「糧草」，其餘殘留依 §7 清單改。
- **內部欄位**：標準 id 是 `food`；`grain` 在邊界轉成 `food`（讀取時別名轉換，寫出時一律 `food`）。
- **舊存檔遷移**：存檔版本升一版；載入舊檔時 `grain → food`、`silver`（舊 `_missionWallet.gold` 語意）依 §6 轉入家族庫房；遷移後寫回新版，並寫一筆 `currency.migrated` 稽核事件。遷移必須冪等（重跑不重複加值）。

## 5. 持有者與框架接入

| 框架 | 接入 |
|---|---|
| 物品庫存（1184） | `wallet.currencies` 的持有者：`shogunate` 持 `gold/food/troops/fame`，`household` 持 `silver`；`resource-def.v1` 的 `holderKind` 欄位決定 |
| 買賣商店（1183） | 公庫商店付金，家族商店付銀兩；`shop-def.currency` 只能填本表的 id 或帳號級代幣 id |
| 獎勵（1186） | `reward-bundle.v1` 的資源項寫標準 id；`silver` 發給家族庫房，`gold` 發給公庫 |
| 任務（1185） | 任務獎勵與花費一律用標準 id；舊任務資料的 `silver` 沿用本檔語意（家族銀兩），舊 `grain` 讀入時轉 `food` |
| 占用（1242） | 無貨幣關係，只有「家業佔用人手」 |

## 6. 程式欄位對照（查 cross-ref-code，不寬搜）

| 位置 | 現況 | 遷移 |
|---|---|---|
| `core/systems/ResourceCap.ts` | `BaseResourceKey = food/gold/troops/fame`，標籤已「糧草」，金標籤「黃金」 | 金標籤改「金」；新增 `silver` 的家族庫房上限（只讀） |
| `core/managers/GameSession.ts` | `_military.food`（糧）、`wallet.gold`（金）、`_missionWallet.gold()`（任務銀兩）；`hallMissionStock` 的 grain=food、silver=_missionWallet | 抽出 `ClanTreasury`（家族庫房），`_missionWallet` 改持銀兩；`gold` 只剩公庫 |
| `core/mission/MissionTypes.ts` | `MissionResourceKey = 'grain'｜'troops'｜'silver'` | 在 `MissionDefinitionParser` 邊界把 `grain` 轉 `food`；`silver` 保留，語意改為家族銀兩 |
| `core/systems/HallMissionData.ts`、`HallMissionActions.ts`、`HallMissionRules.ts` | 任務 `grain/silver` 收益 | 同上，邊界轉換；收益 `silver` 入家族庫房 |
| `core/systems/DomesticTasks.ts`、`DailySubsidy.ts`、`DispatchJobs.ts`、`GovernanceEvents.ts`、`RivalAiDiplomacy.ts` | 直接用 `food` 與 `gold` | `food` 不變；`gold` 確認屬公庫用途（外交、征兵），家業類收益改走銀兩 |
| `core/services/PlayerSaveTableRows.ts` | 存檔欄位 | 加 `silver`、版本升一版（§4） |
| `assets/resources/data/missions/domestic/*.json` | 殘留 `糧食` 字樣 | 全改「糧草」 |

## 7. 驗收（總規格層）

1. 玩家可見字串搜不到「糧食」（`check-no-legacy-food-label` 檢查腳本，納入 compute-gate）。
2. 轉移命令：額度、禁區、`idemKey` 重送不重複、功勳變化與俸祿發放與 §3 表一致，且不存在公庫金直接兌銀兩的路徑。
3. 舊存檔載入後：`grain` 全轉 `food`、銀兩進家族庫房、金不變；重複載入不重複加值。
4. 公庫商店只扣金，家族商店只扣銀兩；跨用被拒（E303 幣別不符，沿用 1182 錢包碼）。
5. 武將資料不出現貨幣欄位。

## 8. 實作卡切分

| 卡 | 內容 | 依賴 | 驗收 |
|---|---|---|---|
| CUR-1 | `resource-def.v1`（金、銀兩、糧草、兵力、名望）＋持有者表＋糧食→糧草的字串、資料全面改名（含檢查腳本） | 1184 的 ITM-M | §7 第 1、5 條；`check-no-legacy-food-label` 綠 |
| CUR-2 | 家族庫房 `ClanTreasury`＋`_missionWallet` 改持銀兩＋存檔升版與冪等遷移（§4、§6） | CUR-1 | §7 第 3 條；單元測試覆蓋舊檔三種型態 |
| CUR-3 | `treasury.donate`、`treasury.stipend`（捐獻換功勳、國家發俸祿；11/22 起取消 divert）＋`transfer-rules.v1.json`＋API／本機 adapter | CUR-2、1182 §5 | §7 第 2 條；民心／忠誠變化對得上表 |
| CUR-4 | 家業、學府、婚嫁等包裝改用銀兩；公庫商店與家族商店分貨幣 | CUR-2、SHP-BASE（1183）、1181 | §7 第 4 條 |

## 9. 待使用者決定的大方向

1. 轉蛋貨幣（免費銅錢符、求籤令）與銀兩是否永遠完全分開？PM 預設：**完全分開**，銅錢符不可兌銀兩，以免繞過轉蛋保底設計。

## 變更記錄

- 2026-11-22：使用者 2026-11-22 裁決改寫 §1 第 3 條、§3：家族捐銀兩換功勳、國家發俸祿給家族、國庫的金不能直接搬回家；作廢 `treasury.divert` 挪用規則；數值待企劃（Antigravity）。任務卡 PROG-2-9733。
