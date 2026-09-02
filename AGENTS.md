<!-- ATM ROOT ENTRY:START -->

## ATM Governance Entry

Read the repository root README.md for project context, then run:

```bash
node atm.mjs next --prompt "<current user prompt>" --json
```

First-contact behavior:

1. If `node atm.mjs next --prompt "<current user prompt>" --json` returns an `ATM_USER_NOTICE` message or `evidence.userNotice`, show that notice to the user in natural language before running the returned next action.
2. If existing host instructions reference a missing local document, mention the missing file once and continue with the ATM route.
3. After an onboarding or refresh command succeeds, return to the user original request and continue the actual work.

Editor integration self-check:

1. If `.atm/config.json` exists, confirm this editor already has its repo-local ATM entry files before trusting ATM skill routing.
2. If the current editor entry file is missing, install the matching adapter immediately with `node atm.mjs integration add <editor-id> --json`, then verify it with `node atm.mjs integration verify <editor-id> --json`.
3. Expected primary entry files:
   - `codex`: `integrations/codex-skills/atm-governance-router/SKILL.md` via `node atm.mjs integration add codex --json`
   - `claude-code`: `.claude/skills/atm-governance-router/SKILL.md` via `node atm.mjs integration add claude-code --json`
   - `cursor`: `.cursor/rules/skills/atm-governance-router/SKILL.md` via `node atm.mjs integration add cursor --json`
   - `copilot`: `.github/instructions/atm-governance-router.instructions.md` via `node atm.mjs integration add copilot --json`
   - `gemini`: `.gemini/commands/atm-governance-router.toml` via `node atm.mjs integration add gemini --json`
4. Refresh local project skills with `powershell -ExecutionPolicy Bypass -File tools_node/sync-project-skills.ps1` before trusting Captain / dispatch routing based on copied skills.

Python-only runtime self-check:

1. If the project probe reports Python without JavaScript or TypeScript, candidate ranking and source inventory can continue, but atom birth/apply must not be described as ready until a Python runtime/language adapter or plugin has been selected.
2. If this ATM release does not bundle a dedicated Python language adapter/plugin, say that explicitly. Treat it as an expected product gap, not as host-repo corruption.
3. In that case, continue with ATM discovery routes such as candidate ranking, source inventory, police evidence, or docs-first work, and tell the user that Python atom birth/apply remains deferred until a Python adapter/plugin is installed or implemented.

Treat these ATM runtime files as supporting state only:

- .atm/history/tasks/BOOTSTRAP-0001.json
- .atm/runtime/profile/default.md
- .atm/history/evidence/BOOTSTRAP-0001.json

<!-- ATM ROOT ENTRY:END -->

<!-- doc_id: doc_ai_0018 -->
**全繁體中文模式**: 推理與回覆一律繁體中文，使用台灣慣用術語。
# 3KLife Agent Overrides

本檔補充專案內的高優先級 Agent 行為規則。

**必經入口**：任何 Agent 先讀 [docs/agent-identity-map.md](docs/agent-identity-map.md)，並用 `node atm.mjs actor adopt --editor <editor> --model <model> --kind ai-agent --json` 完成 `AGENT_IDENTITY` 與 repo-local git 身份設定，再進入其他規則。

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

## 武將頭像工作流

- 若工作是武將頭像裁切或批次生成，先用 `general-avatar-crop`，再執行 `node tools_node/generate-general-avatars.js [generalId]`；完成後在 Cocos Creator 對 `assets/resources/sprites/generals/avatars/` 做 `Refresh Assets`。

## 全域縮圖讀取規則

這條規則不再限定 `(best)` 模式，而是所有對話都一律生效。

1. 任何 `view_image` 前，先確認圖片寬度。
2. 採用「thumbnail-first progressive zoom」：先試 `125px`；如果 `125px` 已足夠辨識，就不准放大。
3. 若 `125px` 不足以完成當前判讀，才允許放大一倍，依序走 `125px -> 250px -> 500px`；每次都要在前一級明確不足時才能升級。
4. Browser screenshot / Editor screenshot / compare board / PrintWindow / 全畫面 capture，一律先裁主區域，再套用同一套 `125 -> 250 -> 500` 規則；禁止直接跳大圖。
4. 若需要縮圖，先跑：
   ```bash
   node tools_node/prepare-view-image.js --input <path>
   ```
