<!-- doc_id: doc_spec_0515 -->
# 名將挑戰賽ELO積分計算模型與段位動態升降規格書

> **模組識別碼**：`TRN-07`  
> **系統歸屬**：名將挑戰賽（Tournament）積分與段位體系  
> **單一真相來源**：本規格書確立名將挑戰賽 ELO 排名積分計算模型（K=32）、勝率期望函數、非負保底約束與六階段位即時動態升降之唯一權威標準。

---

## 一、系統概述與架構原則

名將挑戰賽採用國際標準 ELO 等級分系統（Elo Rating System）評定玩家在非同步離線對抗中之真實競技水準。對局勝負直接觸發積分增減，段位隨積分實時升降，維持競技排名的公平性與流動性。

### Unity / 架構對照
- **積分計算中樞**：類似 Unity 中的 `EloRatingCalculator` 靜態純函式類別，不依賴 MonoBehaviour。
- **無浮點誤差**：最終得分嚴格取整數（`Math.round`），保證前後端計算確定性。

---

## 二、ELO 積分演算法與常數定義

### 1. 核心常數
```typescript
export const TOURNAMENT_ELO_CONFIG = {
    eloK: 32, // ELO 權重係數 K 值
} as const;
```

### 2. 勝率期望值與積分 Delta 計算公式
給定我方當前積分 $R_{\text{my}}$ 與對手當前積分 $R_{\text{opp}}$，我方勝率期望值 $E_{\text{my}}$ 為：

$$E_{\text{my}} = \frac{1}{1 + 10^{(R_{\text{opp}} - R_{\text{my}}) / 400}}$$

當系列賽結束時，依實際勝負結果 $S$（勝出 $S = 1$，失敗 $S = 0$）計算積分變動值 $\Delta R$：

$$\Delta R = \text{round}\left(K \times (S - E_{\text{my}})\right)$$

```typescript
export function tournamentEloChange(myRank: number, opponentRank: number, isWin: boolean): number {
    const safeMy = Math.max(0, myRank);
    const safeOpp = Math.max(0, opponentRank);
    const expected = 1 / (1 + Math.pow(10, (safeOpp - safeMy) / 400));
    const outcome = isWin ? 1 : 0;
    return Math.round(TOURNAMENT_ELO_CONFIG.eloK * (outcome - expected));
}
```

### 3. 非負整數夾取約束
更新後積分必須滿足非負邊界保護：

$$R_{\text{after}} = \max(0, R_{\text{my}} + \Delta R)$$

```typescript
export function applyEloChange(currentPoints: number, delta: number): number {
    return Math.max(0, currentPoints + delta);
}
```

---

## 三、六階段位實時動態升降狀態機

段位嚴格依照 $R_{\text{after}}$ 之分值範圍即時判定，不設置延遲緩衝或鎖段保護：

| 段位識別碼 (`RankTier`) | 中文名稱 | 分數區間 (`Points Range`) | 升降級規則 |
|---|---|:---:|---|
| `LEGEND` | 傳說 | $\ge 3000$ | 分數 $\ge 3000$ 即刻晉升 |
| `DIAMOND` | 鑽石 | $2500 \sim 2999$ | 掉落 $<2500$ 立即降為白金 |
| `PLATINUM` | 白金 | $2000 \sim 2499$ | 掉落 $<2000$ 立即降為黃金 |
| `GOLD` | 黃金 | $1500 \sim 1999$ | 掉落 $<1500$ 立即降為白銀 |
| `SILVER` | 白銀 | $1000 \sim 1499$ | 掉落 $<1000$ 立即降為青銅 |
| `BRONZE` | 青銅 | $0 \sim 999$ | 最低基礎段位，下限為 0 |

---

## 四、連勝計數（Win Streak）狀態流轉

```typescript
export interface StreakState {
    winStreak: number;     // 當前連勝
    bestWinStreak: number; // 本季最高連勝
}

export function updateStreak(current: StreakState, isWin: boolean): StreakState {
    if (isWin) {
        const nextStreak = current.winStreak + 1;
        return {
            winStreak: nextStreak,
            bestWinStreak: Math.max(current.bestWinStreak, nextStreak),
        };
    } else {
        return {
            winStreak: 0,
            bestWinStreak: current.bestWinStreak,
        };
    }
}
```

---

## 五、驗收條件與測試案例 (Test Cases)

- **TC-TRN-25（同分對決勝負）**：
  - 雙方積分皆為 1500，期望勝率 $E = 0.5$。獲勝增加 $\text{round}(32 \times 0.5) = +16$ 分；戰敗扣除 $\text{round}(32 \times (-0.5)) = -16$ 分。
- **TC-TRN-26（以弱勝強加分擴大）**：
  - 我方 1000 分擊敗 1400 分對手，分差 400 分，$E \approx 0.091$。獲勝增加 $\text{round}(32 \times 0.909) = +29$ 分。
- **TC-TRN-27（以強凌弱扣分懲罰）**：
  - 我方 2000 分敗給 1600 分對手，分差 $-400$ 分，$E \approx 0.909$。戰敗扣除 $\text{round}(32 \times (-0.909)) = -29$ 分。
- **TC-TRN-28（零分下限保底）**：
  - 當前積分為 10 分，戰敗計算應扣 16 分，結算後積分夾取為 0 分，禁止出現負數。
