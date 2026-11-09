<!-- doc_id: doc_spec_0641 -->
# 遺傳因子跳星突變StarJump與重塑洗髓商業平衡規格書

> **規格代碼**：`FBR-09`
> **版本**：v1.0 (Single Source of Truth)
> **狀態**：正式定案 (Approved)
> **檔案大小限制**：嚴格 <6144 bytes

---

## 1. 系統定位與商業化邊界裁決

本規格確立武將配種結緣時遺傳因子「跳星突變（Star Jump）」演算法，以及道具「洗髓伐骨丹」重塑因子的商業化機制與保底防火牆。
**核心原則（Single Source of Truth）**：
- Star Jump 僅提升星等（如 3★ 躍升為 5★），**絕對不發生跨色系基因突變**（藍色屬性絕不轉化為紅色壽命）。
- 洗因子嚴格限制每月次數，且設有保底重塑協議，杜絕無底洞課金。

```mermaid
flowchart TD
    InheritFactor[因子遺傳進池] --> CheckJump{Star Jump 判定: 基準 3% + LUK 修正}
    CheckJump -- 成功跳星 --> StarUpgrade[星等直接 +1 或 +2 (上限 5★)]
    CheckJump -- 未跳星 --> NormalInherit[維持原代星等分佈]
    StarUpgrade --> FinalGene[產生子嗣 GeneObject]
    NormalInherit --> FinalGene
    FinalGene --> PlayerRecast[玩家使用洗髓伐骨丹]
    PlayerRecast --> CheckPity{重塑累計次數 >= 3?}
    CheckPity -- 是 --> GuaranteeStar[保底重塑出 >= 3★ 同色因子]
    CheckPity -- 否 --> RollRecast[全星等隨機抽樣]
```

---

## 2. Star Jump 跳星演算法與運氣修正

```typescript
export interface StarJumpResult {
  originalLevel: number;
  newLevel: number;
  hasJumped: boolean;
  jumpDelta: number; // 躍升星等 (通常為 +1 或 +2)
}

export function rollStarJump(currentLevel: number, avgParentLuk: number): StarJumpResult {
  if (currentLevel >= 5) {
    return { originalLevel: 5, newLevel: 5, hasJumped: false, jumpDelta: 0 };
  }
  // 基準率 3%，每 10 點平均運氣增加 0.5%，上限 8%
  const jumpChance = Math.min(0.08, 0.03 + (avgParentLuk / 10) * 0.005);
  const isTriggered = Math.random() < jumpChance;
  if (!isTriggered) {
    return { originalLevel: currentLevel, newLevel: currentLevel, hasJumped: false, jumpDelta: 0 };
  }
  // 70% 機率跳 1 星，30% 機率跳 2 星 (上限夾制 5★)
  const delta = Math.random() < 0.7 ? 1 : 2;
  const clampedLevel = Math.min(5, currentLevel + delta);
  return { originalLevel: currentLevel, newLevel: clampedLevel, hasJumped: true, jumpDelta: clampedLevel - currentLevel };
}
```

---

## 3. 洗髓伐骨丹重塑協議（Recast Protocol）

1. **道具定位**：`ITEM_RESET_BONE_PILL`，百寶閣定價 500 玉璧，每位玩家每月限購 2 顆。
2. **重塑規則**：
   - 僅能選擇未被鎖定（`Is_Locked == false`）且非紫色的遺傳因子。
   - 保持原色系不變，於該色系因子字典中重新抽取 `Gene_ID` 與星等。
3. **保底機制（Pity Protection）**：
   - 連續 2 次重塑結果 $<3\text{★}$ 時，第 3 次重塑必定產出 $\ge 3\text{★}$ 稀有因子。
   - 重塑後若玩家不滿意，允許保留舊因子（放棄新因子），但消耗之洗髓伐骨丹不予退還。
