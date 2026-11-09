<!-- doc_id: doc_spec_1096 -->
# 血統活性WildGene初代變異率加成與StarJump跳星演算法規格書

> 標籤：`BLT-07` · `M2` · `血統活性` · `WildGene` · `StarJump跳星` · `單一真相來源`

---

## 1. 核心定位與職責邊界

本規格書定義《三國志·漢末霸業》血統家族培育體系中，初代名將祖先基因活性激發之「野生基因突變（Wild Gene）」演算法，以及因子繼承時觸發「跨階跳星（Star Jump）」之提升幅度與上限約束。

本模組為純邏輯無副作用運算，獨立計算突變判定，不依賴任何外部引擎元件。

---

## 2. 突變率精算模型（rollWildGene）

野生基因突變機率依提供因子之祖先世代深度決定，初代始祖享有高活性加成：

```typescript
export const STAR_JUMP_CHANCE = 0.10;           // 基準突變率: 10%
export const WILD_GENE_FIRST_GEN_BONUS = 0.10;  // 初代祖先加成: +10%

export function rollWildGene(ancestorGeneration: number, random: () => number): boolean {
    if (!Number.isInteger(ancestorGeneration) || ancestorGeneration < 1) {
        throw new RangeError('祖先世代必須是正整數');
    }
    const chance = STAR_JUMP_CHANCE + (ancestorGeneration === 1 ? WILD_GENE_FIRST_GEN_BONUS : 0);
    return random() < chance;
}
```

### 2.1 世代突變率對照表

| 祖先世代 (Generation) | 突變機率 (`Chance`) | 說明 |
|:---:|:---:|---|
| **第 1 代（初代始祖名將）** | **$20\%$** ($10\% + 10\%$) | 歷史名將初代基因活性極強，極易激發異能突變 |
| **第 2 代及後續繁衍世代** | **$10\%$** (基準值) | 世家繁衍多代後血統趨向平穩，維持常態突變率 |

---

## 3. 因子跳星演算法（applyStarJump）

因子在確定命中野生突變後，初始星等獲得躍遷式提升：

```typescript
export const STAR_JUMP_STEP = 2;        // 跳星步長: 一次升兩星
export const STAR_JUMP_MAX_LEVEL = 5;   // 全域最高星級上限: 5 星

export function applyStarJump<T extends StarJumpFactor>(factor: T, random: () => number): T {
    if (!Number.isInteger(factor.level) || factor.level < 1) {
        throw new RangeError('星級必須是正整數');
    }
    const level = factor.level >= STAR_JUMP_MAX_LEVEL
        ? STAR_JUMP_MAX_LEVEL
        : Math.min(STAR_JUMP_MAX_LEVEL, factor.level + (random() < STAR_JUMP_CHANCE ? STAR_JUMP_STEP : 0));
    return { ...factor, level };
}
```

### 3.1 跳星數值階梯與極限保護
1. **雙級跳躍**：命中跳星時，星級直接 $+2$ 星（例如 ★3 $\to$ ★5、★2 $\to$ ★4、★1 $\to$ ★3）。
2. **五星封頂**：星級絕對不可超過 5 星上限。若原始星級為 4 星，跳星後夾取至 5 星；若已為 5 星，不進行跳星且不消耗隨機種子。

---

## 4. 介面特效契約

當子嗣繼承因子中成功激發跳星時：
- 子嗣物件標記 `wildGene: true`。
- 結緣揭曉介面（`GeneralUnveiled`）播放金色電光環繞動畫，顯示「血統覺醒·異稟突變」戰術高光標籤。
