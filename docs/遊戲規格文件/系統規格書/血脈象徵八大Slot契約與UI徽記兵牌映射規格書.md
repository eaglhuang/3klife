<!-- doc_id: doc_spec_0672 -->
# 血脈象徵八大Slot契約與UI徽記兵牌映射規格書

> **所屬模組**：`3.7 UI 介面與視覺工程 (BSS-01 / BSS-04)`  
> **單一真相來源**：正式落檔 `bloodline-symbol-slot-contract-v1`，定義立繪與卡面之八大血脈象徵 Slot（Symbol Slot）、與前端 UI 徽記/虎符兵牌映射矩陣，以及美術立繪回灌禁令。

---

## 1. 八大血脈象徵 Slot 語意與位置定義

為使武將立繪、卡牌外框與戰場小人之視覺符號具備嚴密的邏輯自洽，定義八大血脈象徵槽位（Symbol Slot）：

```
+-------------------------------------------------------------------------+
| [SLOT-01: 額前靈火 Forehead]  --> 主將天命覺醒標記 (紫微/赤金)           |
| [SLOT-02: 胸口命篆 Chest]     --> 核心主因子金石印記 (對應 BloodlineCrest)|
| [SLOT-03: 肩甲獸紋 Shoulder]  --> 虎符兵種軍勢象徵 (白馬/陷陣/虎豹)       |
| [SLOT-04: 腰間玉符 Waist]     --> 世家名望與門閥品階符節 (漢玉水滴)       |
| [SLOT-05: 袍甲雲紋 Cloak]     --> 先祖傳承世代標記 (雲雷紋/蟠龍紋)        |
| [SLOT-06: 兵刃靈符 Weapon]    --> 專屬奧義戰法銘文 (錯金劍痕)             |
| [SLOT-07: 護腕符印 Wrist]     --> 根性精力抗性印記 (玄武水波)             |
| [SLOT-08: 輪廓微光 Aura]      --> 戰場 EP 爆發共鳴 (低頻靈氣)             |
+-------------------------------------------------------------------------+
```

---

## 2. Slot 與前端 UI / 兵牌映射矩陣

前端各模組透過標準 Slot 欄位讀取視覺素材，不得越俎代庖：

| Slot 代碼 | 槽位名稱 | 前端 UI 映射元件 | 資源路徑標準 |
|:---:|:---|:---|:---|
| **SLOT-01** | `FOREHEAD_SIGIL` | 戰場血條旁頭像、大廳名牌 | `sprites/ui/sigil/forehead_{color}.png` |
| **SLOT-02** | `CHEST_TALISMAN` | 日常人物頁、命鏡覺醒大卡 | `BloodlineCrestWidget` (`SIZE_XL` / `SIZE_LG`) |
| **SLOT-03** | `SHOULDER_CREST` | 虎符詳情面板、特種兵卡牌 | `sprites/ui/tally/tally_insignia_{troopId}.png` |
| **SLOT-04** | `WAIST_JADE` | 世家總覽、十四人血統樹節點 | `sprites/ui/noble/jade_pendant_{tier}.png` |
| **SLOT-05** | `BACK_CLOAK` | 武將全幅立繪下擺裝飾 | `sprites/ui/patterns/pattern_{motif}.png` |
| **SLOT-06** | `WEAPON_ENGRAVING` | 戰法詳情、奧義特寫動畫 | `sprites/ui/tactics/rune_{tacticType}.png` |
| **SLOT-07** | `WRIST_GUARD` | 屬性面板抗性標籤 | `sprites/ui/stats/resist_badge_{element}.png` |
| **SLOT-08** | `AURA_OUTLINE` | 戰場單挑、絕境奧義爆發 | 著色器材質 `mat_auric_resonance` (動態渲染) |

---

## 3. 美術立繪 Prompt 回灌守則（Slot Grounding Rule）

在使用 AI 圖像生成工具（nano-banana、dalle3、comfyui）產出名將或先祖立繪時，必須嚴格遵守以下回灌規範：
1. **嚴禁生化異變**：
   - 靈獸血脈外顯必須透過「青銅金石飾品、刺繡雲紋、寶玉配飾」表達；
   - **絕對禁止** 出現恐怖肉瘤、生化變異、裂膚流血或克蘇魯觸角。
2. **槽位精確著墨**：
   - Prompt 必須明確指定 `SLOT-02`（胸前金錯青銅印）與 `SLOT-04`（腰間漢玉符節），確保成圖符合三國古典漢風美感。

---

## 4. 資料契約 Schema（bloodline-symbol-slot-contract-v1.json）

```typescript
export interface SymbolSlotDefinition {
  slotId: "SLOT_01" | "SLOT_02" | "SLOT_03" | "SLOT_04" | "SLOT_05" | "SLOT_06" | "SLOT_07" | "SLOT_08";
  canonicalName: string;
  uiTargetComponent: string;
  allowedAssetPrefix: string;
  requiresShader: boolean;
}
```
