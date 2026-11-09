<!-- doc_id: doc_spec_1103 -->
# 運氣LUK屬性模型與紫色因子等級上限推進規格書

> 標籤：`LUK-01` · `LUK-02` · `LUK-03` · `M2` · `運氣屬性` · `紫色因子` · `天命門檻` · `單一真相來源`

---

## 1. 核心定位與職責邊界

本規格書定義《三國志·漢末霸業》血統家族培育體系中，武將第六項隱藏屬性「運氣（LUK）」之資料結構、視覺隱藏旗標、紫色天命因子對 LUK 成長上限之推進演算法（`lukMaxForGenes`），以及三大史實級天命門檻特權模型（`luckThresholdEffects`）。

本模組為純邏輯無副作用運算，負責計算上限與天命資格旗標，不涉及具體介面繪製與存檔寫入。

---

## 2. 運氣屬性結構與前期視覺隱藏（LUK-01）

運氣不同於傳統五維，作為隱藏天命維度收錄於武將設定中：

```typescript
export interface GeneralLuckConfig {
    luk: number;        // 當前運氣值 (0~100)
    maxLuk: number;     // 運氣天花板上限 (50~100)
    isVisible: boolean; // 是否對玩家公開可視 (受發現等級門檻保護)
}
```

1. **前期隱藏防劇透**：在玩家發現等級未達 Phase 3（Lv 45+）前，武將名冊與詳情面板中 LUK 屬性顯示為遮罩狀態（`isVisible = false`，UI 顯示 `??? (Lv46 解鎖)`）。
2. **純數值後台運作**：即便在前期隱藏狀態下，LUK 數值仍默默影響子嗣結緣受孕率、天命波動（Fate Wave）、培育好感度與因子覺醒速度。

---

## 3. 紫色因子等級推進上限公式（LUK-03）

凡人運氣上限受天道約束封頂於 50 點，唯有攜帶紫色天命因子者方可突破界限：

$$\text{LUK\_Max} = \min\left(100, \text{LUK\_BASE\_MAX}(50) + \text{PurpleGeneLevel} \times 10\right)$$

```typescript
export const LUK_BASE_MAX = 50;
export const LUK_MAX_PER_PURPLE_LEVEL = 10;
export const LUK_MAX = 100;

export function lukMaxForGenes(genes: readonly FateHeldGene[] | undefined): number {
    let purple = 0;
    for (const gene of genes ?? []) {
        if (!FATE_BLESSING_GENE_IDS.includes(gene.id ?? '')) continue;
        const level = Number.isFinite(gene.level) ? Math.max(0, gene.level ?? 0) : 0;
        purple = Math.max(purple, level);
    }
    return Math.min(LUK_MAX, LUK_BASE_MAX + purple * LUK_MAX_PER_PURPLE_LEVEL);
}
```

### 3.1 紫因子星等與運氣上限階梯表

| 紫色天命因子星等 | 運氣上限天花板 (`maxLuk`) | 氣運境界與說明 |
|:---:|:---:|---|
| **無紫因子** | **50 點** | 凡俗常態，氣運平平，無法觸發極限天命 |
| **★1 紫因子** | **60 點** | 初露鋒芒，天命微動 |
| **★2 紫因子** | **70 點** | 氣運加身，災厄退避 |
| **★3 紫因子** | **80 點** | **達到第一天命門檻**，開啟戰法強制複製 |
| **★4 紫因子** | **90 點** | 福澤深厚，全面加速修業覺醒 |
| **★5 紫因子** | **100 點** (絕對上限) | **達到天命極限門檻**，人神共鑑，天命傳承 |

- **潛力原則**：即便紫色因子處於灰鎖狀態（尚未覺醒），其星等仍直接擴充該武將的 `maxLuk` 上限，反映子嗣與生俱來之氣運容積。

---

## 4. 三大特殊天命門檻效果（luckThresholdEffects）

當父母平均運氣達到關鍵數值時，結緣孕育將觸發逆天改命之特殊效果：

```typescript
export const LUK_FORCE_TACTIC_COPY_MIN = 80;
export const LUK_BLOODLINE_MUTATION_MIN = 95;

export interface LuckThresholdEffects {
    forceTacticCopy: boolean;   // 戰法強制複製 (>= 80)
    bloodlineMutation: boolean; // 血統基因突變 (>= 95)
    fateInheritance: boolean;   // 天命曾祖傳承 (== 100)
}
```

1. **戰法強制複製（$\text{LUK} \ge 80$）**：
   - 父母雙方最強之固有核心戰法，享有 **$100\%$ 強制繼承** 保底，無視常規進池隨機率。
2. **血統基因突變（$\text{LUK} \ge 95$）**：
   - 子嗣出生時，隨機選定一個已繼承之因子發生跳星突變，星等直接突破階梯上限。
3. **天命傳承（$\text{LUK} = 100$）**：
   - 達到滿額 100 點極致天命時，突破 14 人三代祖譜邊界，額外向下定向繼承 1 個曾祖代之稀世隱藏因子。
