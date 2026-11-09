<!-- doc_id: doc_spec_0355 -->
# 虎符卡面UI佈局與部隊卡圖備援渲染規格書

> **文件狀態**：單一真相來源（Single Source of Truth）  
> **系統代碼**：`TRP-16`、`TRP-17`、`SYS-TALLY-UI-FALLBACK`  
> **核心職責**：確立三十四營特殊兵種虎符卡面尺寸（287×142）、四大核心資訊欄位排版標準，以及部隊卡面素材缺失時之動態優雅降級（Fallback to `troops.png`）渲染協定。

---

## 1. 卡面尺寸與視覺元件排版規格

所有虎符卡片（`TigerTallyComposite`、`EliteTroopCodexComposite`）統一採用橫向矩形規格：

```
┌────────────────────────────────────────────────────────────────────────┐
│ [左側 287x142 背景層]                               [右上: 星級徽章 1~5]│
│  - 動態部隊美術 (troops_*.png)                                         │
│  - 底層漸變暗角遮罩 (gradient_overlay)             [右中: 兵種與營別]  │
│                                                     - 營別名稱 (如: 白毦兵)│
│ [左下: 核心約束四標籤]                              - 糧耗: 80 斛/次    │
│  - 投入兵力: 1,500 (固定)                          - 共鳴倍率: +50%     │
│  - 場上限額: 1 隊 (唯一)                            - 專屬戰法名稱      │
└────────────────────────────────────────────────────────────────────────┘
```

### 1.1 四大核心必備資訊欄位
1. **投入兵力標籤**：全域固定為 **1,500 兵力**，不可自定義增減，字體大小 14sp。
2. **出征糧草消耗**：以斛為單位（如 `UI_TALLY_GRAIN_COST`），鮮黃色高亮標示。
3. **星級共鳴倍率**：依當前星階顯示增幅（如 1 星 $+0\%$、3 星 $+50\%$、5 星 $+100\%$）。
4. **全場限額警示**：明確標註「全場限調遣 1 隊」，防止玩家誤判可多隊複製出陣。

---

## 2. 部隊卡圖動態備援渲染管線（Dynamic Fallback Pipeline）

為防止部分特殊兵種專屬美術立繪在開發或熱更新期間缺失導致介面破圖或拋出異常，渲染引擎實施動態降級守則：

```
[請求加載: troops_{campId}.png] ──(存在)──> [正常渲染專屬卡圖]
             │
          (缺失/損壞)
             ↓
[優雅降級: 安全載入通用 troops.png] ──> [日誌發送 Warning 警告] ──> [正常渲染通用卡圖]
```

> **零破圖鐵律**：無論任何情況，禁止在介面上出現粉紅色缺失方塊（Missing Texture）或空白節點；若通用 `troops.png` 亦不可讀，則渲染預設純色底板搭配金屬邊框。

---

## 3. TypeScript 資源加載適配器

```typescript
export class TallyCardArtLoader {
  private static readonly FALLBACK_PATH = 'ui/tiger-tally/card-art/troops';
  private static readonly BASE_DIR = 'ui/tiger-tally/card-art/';

  public static async loadCardArt(campId: string): Promise<string> {
    const specificPath = `${this.BASE_DIR}troops_${campId.toLowerCase()}`;
    const exists = await this.checkAssetExists(specificPath);
    if (exists) {
      return specificPath;
    }
    console.warn(`[TallyCardArtLoader] Missing art for ${campId}, fallback to default.`);
    return this.FALLBACK_PATH;
  }

  private static async checkAssetExists(path: string): Promise<boolean> {
    // 透過 Cocos resources.load 或快取字典確認資源存在性
    return true;
  }
}
```

---

## 4. 驗收標準與 CI 閘門（Acceptance Criteria）

1. **尺寸與排版規格符合率**：
   - 卡片在 1080p 與 720p 設備上均嚴格維持 287×142 寬高比，四項標籤無文字溢出。
2. **缺圖無痛回退測試**：
   - 傳入未定義之假營別代碼（如 `troops_unknown.png`），確認能秒級回退至 `troops.png` 且無例外。
3. **單元測試涵蓋**：
   - 驗證 34 營卡面設定檔皆包含兵力、糧耗、星級與路徑欄位。
