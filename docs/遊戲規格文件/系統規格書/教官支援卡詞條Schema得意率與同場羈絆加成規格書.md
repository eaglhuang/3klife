<!-- doc_id: doc_spec_0400 -->
# 教官支援卡詞條Schema得意率與同場羈絆加成規格書

## 1. 核心定位與職責邊界
本規格書定義《三國人生》武將退役轉化與卡池獲取之「教官支援卡（Mentor Support Card, SUP_*）」的資料結構契約、六階星等倍率表、得意率（Slot Burst Rate）與同場羈絆連攜機制（WBS `FORM-03`，代碼落位於 `MentorCard.ts`、`MentorSupportSchema.ts` 與 `MentorSupportCatalog.ts`）。
系統嚴格確立「教官專職教學（`roleBoundary: 'TeachingOnly'`）」的底層防護鐵律，確保退役武將作為導師指派時，不干預下一代之血脈因子遺傳鏈。

```
              ┌──────────────────────────────────────────────┐
              │          SupportCardDef 支援卡契約模型       │
              └──────────────────────┬───────────────────────┘
                                     │
          ┌──────────────────────────┼──────────────────────────┐
          ▼                          ▼                          ▼
   【詞條與效果陣列】         【星等階梯 (★0~★5)】      【羈絆連攜與得意率】
   • Teaching_Style 風格      • 6格長度陣列              • slotBurstRate 得意率
   • Stat_Bonus 屬性加值      • friendshipBonus 友情     • synergyPartners 同場夥伴
   • Passive_Effects 被動     • trainingEffect 訓練      • synergyEventId 專屬事件
   • Tactic_Inspire 靈感      • 數值嚴格單調不減         • roleBoundary: TeachingOnly
```

---

## 2. 核心資料結構定義（`SupportCardDef`）

支援卡結構由 JSON 配置解析為強型別之 `SupportCardDef`：

```typescript
export interface SupportCardDef {
    supportId: string;
    name: string;
    rarity: string;                      // R / SR / SSR / UR
    teachingStyle: string;               // 教學風格代碼
    statBonus: Partial<Record<TrainingKind, number>>; // STR/INT/LEA/POL/CHA 映射
    tacticInspireEvents: readonly TacticInspireEventDef[]; // 戰法靈感事件
    passiveEffects: readonly PassiveEffectDef[];           // 被動效果清單
    friendshipBonus: readonly number[];  // ★0~★5 友情加成倍率 (長度 6)
    trainingEffect: readonly number[];   // ★0~★5 訓練效果倍率 (長度 6)
    trainingSlotAffinity: readonly TrainingKind[]; // 得意訓練槽位
    slotBurstRate: number;               // 得意率 (0.0 ~ 1.0)
    synergyPartners: readonly string[];  // 同場連攜教官清單
    synergyEventId?: string;             // 觸發連攜特訓事件 ID
    source: MentorSource;                // Gacha / Retire / Capture / Mercenary / Offspring
    roleBoundary: 'TeachingOnly';        // 角色邊界硬規則
}
```

---

## 3. 六階星等數值矩陣與單調性約束

教官卡透過重複抽取或突破升星（★0 至 ★5），其效果陣列長度嚴格等於 **6 格**（`SUPPORT_STAR_TABLE_LENGTH = 6`）：

1. **友情加成倍率（`friendshipBonus`）**：
   - 索引代表星等（Index 0 為 ★0，Index 5 為 ★5）。
   - 基準值為 1.0（無加成），★5 最高可成長至 1.50（$+50\%$ 友情加成）。
2. **訓練效果倍率（`trainingEffect`）**：
   - 陪伴學員時直接提升訓練成效，由 ★0 的 1.0 階梯式提升至 ★5 的 1.30（$+30\%$ 訓練效果）。
3. **單調不減校驗（`isNonDecreasing`）**：
   - Schema 解析器強制檢查陣列數值：$A[i] \le A[i+1]$，星等提升效果絕不倒退，否則配置編譯報錯。

---

## 4. 戰法靈感與同場羈絆連攜

### 4.1 戰法靈感事件（`TacticInspireEventDef`）
- `triggerWindow`：觸發回合區間（如 `[10, 25]` 回合）。
- `baseRate`：基礎觸發機率（0.0 ~ 1.0）。
- `minStar`：最低解鎖星等要求。
- `bloodlineRequired`：家傳戰法可選之血脈代碼（例如常山趙氏、穎川荀氏）。

### 4.2 得意率與同場連攜（Synergy）
1. **得意率（`slotBurstRate`）**：教官在每回合隨機分派設施時，優先降臨於其得意訓練槽位（`trainingSlotAffinity`）之機率偏向（基準 30%~60%）。
2. **同場羈絆（`synergyPartners`）**：當指派陣容中同時存在連攜名將（如荀彧與荀攸、關羽與張飛），培育期間機率觸發專屬「特訓文會事件（`synergyEventId`）」，提供高額雙重屬性爆發與額外戰法點數。
