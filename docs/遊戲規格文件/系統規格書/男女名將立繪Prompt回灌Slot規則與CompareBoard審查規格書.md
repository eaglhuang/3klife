<!-- doc_id: doc_spec_0676 -->
# 3KLife 男女名將立繪Prompt回灌Slot規則與CompareBoard審查規格書

> **規格代碼**：SPEC-ART-BSS02  
> **關聯 WBS**：BSS-02（M10 男/女武將 prompt 模板回灌 slot 規則）、BSS-03（M10 male/female/bloodline 三類 compare board）  
> **文件版本**：v1.0.0 (單一真相來源，無補丁整併版)  
> **所屬系統**：UI 介面與視覺工程（UI Architecture & Art Pipeline）

---

## 1. 核心宗旨與設計哲學

AI 圖像生成工具（如 SDXL、ComfyUI、DALL-E 3）在處理「三國武將血脈覺醒」立繪時，若缺乏精確約束，極易失控產生非預期的視覺噪音（如男武將生化裂痕、女武將機甲骨骼）。為使血脈象徵八大 Slot（引自 `doc_spec_0672`）自然融入漢風立繪中，本規格書制定**男女名將 Prompt 模板回灌規則**，並定義**三類 Slot-Map Compare Board（對照審查看板）**之結構化驗收標準。

---

## 2. 男女名將 Prompt 模板回灌規則 (BSS-02)

### 2.1 男武將 Slot 回灌模板 (Male General Prompt Recipe)

男武將立繪強調「威嚴、沉穩、將帥英氣」，Slot 分配側重於重型甲冑與兵器金石：
- **核心主槽位 (Primary Slots)**：
  - `SLOT_SHOULDER_BEAST`（肩甲獸紋）：肩吞青銅猛獸浮雕，雙眼嵌暗金冷玉，嚴禁塑料賽博角飾。
  - `SLOT_WEAPON_RUNE`（兵刃靈符）：長槍冷刃或古劍銘文泛出深沉水墨金芒，嚴禁雷射光劍。
  - `SLOT_CHEST_SIGIL`（胸口命篆）：護心鏡周圍青銅龍首暗刻，與呼吸節奏共鳴。
- **面部與微光控制**：
  - `SLOT_FOREHEAD_FLAME`：僅限眉心一抹暗紅硃砂古篆微印，**嚴禁**全臉蔓延生化裂痕或血管異變。
  - `SLOT_AURA_SILHOUETTE`：背後淡雅水墨氣浪微光，擴散距離 $\le 30\text{px}$。

### 2.2 女武將 Slot 回灌模板 (Female General Prompt Recipe)

女武將立繪強調「典雅、英颯、華美流光」，Slot 分配側重於衣飾玉佩與靈動花鈿：
- **核心主槽位 (Primary Slots)**：
  - `SLOT_WAIST_JADE`（腰間玉符）：漢代白玉透雕佩飾，流蘇隨風飄逸，泛出柔和靈犀光澤。
  - `SLOT_ROBE_PATTERN`（袍甲雲紋）：錦緞長袍邊緣繡金絲流雲與靈獸羽紋，精緻細膩。
  - `SLOT_FOREHEAD_FLAME`（額前靈火）：精緻漢代神鳥花鈿，眉宇微泛朱雀/玄武靈動晨曦。
- **面部與微光控制**：
  - `SLOT_WRIST_MARK`：手腕溫潤玉鐲微光，戰鬥引弓或撫琴時散發水墨漣漪。
  - **嚴禁**外露任何生化金屬骨架、外骨骼支架或暴露粗糙傷口。

---

## 3. Compare Board 結構與審查標準 (BSS-03)

每次武將立繪生成或改版時，必須自動輸出 $2560\times 1440$ 標準對照看板，供藝術總監與 CI 審查：

```
+-------------------------------------------------------------------------------+
|                        3KLife Slot-Map Compare Board                          |
+-----------------------+-----------------------+-----------------------+-------+
| Panel A: 史實基礎立繪  | Panel B: 槽位遮罩標註  | Panel C: AI 融入草稿   | Panel D: 最終修墨立繪  |
| (Historical Base)     | (Slot Mask Overlay)   | (AI Draft Render)     | (Final Retouched)     |
| [完整漢服甲冑無光效]   | [紅圈標示 8 大 Slot]   | [初步 Prompt 生成圖]  | [手繪精修通過禁區審查] |
+-----------------------+-----------------------+-----------------------+-------+
| 評審檢核項:           | 1. 禁區違規檢測: PASS   2. 槽位對位準確度: 94%   3. 漢風水墨感: PASS  |
+-------------------------------------------------------------------------------+
```

### 3.1 三類 Compare Board 審查標準

1. **Male Warrior Compare Board**：
   - 驗證男武將肩甲獸吞金石感、兵刃符文是否具歷史重量感。
2. **Female Heroine Compare Board**：
   - 驗證女武將衣飾飄逸感、腰佩玉石通透度與花鈿神紋是否典雅。
3. **Bloodline Resonance Compare Board**：
   - 將同一武將套用 6 色血脈因子（青/赤/玄/白/黃/紫）生成橫向對照，確認靈獸圖騰與顏色自然切換，無臉孔變形問題。

---

## 4. 驗收測試案例 (Test Cases)

- **TC-BSS-02-01【男武將 Prompt 禁區防護驗證】**：以張飛立繪生成測試，驗證 Prompt 回灌參數自動過濾 `face crack`、`glowing eye laser`，確保產出物眉心僅含正統古篆符印。
- **TC-BSS-02-02【女武將腰佩玉符槽位精準對齊】**：以甄姬立繪生成測試，驗證 `SLOT_WAIST_JADE` 準確座落於漢服腰封結繩處，且具備白玉半透明折射。
- **TC-BSS-03-01【Compare Board 4 格生成自動化】**：輸入武將 ID，管線能在 15 秒內自動合成 Panel A~D 4 格對照板並輸出 $125\text{px}$ 檢視縮圖。