5. `prepare-view-image.js` 的預設寬度現在就是 `125px`；若看不清，才重跑 `--maxWidth 250`，再不夠才 `--maxWidth 500`。
6. 若不想手記 `125 / 250 / 500`，優先改用：
   ```bash
   node tools_node/prepare-view-image-progressive.js --input <path> --level thumb
   ```
   看不清時再改 `--level inspect`、`--level detail`；若要從上一張 preview 繼續升級，需搭配 `--next --source <original-path>`。
7. 單次回合最多 `1` 張主圖 + `1` 張對照圖。
8. 只有在使用者明確表示「放開縮圖原則 / 允許讀原圖」時，才可查看 `>500px` 原圖。
9. 截圖工具流應優先直接產出可讀的小圖；若工具先產大圖，必須立刻接 `prepare-view-image.js` 或 progressive wrapper，不得把原始大圖直接送進 `view_image`。

## 嚴格模式

所有對話都一律生效，Agent 必須進入「最佳上下文節流模式」。

### 強制行為

1. 先讀 `docs/keep.summary.md (doc_index_0012)` (doc_index_0012)（需修改共識時才讀 `docs/keep.md (doc_index_0011)` (doc_index_0011) 全文）。
2. 立刻套用 `.agents/skills/best-mode/SKILL.md` (doc_agentskill_0001) 的路由規則。
3. 在讀取大型檔案、compare board、QA 圖片、長篇 notes、`docs/ui-quality-todo.json`、`docs/keep.md (doc_index_0011)` (doc_index_0011) 之前，先跑：
   ```bash
   node tools_node/check-context-budget.js --changed --emit-keep-note
   ```
4. 若任務含大型 `.md` / `.json` 變更，先跑：
   ```bash
   node tools_node/summarize-structured-diff.js --git <file>
   ```
5. handoff 與中繼摘要一律優先使用：
   ```bash
   node tools_node/generate-context-summary.js --task <task-id> --goal "<goal>" --files <file...>
   ```
6. final answer 前一律補：
   ```bash
   node tools_node/report-turn-usage.js --changed --emit-final-line
   ```

### Wrapper 優先

- UI 任務優先走：
  ```bash
  node tools_node/run-ui-workflow.js --workflow <workflow-id> ...
  ```
- 非 UI，但有圖片、compare board、大型文件或重 diff 的任務，優先走：
  ```bash
  node tools_node/run-guarded-workflow.js --workflow <name> ...
  ```
- 收工前優先走：
  ```bash
  node tools_node/finalize-agent-turn.js --workflow <workflow-id> ...
  ```

### 額外限制

- 禁止直接把整份 `keep.md` (doc_index_0011)、`ui-quality-todo.json`、大型 notes、compare board、批次 screenshot 塞進對話。
- 圖片一次最多 `1` 張主圖 + `1` 張對照圖。
- 若 `check-context-budget.js` 回傳 `warn` 或 `hard-stop`，必須先縮摘要，再繼續工作。
- 若已使用 wrapper，wrapper 的 block 結果優先，不能繞過。
- 若要替換 `assets/resources/sprites/ui_families/general_detail/v3_final/*` 的 alias，必須先讀 `docs/ui/general-detail-v3-final-alias-policy.md (doc_ui_0043)` (doc_ui_0043)，只能照白名單或 provisional-allow 執行；黑名單替換一律先開 task，再跑新的 `formal-pass-rX`。
- 若要處理框體資產，必須先判斷它是不是 `non-9-slice ornate frame`：凡是四角完整花角 + 四邊連續 ornament 的整框，禁止直接九宮拉伸；只能固定尺寸、拆角邊件，或改畫 stretch-safe 中段版本。

## Skill 指名

若工作會用到 Captain / dispatch 類流程，先確認已執行 `powershell -ExecutionPolicy Bypass -File C:\Users\User\3KLife\tools_node\sync-project-skills.ps1`，再以同步後的 `.codex/skills` 版本為準。

若使用者直接提到隊長 / 派工 / dispatch，優先套用 `atm-captain-dispatch-standard`，再配合 `atm-dispatch` 產出可轉貼派工單。

若工作需要三國外部證據驗證、公開資料查核或 web evidence 比對，優先套用 `3kweb-check`。

若使用者直接提到 `$context-budget-guard`，Agent 必須優先套用對應 skill。
