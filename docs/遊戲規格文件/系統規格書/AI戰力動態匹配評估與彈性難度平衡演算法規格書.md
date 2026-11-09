# AI戰力動態匹配評估與彈性難度平衡演算法規格書

<!-- doc_id: doc_spec_0611 -->

> 本規格書依據 WBS `AIS-09`（AI 戰力評估 evaluateAIPower 與難度匹配 ±20% 調整）制定，為關卡戰前戰力校準與橡皮筋動態平衡之單一真相來源（Single Source of Truth）。
> 核心約束：無副作用純邏輯架構、軍勢綜合戰力客觀評估公式、戰力差超越 ±20% 動態微調縮放、防無趣碾壓與絕望卡關、全繁體中文台灣慣用術語。

---

## 1. 業務定位與戰力動態平衡機制

為了維持戰鬥策略深度與遊戲沉浸感，系統在戰場載入前對玩家出征軍勢與 AI 敵軍進行綜合戰力（Combat Power, CP）評估。當戰力差距超過 $\pm 20\%$ 閾值時，系統自動啟動彈性難度微調（Rubber-Banding Scaling），適度調整敵方部隊攻防縮放係數。

```mermaid
flowchart TD
    Start[載入關卡軍勢配置] --> Eval[計算雙方綜合戰力 CP_Player 與 CP_AI]
    Eval --> Diff{戰力差比例 (CP_Player - CP_AI) / CP_AI}
    Diff -- 超過 +20% (玩家過強) --> BuffAI[微調: AI 攻防倍率向上微調 (最高 +15%)]
    Diff -- 低於 -20% (玩家過弱) --> NerfAI[微調: AI 攻防倍率向下微調 (最高 -15%)]
    Diff -- 介於 -20% ~ +20% --> Normal[標準難度: 縮放倍率保持 1.00]
    BuffAI --> Apply[套用最終關卡屬性至 BattleSceneLoader]
    NerfAI --> Apply
    Normal --> Apply
```

---

## 2. 綜合戰力（Combat Power）評估公式

軍勢綜合戰力由「主將五維與等級」、「兵力規模」、「裝備與虎符品質」三軸加權組成：

$$\text{CP} = \lfloor \text{CP}_{\text{stat}} \times 0.40 + \text{CP}_{\text{troops}} \times 0.35 + \text{CP}_{\text{tally}} \times 0.25 \rfloor$$

1. **屬性與等級戰力（$\text{CP}_{\text{stat}}$）**：
   $$\text{CP}_{\text{stat}} = (\text{STR} + \text{LEA} + \text{INT}) \times 2.0 + \text{Level} \times 50$$
2. **兵力規模戰力（$\text{CP}_{\text{troops}}$）**：
   $$\text{CP}_{\text{troops}} = \lfloor \text{CommandCapacity} \times 0.8 \rfloor$$
3. **虎符與裝備戰力（$\text{CP}_{\text{tally}}$）**：
   $$\text{CP}_{\text{tally}} = \sum (\text{TallyQualityRate} \times (1 + \text{Star} \times 0.1) \times 300)$$
   （品質係數：N=1.0, R=1.2, SR=1.5, SSR=2.0, UR=2.6）

---

## 3. 戰力差比例與難度縮放演算法

計算相對差距比率：

$$\Delta_{\text{power}} = \frac{\text{CP}_{\text{player}} - \text{CP}_{\text{ai}}}{\text{CP}_{\text{ai}}}$$

系統依據差距比率計算 AI 戰力調整乘數 $M_{\text{ai\_scale}}$：

$$M_{\text{ai\_scale}} = \begin{cases} 
1.00 + \min(0.15, (\Delta_{\text{power}} - 0.20) \times 0.5) & \text{若 } \Delta_{\text{power}} > 0.20 \\
1.00 - \min(0.15, (-\Delta_{\text{power}} - 0.20) \times 0.5) & \text{若 } \Delta_{\text{power}} < -0.20 \\
1.00 & \text{若 } -0.20 \le \Delta_{\text{power}} \le 0.20
\end{cases}$$

> **保護邊界**：無論戰力差距多懸殊，自動微調倍率 $M_{\text{ai\_scale}}$ 嚴格限制在 $[0.85, 1.15]$ 區間內，保障核心養成數值之成就感與關卡原始設計基調。

---

## 4. 資料模型與無副作用純函式

```typescript
export interface IArmyCombatProfile {
    readonly str: number;
    readonly lea: number;
    readonly int: number;
    readonly level: number;
    readonly troops: number;
    readonly tallyQualityScore: number; // 虎符裝備換算分
}

export function evaluateCombatPower(p: IArmyCombatProfile): number {
    const cpStat = (p.str + p.lea + p.int) * 2.0 + p.level * 50;
    const cpTroops = Math.floor(p.troops * 0.8);
    const cpTally = p.tallyQualityScore;
    return Math.floor(cpStat * 0.40 + cpTroops * 0.35 + cpTally * 0.25);
}

export interface ICombatPowerMatchResult {
    readonly playerCP: number;
    readonly aiCP: number;
    readonly powerDiffRate: number;
    readonly scaleMultiplier: number;
    readonly matchStatus: 'PLAYER_OVERPOWERED' | 'BALANCED' | 'PLAYER_UNDERPOWERED';
}

export function matchCombatPowerDifficulty(player: IArmyCombatProfile, ai: IArmyCombatProfile): ICombatPowerMatchResult {
    const playerCP = evaluateCombatPower(player);
    const aiCP = Math.max(1, evaluateCombatPower(ai));
    const powerDiffRate = (playerCP - aiCP) / aiCP;

    let scaleMultiplier = 1.00;
    let matchStatus: ICombatPowerMatchResult['matchStatus'] = 'BALANCED';

    if (powerDiffRate > 0.20) {
        const adjustment = Math.min(0.15, (powerDiffRate - 0.20) * 0.5);
        scaleMultiplier = 1.00 + adjustment;
        matchStatus = 'PLAYER_OVERPOWERED';
    } else if (powerDiffRate < -0.20) {
        const adjustment = Math.min(0.15, (-powerDiffRate - 0.20) * 0.5);
        scaleMultiplier = 1.00 - adjustment;
        matchStatus = 'PLAYER_UNDERPOWERED';
    }

    return {
        playerCP,
        aiCP,
        powerDiffRate,
        scaleMultiplier: Number(scaleMultiplier.toFixed(3)),
        matchStatus,
    };
}
```

---

## 5. 驗收測試案例（Test Cases）

| 測試編號 | 測試情境 | 輸入條件 | 預期輸出 |
|---|---|---|---|
| `TC-CP-01` | 勢均力敵標準區間 | 玩家 CP 5,000，AI CP 4,800（差距 +4.1%） | `matchStatus='BALANCED'`, `scaleMultiplier=1.00` |
| `TC-CP-02` | 玩家過強啟動 AI 增幅 | 玩家 CP 8,000，AI CP 5,000（差距 +60%） | `matchStatus='PLAYER_OVERPOWERED'`, `scaleMultiplier=1.15`（達上限） |
| `TC-CP-03` | 玩家落後啟動 AI 軟化 | 玩家 CP 3,000，AI CP 5,000（差距 -40%） | `matchStatus='PLAYER_UNDERPOWERED'`, `scaleMultiplier=0.90` |
| `TC-CP-04` | 臨界值精確判斷 | 差距恰好為 +20.0% | `scaleMultiplier=1.00`，不觸發調整 |
