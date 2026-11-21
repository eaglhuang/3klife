# 獎勵系統Base框架規格書（分片索引） — 4–10 共用 API、包裝接入、依賴、遷移、實作卡、驗收、待決

> 這是 `獎勵系統Base框架規格書.md` 的「4–10 共用 API、包裝接入、依賴、遷移、實作卡、驗收、待決」分片。完整索引見 `docs/遊戲規格文件/系統規格書/獎勵系統Base框架規格書.md`。

<!-- doc_id: doc_spec_1262 -->

## 4. 共用 API（介面草案）

```ts
interface IRewardService {
  // 內容層
  roll(poolId: string, ctx: RewardCtx, rng: RandomSource): GrantPlan;          // 抽出結果（含保底推進）
  fixed(bundleId: string, ctx: RewardCtx): GrantPlan;                          // 固定獎／懲罰
  scale(plan: GrantPlan, mul: { reward?: number; risk?: number }): GrantPlan;  // 等階與倍率縮放（沿用任務 rewardMul／riskMul）
  // 結算層
  settle(plan: GrantPlan, target: HolderRef): SettleResult;                    // 先入帳：道具→IItemStore.apply，其餘→宿主 handler；原子
  // 演出層
  present(plan: GrantPlan, override?: PresentationBinding): Promise<void>;     // 轉交演出系統播放；可跳過
}
interface IEffectHandlerRegistry { register(kind: string, h: (e: ResolvedEffect, ctx: RewardCtx) => EffectResult): void; }
interface IPresentationRegistry  { register(type: string, module: GrantPresentationModule): void; }  // 擴充新演出
```

規則：
1. **先結算、後演出**：`settle` 成功才算給獎，演出只是回放已定結果；演出被跳過、中斷、閃退重進，帳目都不變。
2. 抽取必須可重現：隨機源由呼叫端傳入（戰場用戰場種子，本機用存檔種子），保底計數器存存檔。
3. 道具類效果一律進 `IItemStore.apply`，帶 `source=REWARD`、`sourceRef=poolId`。
4. 容量不足時依物品庫存的 `overflow` 規則處置（預設轉信箱），不得丟棄獎勵。
5. 懲罰上限（例如單次不可扣超過某比例）由 `reward-bundle` 的 `cap` 欄位宣告，帳本截斷時記入 trace。
6. 演出類型缺少實作時退回 `instant`，並寫 error log，不得吞掉獎勵。

## 5. 各包裝如何只用差異設定接入

1. **任務結算（成敗四級）**：任務定義只寫「成敗樹」與各級對應的 `bundleId`／`poolId`（如 critical→`POOL_*_CRIT`、disaster→`BUNDLE_*_FAIL`），結算時呼叫 `fixed／roll`＋`scale`。現有任務核心的 `MissionEffect` 帳本與 rewardMul／riskMul 就是本系統效果帳本的前身。
2. **極限任務掉落**：一份 `reward-pool`，權重 40／30／20／10（銅錢、高粱、戰法筆記、活力丹），`presentation=chest`。對應既有 `ExtremeTaskDrop`。
3. **歷練四路大富翁（子嗣十歲歷練 doc_spec_1180，9198 修訂）**：格子事件呼叫 `roll`；「自動走寶路、連續開寶」＝ `presentation.type=treasureRoad`，路徑長度與每格獎池寫在設定，格子本身不寫獎勵邏輯。
4. **轉蛋（使用者 11/21 裁決 #9）**：獎池＝卡池（SSR 3%、SR 10%、R 87%，UP 佔比 70%／80%），保底改為硬保底加軟保底（第 12.3 節），`presentation=gachaReveal`；扣款走商店與錢包；抽獎、權重、保底全由 `reward.roll` 計算，機率表由 `reward.pools` 產出。遷移見第 12 章。
5. **戰場戰利品與成就里程碑**：戰後一次性原子結算 (doc_spec_0603) 即 `settle` 的原子特性；里程碑獎（現有 `MilestoneRewards`、`LegacyAchievement` 的高級貨幣 100）改為 `fixed` 套件。
6. **幕府家業產出（9199）**：每季產出 `fixed` 套件，目標持有者為公庫。
7. **藏寶圖／骰子／轉盤（新活動）**：只新增 `grant-presentation` 設定與一個演出模組；獎池內容沿用現有獎池，不新增獎勵程式。

## 6. 與其他框架的依賴

- 依賴 **物品庫存**（入帳）與 **劇情（演出）**（播放給獎演出）。
- 被 **任務、商店、轉蛋、歷練、家業、戰場、劇情選項** 呼叫。
- 與 **技能**：`tacticLearn` 效果交技能系統學習判定（保底金戰法、TP 門檻仍由技能系統判定）。

## 7. 現有程式盤點與遷移建議

