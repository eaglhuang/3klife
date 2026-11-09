<!-- doc_id: doc_spec_0586 -->
# 傭兵退役轉教官TP折算與因子爆發揭露門檻規格書

> 標記：Single Source of Truth（單一真相來源）  
> 涵蓋工作包：`MERC-10`、`FBR-12`  
> 狀態：正式發布 / 核心邏輯規格

---

## 1. 系統定位與架構

本模組定義遊戲中已結義客卿武將晚年傳承與遺傳因子爆發感知機制：
1. **傭兵退役轉教官與 TP 基底折算（MERC-10）**：已轉為永久常駐的客卿武將，在年滿 65 歲自然卸甲時，可轉化為學府培育專屬的「名宿教官卡（`MentorCard`）」，其基礎培育點數（`Mentor_TP_Base`）依生前累積總 TP 的 30% 進行無損折算，繼續作育宗族後輩。
2. **因子揭露順序與色階規範（FBR-12）**：嚴格依照因子爆發系統 §K 標準，重構因子的自然覺醒感知門檻：綠色基礎天賦因子自 1 級誕生時立即顯性揭露；紅色潛在爆發因子於 20 歲弱冠禮時正式揭露。代表色統一為象徵天賦的玄白（基礎）與赤焰（爆發）。

```mermaid
flowchart LR
    subgraph MERC-10 客卿退役傳承
        PermanentMerc[永久武將 滿65歲] --> Retire[觸發卸甲退役流程]
        Retire --> CalcTP["計算 Mentor_TP_Base = floor(Total_TP * 0.3)"]
        CalcTP --> EmitCard[生成名宿教官卡: 繼承奧義與門風]
    end

    subgraph FBR-12 因子爆發階梯 (§K)
        Birth[1歲誕生] --> RevealGreen["Lv 1 揭露基礎因子 (白/綠, 始顯)"]
        Crown[20歲弱冠] --> RevealRed["Lv 20 揭露爆發因子 (紅/焰, 潛能)"]
    end
```

---

## 2. 傭兵退役轉教官與 TP 折算（MERC-10）

### 2.1 退役門檻與卡片生成
- 當武將年齡判定 `age >= 65` 且來源為已結義客卿時，開放退役轉教官選項。
- 轉化時生成不可變教官卡資料結構：

```typescript
export interface IMentorCardConversion {
  readonly generalId: string;
  readonly originalTotalTp: number;
  readonly mentorTpBase: number;
  readonly inheritedSecretTactic: string;
  readonly familyTradition: string;
}

export function convertToMentorCard(
  generalId: string,
  totalTp: number,
  inheritedSecretTactic: string,
  familyTradition: string
): IMentorCardConversion {
  // MERC-10 硬邊界：基底 TP 精確為生前總 TP 的 30% 向下取整
  const mentorTpBase = Math.floor(totalTp * 0.3);
  return {
    generalId,
    originalTotalTp: totalTp,
    mentorTpBase,
    inheritedSecretTactic,
    familyTradition,
  };
}
```

---

## 3. 因子揭露順序與爆發門檻（FBR-12）

### 3.1 門檻常數單一真相來源
淘汰歷史殘留的 20 級與 45 級舊設定，全專案統一定義於 `FACTOR_DISCOVERY_THRESHOLDS`：

```typescript
export const FACTOR_DISCOVERY_THRESHOLDS = {
  /** 基礎遺傳因子：1 級誕生即顯性揭露 */
  BASIC_FACTOR_LEVEL: 1,
  /** 爆發因子：20 級（弱冠成人禮）感知覺醒 */
  BURST_FACTOR_LEVEL: 20,
} as const;

export type FactorColorTier = 'WHITE_BASIC' | 'RED_BURST';

export interface IFactorDiscoveryDefinition {
  readonly factorId: string;
  readonly tier: FactorColorTier;
  readonly requiredLevel: number;
}
```

### 3.2 雙色階映射
1. **基礎因子（WHITE_BASIC）**：門檻等級 1。展示為純白底色，象徵先天血脈骨骼之始。
2. **爆發因子（RED_BURST）**：門檻等級 20。展示為赤紅流光，象徵成年後血脈力量之全面解放。

---

## 4. 驗收與測試標準

1. **教官 TP 折算測試（TC-MERC-10-01）**：
   - 輸入 `totalTp = 1000`，檢核生成之 `mentorTpBase === 300`。
   - 輸入 `totalTp = 999`，檢核生成之 `mentorTpBase === 299`（精確向下取整）。
2. **因子揭露門檻校驗（TC-FBR-12-01）**：
   - 檢核武將在 1 級時基礎因子已為可見狀態。
   - 檢核武將在 19 級時爆發因子維持遮蔽，升至 20 級瞬間觸發爆發揭露事件。
