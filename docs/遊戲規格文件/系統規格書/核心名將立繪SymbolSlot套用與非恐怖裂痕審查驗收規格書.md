<!-- doc_id: doc_spec_0681 -->
# 3KLife 核心名將立繪SymbolSlot套用與非恐怖裂痕審查驗收規格書

> **規格代碼**：SPEC-ART-BSS05  
> **關聯 WBS**：BSS-05（M10 核心武將立繪套用 slot 並驗收）  
> **文件版本**：v1.0.0 (單一真相來源，無補丁整併版)  
> **所屬系統**：UI 介面與視覺工程（UI Architecture & Art Pipeline）

---

## 1. 核心宗旨與設計哲學

本規格書將血脈象徵八大 Slot（引自 `doc_spec_0672`）具體套用於五大核心示範名將（趙雲、關羽、諸葛亮、甄姬、孫尚香）之立繪資產中。為杜絕 AI 繪圖失控產生之生化喪屍異變，本規範設立嚴格之**「非恐怖裂痕（No-Body-Horror）」量化驗收邊界**，確保名將在具備上古血脈威能之同時，保有漢代英雄之歷史莊嚴感。

---

## 2. 五大核心名將 Slot 套用對照表

| 武將 ID | 名稱 | 血脈因子 / 靈獸 | 核心主 Slot 分配 (Primary Slots) | 輔助 Slot 分配 (Secondary Slots) | 面部防恐怖裂痕規範 |
|---|---|---|---|---|---|
| **GEN_ZHAOYUN** | 趙雲 | 武 (白) · 白虎 / 智 (藍) · 玄武 | `SLOT_SHOULDER_BEAST` (肩吞青銅獸)<br>`SLOT_WEAPON_RUNE` (亮銀槍刃墨金篆) | `SLOT_AURA_SILHOUETTE`<br>(身後淡墨氣浪) | 眉心素銀星宿暗印，全臉皮膚光潔，嚴禁裂紋。 |
| **GEN_GUANYU** | 關羽 | 統 (紅) · 青龍 / 德 (綠) · 麒麟 | `SLOT_WEAPON_RUNE` (偃月刀身流光)<br>`SLOT_ROBE_PATTERN` (綠錦雲龍刺繡) | `SLOT_CHEST_SIGIL`<br>(護心鏡古篆龍紋) | 面如重棗，眼含精光，嚴禁面部血管外露。 |
| **GEN_ZHUGE_LIANG** | 諸葛亮 | 智 (藍) · 玄武 / 運 (紫) · 應龍 | `SLOT_ROBE_PATTERN` (鶴氅金絲八卦)<br>`SLOT_WEAPON_RUNE` (白羽扇雲紋) | `SLOT_WAIST_JADE`<br>(腰間透雕雙魚佩) | 容貌清雋，僅眉心微泛玄藍智慧靈光。 |
| **GEN_ZHENJI** | 甄姬 | 魅 (粉) · 朱雀 / 智 (藍) · 玄武 | `SLOT_WAIST_JADE` (腰間羊脂白玉佩)<br>`SLOT_FOREHEAD_FLAME` (鳳羽硃砂花鈿) | `SLOT_WRIST_MARK`<br>(手腕溫潤玉鐲微光) | 絕代佳人，除額前漢風花鈿外，禁任何印記。 |
| **GEN_SUN_SHANGXIANG** | 孫尚香 | 統 (紅) · 青龍 / 武 (白) · 白虎 | `SLOT_WEAPON_RUNE` (短劍金石符印)<br>`SLOT_WRIST_MARK` (精鋼護腕獸吞) | `SLOT_ROBE_PATTERN`<br>(戰袍金線赤羽暗紋) | 英姿颯爽，臉龐乾淨俐落，禁機械骨骼。 |

---

## 3. 非恐怖裂痕量化驗收標準 (Quality Metrics)

所有立繪資產在提交審查前，必須通過以下量化檢驗標準：

```typescript
export interface PortraitSlotQcReport {
  generalId: string;
  hasFaceCorruption: boolean;         // 面部是否有生化/肉瘤裂紋 (一票否決)
  foreheadSigilAreaRatio: number;     // 額前花鈿佔全臉面積比 (上限 3.5%)
  auraBleedDistancePx: number;        // 水墨外光暈擴散寬度 (上限 25px)
  primarySlotMatchCount: number;      // 主 Slot 正確對位數量 (必須 >= 2)
  isHanBronzeAesthetic: boolean;      // 質感是否為漢代金石水墨 (非賽博龐克)
  verdict: 'PASS' | 'FAIL';
}
```

- **面部容忍度上限**：額前花鈿或印記面積不得超過面部像素的 $3.5\%$。
- **光暈控制**：水墨靈氣擴散距離嚴格限制在 $25\text{px}$ 以內，避免全屏光污染。

---

## 4. 驗收測試案例 (Test Cases)

- **TC-BSS-05-01【趙雲立繪 Slot 對位審查】**：以趙雲覺醒立繪進行驗證，肩吞猛獸浮雕與長槍符文準確座落，面部完全無生化裂痕，審查判定 `PASS`。
- **TC-BSS-05-02【甄姬面部非恐怖標準檢測】**：以甄姬覺醒立繪進行檢測，額前花鈿面積佔比 $2.1\% \le 3.5\%$，腰佩玉石通透自然，判定 `PASS`。
- **TC-BSS-05-03【恐怖裂痕自動攔截】**：人工故意輸入帶有生化外骨骼之測試立繪，審查工具檢出 `hasFaceCorruption = true`，自動阻斷入庫。
