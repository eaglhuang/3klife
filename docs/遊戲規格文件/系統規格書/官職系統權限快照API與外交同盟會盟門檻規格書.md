<!-- doc_id: doc_spec_0591 -->
# 官職系統權限快照API與外交同盟會盟門檻規格書

> 標記：Single Source of Truth（單一真相來源）  
> 涵蓋工作包：`OFC-04`、`OFC-07`  
> 狀態：正式發布 / 核心邏輯規格

---

## 1. 系統定位與架構

本模組規範朝廷官職體系中「權限快照 API（`OfficerPermissionsSnapshot`）」的單向唯讀資料流，以及官職階位解鎖的「外交盟約、聯盟文書與反霸權會盟」門檻判定。業務系統（任務牆、沙盤、太守府治理、AI 外交決策）嚴禁直接修改 `OfficerState`，必須統一透過不可變權限快照取用權限，達成模組解耦。

```mermaid
flowchart TD
    OfficerState[官職狀態 OfficerState] --> GenSnapshot[生成快照 getPermissionsSnapshot]
    GenSnapshot --> Snapshot[不可變權限快照 OfficerPermissionsSnapshot]

    Snapshot --> TaskWall[雙牆: 任務難度與欄位]
    Snapshot --> WorldMap[沙盤: S1/S2/S3 階段與標記]
    Snapshot --> Diplomacy[外交: 聯盟文書與反霸權會盟]

    subgraph 外交權限閘門 (OFC-07)
        Diplomacy --> CheckTier{官職階位}
        CheckTier -- "< TIER_4" --> DenyAlliance[無法發起聯盟文書]
        CheckTier -- ">= TIER_4" --> AllowAlliance[開放簽署雙邊聯盟文書]
        CheckTier -- ">= TIER_5" --> AllowCoalition[解鎖反霸權合縱高階會盟]
    end
```

---

## 2. 官職權限快照 API 規格（OFC-04）

### 2.1 權限快照資料模型
```typescript
export type OfficerTier = 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_4' | 'TIER_5';

export interface IOfficerPermissionsSnapshot {
  readonly tier: OfficerTier;
  readonly tierName: string;
  readonly maxTaskWallSlots: number;         // 任務牆可接任務數（2 ~ 5）
  readonly allowedTaskDifficulties: readonly string[]; // 允許承接之難度
  readonly sandTableStageUnlocked: 'S1' | 'S2' | 'S3';  // 世界沙盤可見階段
  readonly maxMapMarkers: number;            // 沙盤標記上限（3 ~ 10）
  readonly canInitiateAlliance: boolean;     // 聯盟文書權限（TIER_4 開啟）
  readonly canFormCoalition: boolean;        // 反霸權高階會盟權限（TIER_5 開啟）
  readonly snapshotTimestamp: number;
}
```

### 2.2 快照生成演算法
```typescript
export function createOfficerPermissionsSnapshot(tier: OfficerTier): IOfficerPermissionsSnapshot {
  const configs: Record<OfficerTier, Omit<IOfficerPermissionsSnapshot, 'tier' | 'snapshotTimestamp'>> = {
    TIER_5: {
      tierName: '大將軍',
      maxTaskWallSlots: 5,
      allowedTaskDifficulties: ['EASY', 'NORMAL', 'HARD', 'NIGHTMARE', 'HELL'],
      sandTableStageUnlocked: 'S3',
      maxMapMarkers: 10,
      canInitiateAlliance: true,
      canFormCoalition: true,
    },
    TIER_4: {
      tierName: '偏將軍',
      maxTaskWallSlots: 4,
      allowedTaskDifficulties: ['EASY', 'NORMAL', 'HARD', 'NIGHTMARE'],
      sandTableStageUnlocked: 'S2',
      maxMapMarkers: 7,
      canInitiateAlliance: true,
      canFormCoalition: false,
    },
    TIER_3: {
      tierName: '裨將軍',
      maxTaskWallSlots: 3,
      allowedTaskDifficulties: ['EASY', 'NORMAL', 'HARD'],
      sandTableStageUnlocked: 'S2',
      maxMapMarkers: 5,
      canInitiateAlliance: false,
      canFormCoalition: false,
    },
    TIER_2: {
      tierName: '中郎將',
      maxTaskWallSlots: 3,
      allowedTaskDifficulties: ['EASY', 'NORMAL'],
      sandTableStageUnlocked: 'S1',
      maxMapMarkers: 4,
      canInitiateAlliance: false,
      canFormCoalition: false,
    },
    TIER_1: {
      tierName: '校尉',
      maxTaskWallSlots: 2,
      allowedTaskDifficulties: ['EASY'],
      sandTableStageUnlocked: 'S1',
      maxMapMarkers: 3,
      canInitiateAlliance: false,
      canFormCoalition: false,
    },
  };

  return {
    tier,
    ...configs[tier],
    snapshotTimestamp: Date.now(),
  };
}
```

---

## 3. 外交與會盟權限閘門規則（OFC-07）

1. **聯盟文書（Bilateral Alliance）**：
   - 門檻：當前官職達 `TIER_4`（偏將軍）以上。
   - 未達階位者在外交面板發起盟約時，系統以 `UI_OFFICER_RESTRICT` 提示：「官階未達偏將軍，無權簽署國書」。
2. **反霸權高階會盟（Anti-Hegemony Coalition）**：
   - 門檻：當全圖出現佔地 $\ge 30\%$ 霸權時，發起討伐同盟需具備 `TIER_5`（大將軍）。低於此階僅能響應 NPC 霸主號召入盟，不可主導會盟。

---

## 4. 驗收與測試標準

1. **快照不可變性測試（TC-OFC-04-01）**：
   - 驗證外部系統透過 `createOfficerPermissionsSnapshot` 取得之快照物件受唯讀約束。
2. **外交聯盟門檻校驗（TC-OFC-07-01）**：
   - 官職為 `TIER_3` 時 `canInitiateAlliance === false`；升至 `TIER_4` 瞬間變為 `true`。
3. **會盟主導權檢驗（TC-OFC-07-02）**：
   - 檢核僅 `TIER_5` 快照回傳 `canFormCoalition === true`。
