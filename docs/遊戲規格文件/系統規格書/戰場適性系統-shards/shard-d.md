# 戰場適性系統規格書（分片索引） — K–Q 天氣代碼、季節機率、劇情固定、排程、戰前顯示、JSON、驗收（PROG-2-9733）

> 這是 `戰場適性系統.md` 的「K–Q 天氣代碼、季節機率、劇情固定、排程、戰前顯示、JSON、驗收（PROG-2-9733）」分片。完整索引見 `docs/遊戲規格文件/系統規格書/戰場適性系統.md`。

## K. 天氣代碼總表與舊碼對照

> PROG-2-9733。本章與 §F 天氣適性效果、天氣強約束互補：§F 管效果，本章管代碼與資料來源。

| 中文 | 規格代碼 | 程式 enum（shared/CommonEnums.ts） | 舊資料碼對照 | 進隨機池 |
|---|---|---|---|---|
| 晴天 | SUNNY | Weather.Clear | clear | 是 |
| 雨天 | RAINY | Weather.Rain | rain、RAIN、snow | 是 |
| 大霧 | FOG | Weather.Fog | fog | 是 |
| 大風 | WINDY | Weather.Windy | sandstorm | 是 |
| 夜戰 | NIGHT | Weather.Night | night | 否（只能由劇本指定） |
| 雷暴 | THUNDER | Weather.Thunder | 無 | 是 |

- 讀入一律經 `normalizeWeather()`；認不得的字串視為「沒有值」。
- 資料檔（encounters.json 等）只寫規格代碼；`RAIN` 已改為 `RAINY`（theme-flood-fancheng）。
- 沒有雪天：冬季以大霧代替。

## L. 季節天氣機率表

整場戰鬥的天氣若不是劇本指定，依「開戰時的季」從下表按權重抽一種（總 PM 2026-11-22 裁決：晴天每季至少 50%，只用既有天氣種類）。

| 季（GameClock.currentSeason） | SUNNY | RAINY | FOG | WINDY | THUNDER |
|---|---|---|---|---|---|
| 春（1） | 50 | 25 | 15 | 10 | - |
| 夏（2） | 50 | 30 | - | 5 | 15 |
| 秋（3） | 50 | 10 | 10 | 30 | - |
| 冬（4） | 50 | 5 | 30 | 15 | - |

- 權重為相對值，目前每季加總 100，數字只放 `battle-weather-season.json`，程式不寫死。
- NIGHT 不進隨機池，只能由劇本指定。
- 季節來源：`core/systems/GameClock.ts` 的 `GameTimeState.currentSeason`（1～4）。`shared/foundation/GameClock.ts` 只做季序算術（SeasonStamp，給 API 伺服器端用），不是狀態來源。
- 抽取種子 = 年-季-關卡 ID：同一年同一季同一關永遠抽到同一種，戰前顯示與戰場必然一致，也不能靠重開刷天氣。

## M. 劇情關固定天氣

- 關卡（encounter）的 `weather` 欄位有值（認得的代碼）就固定使用，不抽；有 `weatherSchedule` 的關卡也視為劇本指定，照舊行為。
- 欄位沒值（省略、空字串、認不得）才依 §L 抽。目前 extreme-lu-bu、extreme-cao-cao、extreme-guan-yu 沒填，依季節抽。
- 範例（待赤壁關建立後套用，本次不新增關卡內容）：赤壁之戰 `"weather": "WINDY"`（東風）。
- 沒有季節資料（表缺、季不在 1～4、權重全為 0）時回 SUNNY。

## N. 天氣排程與變化

優先順序由高到低：
1. 天氣道具覆寫（祈風令→WINDY、祈雨符→RAINY，使用當回合起 3 回合，見 WeatherItem.ts）。
2. 關卡的 `weatherSchedule`（依回合區間）。
3. 本場天氣（§M 固定或 §L 抽出）。

- 整場天氣固定，不中途自然切換；道具到期後回到上一層的天氣。
- 抽出的結果在進戰場前就決定，經 `BattleEntryParams.weather` 傳入戰場。

## O. 戰前天氣顯示

- 出征前的戰前偵查面板，「核心機制」標題同一行後接：`天氣：大霧（遠程命中 -30%、火計禁用）`。
- 環境偵察（任務詳情 `envScoutWeatherLine`，MissionDetailPresenter）有戰場天氣時顯示同一行；一般任務沒有戰場天氣，維持「風險・期限」。
- 效果描述從現有效果數值產生（WeatherTacticRestriction 的命中、射程、火計、水攻規則），不寫死文字；晴天等無特殊效果只寫「天氣：晴天」。
- 戰前顯示與戰場 `BattleState.weather` 必須是同一個值。

## P. JSON 格式與驗證規則

`assets/resources/data/battle-weather-season.json`：

- `version`、`defaultWeather`（SUNNY）、`randomExcluded`（["NIGHT"]）、`drawRule`（說明用）。
- `seasons`：鍵 "1"～"4"，每季 `label` 與 `weights`（天氣代碼 → 非負數）。
- 驗證（`validateBattleWeatherSeasonTable`，資料壞了拋錯，不默默改結果）：天氣代碼須為規格六碼；NIGHT 必須在 randomExcluded 且不得出現在權重；季節鍵只能 1～4；權重不得為負、每季總和須大於 0。

## Q. 驗收標準

1. 四季各抽 1000 次（固定種子），比例與 §L 相差在 5 個百分點內；NIGHT 出現 0 次。
2. 關卡 `weather` 有值時永遠使用該值；沒值才依季抽；沒有季節資料回 SUNNY。
3. 戰前偵查面板與戰場 `BattleState.weather` 一致。
4. 戰前顯示的效果描述與 §F 數值相符，且由程式從數值產生。
5. 天氣道具仍覆寫 3 回合，之後回到本場天氣。
6. 待辦（本次不做）：雷暴機械 30% 損毀與士氣 -20、赤壁關內容、天氣適性數值表。

---