| 現有實作 | 位置 | 可否抽成 base | 說明 |
|---|---|---|---|
| 任務效果帳本、rewardMul／riskMul、成敗四級 | `core/mission/MissionTypes.ts`、`MissionResolver.ts`、`MissionBalance.ts` | 可，效果種類與帳本直接成為 `EffectLedger` | 任務核心（PROG-2-9144）已把「宿主逐項套用帳本」做好，是最成熟的前身 |
| 極限任務掉落 | `core/systems/ExtremeTaskDrop.ts` | 可，標準加權獎池 | `EXTREME_TASK_DROP_WEIGHTS` 直接轉 JSON |
| 轉蛋抽取與保底 | `core/systems/GachaDraw.ts`、`GachaSystem.ts`、`GachaLocalRules.ts` | 可抽出「加權＋保底」引擎；轉蛋專屬規則留設定／插件 | 見 Q1 |
| 里程碑與傳承獎 | `core/systems/MilestoneRewards.ts`、`LegacyAchievement.ts` | 可，改為固定套件 | |
| 戰場戰利品結算 | `core/systems/BattleAftermath.ts`、`StageSalvageSettlement.ts`（規格 doc_spec_0603） | 可 | 原子入庫對應 `settle` |
| 禮包與通行證發獎 | `core/systems/GiftBundle.ts`、`SeasonPass.ts`；`HallMissionLoop` 內的發獎 | 可，固定套件 | 家業規格 doc_spec_1181 §3.1 同樣指出：獎池、掉落、發獎、保底分散各處，沒有統一給獎演出與懲罰 |
| 俘虜搜繳傳家寶 | doc_spec_0429 規格 | 可，獎池＋條件 | |
| 許願池 | `core/systems/WishPool.ts` | 部分 | 免費許願軌屬獎勵＋保底 |
| 演出 | 轉蛋演出 `ui/core/GachaFullScreenPanel.ts`、`GachaFlowCoordinator.ts`、學府開獎 toast（`LobbyScene.showAcademyInheritDraw`） | 轉為演出模組 | 目前各畫面自帶演出，沒有共用「給獎演出」介面 |

遷移順序：(1) 先做 `IRewardService` 的內容層（獎池、固定套件、效果帳本），任務核心帳本直接接上；(2) `ExtremeTaskDrop` 改讀獎池；(3) 結算層接物品庫存；(4) 演出層介面與 `instant`／`chest` 兩個模組；(5) 轉蛋依使用者 11/21 裁決 #9 接入（細節與卡片切分見第 12 章）；(6) 新演出（藏寶圖、骰子、轉盤、寶路）逐一加模組。

## 8. 實作卡拆分建議（API 層排第一張，本框架 base 排第二張）

0. **前置 API-BASE**（總綱第 9 章第 1 張）：共通 API 層＋本機伺服器 adapter＋存檔走 API。本框架所有卡依賴它。
1. **RWD-BASE**：`reward-pool／reward-bundle` 型別、加權抽取＋保底、效果帳本、`settle`（先以假的物品庫存介面）＋單元測試。
2. 任務核心帳本接入（`MissionEffect`→效果帳本）。
3. 極限任務、里程碑改走獎池／套件。
4. 演出綁定介面與 `instant`、`chest` 模組（與演出系統 base 同步）。
5. 新演出模組：`treasureRoad`（歷練 9198）、`treasureMap`、`dice`、`wheel`。
6. 轉蛋接入（使用者 11/21 裁決 #9，卡片切分見第 12 章）。
7. 家業產出接入（待 9199）。

## 9. 驗收重點

- 新增一種獎池或獎勵套件只改 JSON；新增一種給獎演出只加一個演出模組，不動獎池。
- 同一組種子與保底計數，重現同一結果。
- 演出被跳過或中斷，帳目與已入庫物品不變。
- 懲罰與獎勵走同一帳本，截斷與縮放有 trace。

## 10. 待決題的裁決結果（2026-11-21 回寫）

標註：**使用者 11/21 裁決**＝使用者親自回答；**PM 裁決**＝依已定案大方向由總 PM 定案。

- **Q1 轉蛋與獎勵系統的關係：** **使用者 11/21 裁決 #9** 採 A：轉蛋 = 獎勵系統的一種。轉蛋**保留自己的畫面與演出**（含宿命池、紅顏池各自版面）；**抽獎、權重、保底改由 `reward.roll` 計算**；轉蛋專屬規則（雙重保底、同名轉換、單鍵十連、UP 佔比、宿命池每輪必含一位六大宿命名將）以獎池設定欄位與插件表達，扣款由商店包裝，演出用 `gachaReveal`。「所有轉蛋都是轉蛋系統的一池」（doc_spec_0042 §L）原則保持，只是底層改接 base。原 B、C 案作廢。
- **Q2 給獎預設演出：** **PM 裁決** A 預設 `instant`，高等階才自動升級為 `chest`；轉蛋池固定用 `gachaReveal`，不受此預設影響。
- **Q3 保底計數是否跨獎池共用：** **PM 裁決** A 每個獎池各自計數（轉蛋沿用「各池獨立計數」，doc_spec_0463）；同卡池的多條階梯以 `counterKey` 區分。
- **Q4 懲罰是否可被道具或特質減免：** **PM 裁決** A 可，以 `riskMul` 倍率表達（沿用任務現況）。
- **Q5 付費抽取類演出的機率公開方式（商業化）：** **使用者 11/21 裁決 #11** 公開完整機率表，每個池都有「機率說明」鈕，列出各等階與每個角色的機率及保底規則；資料由 `reward.pools` 產出，不准另外手寫。比 A 案（常駐顯示各等階）更嚴，取代 A、B、C。
- **Q6（新增）保底型式：** **使用者 11/21 裁決 #10** 硬保底，接近保底時機率漸升（soft pity）；公式與各池數值見第 12.3 節（數值由 PM 設計）。
