<!-- doc_id: doc_spec_0669 -->
# 人物頁六頁Tab圖示兩態規格與最小點擊熱區標準規格書

> **所屬模組**：`3.7 UI 介面與視覺工程 (GDART-05 / GDART-07)`  
> **單一真相來源**：定義人物頁六大分頁（將/屬/命/技/寶/兵）按鈕之雙態圖示命名矩陣、手機 $\ge 44\times 44\text{pt}$ 觸控熱區標準、防抖排版補間，以及未解鎖置灰鎖定樣式。

---

## 1. 六大分頁圖示命名與意象矩陣

六大分頁圖示收納於 `assets/resources/sprites/ui/general_detail/tabs/`，嚴格遵守對稱雙態資產命名：

| 分頁代碼 | 頁面名稱 | 圖騰意象 | 未選中資產 (`idle`) | 選中啟動資產 (`active`) |
|:---:|:---:|:---|:---|:---|
| **`OVERVIEW`** | **將** (Overview) | 虎形帥印 / 漢金銅印 | `tab_general_idle.png` | `tab_general_active.png` |
| **`STATS`** | **屬** (Stats) | 六角羅盤 / 天文算籌 | `tab_stats_idle.png` | `tab_stats_active.png` |
| **`BLOODLINE`** | **命** (Bloodline) | 應龍戰魂 / 靈獸符印 | `tab_bloodline_idle.png`| `tab_bloodline_active.png`|
| **`TACTICS`** | **技** (Tactics) | 兵法竹簡 / 青銅古劍 | `tab_tactics_idle.png`  | `tab_tactics_active.png`  |
| **`EQUIP`** | **寶** (Equip) | 傳家古鼎 / 神兵寶甲 | `tab_equip_idle.png`    | `tab_equip_active.png`    |
| **`APTITUDE`** | **兵** (Aptitude) | 特種軍旗 / 虎符令箭 | `tab_aptitude_idle.png` | `tab_aptitude_active.png` |

---

## 2. 觸控熱區與尺寸規格規範

為保障手機雙手與單手操作之精確度，杜絕誤觸，按鈕節點與圖示尺寸規格如下：

```
+-------------------------------------------------------+
|  [按鈕節點整體熱區: 寬 64px x 高 72px] (>= 44x44pt)   |
|                                                       |
|       +---------------------------------------+       |
|       |   [圖示 Sprite: 36px x 36px (居中)]   |       |
|       +---------------------------------------+       |
|       |   [文字 Label: 14sp "將" (字距 2px)]   |       |
|       +---------------------------------------+       |
|       | === 選中金線 (寬 40px x 高 3px) ===   |       |
+-------------------------------------------------------+
```

- **圖示本體規格**：透明背景 PNG，核心視覺物件尺寸居中固定為 `36x36 px`。
- **觸控點擊熱區**：`UITransform` 尺寸為 `64x72 px`（最小點擊面積 $\ge 44\times 44\text{pt}$，符合 iOS Human Interface Guidelines 與 Android Material Design）。

---

## 3. 三態視覺呈現與無抖動補間協議 (Zero Layout Thrashing)

分頁按鈕具備三種確定性視覺狀態：
1. **未選中態 (`IDLE`)**：
   - 圖示色調為水墨沉香暗金色（`#8C7B65`，Opacity 0.85）；
   - 底部指示金線隱藏（`activeIndicator.opacity = 0`）。
2. **選中啟動態 (`ACTIVE`)**：
   - 圖示高亮為琉璃璀璨金（`#ECC94B`，Opacity 1.0）；
   - 底部指示金線浮現，寬度以 Tween 0.15s 自中央展開至 40px；
   - **硬性約束**：切換狀態僅變更材質色彩與 Alpha，**絕對禁止修改按鈕之寬高尺寸（禁止 Scale 放大）**，防止引發整列 Tab 排版震顫（Layout Reflow）。
3. **未解鎖態 (`DISABLED`)**：
   - 如新角色未開啟血脈時，命頁圖示置灰（`#4A5568`，Opacity 0.4）；
   - 右上角覆蓋 12x12 銅鎖小標記（`ic_lock_mini.png`）；點擊彈出「需武將達成 1 轉解鎖」提示 Toast。

---

## 4. 代碼接線契約

```typescript
export interface TabButtonVisualState {
  tabKey: "OVERVIEW" | "STATS" | "BLOODLINE" | "TACTICS" | "EQUIP" | "APTITUDE";
  state: "IDLE" | "ACTIVE" | "DISABLED";
  touchTargetSize: { width: 64; height: 72 };
  iconSize: { width: 36; height: 36 };
  labelKey: string;                // 對應 doc_spec_0654 i18n
}
```
