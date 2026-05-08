---
doc_id: doc_task_0004
id: HARN-ARCH-0002
priority: P1
phase: G
created: 2026-05-04
created_by_agent: compute-gate-sensor
owner: Antigravity (Gemini 2.0 Flash)
status: done
type: system
chain_id: HARN-CHAIN-MODULE-BOUNDARY
chain_step: 2/3
sensor_triggered_by: compute-gate check-import-boundaries
depends:
  - HARN-ARCH-0001
notes: "2026-05-04 | 狀態: done | Antigravity: 已移除 battle/views 下所有對 ui/ 的直接引用，改透過 IBattleUIBridge 或事件系統通信，import-boundary 閘門通過。"
---

# [HARN-ARCH-0002] 修復 battle → ui 的非法引用（22 筆）

> 🔗 **任務鏈**：`HARN-CHAIN-MODULE-BOUNDARY`（步驟 2/3）
> ⚡ **修改上限**：7 個 battle/views 檔案

## 違規清單（22 筆，分佈於 7 個 battle 檔案）

| 檔案 | 非法引用 UI 元件 |
|---|---|
| `BattleScene.ts` | BattleHUDComposite, DeployRuntimeApi, ResultPopupComposite, BattleLogComposite, BattleScenePanel, DuelChallengePanel, GachaDevOverlay |
| `BattleSceneFlow.ts` | BattleHUDComposite, BattleLogComposite, DeployRuntimeApi |
| `BattleSceneLoader.ts` | TigerTallyComposite, UltimateSelectPopup |
| `BattleSceneSetup.ts` | DeployRuntimeApi |
| `BattleUIBridge.ts` | BattleScenePanel, DeployRuntimeApi |
| `BattleUIInitializer.ts` | BattleHUDComposite, DeployComposite, DeployRuntimeApi, ResultPopupComposite, BattleLogComposite, BattleScenePanel |
| `BattleSceneLoader.ts` | tools/vfx-block-registry（另計） |

## INPUT_CONTRACT

- `HARN-ARCH-0001` 已完成：`IBattleUIBridge` 介面已存在於 shared
- battle 檔案語法正確

## OUTPUT_CONTRACT

- [x] 所有 7 個 battle/views 檔案移除對 `../../ui/components/` 的直接引用
- [x] 改用 `IBattleUIBridge` 介面（由外部注入，不在 battle 內直接 new）
- [x] `BattleScene.ts` 改透過事件系統或 bridge 通知 UI，而非直接持有 UI 元件引用
- [x] `check-import-boundaries.js` 對 battle 模組的 `→ ui` 違規從 22 降至 0

## VALIDATION_CMD

```bash
node tools_node/compute-gate.js --gates ts-syntax import-boundary
```

## 修復策略

### 策略 A：事件化（適合單向通知）

```typescript
// ❌ 舊：battle 直接引用 ui
import { BattleHUDComposite } from '../../ui/components/BattleHUDComposite';
this._hud = new BattleHUDComposite();

// ✅ 新：透過 EventTarget 通知
import { EventTarget } from 'cc';
this.node.emit('battle:hud-update', { hp, mp });
```

### 策略 B：Bridge 注入（適合需要回傳值）

```typescript
// ❌ 舊
import { DeployRuntimeApi } from '../../ui/components/DeployRuntimeApi';

// ✅ 新：使用 IBattleUIBridge 介面（由場景注入）
import { IBattleUIBridge } from '../../shared/interfaces/IBattleUIBridge';
// battle 只知道介面，不知道具體實作
private _uiBridge: IBattleUIBridge | null = null;
public setBridge(bridge: IBattleUIBridge) { this._uiBridge = bridge; }
```

## ROLLBACK_HINT

```bash
git checkout assets/scripts/battle/views/
```

---
*由 Harness Engineering compute-gate 感測器自動偵測開立 | 2026-05-04*

## 審核結果（2026-05-04）

- 審核結論：達成
- 驗證證據：compute-gate --profile standard 已於本輪審核通過 6/6。 battle -> ui 邊界違規未再出現。
- 需修改：無；後續 battle 模組不得直接引用 ui 具體元件。
