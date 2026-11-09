<!-- doc_id: doc_spec_0510 -->
# 名將挑戰賽杯賽場地屬性輪替與季節BOSS弱點標籤規格書

> **模組識別碼**：`TRN-02`  
> **系統歸屬**：名將挑戰賽（Tournament）場地與 BOSS 配置  
> **單一真相來源**：本規格書確立名將挑戰賽杯賽輪替清單、地形天氣參數、季節 BOSS 弱點標籤及 1.5 倍克制傷害加成之唯一標準。

---

## 一、系統概述與架構原則

名將挑戰賽在每一賽季由系統依序輪替特定杯賽場地，並指派當季專屬之季節 BOSS。玩家在培育期（第 0~6 天）即可預覽當季場地與 BOSS 弱點，據以調整培育方針與陣容技能。

### Unity / 架構對照
- **資料驅動**：場地與 BOSS 定義以不可變配置表（Immutable Config Table）管理，如同 Unity 中的 `VenuePresetScriptableObject`。
- **解耦設計**：弱點檢測與倍率計算為純數學邏輯，不依賴戰鬥渲染節點。

---

## 二、杯賽輪替清單與場地環境配置

系統預設內建五大史實杯賽，依賽季序號（`seasonIndex % TOURNAMENT_CUPS.length`）循環輪替：

```typescript
export interface TournamentSeasonBoss {
    bossId: string;
    name: string;
    weaknessTags: TournamentBossTag[];
    basePower: number; // 基礎基準戰力（標準為 10000）
}

export interface TournamentVenue {
    cupName: string;
    terrain: TerrainType;
    weather: Weather;
    boss: TournamentSeasonBoss;
    specialRule?: {
        label: string;
        tagMultipliers: Readonly<Record<string, number>>;
    };
}
```

### 五大杯賽標準矩陣

| 序號 | 杯賽名稱 | 地形 (`TerrainType`) | 天氣 (`Weather`) | 季節 BOSS | 弱點標籤 (`weaknessTags`) | 特殊規則加成 |
|:---:|---|---|---|---|---|---|
| 0 | **赤壁盃** | 水域 (`River`) | 狂風 (`Windy`) | 連環戰船 | `FIRE`, `RANGED` | 火攻傷害 $\times 2.0$ |
| 1 | **張飛盃** | 山地 (`Mountain`) | 晴天 (`Clear`) | 燕人猛將 | `SLOW`, `ANTI_CONTROL` | 無 |
| 2 | **官渡盃** | 平原 (`Plain`) | 晴天 (`Clear`) | 袁軍重騎 | `ANTI_CAVALRY`, `FIRE` | 騎兵衝鋒傷害 $\times 1.8$ |
| 3 | **呂布盃** | 要塞 (`Fortress`) | 雷雨 (`Thunder`) | 飛將無雙 | `SLOW`, `ANTI_CAVALRY` | 無 |
| 4 | **虎牢盃** | 山地 (`Mountain`) | 黑夜 (`Night`) | 雄關悍將 | `RANGED`, `ANTI_CONTROL` | 無 |

---

## 三、BOSS 弱點標籤體系與傷害加成演算法

### 1. 弱點標籤列舉
```typescript
export type TournamentBossTag = 'FIRE' | 'SLOW' | 'ANTI_CONTROL' | 'ANTI_CAVALRY' | 'RANGED';

export const TOURNAMENT_BOSS_TAG_LABEL: Readonly<Record<TournamentBossTag, string>> = {
    FIRE: '火攻',
    SLOW: '緩速',
    ANTI_CONTROL: '破控',
    ANTI_CAVALRY: '剋騎',
    RANGED: '遠射',
};
```

### 2. 傷害倍率計算
```typescript
export const BOSS_WEAKNESS_BONUS = 1.5; // 弱點命中加成倍率

/**
 * 計算武將/戰法標籤對當季 BOSS 的綜合克制傷害倍率
 */
export function calculateBossTagMultiplier(
    attackerTags: readonly TournamentBossTag[],
    bossWeaknesses: readonly TournamentBossTag[],
    specialRuleMultipliers?: Readonly<Record<string, number>>
): number {
    let multiplier = 1.0;
    
    // 1. 檢驗是否命中 BOSS 弱點標籤（命中任一弱點即享有 1.5 倍）
    const hitsWeakness = attackerTags.some(tag => bossWeaknesses.includes(tag));
    if (hitsWeakness) {
        multiplier *= BOSS_WEAKNESS_BONUS;
    }
    
    // 2. 累加場地特殊規則倍率
    if (specialRuleMultipliers) {
        for (const tag of attackerTags) {
            if (specialRuleMultipliers[tag] && specialRuleMultipliers[tag] > 1.0) {
                multiplier *= specialRuleMultipliers[tag];
            }
        }
    }
    
    return multiplier;
}
```

---

## 四、培育期公告機制合約

1. **零時公告**：當賽季進入第 0 天（培育期起始），系統即時公布當季 `TournamentVenue` 結構，包含地形、天氣、BOSS 弱點與特殊規則文字。
2. **UI 契約**：大廳賽季面板（`TournamentPanelController`）需完整展示杯賽名稱與弱點標籤晶片（Chips），引導玩家在學府培育成相應適性子嗣。

---

## 五、驗收條件與測試案例 (Test Cases)

- **TC-TRN-05（杯賽輪替取模）**：
  - 輸入賽季 index 0 取得赤壁盃；index 5 回歸赤壁盃；index 2 取得官渡盃。
- **TC-TRN-06（弱點加成判定）**：
  - 攻擊者擁有 `['FIRE']`，BOSS 弱點含 `FIRE`，計算倍率為 1.5 倍。
- **TC-TRN-07（未命中弱點保底）**：
  - 攻擊者擁有 `['ANTI_CAVALRY']`，面對弱點僅為 `['SLOW']` 的 BOSS，基礎倍率保持 1.0 倍。
- **TC-TRN-08（場地特殊規則疊加）**：
  - 在赤壁盃中，攻擊者擁有 `FIRE`，既命中弱點（1.5 倍）又享有特殊規則（2.0 倍），最終倍率為 $1.5 \times 2.0 = 3.0$ 倍。
