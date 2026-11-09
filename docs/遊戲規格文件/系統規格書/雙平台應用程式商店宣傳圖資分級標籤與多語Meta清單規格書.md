<!-- doc_id: doc_spec_0697 -->
# 3KLife 雙平台應用程式商店宣傳圖資分級標籤與多語Meta清單規格書

> **規格代碼**：SPEC-OPS-STORE01  
> **關聯 WBS**：STORE-METADATA-01（雙平台商店宣傳圖資、分級標籤與多語 Meta）  
> **文件版本**：v1.0.0 (單一真相來源，無補丁整併版)  
> **所屬系統**：數值、架構與底層支援（Formula, Architecture & Backend）

---

## 1. 核心宗旨與設計哲學

為確保本遊戲順利發布於 Apple App Store 與 Google Play Store，杜絕因宣傳素材尺寸不符、透明通道違規、多語文字超出字數限制或年齡分級申報矛盾所導致之商店退件，本規格書制定全域**商店宣傳圖資規格矩陣**、**年齡分級標籤標準**與**多語系商店 Meta 資料清單**。

---

## 2. 雙平台宣傳圖資規格矩陣 (Visual Assets Matrix)

| 資產類型 (Asset Type) | 目標平台 | 精確解析度 (Resolution) | 檔案格式與色彩規範 | 安全邊距與約束 (Constraints) |
|---|---|---|---|---|
| **App Icon (主圖示)** | Apple App Store | $1024\times 1024\text{px}$ | 24-bit PNG，**嚴禁透明度 (No Alpha)** | 直角邊緣，由蘋果系統自動裁切圓角。 |
| **App Icon (主圖示)** | Google Play | $512\times 512\text{px}$ | 32-bit PNG (含 Alpha)，最大 1MB | 直角邊緣，色彩空間 sRGB。 |
| **Feature Graphic (置頂橫幅)** | Google Play | $1024\times 500\text{px}$ | 24-bit PNG 或 JPEG，最大 15MB | 核心角色與文字必須置於中央 $85\%$ 安全區。 |
| **手機展示截圖 (Screenshots)** | iOS (6.7" & 6.5") | $1290\times 2796\text{px}$ | 24-bit PNG，垂直橫向皆可 | 5 張一組，展示命鏡、戰鬥、大廳、子嗣傳承。 |
| **手機展示截圖 (Screenshots)** | Android 手機 | $1080\times 2400\text{px}$ | 24-bit PNG 或 JPEG | 長寬比 20:9，無多餘系統導航列。 |

---

## 3. 年齡分級與多語 Meta 文本字典

### 3.1 國際年齡分級審查標準 (Age Ratings)

- **IARC 分級**：`12+`（輕微虛擬歷史戰鬥衝突，無血腥殘肢，無成人內容）。
- **Apple 分級**：`12+`（頻繁/輕微的卡通或虛擬暴力）。
- **台灣分級**：`輔導 12 歲級`（戀愛交友、暴力打鬥）。

### 3.2 多語 Meta 字數硬約束表

```typescript
export interface StoreMetadataLocale {
  locale: 'zh-TW' | 'zh-CN' | 'en' | 'ja';
  appTitle: string;                   // 雙平台硬上限 30 字元
  subtitle: string;                   // iOS 上限 30 字元；Google 短說明上限 80 字元
  keywords: string[];                 // iOS 專用，總逗號字串上限 100 字元
  fullDescription: string;            // 雙平台上限 4000 字元
}
```

- **繁體中文範例 (zh-TW)**：
  - `appTitle`：「三國人生：命鏡傳承」 (10 字)
  - `subtitle`：「三國養成策論手牌，開宗立派世代傳承」 (20 字)
  - `keywords`：`["三國", "策略", "養成", "武將", "卡牌", "三國志"]`

---

## 4. 驗收測試案例 (Test Cases)

- **TC-STORE-META-01【iOS 主圖示 Alpha 通道自動審計】**：腳本自動掃描 iOS 宣傳圖示，若檢測到 PNG 包含 Alpha 通道（32-bit），立即判定不合格並自動轉換為 24-bit RGB。
- **TC-STORE-META-02【商店標題 30 字元上限攔截】**：輸入長度為 32 字元的測試標題，審查器及時攔截並拋出 `STORE_TITLE_OVERFLOW` 警告。
- **TC-STORE-META-03【置頂橫幅安全區覆蓋率檢測】**：校驗 Google Play 橫幅圖資，確認所有重要文案均位於中心 85% 區域內，邊緣無文字被截斷。
