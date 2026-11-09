<!-- doc_id: doc_spec_0389 -->
# 戰場AI部隊部署節奏與相剋車道挑選決策規格書

## 1. 核心定位與職責邊界
本規格書定義《三國人生》敵方與委任 AI 在戰鬥大回合中的部隊部署決策體系（WBS `AIS-05`，代碼落位於 `AiDeployCount.ts`、`AiDeployTroopPick.ts` 與 `AiLaneStrategy.ts`）。
系統依據當前遊戲難度、戰鬥推進回合、敵我場上兵力分佈、智力等級（IQ）與 Profile 偏好，依序執行「部署數量計算 $\to$ 兵種剋制選定 $\to$ 空車道派駐」三階段決策管線。

```
              ┌──────────────────────────────────────────────┐
              │          AI Deploy Pipeline 部署決策管線       │
              └──────────────────────┬───────────────────────┘
                                     │
          ┌──────────────────────────┼──────────────────────────┐
          ▼                          ▼                          ▼
   【階段一：數量計算】       【階段二：兵種挑選】       【階段三：車道指派】
   • 每5回合 +1 支            • LOW: 隨機/偏好           • FOCUS_2_3 (中央3路)
   • 難度加成 difficultyBonus • HIGH: 35%~100% 剋制      • SCOUT_WEAK (薄弱防線)
   • 上限夾住 min(3, count)   • 場景 Preset 偏好覆蓋     • CAVALRY_CHARGE (衝鋒路)
```

---

## 2. 部署數量節奏計算模型（`AiDeployCount`）

AI 每回合可部署之部隊數量由當前戰鬥回合數與難度設定共同驅動：
$$\text{safeTurn} = \max(0, \lfloor \text{turn} \rfloor)$$
$$\text{turnBonus} = \lfloor \frac{\text{safeTurn}}{5} \rfloor$$
$$\text{DeployCount} = \min(3, 1 + \text{turnBonus} + \text{difficultyBonus})$$

1. **部署上限天花板**：單回合部署部隊數嚴格封頂為 **3 支**（`AI_DEPLOY_COUNT_CAP = 3`）。
2. **回合爬升階梯**：每持續交戰 5 回合，基礎部署配額增加 1 支（`AI_DEPLOY_TURNS_PER_BONUS = 5`）。
3. **保底防護**：第 1 回合在無難度加成下，保底至少部署 1 支部隊。

---

## 3. 兵種針對與偏好挑選模型（`AiDeployTroopPick`）

從 AI 當前陣營糧草所能負擔的兵種清單（`affordable`）中，挑選最優兵種：

### 3.1 智力（IQ）與剋制判定
1. **LOW IQ 盲目出兵**：完全不分析玩家部隊，不進行相剋檢定，直接進入偏好隨機池。
2. **NORMAL 及以上 IQ 剋制檢核**：
   - 分析玩家當前在場部隊中數量最多的兵種（`playerMostCommon`）。
   - 若 AI 之 Profile 標記為必定剋制（`preferCounter = true`，如策士型 Profile），或隨機擲骰 $< \text{counterChance}$（基準 35%）：
     - 遍歷買得起的兵種，若存在能剋制玩家主力的兵種（依五角相剋表 `counterMap`），**強制優先出陣該相剋兵種**。

### 3.2 Profile 與場景 Preset 偏好回退
若無相剋兵種可選或未觸發剋制，依「武將個人 Profile $\to$ 戰場場景 Preset $\to$ 全兵種隨機」順序回退：
- **森林埋伏（AmbushAttack）**：偏好機動與伏擊兵種（`CAVALRY`、`INFANTRY`）。
- **夜襲奇襲（NightRaid）**：偏好突刺爆發兵種（`CAVALRY`、`PIKE`）。
- **峽谷落石（RockSlide）**：偏好重裝前排兵種（`SHIELD`、`PIKE`）。
- **水淹七軍（FloodAttack）**：偏好水戰與步弓兵種（`INFANTRY`、`SHIELD`、`ARCHER`），避開低適性騎兵。
- **火燒偷襲（FireAttack）**：偏好高速穿插兵種（`CAVALRY`、`ARCHER`）。

---

## 4. 車道戰略指派矩陣（`AiLaneStrategy`）

自戰場 5 條車道（Lane 0~4）中尚有空間之空車道（`freeLanes`）挑選最優目標線：

| 路線策略代碼 (`AiLaneStrategy`) | 核心挑線邏輯 | 同分決策 |
| :--- | :--- | :--- |
| **`FOCUS_2_3`** | 鎖定中央三路（`[1, 2, 3]`），於中央路中挑選**己方部隊最少**之車道。若中央全滿則向兩側退回。 | 隨機 |
| **`SPREAD_5` / `ALL_5`** | 全戰場均衡佈局，挑選**己方部隊最少**之空線，分散兵力。 | 隨機 |
| **`SCOUT_WEAK`** | 針對弱點突擊，挑選**玩家部隊最少（防守最薄弱）**之車道強行推進。 | 隨機 |
| **`CAVALRY_CHARGE_1`** | 騎兵集火衝鋒，挑選**己方部隊最多**之車道（開局預設 Lane 2）；若已滿則挑選離衝鋒線**最近**之空線。 | 隨機 |
| **`EMPTIEST_1_2`** | 迂迴穿插，挑選**雙方在場部隊總和最少**之無人車道快速直撲敵後。 | 隨機 |
| **`null` / 未指定** | 無特殊戰略偏好，於可用空車道中均等隨機挑選。 | 隨機 |
