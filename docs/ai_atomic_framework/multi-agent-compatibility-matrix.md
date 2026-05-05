<!-- doc_id: doc_other_0034 -->
# Multi-AI Agent 兼容性測試矩陣

> 補丁來源：`AI原子框架開發計畫書.md` v0.2.1 補強 §B7
> 文件位置：`docs/ai_atomic_framework/multi-agent-compatibility-matrix.md`
> 對應 ATM 任務：ATM-2.5-0003（multi-agent compatibility verification）

---

## 為什麼需要本矩陣

ATM 開源框架的核心承諾之一是「**model-neutral / agent-neutral**」 — README、AGENTS.md、`.atm/profile` 不應綁定任何特定 AI agent。但「設計上 generic」與「實際上 generic」是兩件事；AGENTS.md 容易夾帶 Claude Code 特定的 slash command 假設、Cursor 特定的編輯器 hook、Copilot 特定的 PR 行為。

本矩陣定義 **5 個 AI agent 的 alpha gate 兼容性測試**，作為上游 ATM upstream 的 **acceptance condition** — 任一 agent 不通過 alpha gate，AGENTS.md / `.atm/profile` 必須修到通過後才釋出 ATM 0.1.0 alpha。

---

## 測試矩陣

| Agent | 模型 / 工具 | Test cmd | Pass criteria | Owner | 釋出阻塞？ |
|---|---|---|---|---|---|
| **Claude Code** | Sonnet 4.6 / Opus 4.7 | `atm self-host-alpha --agent claude-code --json` | 4 條 alpha gate 全 boolean true | upstream maintainer | ✅ 必過 |
| **Cursor** | GPT-4o / Claude Sonnet | manual run with prompt recipe | 同上 | community contributor | ⚠️ 至少 3/5 過 |
| **Aider** | GPT-4o / GPT-4-turbo | `aider --message "$(cat .atm/AGENTS.md)" --yes-always` | 同上 | community | ⚠️ 至少 3/5 過 |
| **GitHub Copilot Agent** | GPT-4 | `gh copilot agent run` | 同上 | community | ⚠️ 至少 3/5 過 |
| **OpenAI Assistants API** | GPT-4o / o1 | `node tests/agents/openai-assistant.test.js` | 同上 | upstream | ⚠️ 至少 3/5 過 |

**釋出條件**：
- Claude Code 必過（上游主開發環境）
- 至少 5 個中的 3 個過 alpha gate
- 任一 agent 過不了 → 必須查清原因；AGENTS.md 改 generic 化後 retest

---

## Alpha Gate 4 條判定（與 `open-source-extraction-plan.md` §1.1.4 一致）

| # | Criteria | Cmd | Pass condition |
|---|---|---|---|
| 1 | AI 讀 README/AGENTS/profile 完成 init/adopt | `atm init --adopt --dry-run --json` | exit 0 + 輸出含 `"adoptedAt"` |
| 2 | 建第一張 task + 鎖 scope + 寫 artifact | 三 cmd 鏈 | 3 cmd 全 exit 0 + `.atm/tasks/`, `.atm/locks/`, `.atm/artifacts/` 各有檔 |
| 3 | 完成 hello-world atom smoke validation | `atm test --atom hello-world` | exit 0 + report.json 顯示 5/5 fixture pass |
| 4 | 全程不依賴 3KLife / Cocos / html-to-ucuf | `atm verify --neutrality` | neutralityScanner exit 0 |

---

## 各 Agent 測試流程

### Claude Code

**前置**：在 sandbox repo 中安裝 Claude Code CLI，準備測試帳號。

```bash
# sandbox repo（empty）
mkdir -p /tmp/atm-sandbox-claude && cd /tmp/atm-sandbox-claude
git init
npm i -g atm-cli@latest

# 啟動 Claude Code，給予一行指令
claude --message "Read README.md and AGENTS.md, then run alpha gate test"

# 預期 Claude Code 自動執行：
# 1. atm init --adopt --dry-run --json
# 2. atm task create --auto
# 3. atm task lock <id>
# 4. atm artifact put
# 5. atm test --atom hello-world
# 6. atm verify --neutrality

# 驗證
atm self-host-alpha --verify --json
# 期望: { "criteria1": true, "criteria2": true, "criteria3": true, "criteria4": true }
```

