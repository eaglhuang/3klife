<!-- doc_id: doc_spec_0695 -->
# 3KLife 多語系UI文字動態長度自適應縮放與截斷防護規格書

> **規格代碼**：SPEC-UI-I18N01  
> **關聯 WBS**：I18N-COMPAT-01（多語系 UI 文字長度自適應與截斷防護）  
> **文件版本**：v1.0.0 (單一真相來源，無補丁整併版)  
> **所屬系統**：UI 介面與視覺工程（UI Architecture & Art Pipeline）

---

## 1. 核心宗旨與設計哲學

本遊戲發行包含繁體中文、簡體中文、英文與日文。英文譯文通常比中文原句長 1.8 至 2.5 倍，日文亦常因平假名及片假名膨脹版面。若 UI 採用寫死之固定寬度與字型大小，將導致災難性之文字遮蔽、超出按鈕或版面撕裂。本規格書制定全域 UI 文字之**四大動態自適應溢出處理模式（Overflow Adaptations）**與**靜態溢出審查門禁**。

---

## 2. 四大動態自適應模式與排版約束

| 元件類別 (Component Type) | 溢出模式 (Overflow Mode) | 縮放與截斷策略 (Strategy) | 最小縮放極限 (Min Size) | 溢出防護 (Fallback) |
|---|---|---|---|---|
| **按鈕文案 (Button Label)** | `Label.Overflow.SHRINK` | 自動等比縮小字體以塞入按鈕內部 | 原字號之 $70\%$ (如 28pt $\rightarrow$ 20pt) | 若達 $70\%$ 仍超限，觸發兩側水平 Padding 自動壓縮 $20\%$。 |
| **彈窗標題 (Modal Header)** | `Label.Overflow.SHRINK` | 自動縮放字型以完全容納標題 | 原字號之 $80\%$ | 若仍超限，自動換行並同步撐高頂部標題列。 |
| **物品名牌 (Item/Skill Name)** | `Label.Overflow.CLAMP` | 單行顯示，寬度超限末尾自動補 `...` | 不縮小 (維持設計層級) | 點擊或長按浮現透明水墨 Tooltip Toast 顯示完整名稱。 |
| **劇情對話 (Story/Lore Body)** | `Label.Overflow.RESIZE_HEIGHT` | 水平固定寬度，垂直依內容動態撐高 | 不縮小 | 外層必須掛載 `ScrollView`，動態刷新 Content 容器高度。 |

---

## 3. 自動化溢出靜態審查與資料介面

CI 建置管線透過 `tools_node/audit-i18n-overflow.js` 進行多語寬度仿真預算：

```typescript
export interface I18nOverflowRule {
  componentType: 'BUTTON' | 'HEADER' | 'BADGE' | 'BODY';
  overflowMode: 'SHRINK' | 'CLAMP' | 'RESIZE_HEIGHT';
  minScaleFactor: number;             // 如 0.70
  maxCharactersPerLine: {
    'zh-TW': number;                  // 繁中字數
    'en': number;                     // 英文大約 2.2 倍字元
    'ja': number;                     // 日文約 1.4 倍字元
  };
}

export interface I18nAuditReport {
  scannedKeysCount: number;
  overflowRiskKeys: Array<{
    i18nKey: string;
    language: string;
    textLength: number;
    recommendedAction: string;
  }>;
  hasBlockingViolations: boolean;     // 若按鈕文字溢出且縮小仍超限則為 true
}
```

- **發布硬約束**：全域 i18n 鍵值在英文環境下，若按鈕文字縮放至 $70\%$ 後寬度依然溢出容器，CI 閘門立即阻斷建置。

---

## 4. 驗收測試案例 (Test Cases)

- **TC-I18N-COMPAT-01【英文長按鈕文字自動縮放】**：切換為英文語系，將「命鏡洗髓」顯示為「Bloodline Mirror Cleansing」，按鈕字號自 26pt 平滑縮小為 19pt，無字母溢出按鈕邊界。
- **TC-I18N-COMPAT-02【物品名牌省略號與 Tooltip 互動】**：超長戰法名稱「諸葛孔明七星禳星續命陣」在小卡片槽中顯示為「諸葛孔明七星...」，點擊後跳出 Tooltip 完整浮窗。
- **TC-I18N-COMPAT-03【ScrollView 垂直高度動態自適應】**：英文版生平敘事篇幅比中文版長 120%，對話面板 Content 高度由 400px 動態重算為 780px，滾動條正常可用，無文字重疊。
