<!-- doc_id: doc_ai_0035 -->
# ATM 任務卡模板

這份模板用來建立 ATM 系列任務卡，目的不是增加文書，而是把 upstream core、downstream adapter、case study 的欄位收斂成同一種格式。

## 適用範圍

- ATM-0~6 任務卡
- 需要透過 task-card-opener 產生的 ATM/ATM-like Markdown 任務卡
- 需要明確標示 hostKind / packageScope / adapterScope 的文件型任務
- 需要回填 hostKind / targetRepo / alphaGate / allowed_files / forbidden_files / non_goals / executionMode 的 open ATM 卡

## Frontmatter 範例

```yaml
---
id: ATM-0-0000
priority: P1
phase: ATM-0
created: 2026-05-06
created_by_agent: AgentX
owner: AgentX
status: open
started_at: ""
started_by_agent: ""
completed_at: ""
type: docs
hostKind: downstream-3klife
targetRepo: 3KLife
alphaGate:
  requiresAlpha0: true
  blocker: false
packageScope:
  - docs/agent-briefs
  - docs/tasks
  - tools_node/adapters/atm-3klife
adapterScope:
  - tools_node/adapters/atm-3klife
allowed_files:
  - docs/agent-briefs/atm-task-template.md
  - docs/agent-briefs/Readme.md
  - docs/tasks/tasks-atm/tasks-atm-part-2.json
forbidden_files:
  - library/
  - temp/
  - profiles/
  - settings/
non_goals:
  - 不改 runtime 核心行為
  - 不碰 library 與 temp 產物
executionMode: task-card-opener
depends:
  - ATM-0-0001
validation_cmd: npm run check:encoding:touched; node tools_node/compute-gate.js --profile standard --agent-feedback
rollback_hint: 依 git diff 回退本卡 touched files；若已產生 doc_id，改用 doc-id-registry 工具校正，不手動複製代號。
notes: "YYYY-MM-DD | 狀態: open | 驗證: pending | 變更: 待開始 | 阻塞: none"
doc_refs: []
---
```

## 欄位說明

- `hostKind`：這張卡主要對應的主場景，例：`upstream`、`downstream-3klife`、`tracking-docs`、`case-study`
- `targetRepo`：這張卡實際落點，例：`AI-Atomic-Framework`、`3KLife`、`npc-brain`、`AI-learning-notes`
- `alphaGate`：是否必須先過 alpha0；若會阻塞後續卡，就把 `requiresAlpha0` 與 `blocker` 的組合寫清楚
- `packageScope`：主要修改範圍，例：`packages/core`、`packages/cli`、`docs/agent-briefs`、`docs/tasks`
- `adapterScope`：適配層範圍，例：`tools_node/adapters/atm-3klife`
- `allowed_files`：本卡允許修改的檔案清單，避免 Agent 看錯 scope
- `forbidden_files`：本卡明確不可碰的檔案或目錄，避免誤改產物與 runtime
- `non_goals`：這張卡明確不做的事情，避免多做或混卡
- `executionMode`：這張卡預期的執行方式，例：`task-card-opener`、`manual-doc`、`adapter-pass`
- `validation_cmd`：此卡預設驗證指令，通常先跑編碼，再跑計算型閘門
- `rollback_hint`：回退時先看 git diff，不要手工複製 doc_id
- `doc_refs`：重大卡的引用欄位；依 ATM_cross_reference 的規則，放在 `notes` 之後

## 建卡建議

1. 先用 task-card-opener 選定 id、title、owner、priority、phase、depends
2. 依任務類型補上 hostKind / packageScope / adapterScope
3. 寫好 validation_cmd 與 rollback_hint
4. 若需要重大規格引用，補 doc_refs
5. 開工前先鎖卡，收工後再把 status、started_at、started_by_agent、completed_at 與 notes 回寫

## task-card-opener 用法

- ATM 任務卡先套用這份模板，再由 task-card-opener 產出對應 Markdown / JSON
- open ATM 卡請優先回填 `hostKind`、`targetRepo`、`alphaGate`、`allowed_files`、`forbidden_files`、`non_goals`、`executionMode`
- 若只是建立卡片骨架，先保留 `status: open`，不要提前補成 done
- 若任務已開始，frontmatter 應同步補 `started_at` 與 `started_by_agent`
