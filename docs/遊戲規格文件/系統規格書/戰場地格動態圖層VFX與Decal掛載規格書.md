<!-- doc_id: doc_spec_0348 -->
# 戰場地格動態圖層VFX與Decal掛載規格書

> **文件狀態**：單一真相來源（Single Source of Truth）  
> **系統代碼**：`GRD-05`、`SYS-TILE-VISUAL-LAYER`  
> **核心職責**：確立戰場網格視覺層（Decal 貼花與 VFX 粒子）之資料驅動掛載協定，實現「單一危害邏輯（Hazard）、多套視覺表現（火海/毒沼/落石）」，並規範物件池（Object Pooling）與記憶體回收策略，避免戰鬥卡頓。

---

## 1. 邏輯與視覺徹底解耦架構

戰鬥邏輯層僅處理 `TileStateType`（`Hazard`、`ForceMove`、`Stealth`）與傷害數值，不包含任何具體 Cocos Prefab 或節點操作。視覺表現由 `TileVisualBindingRegistry` 依據地格效果標籤（`effectTag`）動態掛載：

```
[戰鬥邏輯: Hazard(50傷)] ──(effectTag: "fire")──> [視覺層: 熔岩Decal + 烈焰VFX]
[戰鬥邏輯: Hazard(50傷)] ──(effectTag: "poison")─> [視覺層: 腐蝕Decal + 瘴氣VFX]
```

---

## 2. 視覺圖層掛載契約（Visual Decal & VFX Profile）

| 表現標籤 (Tag) | 地表貼花 (Decal) | 粒子特效 (VFX) | 動畫時長與循環 | 音效觸發 (SFX) |
|---|---|---|:---:|---|
| `hazard_fire` | `decal_ground_scorched.png` | `vfx_flame_burst` | 循環燃燒 (Loop) | `sfx_fire_burn_loop` |
| `hazard_poison` | `decal_ground_toxic.png` | `vfx_poison_mist` | 緩慢升騰 (Loop) | `sfx_acid_bubble` |
| `force_move_water` | `decal_water_ripple.png` | `vfx_water_surge` | 單次位移 (Once, 0.4s)| `sfx_water_flood` |
| `stealth_mist` | `decal_mist_patch.png` | `vfx_dense_fog` | 循環飄蕩 (Loop) | `sfx_wind_whistle` |

---

## 3. 物件池管理與記憶體防護（Zero GC Spike）

1. **節點預熱與池化（Object Pool）**：
   - 進入戰鬥場景時，預先實例化 16 組 Decal 節點與 8 組通用 VFX 粒子發射器，禁止戰鬥中動態 `cc.instantiate`。
2. **生命週期平滑淡出（Fade Out Transition）**：
   - 地格效果剩餘回合歸零時，執行 0.3 秒透明度漸變（Opacity $255 \to 0$），完成後重置狀態回收至池中。
3. **低階設備自動降級**：
   - 當幀率偵測器回報 FPS $< 30$ 時，自動關閉頂部 VFX 粒子發射器，僅保留靜態 Decal 貼花，確保流暢度。

---

## 4. TypeScript 視覺綁定管理器

```typescript
export interface TileVisualConfig {
  effectTag: string;
  decalFramePath: string;
  vfxPrefabPath: string;
  sfxLoopCue?: string;
}

export class TileVisualDispatcher {
  private static registry = new Map<string, TileVisualConfig>();

  public static registerConfig(config: TileVisualConfig): void {
    this.registry.set(config.effectTag, config);
  }

  public static getVisualConfig(effectTag: string): TileVisualConfig | undefined {
    return this.registry.get(effectTag);
  }
}
```

---

## 5. 驗收標準與 CI 閘門（Acceptance Criteria）

1. **同邏輯多表現切換**：
   - 測試用例驗證傳入 `hazard_fire` 與 `hazard_poison` 時，地格數值判定一致，但綁定之貼花與 VFX 資源路徑正確切換。
2. **無內存洩漏**：
   - 模擬連續觸發 50 次地格燃燒與消退，活躍節點總數不超過物件池容量上限。
