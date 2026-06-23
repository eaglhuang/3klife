<!-- doc_id: doc_skl_plan_0001 -->

# SKL Tool-First 升級計畫書

Generated: 2026-06-23
Planning repo: 3KLife
Target framework: AI-Atomic-Framework / ATM
Status: planning source of truth
Source: `C:\Users\User\.codex\attachments\8284c9f2-2886-4e37-83e7-e69b2b9651c9\pasted-text.txt`

## 0. 摘要

本計畫的核心不是再多教一層 skill 如何拼 shell 指令，而是把 ATM 常用治理能力提升為可被 editor/integration 直接呼叫的結構化 tool surface，再由 skill 負責 routing、policy、fallback 與 token-efficient orchestration。

目標狀態：

- tool bridge 直接暴露 machine-readable result shape；
- skill 預設走 tool-first，CLI 僅保留為 fallback 與 read-only inspection；
- `next / claim / evidence / close / commit` 的 lane 決策不再依賴 skill 手工拼命令；
- commit/close lane 對 runtime residue、foreign active-claim、cross-repo planning 對齊有明確 hardening。

## 1. 問題定義

目前 ATM skill 多半仍靠 shell 驅動 CLI，帶來幾個摩擦點：

1. result shape 不穩定，skill 需要解析文字而不是消費明確欄位。
2. 不同 integration 難以共享一致的 follow-up contract，例如 `userNotice`、`nextAction.playbook`、`runnerMode`。
3. close/commit lane 容易被 runtime residue、foreign active-claim、staged foreign governance artifacts 干擾。
4. planning repo 與 framework repo 的 boundary 已存在，但缺少穩定的 tool-facing machine-readable surface 來承接。

## 2. 設計原則

### 2.1 Tool 與 Skill 分工

- Tool：暴露 ATM 治理能力與 machine-readable output。
- Skill：負責語意路由、決策順序、fallback policy、token budget 保護。
- CLI：保留為 underlying engine 與 fallback，不應再是 tool-capable editor 的主要 orchestration API。

### 2.2 Repo-local v1

v1 以 repo-local internal bridge 為主，不主張此輪直接引入 remote shared broker service 或新一代 MCP server。

### 2.3 Fail-closed

- governance blockers 必須以明確 `code` 與 structured payload 對外暴露；
- blocked lane 不能退化成 skill 自己猜測或 silently bypass；
- planning repo / target repo / framework temp claim 的差異需可被 tool surface 清楚表達。

## 3. ATM Tool Bridge v1

### 3.1 Top-level result shape

每個 ATM tool 至少應回傳：

- `ok: boolean`
- `command: string`
- `cwd: string`
- `status?: string`
- `messages: { level, code, text, data? }[]`
- `evidence?: Record<string, unknown>`
- `nextAction?: Record<string, unknown> | null`
- `userNotice?: { text, data? } | null`
- `blockedBy?: string[]`
- `allowedScope?: string[] | null`
- `recommendedFollowup?: string[]`
- `runnerMode?: { mode, normalGovernanceCommand, sourceFirstCommand?, syncCommand? } | null`

### 3.2 Output 規範

- CLI 的 `ATM_*` code 需要可被保留並轉寫到 tool result。
- tool bridge 只負責 transport / shape / parameter validation，不重新發明治理語義。
- 任何 blocker 都必須有 machine-readable `code`，避免 skill 只能比對字串。

## 4. v1 Tool Surface

本 lane 將 tool-first surface 收斂成六張任務卡：

1. `TASK-SKL-0001` 開包與計畫回寫
2. `TASK-SKL-0002` Tool Bridge v1 schema / result adapter
3. `TASK-SKL-0003` `next / claim / framework-mode` tools
4. `TASK-SKL-0004` `evidence / guard / taskflow / governed commit` operator tools
5. `TASK-SKL-0005` skill tool-first orchestration migration
6. `TASK-SKL-0006` governed commit / residue / active-claim hardening

### 4.1 核心 tools

