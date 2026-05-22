<!-- doc_id: doc_ai_0008 -->
## 語言與推理規範

1. **全繁體中文模式**: 推理與回覆一律繁體中文，使用台灣慣用術語。
2. **Unity 對照**: 解釋 Cocos Creator 概念時，主動對照 Unity 的對應概念與設計理念。

## ATM Governance Entry

- 本檔保留 3KLife / Cocos 專案主規則；ATM integration 不得覆蓋本檔內容。
- 進行受治理修改前，先執行 `node atm.mjs next --json`，若出現 `ATM_USER_NOTICE` 必須先回報使用者。
- ATM 詳細路由放在 `.github/instructions/atm-*.instructions.md` 與 `.github/prompts/atm-*.prompt.md`。

# Cocos Creator Project Guidelines

## Code Style & TypeScript Setup

- **Language**: TypeScript (strict mode disabled; decorators enabled with `experimentalDecorators: true`)
- **Target**: ES2015 (import/export syntax)
- **Type Definitions**: `@cocos/creator-types@3.8.8-121518`（engine: `cc` / editor: `Editor` / auto-gen: `temp/declarations/`）
- **Convention**: `db://assets/*` → 專案資產 / `db://internal/*` → 引擎資源
- **Config**: `tsconfig.json` extends `temp/tsconfig.cocos.json`（Cocos Creator 自動產生，不手改）

## Architecture

- **Project**: Cocos Creator 3.8.8 3D game / IDE-driven / Do NOT use npm scripts for builds
- **Key dirs**: `assets/`（遊戲資產）/ `library/`（唯讀資產庫）/ `temp/`（中間產物）/ `@cocos/creator-types/`（型別定義）
- **Do NOT edit**: `library/` / `temp/tsconfig.cocos.json` / `profiles/v2/` / `settings/v2/`

## Build and Development

- Cocos Creator editor: `http://localhost:7456`
- Asset refresh: `curl.exe http://localhost:7456/asset-db/refresh`
- Debug: Chrome attach to `http://localhost:7456`
- Component scripts: TypeScript in `assets/`, decorated with `@ccclass`

## ⛔ 硬規則 #0：接任務卡前必須先上鎖（不可省略）

**在動手執行任何任務卡之前，以下三步是硬前置，缺一不可：**

```bash
# Step 1: 確認無衝突
node tools_node/task-lock.js check <task-id>

# Step 2: 上鎖
node tools_node/task-lock.js lock <task-id> <agent-name>

# Step 3: 更新任務卡 frontmatter（必須 commit 進去）
# status: in-progress
# started_at: <RFC3339 timestamp>
# started_by_agent: <agent-name>
```

> ⚠️ **違反此規則視為無效操作**：即使工作已完成，若未先上鎖，任務卡視同未正式接手。
> 多個 Agent 同時運作時，未上鎖會造成衝突與重工。
> 完整規則見 `docs/agent-briefs/Readme.md (doc_ai_0023)` §鎖卡流程。

收工時必須解鎖：
```bash
node tools_node/task-lock.js unlock <task-id> <agent-name>
```

## 執行前置檢查 (Pre-flight Check)

1. **強制讀取 `docs/keep.summary.md (doc_index_0012)` (doc_index_0012)**: 每次請求前先讀摘要；需修改共識時才讀 `docs/keep.md (doc_index_0011)` (doc_index_0011) 全文。
2. **共識優先**: `docs/keep.md (doc_index_0011)` (doc_index_0011) 為最高執行準則。新技術決策須提醒用戶更新 keep。
3. **Runtime Debug**: crash / TypeError → 先用 `cocos-log-reader` skill 讀 log，不可直接猜。
4. **視覺症狀**: 先用 `cocos-screenshot` skill 截圖；同時有 runtime 錯誤用 `cocos-bug-triage`。
5. **UI / 武將 / Token 節流等領域流程**: 見 `.github/instructions/` 下的 path-specific instructions（自動按路徑載入）。
6. **日誌系統**: `assets/scripts/` 內**禁用裸 `console.log`**，統一使用 `UCUFLogger`（`assets/scripts/ui/core/UCUFLogger.ts`）。新增 debug 功能前先確認目標 `LogCategory` 存在或補 enum；不得自建平行 log 模組。詳見 keep §3.2。
