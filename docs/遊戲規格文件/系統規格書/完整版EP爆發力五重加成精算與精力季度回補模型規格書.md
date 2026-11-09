<!-- doc_id: doc_spec_0573 -->
# 完整版EP爆發力五重加成精算與精力季度回補模型規格書

## 1. 模組職責與架構定位
本規格書規範繁衍繁育體系中的「完整版爆發力 EP 五重加成精算公式（`BreedingSystem.computeFullEp`）」與武將體能循環的「精力消耗與季度待命回補模型（`VitalityRecoveryEngine`）」。模組確保子嗣資質運算具備高度層次感，並以精力消耗約束玩家行動節奏。

```
┌─────────────────────────────────────────────────────────────┐
│                 Breeding EP & Vitality Engine               │
├──────────────────────────────┬──────────────────────────────┤
│ 完整版 EP 五重加成精算       │ 精力消耗與季度回補模型       │
│ Base(50) + 共鳴(15) + 異脈(20)│ 最大精力 100 / 待命加速回補  │
│ + 契合(25) + 精力滿載(10)     │ 紅色因子每級 +10% 回復加成   │
└──────────────────────────────┴──────────────────────────────┘
```

## 2. 完整版 EP 爆發力五重加成精算

### 2.1 五重加成與天命波動精算公式
子嗣出生時的爆發潛力（`EP`）由親代祖譜、相性與身心狀態共同決定：
$$\text{EP} = \text{EP\_BASE} + \text{Resonance} + \text{Outcross} + \text{Affinity} + \text{VitalityFull} + \text{LuckRoll}$$

- **基礎基準值（`EP_BASE`）**：固定為 **50 點**。
- **14 人祖先標籤共鳴（`Resonance`）**：雙方祖譜共有特質標籤 $\ge 3$ 個時，加算 **$+15$ 點**。
- **異脈雜交優勢（`Outcross`）**：非同姓且無近親血緣時，加算 **$+20$ 點**。
- **史實相性契合（`Affinity`）**：雙方符合史實配偶或相性共鳴時，加算 **$+25$ 點**。
- **精力滿載加成（`VitalityFull`）**：繁育瞬間雙親精力值皆為 **100 滿額**，加算 **$+10$ 點**。
- **天命波動（`LuckRoll`）**：受雙親平均運氣影響，波動區間為 **$-5 \sim +15$ 點**。

```typescript
export interface EpCalculationInput {
  hasTagResonance: boolean;     // 共有標籤 ≥ 3
  isOutcross: boolean;          // 異脈非近親
  isHistoricalAffinity: boolean;// 史實契合
  isBothVitalityFull: boolean;  // 雙親精力 100
  avgParentsLuk: number;        // 雙親平均運氣
  luckSeedRoll: number;         // 確定性隨機因子 [0.0, 1.0]
}

export function computeFullEp(input: EpCalculationInput): number {
  const EP_BASE = 50;
  const resonance = input.hasTagResonance ? 15 : 0;
  const outcross = input.isOutcross ? 20 : 0;
  const affinity = input.isHistoricalAffinity ? 25 : 0;
  const vitalityFull = input.isBothVitalityFull ? 10 : 0;

  let luckModifier = 0;
  if (input.avgParentsLuk >= 80) {
    luckModifier = Math.floor(input.luckSeedRoll * 11) + 5; // +5 ~ +15
  } else if (input.avgParentsLuk < 40) {
    luckModifier = Math.floor(input.luckSeedRoll * 6) - 5;  // -5 ~ 0
  }

  const rawEp = EP_BASE + resonance + outcross + affinity + vitalityFull + luckModifier;
  return Math.min(135, Math.max(20, rawEp));
}
```

## 3. 精力消耗與季度待命回補模型

### 3.1 行動精力消耗標準
- **出征攻城（`SIEGE`）**：消耗 **30 點** 精力。
- **家族繁衍（`BREEDING`）**：消耗 **40 點** 精力。
- **學府培育（`NURTURE`）**：消耗 **20 點** 精力。

### 3.2 季度回補與待命加速
每年四季（春、夏、秋、冬）交替結算時，系統自動回復武將精力：
- **常態出征武將**：基礎回復 **20 點**。
- **後方待命武將（待命加速）**：基礎回復提升至 **40 點**。
- **紅色因子加成**：武將若持有紅色遺傳因子，每提升 1 星等，季度回復量額外加成 **$+10\%$**：
$$\text{FinalRecovery} = \left\lfloor \text{BaseRecovery} \times (1.0 + \text{RedFactorLevel} \times 0.10) \right\rfloor$$
$$\text{NewVitality} = \min(\text{MaxVitality}, \text{CurrentVitality} + \text{FinalRecovery})$$

## 4. 單元測試驗證規範
1. **TC-EP-MAX（五重全滿加成檢驗）**：共鳴(15)+異脈(20)+契合(25)+滿載(10)+天命保底(+5)，$\text{EP} = 50+70+5 = 125$ 點。
2. **TC-VIT-CONSUME（消耗精準扣除）**：初始 100 精力，執行繁衍結緣扣 40 點，剩餘 60 點。
3. **TC-VIT-RECOVER（待命加速與紅因子）**：待命武將基礎 40 點，持有 ★3 紅色因子（$+30\%$），回補 $\lfloor 40 \times 1.3 \rfloor = 52$ 點。
