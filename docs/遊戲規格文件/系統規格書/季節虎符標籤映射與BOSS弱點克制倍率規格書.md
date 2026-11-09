<!-- doc_id: doc_spec_0518 -->
# 季節虎符標籤映射與BOSS弱點克制倍率規格書

> **模組識別碼**：`TRN-12`  
> **系統歸屬**：名將挑戰賽（Tournament）季節虎符與 BOSS 連動  
> **單一真相來源**：本規格書確立虎符克制標籤（BossTags）之自帶優先與兵種推導規則、BOSS 弱點比對演算法、以及 1.5 倍傷害加成之唯一標準。

---

## 一、系統概述與架構原則

為了驅動賽季新虎符的策略價值與商業連動，名將挑戰賽每季 BOSS 具備特定的「弱點標籤（Weakness Tags）」。玩家出戰隊伍配置的虎符若命中本季 BOSS 之弱點，將在對抗中享有 **1.5 倍的傷害/戰力增幅（150% 效能）**。

### Unity / 架構對照
- **標籤解析器**：類似 Unity 中的 `TallyTagResolver` 靜態輔助函式，支援卡牌資料解耦查詢。
- **無狀態檢驗**：輸入虎符卡牌陣列與 BOSS 靜態物件，輸出命中報告 DTO。

---

## 二、虎符標籤推導模型與兵種映射表

每一張虎符卡（`TigerTallyCard`）的 BOSS 克制標籤遵循「明確自帶標籤優先，否則依兵種回退推導」的兩階原則：

```typescript
export type TournamentBossTag = 'FIRE' | 'SLOW' | 'ANTI_CONTROL' | 'ANTI_CAVALRY' | 'RANGED';

/** 兵種推導回退對照表（TroopType -> BossTags） */
export const TALLY_BOSS_TAGS_BY_TROOP: Readonly<Record<string, readonly TournamentBossTag[]>> = {
    archer: ['RANGED'],          // 弓兵 -> 遠射標籤
    pikeman: ['ANTI_CAVALRY'],   // 槍兵 -> 剋騎標籤
    engineer: ['FIRE'],          // 工兵 -> 火攻標籤
    navy: ['FIRE'],              // 水軍 -> 火攻標籤
    shield: ['ANTI_CONTROL'],    // 盾兵 -> 破控標籤
    medic: ['ANTI_CONTROL'],     // 醫士 -> 破控標籤
};
```

### 標籤解析演算法
```typescript
export function tallyBossTags(card: { bossTags?: readonly string[]; troopType?: string }): TournamentBossTag[] {
    // 1. 若卡面已明確配置 bossTags，優先使用並過濾非合法標籤
    if (Array.isArray(card.bossTags) && card.bossTags.length > 0) {
        const valid = card.bossTags.filter((t): t is TournamentBossTag => 
            ['FIRE', 'SLOW', 'ANTI_CONTROL', 'ANTI_CAVALRY', 'RANGED'].includes(t)
        );
        return Array.from(new Set(valid));
    }
    // 2. 若未配置，依兵種回退推導
    return [...(TALLY_BOSS_TAGS_BY_TROOP[card.troopType ?? ''] ?? [])];
}
```

- **特殊約束**：緩速標籤（`SLOW`）不對應任何常規兵種，唯有特定新發行季節限定虎符方可具備。

---

## 三、BOSS 弱點比對演算法與 1.5 倍傷害乘區

```typescript
export interface TallyBossMatch {
    matchedCount: number;              // 命中弱點的虎符總張數
    matchedTags: TournamentBossTag[];  // 命中的弱點標籤清單
}

export const BOSS_WEAKNESS_BONUS = 1.5; // 命中弱點之傷害乘數

export function tallyBossMatch(
    cards: readonly { bossTags?: readonly string[]; troopType?: string }[],
    boss: { weaknessTags: readonly TournamentBossTag[] }
): TallyBossMatch {
    const hitSet = new Set<TournamentBossTag>();
    let matchedCount = 0;
    
    for (const card of cards) {
        const tags = tallyBossTags(card).filter(t => boss.weaknessTags.includes(t));
        if (tags.length > 0) {
            matchedCount++;
            tags.forEach(t => hitSet.add(t));
        }
    }
    
    return {
        matchedCount,
        matchedTags: boss.weaknessTags.filter(t => hitSet.has(t)),
    };
}

export function bossWeaknessMultiplier(attackTags: readonly string[], boss: { weaknessTags: readonly string[] }): number {
    const isHit = attackTags.some(t => boss.weaknessTags.includes(t));
    return isHit ? BOSS_WEAKNESS_BONUS : 1.0;
}
```

---

## 四、UI 展示字串合約

介面依據比對結果生成引導提示字串：
- 命中張數 $>0$ 時：`虎符命中 N 張（火攻、遠射）`
- 命中張數 $=0$ 時：`虎符命中 0 張，可配置克制陣容`

---

## 五、驗收條件與測試案例 (Test Cases)

- **TC-TRN-37（自帶標籤優先覆蓋兵種）**：
  - 虎符兵種為 `archer`（預設遠射），但自帶 `bossTags: ['FIRE']`，回傳標籤必定為 `['FIRE']`。
- **TC-TRN-38（兵種自動推導回退）**：
  - 虎符無 `bossTags`，兵種為 `pikeman`，回傳 `['ANTI_CAVALRY']`。
- **TC-TRN-39（弱點比對張數與去重）**：
  - 陣容配置 2 張槍兵虎符與 1 張盾兵虎符，面對弱點為 `ANTI_CAVALRY` 的 BOSS，`matchedCount` 為 2，`matchedTags` 為 `['ANTI_CAVALRY']`。
- **TC-TRN-40（1.5 倍傷害乘區判定）**：
  - 攻擊標籤包含 `FIRE`，BOSS 弱點含 `FIRE`，倍率回傳 1.5；未命中時回傳 1.0。
