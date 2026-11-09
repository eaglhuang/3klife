<!-- doc_id: doc_spec_0658 -->
# 啟動場景靜態依賴邊界審計與禁止綁定戰鬥資源靜態Lint規格書

> **所屬模組**：`3.6 數值、架構與底層支援 (HOT-09 / HOT-07)`  
> **單一真相來源**：定義啟動場景（`LoadingScene` / `StartScene`）首包載入邊界守則、禁止靜態綁定戰鬥核心資源之 AST 語法掃描規則，以及納入 `compute-gate` 閘門之自動化審計契約。

---

## 1. 啟動場景效能邊界與首包約束

為確保遊戲在 Web、手機原生與小遊戲平台具備極致的「首屏秒開」體驗，啟動場景必須嚴格恪守輕量化邊界：
- **首包體積預算**：未壓縮主包體積不得超過 **8MB**（Gzip 後不得超過 **2.5MB**）。
- **啟動場景職責範圍**：僅限負責引擎初始化、網路連線、語意化版本校驗（`doc_spec_0657`）、熱更新進度條與進入大廳之引導，**絕對嚴禁靜態依賴任何戰鬥核心邏輯與美術資產**。

---

## 2. 靜態依賴審核四項法則 (Lint Rules)

靜態審計工具（`lint-start-scene-dependencies.js`）在代碼編譯期對啟動相關場景進行 AST 與 Prefab 關聯掃描：

| 規則代碼 | 規則名稱 | 違規判定準則 | 處置方式 |
|:---:|:---|:---|:---:|
| **R-START-01** | `NO_BATTLE_IMPORT` | `LoadingScene.ts` 或 `StartScene.ts` 中直接靜態 `import ... from "battle/*"` | **編譯阻斷** |
| **R-START-02** | `NO_HEAVY_ASSET_BINDING`| 啟動場景之 `.scene` 或 `.prefab` JSON 中靜態關聯超過 512KB 之紋理或音訊 | **編譯阻斷** |
| **R-START-03** | `BUNDLE_ISOLATION` | 戰鬥資源（模型、特效、音效）未放置於獨立之 `battle_assets` Bundle | **警告提示** |
| **R-START-04** | `INTERFACE_FIRST_BRIDGE`| 啟動流程直接呼叫戰鬥實體元件（如 `BattleGrid`、`CombatResolver`）而非透過 `SceneBridge` | **編譯阻斷** |

---

## 3. 模組解耦與動態載入協議

### 3.1 戰鬥資源 Bundle 動態拉取
所有戰鬥重型資產必須封裝於子包（Asset Bundle），在確定需要進入戰鬥場景時方可發起非同步載入：
```typescript
// 正確之非同步載入規範 (合法)
export async function enterBattleScene(battleId: string): Promise<void> {
  const bundle = await new Promise<cc.AssetManager.Bundle>((resolve, reject) => {
    cc.assetManager.loadBundle("battle_assets", (err, b) => {
      if (err) return reject(err);
      resolve(b);
    });
  });
  // 載入完成後透過 SceneBridge 切換場景
  SceneBridge.openBattle(battleId, bundle);
}
```

### 3.2 違反 R-START-01 之典型錯誤與修正對照
```typescript
// ❌ 嚴重違規：造成首包直接打包 15MB 戰鬥邏輯與圖集
import { BattleCombatResolver } from "../../../battle/logic/BattleCombatResolver";
import { BattleVFXConfig } from "../../../battle/vfx/BattleVFXConfig";

// ✅ 規範修正：透過通用介面或動態引入解耦
import type { IBattleLaunchOptions } from "../../../core/interfaces/IBattleBridge";
import { SceneBridge } from "../../../core/bridges/SceneBridge";
```

---

## 4. 閘門整合與自動化審計流程

1. **腳本落地**：
   - 工具路徑：`tools_node/lint-start-scene-dependencies.js`。
   - 解析 `assets/scripts/ui/scenes/LoadingScene.ts` 與 `assets/scenes/LoadingScene.scene`。
2. **納入計算型閘門**：
   - 整合至 `compute-gate.js` 之 quick profile 掃描流程中。
   - 任一違規輸出錯誤日誌並返回 Exit Code 1，杜絕任何人為疏失將戰鬥資源打包進首包。
