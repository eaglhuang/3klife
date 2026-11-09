<!-- doc_id: doc_spec_1147 -->
# 綠粉因子戰法TP折扣與地形戰場效果連動規格書

> 標籤：`FBR-05` · `M7` · `戰法折扣` · `地形特權` · `戰場連動` · `單一真相來源`

---

## 1. 核心定位與職責邊界

本規格書定義《三國志·漢末霸業》血統家族培育體系中，已覺醒之綠色（戰法種子）與粉色（兵種/地形適性）遺傳因子，於戰法研習介面與沙盤實戰中激發之被動連動特權規則（`FactorTacticLinkage`）。

本模組為純邏輯無副作用運算，負責提供數值修正倍率與戰場資格判斷，不依賴 Cocos 具體部隊節點。

---

## 2. 綠色因子戰法學習 TP 折扣模型

當武將身上已覺醒之綠色戰法種子（`tactic-seed`）與目標戰法所屬類別吻合時，學習技巧點（TP）享有減半特權：

```typescript
export const GREEN_FACTOR_TP_MULTIPLIER = 0.5;

export function learnTpCost(baseTp: number, hasMatchingGreenFactor: boolean): number {
    return Math.ceil(hasMatchingGreenFactor ? baseTp * GREEN_FACTOR_TP_MULTIPLIER : baseTp);
}
```

- **無條件進位計算**：例如基礎學習成本為 25 TP，減半後為 $12.5$，無條件進位為 $13$ TP。
- **永久生效**：只要該綠色因子處於 `isLocked === false` 狀態，該武將學習相符體系戰法皆終生享有此折扣。

---

## 3. 粉色適性因子三大地形戰場特權

粉色因子專注於複雜地理環境與極端天候下的戰術制霸：

```typescript
export const NAVAL_COMBINED_DAMAGE_RATIO = 0.5; // 水域合攻追加傷害: 50%
```

### 3.1 三大地形天候特權矩陣

| 特權類型 | 依賴因子效果 / 條件 | 觸發環境 | 戰術收益說明 |
|---|---|---|---|
| **水域合攻** | `naval-combined-attack`，或水戰適性達 S 級 | 河流格 (`TerrainType.River`) | 四方向正交相鄰友軍可協同發動「合攻」，追加 $50\%$ 傷害，且不觸發敵方反擊 |
| **大霧必中** | `fog-immunity` (大霧免疫) | 大霧天氣 (`Weather.Fog`) | 略過命中率檢驗擲骰，本次物理與奇策攻擊**命中率保證 100%** |
| **林地健步** | `forest-move-bonus` (林地適性) | 林地格 (`TerrainType.Forest`) | 穿越林地地形時，移動力額外 **$+1$ 格**，無視林木阻滯 |

### 3.2 正交相鄰定義（isOrthogonallyAdjacent）
水域合攻嚴格限定四方向正交（前後同一行、或左右同一深度的相鄰格子），斜對角不構成合攻條件：
$$\Delta \text{Lane} + \Delta \text{Depth} = 1$$

---

## 4. 動態戰場特權映射模型

戰鬥開始時，系統藉由 `factorBattleEffectsOf` 從部隊已解鎖之基因池中動態萃取特權：

```typescript
export function factorBattleEffectsOf(
    genes: readonly HeldGene[],
    map: FactorBattleEffectMap
): FactorBattleEffect[] {
    const held = new Set(
        genes.filter((g) => !g.isLocked && (g.level ?? 1) > 0).map((g) => g.id ?? '')
    );
    const effects: FactorBattleEffect[] = [];
    for (const [effect, geneIds] of Object.entries(map.effects)) {
        if (geneIds.some((id) => held.has(id))) {
            effects.push(effect as FactorBattleEffect);
        }
    }
    return effects;
}
```

未覺醒（`isLocked === true`）或星等為 0 之基因嚴格排除於特權池外，確保戰場數值之絕對嚴密性。
