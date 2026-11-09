<!-- doc_id: doc_spec_0368 -->
# 場景戰法六種設定檔JSON資料驅動結構規格書

## 1. 核心定位與資料驅動契約

本規格書為六大特殊場景戰法設定資料表（Scene Presets JSON Data Source，代號 `SCN-01`）的單一真相來源（Single Source of Truth）。為符合架構解耦與資料驅動原則，將硬編碼常數全面遷移至 `assets/resources/data/scene-presets.json`，提供戰場加載器（`BattleSceneLoader`）與環境調度器（`SceneGambitAdapter`）統一載入。

```typescript
export interface ScenePresetConfig {
  version: number;
  presets: Record<string, ScenePresetEntry>;
}

export interface ScenePresetEntry {
  sceneId: string;
  tacticId: string;
  tacticName: string;
  intThreshold: number;
  intelThreshold: number;
  tilePreset: {
    normal: number;
    stealth: number;
    hazard: number;
    forceMove: number;
  };
  bgKey: string;
  bgmTrack: string;
}
```

---

## 2. 六大場景資料表完整定義

| 場景識別碼 (`sceneId`) | 戰術識別碼 (`tacticId`) | 戰術中文名稱 | 智力門檻 | 情報門檻 | 地格分佈比例 (`normal / stealth / hazard / forceMove`) | 背景資源 (`bgKey`) |
|---|---|---|:---:|:---:|---|---|
| `SCENE_FOREST_AMBUSH` | `scene-ambush-attack` | 森林伏兵 | 75 | 45 | `{ normal: 20, stealth: 60, hazard: 20, forceMove: 0 }` | `bg_forest_dense` |
| `SCENE_NIGHT_RAID` | `scene-night-raid` | 夜襲奇襲 | 70 | 40 | `{ normal: 70, stealth: 0, hazard: 30, forceMove: 0 }` | `bg_canyon_night` |
| `SCENE_CANYON_ROCK` | `scene-rock-slide` | 峽谷落石 | 65 | 0 | `{ normal: 30, stealth: 0, hazard: 40, forceMove: 30 }` | `bg_canyon_day` |
| `SCENE_FLOOD` | `scene-flood-attack` | 水淹圍堵 | 80 | 0 | `{ normal: 20, stealth: 0, hazard: 30, forceMove: 50 }` | `bg_river_flood` |
| `SCENE_FIRE_RAID` | `scene-fire-attack` | 火攻偷襲 | 75 | 0 | `{ normal: 40, stealth: 0, hazard: 60, forceMove: 0 }` | `bg_plains_fire` |
| `SCENE_SIEGE` | `scene-siege` | 攻城戰役 | 60 | 0 | `{ normal: 50, stealth: 0, hazard: 30, forceMove: 20 }` | `bg_city_wall` |

---

## 3. 資料檢驗與格式校驗規則

1. **百分比整數檢定**：
   - 每一筆場景之 `tilePreset` 比例必須為非負整數（$\ge 0$），且四類地格比例加總嚴格等於 100：
     $$\text{normal} + \text{stealth} + \text{hazard} + \text{forceMove} = 100$$
2. **門檻數值合理區間**：
   - 智力門檻 $\text{intThreshold} \in [50, 95]$。
   - 情報門檻 $\text{intelThreshold} \in [0, 80]$。未明定情報門檻者預設填入 0（無門檻要求）。
3. **安全回退（Safe Fallback）**：
   - 若資料庫遺漏某場景之定義，系統回退至常規空白戰場：門檻為 0，地格預設全數為 `normal: 100`，背景套用 `bg_normal_day`。

---

## 4. 運行期載入與快取契約

1. **加載時序**：
   - 在進入 `BattleScene` 前，由 `BattleSceneLoader` 透過 Cocos 資源管線（`resources.load('data/scene-presets')`）以非同步方式完成快取。
2. **記憶體生命週期**：
   - 載入後駐留於靜態記憶體配置表，在切換不同戰鬥場景時重複引用，杜絕每場戰鬥重複解析 JSON 所衍生之垃圾回收（GC）延遲。

---

## 5. 自動化測試與驗收標準

1. **單元測試對齊**：
   - 對齊 `tests/SceneTilePresets.test.ts` 與 `tests/SceneGambitTrigger.test.ts`。
   - 驗收條件 1：驗證 6 種場景定義完整包含智力/情報門檻與地格比例四大欄位。
   - 驗收條件 2：驗證未在配置表之未知場景（Unknown Scene）正確退回常規 100% normal 設定。
   - 驗收條件 3：驗證全量配置表經 `validateSceneTilePresets` 檢定回傳 0 錯誤。
