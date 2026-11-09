<!-- doc_id: doc_spec_0344 -->
# 戰法TP點數消耗模型與綠色因子折半減免規格書

> **文件狀態**：單一真相來源（Single Source of Truth）  
> **系統代碼**：`NUM-10`、`SYS-TACTIC-TP-MODEL`  
> **核心職責**：確立全域 28 條基礎與名將戰法之戰術點數（TP: Tactical Points）消耗階梯模型、持有綠色特質因子時之折半減免公式（50% 折扣），以及最低保底約束。

---

## 1. 戰法 TP 點數階梯架構

武將於戰鬥中累積戰術點數（TP，上限 100 點），施放戰法須消耗對應 TP。戰法依威力與戰術定位劃分為四大階梯：

| 戰法位階 | TP 基礎消耗 ($\text{TP}_{\text{base}}$) | 典型戰法範例 | 戰術效果定位 |
|:---:|:---:|---|---|
| **基礎戰術 (Tier 1)** | 15 ~ 20 | 突擊、齊射、鼓舞、急救 | 單體小幅增益、基礎位移或牽制 |
| **精銳戰術 (Tier 2)** | 25 ~ 35 | 奮迅、火矢、偽報、連環 | 行列貫穿、屬性削弱、異常狀態賦予 |
| **陣線破壞 (Tier 3)** | 40 ~ 50 | 陷陣突破、水淹七軍、橫掃千軍 | 大範圍群體傷害、強制擊退、地形改變 |
| **絕殺奇謀 (Tier 4)** | 60 ~ 75 | 八陣圖、神火計、萬人敵 | 改變戰場氣候、全體強力控場、斬殺斬將 |

---

## 2. 綠色因子折半減免公式

### 2.1 減免計算算式
當出陣武將之遺傳因子槽（Gene Slots）中具備對應系別之**綠色特質因子**（如「兵貴神速」、「神算巧變」）時，該系戰法之最終 TP 消耗享有 50% 減免：
$$\text{TP}_{\text{final}} = \max\left(10, \; \left\lfloor \text{TP}_{\text{base}} \times \left(1 - M_{\text{green}}\right) \right\rfloor\right)$$

- **減免係數 ($M_{\text{green}}$)**：
  - 持有對應系別綠色因子：$M_{\text{green}} = 0.50$（直接減免 50%）
  - 無對應綠色因子：$M_{\text{green}} = 0.00$
- **保底消耗約束**：無論如何疊加，戰法最終消耗不得低於 **10 點 TP**（防止零消耗連續施放）。

---

## 3. 28 條核心戰法消耗基準表

```json
{
  "tacticTpDefaults": {
    "TAC_RUSH": { "tier": 1, "tpBase": 15, "geneType": "green_vanguard" },
    "TAC_VOLLEY": { "tier": 1, "tpBase": 20, "geneType": "green_archer" },
    "TAC_INSPIRE": { "tier": 1, "tpBase": 15, "geneType": "green_support" },
    "TAC_FIRE_ARROW": { "tier": 2, "tpBase": 30, "geneType": "green_stratagem" },
    "TAC_FEIGNED_RETREAT": { "tier": 2, "tpBase": 35, "geneType": "green_deception" },
    "TAC_IRON_CAVALRY": { "tier": 3, "tpBase": 45, "geneType": "green_vanguard" },
    "TAC_WATER_SURGE": { "tier": 3, "tpBase": 50, "geneType": "green_water" },
    "TAC_EIGHT_TRIGRAMS": { "tier": 4, "tpBase": 70, "geneType": "green_genius" },
    "TAC_DIVINE_FIRE": { "tier": 4, "tpBase": 75, "geneType": "green_genius" }
  }
}
```

---

## 4. TypeScript 消耗解析器與驗收標準

```typescript
export interface TacticCostInput {
  tacticId: string;
  baseTp: number;
  hasGreenGene: boolean;
}

export function calculateTacticTpCost(input: TacticCostInput): number {
  if (!input.hasGreenGene) {
    return input.baseTp;
  }
  const discounted = Math.floor(input.baseTp * 0.5);
  return Math.max(10, discounted);
}
```

### 4.1 驗收標準（Acceptance Criteria）
1. **折半精確度**：單元測試覆蓋 28 條戰法在持有/未持有綠色因子下之 TP 結算，無浮點數殘留。
2. **保底 10 TP 攔截**：原消耗 15 點戰法折半後為 7.5，經向下取整為 7，但受下限限制必須回傳 10 點。
