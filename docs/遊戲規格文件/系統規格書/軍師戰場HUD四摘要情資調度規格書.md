<!-- doc_id: doc_spec_0352 -->
# 軍師戰場HUD四摘要情資調度規格書

> **文件狀態**：單一真相來源（Single Source of Truth）  
> **系統代碼**：`LVL-06`、`SYS-STRATEGIST-HUD`  
> **核心職責**：確立戰鬥主介面中「軍師 HUD」四欄戰場摘要情資（環境危害/互動物件狀態/打撈收益/配置缺口）之調度協議、事件訂閱驅動管線，以及恪守戰場迷霧之隱私安全邊界。

---

## 1. 軍師 HUD 四摘要面板架構

軍師 HUD（Strategist HUD）置於戰鬥螢幕右上方，提供戰局全局情資摘要：

| 摘要欄位 (Field) | 資料來源 (Source) | 呈現內容與格式 | 刷新時機 (Trigger) |
|---|---|---|---|
| **Theme_Hazard** | `BattleTileEffectPhase` | 當前環境危害（如：【火海延燒 3格】【濃霧蔽日】） | 回合初/地格狀態改變時 |
| **Interactive_Object_Status**| `InteractiveObjectManager`| 戰術物件存活率與狀態（如：水閘 100%、敵糧倉 45%） | 物件遭受攻擊或觸發時 |
| **Stage_Salvage_Summary** | `StageSalvageCollector` | 戰鬥中累積截獲資源（如：石材 +200、糧草 +450） | 擊破物件或斬將掠奪時 |
| **Recommended_Loadout_Gap** | `LoadoutEvaluator` | 出陣配置缺口提示（如：【缺少水戰適性部隊】） | 戰鬥全程常駐警示 |

---

## 2. 戰場迷霧與隱私安全協議（Fog of War Protocol）

> **軍師情報鐵律**：軍師 HUD 僅彙整**已知、已發生或全局公開之戰場宏觀情資**：
1. **嚴禁洩漏埋伏點**：處於 `Stealth(Forest)` 或迷霧中之敵軍，HUD 絕對不顯示其坐標、血量與兵種。
2. **嚴禁洩漏 AI 行進路徑**：敵方部隊下一回合之移動預判向量嚴格保密，禁止在 HUD 或地圖路徑線中提前繪製。

---

## 3. 資料管線與事件訂閱契約

軍師 HUD 嚴格遵循 Reactive 事件驅動，禁止在 Update 迴圈中逐幀輪詢：

```typescript
export interface StrategistHudState {
  themeHazards: Array<{ tag: string; label: string; turnsLeft: number }>;
  interactiveObjects: Array<{ name: string; hpPercent: number; state: string }>;
  accumulatedSalvage: { wood: number; stone: number; grain: number };
  loadoutGaps: string[];
}

export class StrategistHudBridge {
  private currentState: StrategistHudState;

  public onTileStateChanged(hazards: StrategistHudState['themeHazards']): void {
    this.currentState.themeHazards = hazards;
    this.notifyHudUpdate();
  }

  public onObjectDamaged(objectId: string, hpPercent: number, state: string): void {
    const target = this.currentState.interactiveObjects.find(o => o.name === objectId);
    if (target) {
      target.hpPercent = hpPercent;
      target.state = state;
      this.notifyHudUpdate();
    }
  }

  private notifyHudUpdate(): void {
    // 透過 BattleUIBridge 發送精簡增量更新
  }
}
```

---

## 4. 驗收標準與 CI 閘門（Acceptance Criteria）

1. **事件驅動無幀輪詢**：
   - 程式碼審查確認 HUD 更新邏輯完全掛載於事件回調，無每幀 query 消耗。
2. **迷霧隱私隔離測試**：
   - 單元測試模擬敵軍進入掩體，檢核 HUD 回傳之摘要資料不包含該單位任何隱私資訊。
3. **戰後 Salvage 正確對齊**：
   - HUD 顯示之累計打撈物資與戰鬥結算報告數值 100% 一致。
