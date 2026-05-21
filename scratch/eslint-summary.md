# ESLint 全專案分析結果

## 總覽
- 檢查檔案數: 1396
- 有問題的檔案數: 864
- 總 Errors: 3396
- 總 Warnings: 1885
- 總計: 5281
- 可自動修復 (--fix): 318
- 規則種類數: 10

## 按目錄分布
| 目錄 | Errors | Warnings | 合計 |
|------|--------|----------|------|
| extensions | 978 | 570 | 1548 |
| tools_mcp | 922 | 563 | 1485 |
| assets | 199 | 426 | 625 |
| tools_node | 472 | 6 | 478 |
| tests | 19 | 318 | 337 |
| atomic_workbench | 323 | 0 | 323 |
| scratch | 130 | 0 | 130 |
| temp_workspace | 115 | 0 | 115 |
| scripts | 50 | 0 | 50 |
| .github | 32 | 0 | 32 |
| .agents | 30 | 0 | 30 |
| server | 28 | 1 | 29 |
| tools | 28 | 0 | 28 |
| packages | 18 | 0 | 18 |
| test-parser2.js | 11 | 0 | 11 |
| dump-battlelog.js | 9 | 0 | 9 |
| scan_summaries.js | 8 | 0 | 8 |
| test-parser4.js | 6 | 0 | 6 |
| local | 5 | 0 | 5 |
| test-parser-fixed.js | 3 | 0 | 3 |
| dump-battlelog2.js | 2 | 0 | 2 |
| dump.js | 2 | 0 | 2 |
| test-parser.js | 2 | 0 | 2 |
| test-parser3.js | 2 | 0 | 2 |
| examples | 1 | 0 | 1 |
| fixtures | 1 | 0 | 1 |
| shared | 0 | 1 | 1 |

## 按規則分類（數量降序）
| 規則 | Errors | Warnings | 合計 | 影響檔案數 | 可自動修復 |
|------|--------|----------|------|-----------|-----------|
| no-console | 2110 | 0 | 2110 | 506 | 0 |
| @typescript-eslint/no-explicit-any | 0 | 1583 | 1583 | 135 | 0 |
| @typescript-eslint/no-unused-vars | 675 | 0 | 675 | 284 | 0 |
| eqeqeq | 301 | 0 | 301 | 73 | 0 |
| @typescript-eslint/no-non-null-assertion | 0 | 282 | 282 | 60 | 0 |
| no-var | 191 | 0 | 191 | 36 | 191 |
| prefer-const | 107 | 0 | 107 | 52 | 107 |
| (parse-error) | 7 | 20 | 27 | 17 | 20 |
| vue/one-component-per-file | 4 | 0 | 4 | 4 | 0 |
| import/no-dynamic-require | 1 | 0 | 1 | 1 | 0 |

## 各規則詳情與範例

### no-console
- 類型: error | 合計: 2110 | 影響檔案: 506 | 可自動修復: 0
- 範例:
  - `.agents\skills\comfyui-sdxl-partial-asset-gen\scripts\generate-comfyui-sdxl.js:90` → Unexpected console statement. Only these console methods are allowed: warn, error.
  - `.agents\skills\comfyui-sdxl-partial-asset-gen\scripts\generate-comfyui-sdxl.js:817` → Unexpected console statement. Only these console methods are allowed: warn, error.
  - `.agents\skills\comfyui-sdxl-partial-asset-gen\scripts\generate-comfyui-sdxl.js:822` → Unexpected console statement. Only these console methods are allowed: warn, error.

### @typescript-eslint/no-explicit-any
- 類型: warning | 合計: 1583 | 影響檔案: 135 | 可自動修復: 0
- 範例:
  - `assets\scripts\battle\views\BattleScene.ts:202` → Unexpected any. Specify a different type.
  - `assets\scripts\battle\views\BattleScene.ts:203` → Unexpected any. Specify a different type.
  - `assets\scripts\battle\views\BattleScene.ts:204` → Unexpected any. Specify a different type.

