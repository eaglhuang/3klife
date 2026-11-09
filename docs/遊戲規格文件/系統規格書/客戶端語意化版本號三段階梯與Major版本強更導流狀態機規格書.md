<!-- doc_id: doc_spec_0657 -->
# 客戶端語意化版本號三段階梯與Major版本強更導流狀態機規格書

> **所屬模組**：`3.6 數值、架構與底層支援 (HOT-01)`  
> **單一真相來源**：定義客戶端語意化版本號（`Major.Minor.Patch`）演進階梯、熱更新邊界限制，以及當主版號不相容時觸發不可繞過之商店強更導流狀態機。

---

## 1. 語意化版本號三段階梯與熱更邊界

本專案採嚴格之語意化版本規範（`X.Y.Z`），嚴格劃定各階梯之發佈與更新邊界：

```
+-------------------------------------------------------------------------+
| [Major (X)] : 核心架構/引擎升級/原生SDK變更 -> 嚴禁熱更，強制商店全量安裝  |
+-------------------------------------------------------------------------+
| [Minor (Y)] : 全新玩法/大型節慶場景/系統擴展 -> 支援 Asset Bundle 差異下載 |
+-------------------------------------------------------------------------+
| [Patch (Z)] : 緊急缺陷修復/配表調整/文案潤飾 -> 支援純腳本輕量熱修復     |
+-------------------------------------------------------------------------+
```

| 階梯級別 | 範例 | 觸發場景 | 更新途徑 | 是否允許進遊戲 |
|:---:|:---:|:---|:---|:---:|
| **Major (X)** | `2.0.0` | 引擎版本升級、原生第三方 SDK 抽換、不可逆存檔架構顛覆 | 應用商店（App Store / Google Play / TapTap） | **完全阻斷 (強制導流)** |
| **Minor (Y)** | `1.5.0` | 新增世家天下玩法、大廳晝夜節慶、新英雄卡池 | Asset Bundle CDN 差異下載（HotUpdateScene） | 完成差異下載後進入 |
| **Patch (Z)** | `1.4.2` | 戰鬥傷害溢出修復、文案錯字修正、數值常數微調 | 登入前靜默腳本覆蓋（1 秒內完成） | 直接進入 |

---

## 2. 登入前版本校驗協議

在啟動遊戲進入標題前，客戶端發起版本校驗請求：
```http
POST /api/version/check
Content-Type: application/json

{
  "clientVersion": "1.4.1",
  "platform": "ANDROID",
  "channelId": "OFFICIAL",
  "deviceId": "dev-a89c-34f1"
}
```

伺服端依據各平台最新版本清單回傳指示：
```json
{
  "status": "FORCE_UPDATE",
  "minSupportedMajor": 2,
  "latestVersion": "2.0.1",
  "storeUrl": "https://play.google.com/store/apps/details?id=com.eaglhuang.threekingdomslife",
  "title": "版本更新公告",
  "updateNotes": "全新 2.0 門閥勢力資料片上線！請前往商店下載最新版本以繼續遊玩。",
  "packageSizeBytes": 854200100
}
```

---

## 3. Major 強更導流狀態機（ForceUpdateStateMachine）

當伺服器回傳 `status === "FORCE_UPDATE"` 或客戶端比對發現 `client.major < server.minSupportedMajor` 時，啟動強更阻斷狀態機：

```
                [啟動遊戲: 版本校驗]
                         |
           [client.major < minSupportedMajor ?]
               /                       \
             [是]                     [否]
              |                         |
       [進入 FORCE_UPDATE 態]      [進入 Minor/Patch 熱更檢查]
              |
    [彈出 StoreRedirectModal]
    - 無關閉按鈕 (X)
    - 阻斷 ESC 鍵 / Android 返回鍵
    - 禁止背景遮罩點擊穿透
              |
      [玩家點擊「前往更新」]
              |
     [調用原生平台 Deep Link]
     - Android: market://details?id=...
     - iOS: itms-apps://itunes.apple.com/app/id...
              |
       [掛起/退出遊戲進程]
```

---

## 4. 客戶端 UI 契約與資料模型

```typescript
export interface ForceUpdateDialogSpec {
  dialogType: "MODAL_BLOCKING";
  allowClose: false;               // 強制禁止關閉
  allowBackgroundDismiss: false;   // 強制禁止背景點擊
  allowHardwareBack: false;        // 強制禁止安卓返回鍵穿透
  titleText: string;
  updateNotesMarkdown: string;
  confirmButtonText: "前往商店更新";
  targetStoreUrl: string;
}
```

- **單一真相約束**：強更判定邏輯收攏於 `VersionGateManager`，任何遊戲場景不得在未完成版本檢驗前提前載入業務模組。