- `atm_next`
- `atm_next_claim`
- `atm_framework_mode_status`
- `atm_framework_mode_claim`
- `atm_evidence_run`
- `atm_guard_run`
- `atm_taskflow_open`
- `atm_taskflow_pre_close`
- `atm_taskflow_close`
- `atm_git_commit`

## 5. Skill 遷移規則

- `atm-governance-router`、`atm-next`、`atm-task-intent-resolver`、`atm-evidence`、`atm-lock` 等 skill 應先探測 tool-capable environment。
- 有 tool 時先走 tool-first；沒有 tool 或 tool 失敗時才退回 CLI。
- fallback policy 必須明示，不能在 skill 內偷偷把 blocked lane 降格成 shell 直跑。

## 6. Hardening 主題

### 6.1 P0

- auto-generated runtime residue 辨識與 advisory
- foreign active-claim blocker 與 close/commit lane 診斷
- governed commit lane 對 staged foreign governance artifacts 的 fail-closed 說明

### 6.2 P1

- planning repo vs framework repo cross-repo target 對齊
- framework temp claim 與 prompt-scoped task route 的 machine-readable disclosure
- `taskflow pre-close` / `close` 的 residue diagnostics shape 一致化

## 7. 實作波次

### Phase A

建立 Tool Bridge v1 的 schema、adapter、result normalization 與 capability registry。

### Phase B

落地核心 tool surface，先覆蓋 `next / claim / framework-mode / evidence / guard / commit / taskflow`。

### Phase C

將 skill 轉為 tool-first orchestration，保留 CLI fallback 與 editor capability detection。

### Phase D

補齊 close/commit lane residue、active-claim、foreign staged governance artifacts 的 hardening。

### Phase E

補 adoption note、migration note、editor integration matrix 與 rollout guidance。

## 8. 任務包

| Task ID | Kind | Goal | Target repo | Depends |
|---|---|---|---|---|
| `TASK-SKL-0001` | planning card | 回寫 SKL 計畫、建立任務索引，開出 0002~0006 | 3KLife | none |
| `TASK-SKL-0002` | execution card | 建立 Tool Bridge v1 schema、CLI result adapter、capability registry | AI-Atomic-Framework | `TASK-SKL-0001` |
| `TASK-SKL-0003` | execution card | 落地 `next / claim / framework-mode` tool surface | AI-Atomic-Framework | `TASK-SKL-0001`, `TASK-SKL-0002` |
| `TASK-SKL-0004` | execution card | 落地 `evidence / guard / taskflow / governed commit` operator tools | AI-Atomic-Framework | `TASK-SKL-0001`, `TASK-SKL-0002` |
| `TASK-SKL-0005` | execution card | 將 skill 改寫為 tool-first orchestration 並保留 CLI fallback | AI-Atomic-Framework | `TASK-SKL-0002`, `TASK-SKL-0003`, `TASK-SKL-0004` |
| `TASK-SKL-0006` | execution card | harden commit/close lane 的 residue、active-claim、cross-repo 邏輯 | AI-Atomic-Framework | `TASK-SKL-0003`, `TASK-SKL-0004`, `TASK-SKL-0005` |

## 9. 完成定義

此 lane 的「v1 完成」代表：

- tool-capable editor 可以用結構化 tools 走完主要 ATM 治理路徑；
- skill 能消費 machine-readable `messages / evidence / nextAction / runnerMode / userNotice`；
- blocked lane 與 boundary condition 有明確 `code` 與 payload；
- CLI 保留為 fallback，但不再是主要 orchestrator；
- close/commit lane 對 residue 與 foreign governance noise 的診斷足夠穩定，可在真實 dogfood 中使用。

## 10. Non-Goals

- 本輪不主張直接改成 remote-first architecture。
- 本輪不重寫整個 ATM CLI，只為 tool-first surface 建立橋接層。
- 本輪不創造第二套 task model；ATM 的正式治理語義仍由既有 CLI/runtime 持有。

## 11. Cross References

- 參考 lane: [../cid-hardening/README.md](../cid-hardening/README.md)
- 任務索引: [./tasks/README.md](./tasks/README.md)
- 已驗證事實: [./00-verified-facts.md](./00-verified-facts.md)
