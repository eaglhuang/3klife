<!-- doc_id: doc_other_0038 -->
# Agent Identity Map

本文件是本 repo 所有 Agent 的唯一身份入口。任何 Agent 在進入 lock、task card、commit、或 git 設定流程之前，先讀本文件，並依下列規則設定自己的身份。

## 必經流程

1. 先讀本文件。
2. 選定自己的 slug。
3. 設定 `AGENT_IDENTITY=<slug>`。
4. 以 repo-local `git config` 設定 `user.name` 與 `user.email`。
5. 再進入 lock、task card、commit 流程。

## 身份規則

- 新身份一律使用可辨識 slug，格式建議為 `vs-insiders-<model-name>`、`vs-code-<model-name>`、`claude-code-<model-name>`、`codex-<model-name>` 這種帶編輯器前綴的名稱。
- `lock`、task card 的 `owner` / `created_by_agent` / `started_by_agent`，以及 commit author，都應該使用同一個 slug。
- `GitHubCopilot` 只保留給舊資料與回溯相容，不建議作為新身份。
- 如果你是新入口文件或新工作流，請先讓它指向本文件，再開始做自己的規則。

## 對照表

| 入口 / 編輯器 | 建議 slug | `AGENT_IDENTITY` | `git user.name` | `git user.email` | lock / task card |
| --- | --- | --- | --- | --- | --- |
| VS Code Insiders | `vs-insiders-<model-name>` | 同 slug | 同 slug | `<slug>@3klife.local` | 同 slug |
| VS Code Stable | `vs-code-<model-name>` | 同 slug | 同 slug | `<slug>@3klife.local` | 同 slug |
| Claude Code | `claude-code-<model-name>` | 同 slug | 同 slug | `<slug>@3klife.local` | 同 slug |
| Codex / 其他 CLI Agent | `codex-<model-name>` | 同 slug | 同 slug | `<slug>@3klife.local` | 同 slug |
| 其他未知入口 | `agent-<tool>-<model-name>` | 同 slug | 同 slug | `<slug>@3klife.local` | 同 slug |

## 實作方法

- VS Code / VS Code Insiders：在該編輯器自己的使用者設定或啟動環境，注入 `AGENT_IDENTITY`。
- git：在目前 repo 內執行 `git config user.name "<slug>"` 與 `git config user.email "<slug>@3klife.local"`。
- 同一台機器上若有多個 Agent，不要共用同一個 slug。
- 如果你已經有舊的 `GitHubCopilot` 記錄，新的工作仍應切換成新的 slug，不要延用舊身份。

## 範例

```bash
export AGENT_IDENTITY=vs-insiders-gpt-5.4-mini
git config user.name "$AGENT_IDENTITY"
git config user.email "$AGENT_IDENTITY@3klife.local"
```

## 入口要求

- `AGENTS.md`、`CLAUDE.md`、`.github/instructions/agent-collaboration.instructions.md`、`docs/agent-briefs/Readme.md` 都必須先導向本文件。
- 任何新的 Agent 入口若沒有先讀本文件，就不應進入 lock、task card、commit。