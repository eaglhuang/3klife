---
doc_id: doc_other_asp_corpus
task_id: TASK-ASP-0005
title: ASP adapter 驗證用 3KLife corpus 索引
status: v1
updated_at: 2026-06-10T22:00:00+08:00
---

# 3KLife Corpus 索引（adapter candidate-discovery 驗證用）

供 AAF ASP-0002（JS adapter discovery）與 ASP-0003（Python adapter discovery，已完成）對 3KLife 真實程式碼做候選發現驗證。涵蓋 battle / core / ui / tools 四個子系統，刻意混入 class 重、function 重、scene flow、工具腳本等不同型態。

## TypeScript（20 檔，`assets/scripts/`）

| # | 路徑 | 型態備註 |
|---|---|---|
| 1 | assets/scripts/battle/controllers/BattleController.ts | controller，class 重 |
| 2 | assets/scripts/battle/runtime/BattleCombatResolver.ts | 純邏輯 resolver |
| 3 | assets/scripts/battle/runtime/phases/BattleSpecialResolvePhase.ts | phase 狀態機 |
| 4 | assets/scripts/battle/runtime/phases/BattleTileEffectPhase.ts | phase 狀態機 |
| 5 | assets/scripts/battle/shared/BattleTacticBehavior.ts | 行為定義 |
| 6 | assets/scripts/battle/views/BoardRenderer.ts | 渲染 view |
| 7 | assets/scripts/battle/views/UnitRenderer.ts | 渲染 view |
| 8 | assets/scripts/battle/views/SpriteFrameAnimator.ts | 動畫工具 class |
| 9 | assets/scripts/battle/views/TurnFlowManager.ts | 流程管理 |
| 10 | assets/scripts/battle/views/effects/BuffGainEffectPool.ts | 物件池 |
| 11 | assets/scripts/core/models/GeneralUnit.ts | data model |
| 12 | assets/scripts/core/services/BreedingQuotaEnforcer.ts | service，規則邏輯 |
| 13 | assets/scripts/core/services/NpcDialogueService.ts | service，外部整合 |
| 14 | assets/scripts/core/systems/MaterialSystem.ts | system |
| 15 | assets/scripts/core/utils/ParticleUtils.ts | 純 function utils |
| 16 | assets/scripts/core/utils/MaterialUtils.ts | 純 function utils |
| 17 | assets/scripts/ui/core/UISpecLoader.ts | loader |
| 18 | assets/scripts/ui/core/ChildPanelBase.ts | 抽象 base class |
| 19 | assets/scripts/ui/components/BattleLogPanel.ts | UI panel |
| 20 | assets/scripts/tools/SceneAutoBuilder.ts | 編輯器工具腳本 |

## Python（8 檔，`tools_mcp/cocosMCP/Python/`）

3KLife 無 `tools_python/`，採用 cocosMCP Python 工具鏈作為 Python 樣本（D4 決策，見 coordination.md）。

| # | 路徑 | 型態備註 |
|---|---|---|
| 1 | tools_mcp/cocosMCP/Python/server.py | 進入點，含 `__main__` guard |
| 2 | tools_mcp/cocosMCP/Python/cocos_connection.py | 連線 class |
| 3 | tools_mcp/cocosMCP/Python/log_client.py | client |
| 4 | tools_mcp/cocosMCP/Python/config.py | 模組級常數 |
| 5 | tools_mcp/cocosMCP/Python/config/config.py | 模組級常數 |
| 6 | tools_mcp/cocosMCP/Python/tools/scene_tools.py | 工具 function 集 |
| 7 | tools_mcp/cocosMCP/Python/tools/log_tools.py | 工具 function 集 |
| 8 | tools_mcp/cocosMCP/Python/tools/__init__.py | package 匯出 |

## 驗證指令（ASP-0002 完成後執行）

```bash
# 於 3KLife repo 根目錄
npx @ai-atomic-framework/cli candidates discover \
  --include "assets/scripts/**/*.ts" \
  --json > .atm-temp/asp-candidates-3klife.json
```

驗收門檻：candidate precision ≥ 70%（對照人工 ground truth，見 TASK-ASP-0005 任務卡）。
