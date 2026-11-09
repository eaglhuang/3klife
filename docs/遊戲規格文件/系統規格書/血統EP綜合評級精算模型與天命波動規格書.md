<!-- doc_id: doc_spec_1098 -->
# 血統EP綜合評級精算模型與天命波動規格書

> 標籤：`BLT-03` · `M2` · `EP潛力值` · `天命波動` · `單一真相來源`

---

## 1. 核心定位與職責邊界

本規格書定義《三國志·漢末霸業》血統體系中，基於 14 人祖譜之「血統潛力值（Excellence Potential, EP）」評級精算演算法（`computeEpMvp`），以及依據雙親平均幸運值引發之「天命波動（Fate Wave）」動態修正模型。

EP 為純邏輯無副作用精算模型，直接決定子嗣五維基礎屬性之繼承折算率（$\text{BaseStat} = \text{AvgStat} \times \frac{\text{EP}}{100}$）。

---

## 2. EP 基礎公式與四項固定加成

EP 基準值為 50 點，透過 14 人祖譜之血脈共鳴、完全外婚、史實契合與精力狀態進行四重疊加：

$$\text{EP} = \text{EP\_BASE} + \text{Bonus}_{\text{Resonance}} + \text{Bonus}_{\text{Outcross}} + \text{Bonus}_{\text{Affinity}} + \text{Bonus}_{\text{VitalityFull}}$$

```typescript
export const EP_BASE = 50;
export const EP_RESONANCE_BONUS = 15;
export const EP_OUTCROSS_BONUS = 10;
export const EP_AFFINITY_BONUS = 10;
export const EP_VITALITY_FULL_BONUS = 5;
```

### 2.1 加成條件與判定規則表

| 加成項目 | 加成點數 | 判定條件 | 設計意圖 |
|---|:---:|---|---|
| **標籤共鳴 (`Resonance`)** | $+15$ | 14 人祖譜中最高頻標籤出現次數達到共鳴門檻（`analyzeTagResonance`），並確立家族門風 | 鼓勵家族代代傳承同一核心特性 |
| **完全外婚 (`Outcross`)** | $+10$ | 14 個插槽皆已知（非空），且 14 位祖先 UID 完全互不重複（`Set.size === 14`） | 獎勵健康基因多樣性，防範近親退化 |
| **史實契合 (`Affinity`)** | $+10$ | 父母為史實知名情侶/夫妻配對（如劉備×孫尚香、諸葛亮×黃月英） | 史實還原與情懷獎勵 |
| **滿精孕育 (`VitalityFull`)**| $+5$ | 結緣時雙親精力皆處於 100 滿額狀態 | 獎勵充足休養後的受孕培育 |

---

## 3. 天命波動雙向修正模型（Fate Wave）

父母雙方的平均運氣屬性（`parentAvgLuk = (LUK_father + LUK_mother) / 2`）將為 EP 帶來非對稱的天命波動：

```typescript
export const FATE_WAVE_HIGH_LUK_THRESHOLD = 80;
export const FATE_WAVE_LOW_LUK_THRESHOLD = 40;
export const FATE_WAVE_HIGH_RANGE: readonly [number, number] = [5, 15];
export const FATE_WAVE_LOW_RANGE: readonly [number, number] = [-10, -5];
```

### 3.1 幸運三區間分佈

1. **高幸運天命所歸（$\text{parentAvgLuk} > 80$）**：
   - 於 $[+5, +15]$ 區間內均勻隨機擲骰一次。
   - 波動值四捨五入為整數，為 EP 提供正向爆發加成。
2. **低幸運命途多舛（$\text{parentAvgLuk} < 40$）**：
   - 於 $[-10, -5]$ 區間內均勻隨機擲骰一次。
   - 波動值為負數，造成 EP 衰退減損。
3. **凡人平穩區間（$40 \le \text{parentAvgLuk} \le 80$）**：
   - 天命波動固定為 0，不進行額外擲骰，避免污染隨機序列。

---

## 4. 四階段位評級標籤契約

經天命波動疊加後之最終總 EP（$\text{TotalEP} = \text{EP} + \text{FateWave}$），對應至介面展示之四階段位標籤：

| EP 總分區間 | 評級標籤 (`rating`) | 介面顏色與說明 |
|:---:|:---:|---|
| **$\ge 90$** | **天命之子** | 金色高光，具備突破五維上限之極限潛質 |
| **$70 \sim 89$** | **良才美質** | 紫色標籤，屬性傳承維持高檔 |
| **$50 \sim 69$** | **中規中矩** | 藍色標籤，一般常態發展 |
| **$< 50$** | **命途多舛** | 灰色標籤，屬性大幅折減，需靠後天事件彌補 |

```typescript
export function epRatingLabel(ep: number): string {
    if (ep >= 90) return '天命之子';
    if (ep >= 70) return '良才美質';
    if (ep >= 50) return '中規中矩';
    return '命途多舛';
}
```
