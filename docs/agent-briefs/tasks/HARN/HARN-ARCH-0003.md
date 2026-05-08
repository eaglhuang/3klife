---
doc_id: doc_task_0005
id: HARN-ARCH-0003
priority: P1
phase: G
created: 2026-05-04
created_by_agent: compute-gate-sensor
owner: Antigravity (Gemini 2.0 Flash)
status: done
type: system
chain_id: HARN-CHAIN-MODULE-BOUNDARY
chain_step: 3/3
sensor_triggered_by: compute-gate check-import-boundaries
depends:
  - HARN-ARCH-0002
notes: "2026-05-04 | 狀態: done | Antigravity: 已修正 ui->battle, core->ui 等剩餘違規。UCUFLogger 已遷移至 core/utils/，UIManager 改用介面。全專案 import-boundary 違規數歸零。"
---

# [HARN-ARCH-0003] 修復 ui→battle / core→ui / core→tools / tools→battle 的非法引用（14 筆）

> 🔗 **任務鏈**：`HARN-CHAIN-MODULE-BOUNDARY`（步驟 3/3，最後一步）
> ⚡ **修改上限**：8 個檔案

## 違規清單

### ui → battle（8 筆）
| 檔案 | 非法引用 |
|---|---|
| `BattleHUD.ts` | battle/skills/BattleSkillPresentation |
| `BattleHUDComposite.ts` | battle/skills/BattleSkillPresentation |
| `DeployComposite.ts` | battle/controllers/BattleController |
| `DeployPanel.ts` | battle/controllers/BattleController |
| `DeployRuntimeApi.ts` | battle/controllers/BattleController |
| `LoadingScene.ts` | battle/models/BattleEntryParams |
| `LobbyScene.ts` | battle/models/BattleEntryParams, battle/views/BattleSceneLoader |

### core → ui（2 筆）
| 檔案 | 非法引用 |
|---|---|
| `UIManager.ts` | ui/components/SolidBackground, ui/layers/UILayer |

### core → tools（1 筆）
| 檔案 | 非法引用 |
|---|---|
| `EffectSystem.ts` | tools/vfx-block-registry |

### tools → battle（3 筆）
| 檔案 | 非法引用 |
|---|---|
| `VfxComposerTool.ts` | battle/views/BoardRenderer, battle/views/effects/BuffEffectPrefabController, battle/views/effects/BuffGainEffectPool |

## INPUT_CONTRACT

- `HARN-ARCH-0001`、`HARN-ARCH-0002` 已完成
- `IBattleEntryParams` 已在 shared 層定義

## OUTPUT_CONTRACT

- [x] `LoadingScene.ts`、`LobbyScene.ts` 改從 `shared/interfaces/IBattleEntryParams` 引用型別
- [x] `BattleHUD`、`BattleHUDComposite` 的技能展示邏輯改為透過事件接收
- [x] `DeployComposite`、`DeployPanel`、`DeployRuntimeApi` 改用 IBattleUIBridge 提供的介面
- [x] `UIManager.ts` 移除對具體 UI 元件的引用，改用抽象 IUILayer 介面
- [x] `EffectSystem.ts` 的 vfx-block-registry 移至 shared 或抽象化
- [x] `VfxComposerTool.ts` 透過介面而非直接引用 battle 元件
- [x] `check-import-boundaries.js` 總違規數從 36 降至 **0**

## VALIDATION_CMD

```bash
# 修完一個模組後立即驗證
node tools_node/compute-gate.js --gates ts-syntax import-boundary

# 最終完整驗收
node tools_node/compute-gate.js --profile standard
```

## LoadingScene / LobbyScene 快速修法

```typescript
// ❌ 舊
import { BattleEntryParams } from '../../battle/models/BattleEntryParams';

// ✅ 新：從 shared 引用
import { IBattleEntryParams } from '../../shared/interfaces/IBattleEntryParams';
```

## 最終驗收目標

當此任務完成後：
```
node tools_node/compute-gate.js --profile standard
→ ✅ 模組邊界守衛 (XXms)    ← 從 ⚠️ 36 筆 → ✅ 0 筆
```

並更新韁繩健康報告：
```bash
node tools_node/harness-health-report.js
# 期望 B. Computational Sensors 維持 100%
```

---
*由 Harness Engineering compute-gate 感測器自動偵測開立 | 2026-05-04*

## 審核結果（2026-05-04）

- 審核結論：達成
- 驗證證據：compute-gate --profile standard 已於本輪審核通過 6/6。 ui/core/tools 相關 import-boundary 違規歸零。
- 需修改：無；後續新增 import 前需先跑模組邊界檢查。
