<!-- doc_id: doc_spec_0704 -->
# 3KLife 戰鬥區塊特效註冊表與組合配方Recipe資料結構規格書

> **規格代碼**：SPEC-VFX-BLOCK01  
> **關聯 WBS**：VFX-BLOCK-01（戰鬥原子特效區塊註冊表、組合配方 Recipe 資料結構與時間軸同步）  
> **系統分類**：戰鬥系統 / 前端渲染與視覺管線  
> **狀態**：正式生效（單一真相來源，嚴禁尾端追加補丁）

---

## 1. 系統架構定位與設計哲學

本規格書定義《三國人生》（3KLife）戰鬥場景中，技能打擊、奧義演出與受擊反饋的特效管線骨架。為避免單獨製作大量獨立 Prefab 導致資產膨脹與 DrawCall 碎裂，本系統採用「原子區塊（Vfx Block）+ 組合配方（Combo Recipe）」架構：
1. **原子特效區塊（Vfx Block）**：基礎動態單元（斬擊、爆發、氣場、地裂、符文、飄散），共用全域戰鬥特效圖集（`vfx-atlas.png`）。
2. **組合配方（Combo Recipe）**：透過時間軸軌道（Timeline Tracks）在運行期拼裝專屬奧義，實現高表現力與極致資產復用。

---

## 2. 原子特效區塊定義（IVfxBlockDef）

```typescript
export enum VfxBlockCategory {
  SLASH = 'SLASH',       // 刀光劍影斬擊
  IMPACT = 'IMPACT',     // 受擊爆發與衝擊波
  AURA = 'AURA',         // 蓄力氣場與環形靈光
  QUAKE = 'QUAKE',       // 地裂與碎石飛濺
  SIGIL = 'SIGIL',       // 命格法陣與古篆符文
  DEBRIS = 'DEBRIS'      // 水墨殘葉與飄散煙霧
}

export interface IVfxBlockDef {
  readonly blockId: string;                 // 原子區塊唯一識別碼 (如: BLK_SLASH_DRAGON_01)
  readonly category: VfxBlockCategory;     // 類別列舉
  readonly atlasFrame: string;              // 映射圖集幀名稱 (在 vfx-atlas 內)
  readonly durationMs: number;              // 播放生命週期毫秒數
  readonly blendMode: 'NORMAL' | 'ADD';     // 混合模式 (ADD 支援疊加亮光)
  readonly defaultScale: number;            // 預設縮放基準
  readonly hasParticleEmitter: boolean;     // 是否附加粒子發射器
  readonly sfxCueId?: string;               // 關聯音效識別碼 (可選)
  readonly screenShake?: {                  // 畫面震動參數 (可選)
    readonly intensity: number;             // 震動幅度 (像素)
    readonly durationMs: number;            // 震動持續時間
  };
}
```

---

## 3. 組合配方資料結構（IVfxRecipeDef）

組合配方將多個原子區塊沿時間軸串接，並與名將關鍵打擊幀（Hit Frame）對齊：

```typescript
export interface IVfxTrackKeyframe {
  readonly offsetMs: number;                // 相對於配方啟動的時間偏移 (毫秒)
  readonly blockId: string;                 // 呼叫之原子區塊識別碼
  readonly anchorTarget: 'SELF' | 'TARGET' | 'SCREEN_CENTER'; // 座標錨點
  readonly positionOffset: { x: number; y: number };          // 相對位移
  readonly rotationDeg: number;             // 初始旋轉角度 (度)
  readonly scaleMultiplier: number;         // 縮放倍率乘數
  readonly zIndexOffset: number;            // 圖層深度偏移 (-10: 背景, +10: 最前層)
  readonly triggerDamage: boolean;          // 本幀是否為判定扣血與暴擊之判定點
}

export interface IVfxRecipeDef {
  readonly recipeId: string;                // 配方唯一識別碼 (如: RECIPE_GUANYU_CHINGLUNG)
  readonly generalId?: string;              // 綁定名將識別碼 (通用技能則為空)
  readonly totalDurationMs: number;         // 配方總演出時長 (毫秒)
  readonly tracks: readonly IVfxTrackKeyframe[]; // 時間軸軌道清單
  readonly interruptible: boolean;          // 是否可被受擊打斷 (奧義為 false)
  readonly cameraZoomRatio?: number;        // 特寫鏡頭推近倍率 (如 1.25)
}
```

---

## 4. 戰鬥時序同步與判定回調規則

1. **時間基準（Time Sync）**：特效播放時間軸嚴格依賴戰鬥狀態機 DeltaTime 推進，禁止使用 `setTimeout`，確保戰鬥暫停與 2x 倍速時完全同步。
2. **打擊結算點（Hit Trigger）**：當配方時間軸行進至標註 `triggerDamage: true` 之關鍵幀時，發送 `EVENT_BATTLE_HIT_CONFIRMED` 事件驅動飄字與扣血，杜絕音畫脫節。
3. **安全防線**：若 `blockId` 在 `VfxBlockRegistry` 遺失，管線自動降級使用 `BLK_FALLBACK_SLASH` 並記錄警告，禁止拋出例外導致戰鬥畫面凍結。
