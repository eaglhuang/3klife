<!-- doc_id: doc_spec_0393 -->
# 戰鬥AI動態難度自適應微調與提示文案規格書

## 1. 核心定位與設計理念
本規格書定義《三國人生》依據玩家連續戰鬥表現（連勝或連敗）動態微調敵方 AI 強度縮放係數之自適應平衡系統（WBS `AIS-11`，代碼落位於 `AiAdaptiveDifficulty.ts`）。
本系統作為動態遊戲難度調節（Dynamic Difficulty Adjustment, DDA）機制，旨在防止玩家因連續挫敗產生挫折流失，或因持續碾壓失去策略博弈樂趣，並透過戰鬥開場戰報提示建立沉浸式軍事因果反饋。

```
              ┌──────────────────────────────────────────────┐
              │          AiAdaptiveDifficulty 自適應調節器    │
              └──────────────────────┬───────────────────────┘
                                     │ 戰鬥結算寫入存檔
          ┌──────────────────────────┴──────────────────────────┐
          ▼                                                     ▼
   【連勝連敗計數 (Streak)】                             【動態倍率縮放 (Scale)】
   • 連續 3 勝: 敵方縮放 +0.1                           • 基礎倍率 ± 0.1
   • 連續 3 敗: 敵方縮放 -0.1                           • 強制截斷於 [0.7, 2.5] 區間
   • 平手/平局: 計數清零                                • 觸發開戰提示文案 (G-2)
```

---

## 2. 連續勝負狀態機與存檔契約

### 2.1 戰績計數更新狀態機（`nextAiAdaptiveStreak`）
戰鬥結束時，依據結算結果（`AdaptiveBattleResult`）原子更新連勝連敗記錄：
- **`player-win`（玩家獲勝）**：$\text{consecutiveWins} = \text{consecutiveWins} + 1, \quad \text{consecutiveLosses} = 0$
- **`enemy-win`（敵軍獲勝）**：$\text{consecutiveLosses} = \text{consecutiveLosses} + 1, \quad \text{consecutiveWins} = 0$
- **`draw`（戰鬥平手）**：$\text{consecutiveWins} = 0, \quad \text{consecutiveLosses} = 0$（打斷連勝連敗，雙邊計數歸零）。

### 2.2 存檔結構（`aiAdaptiveStreak`）
計數保存在存檔根層級之選用欄位中，向下相容舊版存檔：
```json
{
  "aiAdaptiveStreak": {
    "consecutiveWins": 3,
    "consecutiveLosses": 0
  }
}
```
- **讀取正規化（`normalizeAiAdaptiveStreak`）**：若讀取時欄位缺失、型別非物件、非整數或小於 0，一律安全回退為預設空狀態 `{ consecutiveWins: 0, consecutiveLosses: 0 }`。

---

## 3. 動態難度縮放計算與數值邊界（`adaptiveScaleOf`）

### 3.1 觸發條件與階梯步進
- **連勝/連敗門檻**：$\text{ADAPTIVE\_STREAK\_THRESHOLD} = \mathbf{3}$（連續達成 3 場始觸發調整）。
- **調整步進幅度**：$\text{ADAPTIVE\_STEP} = \mathbf{0.1}$（每次微調 10 個百分點）。

### 3.2 截斷天花板與地板限制
計算公式如下，四捨五入至小數第二位，並嚴格截斷於安全範圍內：
$$\text{scale} = \text{baseScale} + \begin{cases} +0.1, & \text{consecutiveWins} \ge 3 \\ -0.1, & \text{consecutiveLosses} \ge 3 \\ 0, & \text{其他} \end{cases}$$
$$\text{AdaptiveScale} = \min(2.5, \max(0.7, \text{round}(\text{scale}, 2)))$$

- **動態地板（`ADAPTIVE_SCALE_MIN`）**：$\mathbf{0.70}$（避免難度下調過度導致戰鬥完全喪失挑戰性）。
- **動態天花板（`ADAPTIVE_SCALE_MAX`）**：$\mathbf{2.50}$（防止難度上調失控導致數值膨脹崩盤）。

---

## 4. 開戰戰情報告提示文案（`adaptiveHintOf`）

當偵測到自適應縮放倍率發生調整時，戰鬥開局階段於戰報日誌與畫面上方彈出提示 Toast：

| 自適應狀態 | 判定條件 | 提示文案 (`adaptiveHintOf`) | 劇本戰場意向詮釋 |
| :--- | :--- | :--- | :--- |
| **難度上調** | $\text{adaptiveScale} > \text{baseScale}$ | **「敵軍增援抵達，敵方士氣高漲！」** | 展現敵軍精銳集結、軍容鼎盛之警訊 |
| **難度下調** | $\text{adaptiveScale} < \text{baseScale}$ | **「敵軍糧草不濟，士氣低落。」** | 呈現敵軍後勤斷絕、軍心渙散之戰機 |
| **維持基準** | $\text{adaptiveScale} = \text{baseScale}$ | `null`（不顯示任何提示） | 常規平衡交鋒狀態 |
