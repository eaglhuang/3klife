<!-- doc_id: doc_spec_0677 -->
# 3KLife 命鏡裂隙定心者與稀有度Aura靜態圖層分拆標準規格書

> **規格代碼**：SPEC-ART-BML09  
> **關聯 WBS**：BML-09（M10 命鏡裂隙/定心者/稀有度 aura 靜態資產）  
> **文件版本**：v1.0.0 (單一真相來源，無補丁整併版)  
> **所屬系統**：UI 介面與視覺工程（UI Architecture & Art Pipeline）

---

## 1. 核心宗旨與設計哲學

血脈命鏡（Bloodline Mirror）為武將血脈覺醒與先祖通靈之核心神聖介面。為杜絕通用玄幻傳送門（generic portal）之俗套科技感，並兼顧效能與稀有度動態換色，本規格書正式確立命鏡主體之**三層靜態圖層分離標準（Three-Tier Layering Standard）**與**五階稀有度 Aura 着色映射**。

---

## 2. 命鏡靜態圖層分拆標準 (Static Layering)

命鏡視覺節點由外向內、由底向頂嚴格劃分為四大獨立圖層：

```
+-------------------------------------------------------------+
| Layer 4: mirror_rarity_aura  (稀有度靈光層，Color Tint 著色) |
+-------------------------------------------------------------+
| Layer 3: mirror_anchor_core  (定心者核心印石，穩固神魂)     |
+-------------------------------------------------------------+
| Layer 2: mirror_fissure_mesh (命運裂隙紋路，金石開裂質感)   |
+-------------------------------------------------------------+
| Layer 1: mirror_frame_base   (青銅鏡框基座，漢代金石厚重)   |
+-------------------------------------------------------------+
```

### 2.1 圖層細節與資產規範

| 圖層名稱 | 節點命名 (Node Name) | 解析度/尺寸 | 視覺語義與材質 | 混合模式 (Blend Mode) |
|---|---|---|---|---|
| **底層鏡框** | `mirror_frame_base` | $1024\times 1024$ | 漢代八角青銅鏡台，雕琢夔龍雲紋，沉穩厚重。 | `Normal` (Alpha Blend) |
| **裂隙紋路** | `mirror_fissure_mesh` | $1024\times 1024$ | 金石崩裂之天命裂紋，半透明透光，非生化血管。 | `Normal` (帶 Alpha 遮罩) |
| **定心核心** | `mirror_anchor_core` | $512\times 512$ | 懸浮於鏡心之古玉印石，銘刻鎮魂篆文，杜絕晃動。 | `Normal` |
| **靈光疊加** | `mirror_rarity_aura` | $1024\times 1024$ | 外緣向內擴散之水墨霧氣，依稀有度著色。 | `Additive` (加法發光) |

### 2.2 五階稀有度 Aura 色階映射 (Rarity Aura Palette)

靈光層禁止使用科幻光束，嚴格依循金石沉穩色相：
- **N（素銀）**：`#D0D5DD`，不透明度 15%，淡銀月華，平靜如水。
- **R（古銅）**：`#3E6B5C`，不透明度 25%，青銅冷光，金石微潤。
- **SR（紫微）**：`#6941C6`，不透明度 35%，幽邃玄紫，宿命牽引。
- **SSR（赤霄）**：`#D97706`，不透明度 50%，赤金流火，帝王之相。
- **UR（紫金）**：`#7E22CE` 帶 `#F59E0B` 雙色邊，不透明度 65%，山河鼎盛，神威降世。

---

## 3. 資料契約與渲染效能約制

```typescript
export interface MirrorStaticLayerConfig {
  mirrorId: string;
  frameBaseSprite: string;            // db://assets/resources/sprites/mirror/frame_base.png
  fissureMeshSprite: string;          // db://assets/resources/sprites/mirror/fissure_mesh.png
  anchorCoreSprite: string;           // db://assets/resources/sprites/mirror/anchor_core.png
  auraSprite: string;                 // db://assets/resources/sprites/mirror/aura_soft_ink.png
  
  // 效能指標
  atlasPackingId: 'mirror_parts.pac'; // 必須打包進單一圖集
  maxDrawCalls: 1;                    // 合批後 DrawCall 必須為 1
  maxVramBudgetMb: 4.0;               // 靜態紋理 VRAM 上限 4MB
}
```

---

## 4. 驗收測試案例 (Test Cases)

- **TC-BML-09-01【圖層分離獨立性驗證】**：在編輯器中隱藏 `mirror_rarity_aura`，其餘三層仍可正常完整呈現青銅古鏡外觀，無穿幫破圖。
- **TC-BML-09-02【單一圖集合批驗證】**：使用 Cocos Profile 工具監控，四大圖層渲染過程僅產生 1 個 DrawCall。
- **TC-BML-09-03【稀有度 Aura 着色切換】**：動態將武將由 SR 改為 UR，Aura 節點之 Color Tint 於 0.3 秒內平滑過渡至紫金雙色，無跳變閃爍。
