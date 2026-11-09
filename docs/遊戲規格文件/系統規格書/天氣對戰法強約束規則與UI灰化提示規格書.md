<!-- doc_id: doc_spec_0388 -->
# 天氣對戰法強約束規則與UI灰化提示規格書

## 1. 核心定位與設計理念
本規格書定義《三國人生》戰場環境氣象（Clear、Rain、Fog、Thunder、Windy、Night）對戰法施放、全域傷害倍率與遠程射擊之強制性約束法則（WBS `APT-07`，代碼落位於 `WeatherTacticRestriction.ts`、`BattleSkillDispatcher.ts` 與 `BattleTacticBehavior.ts`）。
戰鬥系統將氣象自單純的視覺背景提升為具有絕對支配力之戰術維度，強制實現「天時不可違」之沉浸式博弈體驗。

```
              ┌──────────────────────────────────────────────┐
              │          WeatherTacticRestriction 氣象約束     │
              └──────────────────────┬───────────────────────┘
          ┌──────────────────────────┼──────────────────────────┐
          ▼                          ▼                          ▼
   【火計強約束 (Fire)】      【水攻強約束 (Flood)】     【遠程射程與命中】
   • 雨/霧/雷: 強制禁用       • 雨天: 淹沒深度 +1 格      • 雨/霧/夜: 命中 -20%~-30%
     HUD 灰化 + 攔截 Toast    • 轉晴: 動態還原原地貌      • 大風: 射程 -2 格
   • 大風: 傷害爆發 ×2.0
```

---

## 2. 火計類戰法天候強約束矩陣

火計判定依據戰法設定檔中的 **`tags`** 標籤陣列是否包含 **`fire`**（`isFireTactic(tags)`）進行通用判定，不綁定單一戰法 ID。

### 2.1 禁用天候與三重阻絕協議
當戰場天候處於 **雨天 (Rain)**、**大霧 (Fog)** 或 **雷暴 (Thunder)** 時，火計全面受阻：
1. **戰場 HUD 按鈕灰化**：下排戰法操作面板自動進入禁用遮罩狀態（Disabled Mask），降低不透明度至 40%，阻斷主動選取意圖。
2. **防呆點擊反饋**：若玩家強行點擊灰化戰法圖標，立即彈出系統防呆 Toast 提示：
   $$\text{ToastText} = \text{「當前天氣不符合施放限制」} \quad (\text{WEATHER\_RESTRICTION\_TOAST})$$
3. **調度層雙重攔截**：即便腳本或自動戰鬥發送 `executeBattleSkillRequest`，`BattleSkillDispatcher` 亦於第一步攔截並拒絕執行，回傳結構：
   $$\text{applied} = \text{false}, \quad \text{blockedReason} = \text{'weather-restricted'}$$
   並將提示文案即時寫入戰鬥紀錄記錄（`battleLogLines`）。

### 2.2 大風天候（Windy）助燃爆發
當天候為 **大風 (Windy)** 且成功施放帶有 `fire` 標籤之戰法時，火勢借風力激增：
$$\text{DamageMultiplier} = \begin{cases} \mathbf{2.0}, & \text{天氣為 } \text{Windy} \text{ 且帶 } \text{fire} \text{ 標籤} \\ 1.0, & \text{其他天候或無 } \text{fire} \text{ 標籤} \end{cases}$$

---

## 3. 水攻戰法雨天擴大與動態地貌還原

場景戰法「水攻（`flood-attack`）」與大自然降水緊密連動：

### 3.1 雨天淹沒範圍擴大
- **基礎河道推進**：於晴天時水攻預設淹沒指定橫列之河道深度。
- **雨天暴雨延伸**：當戰場天候為 **雨天 (Rain)** 時，河道深度自動向敵軍深處額外延伸 **1 格**：
  $$\text{DepthBonus} = 1 \quad (\text{RAIN\_FLOOD\_DEPTH\_BONUS})$$
  使洪水能穿透原本安全之次深防線。

### 3.2 天候變化動態地貌即時重算
戰場排程器（`WeatherSchedule`）轉動導致天候切換時，`refreshFloodAttackTerrain` 即時重算河道範圍：
- **雨轉晴**：水位退卻，受雨水額外淹沒之 Depth 格位立即還原為戰前原始地形（例如原先之山地或平原），消除河流屬性。
- **晴轉雨**：水位再度上漲，動態覆蓋原地形為水域（River）。

---

## 4. 全局遠程命中與射程天候修正（PROG-2-1460）

氣象對遠程拋射與視野觀測具有全局物理削弱，作用於所有遠程部隊：

| 天氣 (Weather) | 遠程命中修正 (`weatherRangedHitDelta`) | 遠程射程修正 (`weatherRangedRangeDelta`) | 戰術影響說明 |
| :--- | :---: | :---: | :--- |
| **晴天 (Clear)** | 0% | 0 | 正常視野與行進軌跡 |
| **雨天 (Rain)** | **-20% (-0.20)** | 0 | 雨幕遮蔽視線，箭矢受阻落空 |
| **大霧 (Fog)** | **-30% (-0.30)** | 0 | 濃霧封鎖目標，遠程精度大幅下滑 |
| **夜戰 (Night)** | **-25% (-0.25)** | 0 | 昏暗環境難以索敵，命中受抑 |
| **大風 (Windy)** | 0% | **-2 格** | 強逆風阻礙飛行，遠程射程強制縮短 2 格 |
| **雷暴 (Thunder)** | 0% | 0 | 主要是轟雷音震懾，不扣常規拋射命中 |