### @typescript-eslint/no-unused-vars
- 類型: error | 合計: 675 | 影響檔案: 284 | 可自動修復: 0
- 範例:
  - `.agents\skills\gpt-image-2-gen\scripts\generate-gpt-image-2.js:162` → '_error' is defined but never used.
  - `.github\hooks\scripts\post-encode-check.js:74` → 'e' is defined but never used.
  - `.github\hooks\scripts\session-start.js:18` → 'e' is defined but never used.

### eqeqeq
- 類型: error | 合計: 301 | 影響檔案: 73 | 可自動修復: 0
- 範例:
  - `assets\scripts\battle\skills\resolvers\ProjectedDamageSkillResolver.ts:19` → Expected '!==' and instead saw '!='.
  - `assets\scripts\core\systems\EffectSystem.ts:350` → Expected '!==' and instead saw '!='.
  - `assets\scripts\core\systems\EffectSystem.ts:351` → Expected '!==' and instead saw '!='.

### @typescript-eslint/no-non-null-assertion
- 類型: warning | 合計: 282 | 影響檔案: 60 | 可自動修復: 0
- 範例:
  - `assets\scripts\battle\runtime\phases\BattleAutoMovePhase.ts:67` → Forbidden non-null assertion.
  - `assets\scripts\battle\runtime\phases\BattleAutoMovePhase.ts:78` → Forbidden non-null assertion.
  - `assets\scripts\battle\runtime\phases\BattleAutoMovePhase.ts:124` → Forbidden non-null assertion.

### no-var
- 類型: error | 合計: 191 | 影響檔案: 36 | 可自動修復: 191
- 範例:
  - `extensions\cocos-mcp-server\TestScript.js:2` → Unexpected var, use let or const instead.
  - `extensions\cocos-mcp-server\TestScript.js:3` → Unexpected var, use let or const instead.
  - `extensions\cocos-mcp-server\TestScript.js:5` → Unexpected var, use let or const instead.

### prefer-const
- 類型: error | 合計: 107 | 影響檔案: 52 | 可自動修復: 107
- 範例:
  - `assets\scripts\battle\runtime\BattleCombatResolver.ts:165` → 'nextState' is never reassigned. Use 'const' instead.
  - `assets\scripts\battle\views\TurnFlowManager.ts:61` → 'playerResult' is never reassigned. Use 'const' instead.
  - `assets\scripts\battle\views\UnitRenderer.ts:1543` → 'forward' is never reassigned. Use 'const' instead.

### (parse-error)
- 類型: error | 合計: 27 | 影響檔案: 17 | 可自動修復: 20
- 範例:
  - `assets\scripts\core\utils\UCUFLogger.ts:111` → Unused eslint-disable directive (no problems were reported).
  - `assets\scripts\core\utils\UCUFLogger.ts:114` → Unused eslint-disable directive (no problems were reported).
  - `assets\scripts\ui\core\ChildPanelBase.ts:156` → Unused eslint-disable directive (no problems were reported from '@typescript-eslint/no-unused-vars').

### vue/one-component-per-file
- 類型: error | 合計: 4 | 影響檔案: 4 | 可自動修復: 0
- 範例:
  - `extensions\cocos-mcp-server\dist\panels\default\index.js:2` → Definition for rule 'vue/one-component-per-file' was not found.
  - `extensions\cocos-mcp-server\source\panels\default\index.ts:1` → Definition for rule 'vue/one-component-per-file' was not found.
  - `tools_mcp\cocos-mcp-server\dist\panels\default\index.js:2` → Definition for rule 'vue/one-component-per-file' was not found.

### import/no-dynamic-require
- 類型: error | 合計: 1 | 影響檔案: 1 | 可自動修復: 0
- 範例:
  - `tools_node\run-vfx-browser-qa.js:290` → Definition for rule 'import/no-dynamic-require' was not found.