### Cursor

**前置**：Cursor IDE 安裝 ATM extension（規劃中）或手動透過 chat panel。

**測試流程**（手動）：
1. 開 Cursor 在 sandbox repo
2. Chat panel 輸入：`Read AGENTS.md and complete the alpha gate setup`
3. 觀察 Cursor 是否會自動執行 `atm init` / `atm task create` / `atm test`
4. 跑 `atm self-host-alpha --verify` 驗證

**已知差異**：
- Cursor 的 file edit 可能不走 ATM rule guard（直接 IDE edit）
- 需在 `.atm/profile` 加 `editor.rule_guard_required: true`

### Aider

**前置**：`pip install aider-chat`

```bash
cd /tmp/atm-sandbox-aider
git init
aider --message "$(cat .atm/AGENTS.md)" --yes-always

# Aider 自動執行 .atm/AGENTS.md 中的 instructions
# 驗證
atm self-host-alpha --verify --json
```

**已知差異**：
- Aider 預設會自動 commit；ATM run envelope 應允許但要求 finalize 時 review
- Aider 不支援 task-lock 格式（需 adapter 轉換）

### GitHub Copilot Agent

**前置**：`gh extension install github/gh-copilot`

```bash
cd /tmp/atm-sandbox-copilot
git init
gh copilot agent run --task "Read AGENTS.md and complete alpha gate"
# 驗證
atm self-host-alpha --verify --json
```

**已知差異**：
- Copilot Agent 偏好 GitHub Issues 作為 task source；ATM 需提供 Issues adapter（規劃 ATM-6 作為社群貢獻）

### OpenAI Assistants API

**前置**：OPENAI_API_KEY env

```bash
cd AI-Atomic-Framework
node tests/agents/openai-assistant.test.js
# 此測試會：
# 1. 建立 OpenAI assistant，instructions = AGENTS.md 內容
# 2. 給 assistant 工具：file_search + code_interpreter + custom function (atm CLI wrapper)
# 3. 觸發 alpha gate 流程
# 4. assert 4 條 criteria 全綠
```

---

## AGENTS.md 中立性檢查

每次更新 AGENTS.md 必跑：

```bash
# 黑名單檢查
atm verify --agents-md
# 規則：
# - 不得提及特定 IDE（Cursor / VSCode / JetBrains）
# - 不得使用特定 slash command（/clear / /compact 等 Claude Code 專用）
# - 不得假設特定 tool name（Edit / Write / Bash 等 Claude SDK 專用）
# - 必須使用 generic verb：「edit a file」/「run a command」
```

---

## 兼容矩陣維護節奏

| 事件 | 動作 |
|---|---|
| AGENTS.md 改動 | 必跑全 5 agent 測試 |
| ATM minor 升級 | 必跑全 5 agent 測試（成為 release acceptance）|
| 新 AI agent 加入主流（如 GLM、Gemini Code）| 評估加入矩陣；社群可主動貢獻 owner |
| 任一 agent EOL（如 Aider 停更）| 從矩陣移除；不阻塞釋出 |

---

## 結果記錄與透明度

每次測試結果寫入：
- `tests/agents/results/<agent>-<timestamp>.json`
- `docs/multi-agent-results.md`（人類可讀，開源釋出時公開）

公開內容：
- 每個 agent 的 pass/fail 狀態
- 退步的 agent 應公開 issue link 與計畫修復時程
- 不公開：API key / 個人帳號 / 對話內容

---

## 退場機制

若某 agent 連續 3 個 minor 都不過 alpha gate，且：
- 該 agent 用戶量 < 5%（依 ecosystem stats）
- 該 agent 的修復成本 > 維持 ATM neutrality 的成本

則可降級為「community-maintained，不阻塞釋出」並標 `optional` tier。

---

## 未來擴展（v1.0+）

| Agent | 目前狀態 | 加入時程 |
|---|---|---|
| Anthropic Computer Use | 觀察中 | v1.x 後評估 |
| Google Gemini Code | 觀察中 | v1.x 後評估 |
| Devin | 不可用（commercial closed beta）| 不規劃 |
| Replit Agent | 觀察中 | v1.x 後評估 |
| Smol Developer | community-only | 視貢獻者意願 |
