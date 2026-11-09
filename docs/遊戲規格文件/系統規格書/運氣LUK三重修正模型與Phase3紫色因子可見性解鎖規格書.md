<!-- doc_id: doc_spec_0559 -->
# 運氣LUK三重修正模型與Phase3紫色因子可見性解鎖規格書

## 1. 模組職責與架構定位
本規格書規範武將第六維屬性「運氣（`LUK`）」對遊戲全域的三重機率加成模型（學府培育事件、戰場因子覺醒、世代遺傳進池），以及紫色天命因子在角色達到「Phase 3（Lv46+）」時的可見性遮罩解鎖狀態機。

```
                       ┌───────────────────────────────┐
                       │     Luck Modifier Engine      │
                       └───────────────┬───────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        ▼                              ▼                              ▼
┌───────────────┐              ┌───────────────┐              ┌───────────────┐
│ Nurture Event │              │ Fact Awaken   │              │ Gene Inherit  │
│ Bonus (+10%)  │              │ Speed (x1.3)  │              │ Bonus (+12.5%)│
└───────────────┘              └───────────────┘              └───────────────┘
```

## 2. Phase 3 紫色因子可見性解鎖狀態機

### 2.1 等級門檻與視覺遮罩
紫色天命因子屬於天道秘辛，受嚴格的玩家與武將等級分層管轄：
- **Lv 1 ~ 45（Phase 1 與 Phase 2）**：UI 介面（包含六角圖 `FactorHexGraphic` 與武將詳情 `GeneralDetailStatsChild`）統一顯示為佔位遮罩：
  `UI_GENE_LOCKED: ??? (Lv46 解鎖)`。
- **Lv 46+（Phase 3 啟動）**：遮罩自動破除，顯示真實紫色因子名稱、天命星等（★1 ~ ★5）以及專屬特效粒子。

```typescript
export interface FactorVisibilityState {
  isRevealed: boolean;
  displayLabel: string;
  geneLevelText: string;
}

export function resolvePurpleFactorVisibility(
  generalLevel: number,
  geneName: string,
  starLevel: number
): FactorVisibilityState {
  const PHASE_3_LEVEL_THRESHOLD = 46;
  if (generalLevel < PHASE_3_LEVEL_THRESHOLD) {
    return {
      isRevealed: false,
      displayLabel: '??? (Lv46 解鎖)',
      geneLevelText: '??'
    };
  }
  return {
    isRevealed: true,
    displayLabel: geneName,
    geneLevelText: `★${starLevel}`
  };
}
```

## 3. LUK 屬性全域三重修正演算法

`LUK` 屬性區間為 $0 \sim 100$（基準中位值為 50）。高於基準值時提供正向機率加乘，低於 50 則不倒扣保底效益：

### 3.1 培育幸運事件觸發率修正
在 36 回合學府培育中，正向事件（請益、頓悟、破障）的額外觸發加成：
$$\text{LUK\_Delta} = \max(0, \text{LUK} - 50)$$
$$\text{BonusEventRate} = \min\left(0.10, \text{LUK\_Delta} \times 0.002\right)$$
當 $\text{LUK} = 100$ 時，提供全額 $+10\%$ 的額外奇遇觸發機率。

### 3.2 戰場特定動作因子覺醒速度修正
在實戰中武將執行爆擊、擊破、絕境等動作時，觸發未解鎖因子碎鎖的乘法倍率：
$$\text{AwakenSpeedMultiplier} = 1.0 + \min\left(0.30, \frac{\text{LUK}}{100} \times 0.30\right)$$
當 $\text{LUK} = 100$ 時，覺醒倍率為 $1.30\times$（提升 30% 覺醒速度）。

### 3.3 祖譜世代因子進池繼承率修正
配種繁衍與世代交替時，高階因子（★3 以上）成功進入子代基因池的加算修正：
$$\text{InheritBonus} = \min\left(0.125, \text{LUK\_Delta} \times 0.0025\right)$$
當 $\text{LUK} = 100$ 時，進池率額外獲得 $+12.5\%$ 的加算補正。

```typescript
export interface LuckModifiers {
  bonusEventRate: number;        // [0.0, 0.10]
  awakenSpeedMultiplier: number; // [1.0, 1.30]
  inheritBonus: number;          // [0.0, 0.125]
}

export function computeLuckModifiers(luk: number): LuckModifiers {
  const boundedLuk = Math.max(0, Math.min(100, Math.round(luk)));
  const delta = Math.max(0, boundedLuk - 50);
  return {
    bonusEventRate: Math.min(0.10, delta * 0.002),
    awakenSpeedMultiplier: Number((1.0 + Math.min(0.30, (boundedLuk / 100) * 0.30)).toFixed(4)),
    inheritBonus: Math.min(0.125, delta * 0.0025)
  };
}
```

## 4. 單元測試驗證規範
1. **TC-LUK-01（Lv46 遮罩臨界翻轉）**：等級 45 時遮罩為 `??? (Lv46 解鎖)` 且 `isRevealed = false`；等級 46 時正確揭露因子名稱與星等。
2. **TC-LUK-02（基準運氣 50 零加成檢驗）**：當 LUK 為 50 時，`bonusEventRate` 為 0，`inheritBonus` 為 0，`awakenSpeedMultiplier` 為 1.15。
3. **TC-LUK-03（極限運氣 100 封頂檢驗）**：當 LUK 為 100 時，`bonusEventRate` 精確為 0.10（10%），`inheritBonus` 精確為 0.125（12.5%），`awakenSpeedMultiplier` 為 1.30。
