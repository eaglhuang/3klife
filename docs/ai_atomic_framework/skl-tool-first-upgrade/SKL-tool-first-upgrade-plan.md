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

### 2.2 Router / Playbook / Specialist Skill 三層模型

- `atm-governance-router` 是第一層薄入口，只負責 first-touch 與進 ATM。
- `playbook` 是第二層動態路由，負責當次工作的 lane、先後順序、claim/evidence/close/commit 時機。
- `atm-next`、`atm-task-intent-resolver`、`atm-dispatch`、`atm-evidence`、`atm-lock`、`atm-handoff` 等小 skill 是第三層 specialist skill，各自負責單一治理目的。

設計原則：

- router skill 負責進 ATM，不負責背全部治理細節；
- playbook 負責當次 orchestration；
- specialist skill 負責專業化執行；
- 不把全部 lane 細節再複製回 router 本體。

### 2.3 Repo-local v1

v1 以 repo-local internal bridge 為主，不主張此輪直接引入 remote shared broker service 或新一代 MCP server。

### 2.4 Fail-closed

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

### 5.1 薄 router 原則

- `atm-governance-router` 保持短小，只保留：
  - first-touch entry contract
  - 何時改叫 `atm-task-intent-resolver`
  - 何時改叫 `atm-dispatch`
  - 何時檢查 framework-mode
  - 何時必須讀 playbook
- 不把 `atm-next`、`atm-lock`、`atm-evidence`、`atm-handoff` 的全部細節複製進 router。

### 5.2 共用 Skill 成長架構

不論大 skill 或小 skill，都應共用同一套可成長架構：

- `SKILL.md`：只放穩定、低歧義、值得常駐的核心規則
- `references/learning-loop.md`：放撞牆案例、經驗、修正、模式觀察
- `references/growth-taxonomy.md` 或等效 shared reference：放全 skill 共用分類法、capture template、promotion policy

每顆 skill 都使用同一套欄位與流程：

- `Category`
- `Trigger`
- `Symptom`
- `Correct route`
- `Durable rule`
- `Promotion target`
- `Confidence`
- `Reuse scope`

核心原則：

- 個案先進 reference
- 模式成熟才升 `SKILL.md`
- 相同錯誤分類、capture 模板、promotion 規則可跨 skill 共用

### 5.3 建議共用分類

- `entry-friction`
- `route-confusion`
- `boundary-confusion`
- `fallback-misuse`
- `validator-gap`
- `tooling-mismatch`
- `encoding-risk`
- `overloaded-context`
- `repo-specific-but-generalizable`

## 6. Team Agents 整合模型

### 6.1 Agent + Skill 單元

本計畫把 Team Agent 視為可治理的工作單元，而不是單純的模型人格：

```text
Team Agent = Role + Skill Pack + Permission Lease + Playbook Slice + Growth Contract
```

這代表：

- `Role` 決定職責與禁止事項
- `Skill Pack` 決定專長與工作知識
- `Permission Lease` 決定可持有的能力與範圍
- `Playbook Slice` 決定在當次工作中該角色何時出場、做哪一步
- `Growth Contract` 決定它如何累積錯誤與經驗，而不污染其他角色

### 6.2 四層整合架構

#### Layer 1: Router Layer

- `atm-governance-router`
- `atm-dispatch`
- `atm-task-intent-resolver`

職責：判斷是否進 ATM、是否需要 Team、是否需要特定治理 lane。

#### Layer 2: Playbook Layer

playbook 是本次工作的動態 orchestration contract，負責：

- 決定是否啟動 Team
- 決定啟動哪些角色
- 決定先後順序與可否平行
- 決定哪些角色只有 advisory 權限
- 決定哪些角色可持有 scoped lease

#### Layer 3: Role Skill Pack Layer

每個 Team 角色對應一個 skill pack，而不是一顆肥大 skill。

建議對應：

- Coordinator pack
- Scope Guardian pack
- Implementer pack
- Review Agent pack
- Validator pack
- Evidence Collector pack
- Knowledge Scout pack
- Neutral Write Steward pack

#### Layer 4: Permission / Lease Layer

角色 skill 不只是提示詞不同，而是真正擁有不同權限 lease：

- Coordinator：`task.lifecycle`, `git.write`, `evidence.write`
- Implementer：`file.write`
- Validator：`exec.validator`
- Scope Guardian：`file.read`
- Review Agent：`file.read`, `review.signature.write`
- Knowledge Scout：`file.read`, advisory query 類能力
- Neutral Write Steward：bounded write only, no `git.write`

### 6.3 角色與 skill pack 的關係

關鍵原則不是「每個角色只綁一顆 skill」，而是「每個角色擁有一組低耦合 skill pack」。

例如：

- Coordinator pack 可包含 `atm-governance-router`、`atm-next`、`atm-dispatch`、`atm-handoff`
- Scope Guardian pack 可包含 `atm-lock`、scope/boundary preflight skill
- Validator pack 可包含 `atm-evidence`、validator orchestration skill
- Knowledge Scout pack 可包含 shared growth / retrieval / preflight query skill

### 6.4 不耦合的擴充優勢

此模型的主要好處：

1. 技能不耦合：每個角色只載入自己的 skill pack
2. 知識不耦合：不同角色的 learning loop 不互相污染
3. 權限不耦合：錯誤角色拿不到不該有的 lease
4. 演進不耦合：新增角色時只需新增 role contract + skill pack
5. provider 不耦合：同一 role contract 可對應不同模型商或 runtime
6. 成長不耦合：共享 growth contract，但各自累積本域經驗

### 6.5 必守 guardrail

雖然角色有 skill pack，但流程主權仍屬於 playbook 與 Coordinator：

- individual skill 不得變成第二套 scheduler
- Team 不得取代 ATM 的 claim / close / checkpoint / commit authority
- role skill pack 只能專業化執行，不可自己改寫 lifecycle

這一條是 Team Agents 與 SKL 能結合而不失控的核心。

## 7. Hardening 主題

### 6.1 P0

- auto-generated runtime residue 辨識與 advisory
- foreign active-claim blocker 與 close/commit lane 診斷
- governed commit lane 對 staged foreign governance artifacts 的 fail-closed 說明

### 6.2 P1

- planning repo vs framework repo cross-repo target 對齊
- framework temp claim 與 prompt-scoped task route 的 machine-readable disclosure
- `taskflow pre-close` / `close` 的 residue diagnostics shape 一致化

## 8. 實作波次

### Phase A

建立 Tool Bridge v1 的 schema、adapter、result normalization 與 capability registry。

### Phase B

落地核心 tool surface，先覆蓋 `next / claim / framework-mode / evidence / guard / commit / taskflow`。

### Phase C

將 skill 轉為 tool-first orchestration，保留 CLI fallback 與 editor capability detection。

### Phase C.1

把 `router / playbook / specialist skill` 三層模型固定下來，避免 router 過胖。

### Phase C.2

為所有 ATM skills 建立可共用的 growth contract，讓大小 skill 都能用同一種 learning loop、taxonomy、promotion policy 吸收錯誤與經驗。

### Phase D

把 Team role 映射成 skill packs，讓 Team Agents 由「角色名義存在」提升成「角色 + skill pack + lease + growth contract」的可治理單元。

### Phase E

建立 role-routing matrix、provider-neutral role packs、shared capability manifest，讓 Team Agents 可以在多 vendor runtime 下維持同一套角色治理語義。

### Phase F

補齊 close/commit lane residue、active-claim、foreign staged governance artifacts 的 hardening。

### Phase G

補 adoption note、migration note、editor integration matrix 與 rollout guidance。

## 9. 任務包

| Task ID | Kind | Goal | Target repo | Depends |
|---|---|---|---|---|
| `TASK-SKL-0001` | planning card | 回寫 SKL 計畫、建立任務索引，開出 0002~0006 | 3KLife | none |
| `TASK-SKL-0002` | execution card | 建立 Tool Bridge v1 schema、CLI result adapter、capability registry | AI-Atomic-Framework | `TASK-SKL-0001` |
| `TASK-SKL-0003` | execution card | 落地 `next / claim / framework-mode` tool surface | AI-Atomic-Framework | `TASK-SKL-0001`, `TASK-SKL-0002` |
| `TASK-SKL-0004` | execution card | 落地 `evidence / guard / taskflow / governed commit` operator tools | AI-Atomic-Framework | `TASK-SKL-0001`, `TASK-SKL-0002` |
| `TASK-SKL-0005` | execution card | 將 skill 改寫為 tool-first orchestration 並保留 CLI fallback | AI-Atomic-Framework | `TASK-SKL-0002`, `TASK-SKL-0003`, `TASK-SKL-0004` |
| `TASK-SKL-0006` | execution card | harden commit/close lane 的 residue、active-claim、cross-repo 邏輯 | AI-Atomic-Framework | `TASK-SKL-0003`, `TASK-SKL-0004`, `TASK-SKL-0005` |
| `TASK-SKL-0007` | execution card | 建立所有 ATM skills 共用的成長架構與可重用 learning loop contract | AI-Atomic-Framework | `TASK-SKL-0002`, `TASK-SKL-0005` |
| `TASK-SKL-0008` | planning/execution bridge | 定義 Team role 到 skill pack 的映射契約與 capability boundary | AI-Atomic-Framework | `TASK-SKL-0005`, `TASK-SKL-0007` |
| `TASK-SKL-0009` | execution card | 建立 Team role-routing matrix 與 playbook slice contract | AI-Atomic-Framework | `TASK-SKL-0003`, `TASK-SKL-0005`, `TASK-SKL-0008` |
| `TASK-SKL-0010` | execution card | 建立 provider-neutral role skill-pack manifest 與 permission lease 對齊 | AI-Atomic-Framework | `TASK-SKL-0007`, `TASK-SKL-0008`, `TASK-SKL-0009` |
| `TASK-SKL-0011` | execution card | 將至少一組 Team roles 實際接成 Agent+Skill 可獨立治理單元 | AI-Atomic-Framework | `TASK-SKL-0008`, `TASK-SKL-0009`, `TASK-SKL-0010` |
| `TASK-SKL-0012` | execution card | 將 Team role skill packs 的 growth contract 與 observability 接入 Team runtime | AI-Atomic-Framework | `TASK-SKL-0007`, `TASK-SKL-0010`, `TASK-SKL-0011` |
| `TASK-SKL-0013` | execution card | 建立 shared `atm-error-code-resolver` skill 與 registry-backed error-code knowledge | AI-Atomic-Framework | `TASK-SKL-0002`, `TASK-SKL-0005`, `TASK-SKL-0007` |
| `TASK-SKL-0014` | execution card | 補齊 framework temp claim quickfix 的 `skill -> tools/playbook -> CLI fallback` 友善 AI 路徑 | AI-Atomic-Framework | `TASK-SKL-0002`, `TASK-SKL-0003`, `TASK-SKL-0005`, `TASK-SKL-0013` |
| `TASK-SKL-0015` | execution card | 將 ATM 2.0/2.1 隊長交接中的穩定治理流程回寫到入口 skill 與其投影內容 | AI-Atomic-Framework | `TASK-SKL-0005`, `TASK-SKL-0007`, `TASK-SKL-0014` |

## 10. 完成定義

此 lane 的「v1 完成」代表：

- tool-capable editor 可以用結構化 tools 走完主要 ATM 治理路徑；
- `atm-governance-router` 維持薄入口，而不是變成肥大的總技能；
- `playbook` 穩定扮演 router 與 specialist skills 之間的中介層；
- skill 能消費 machine-readable `messages / evidence / nextAction / runnerMode / userNotice`；
- 大小 skill 共用同一套 growth contract，可持續吸收錯誤與知識經驗；
- Team Agent 可以被清楚定義為 `Role + Skill Pack + Permission Lease + Playbook Slice + Growth Contract`；
- 至少一個 Team role 組合能被驗證為獨立、不混淆、低耦合的治理單元；
- blocked lane 與 boundary condition 有明確 `code` 與 payload；
- CLI 保留為 fallback，但不再是主要 orchestrator；
- close/commit lane 對 residue 與 foreign governance noise 的診斷足夠穩定，可在真實 dogfood 中使用。

## 11. Non-Goals

- 本輪不主張直接改成 remote-first architecture。
- 本輪不重寫整個 ATM CLI，只為 tool-first surface 建立橋接層。
- 本輪不創造第二套 task model；ATM 的正式治理語義仍由既有 CLI/runtime 持有。
- 本輪不讓 individual role skill 自己掌管 lifecycle；Coordinator-only lifecycle 仍維持不變。

## 12. Cross References

- 參考 lane: [../cid-hardening/README.md](../cid-hardening/README.md)
- Team Agents planning source: `C:/Users/User/3KLife/docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md`
- 任務索引: [./tasks/README.md](./tasks/README.md)
- 已驗證事實: [./00-verified-facts.md](./00-verified-facts.md)

## 13. Runner Dogfood Addendum

This addendum is part of the active SKL execution contract.

### 13.1 Frozen runner proof rule

- When a fix changes `CLI / close / taskflow / hook / evidence` behavior and the verification target is the frozen runner (`node atm.mjs`), use: `ATM_RETAIN_RELEASE_ARTIFACTS=1 npm run build`
- A successful `node atm.dev.mjs` run proves source-first behavior only. It does not prove the frozen runner has been refreshed.
- Do not claim frozen-runner validation unless the retained build artifacts were produced and the frozen entrypoint was rerun afterward.

### 13.2 Growth and history routing

- Record this kind of wall-hit in shared growth while the bug or operator trap is still active.
- Keep the product side in backlog until the underlying runner/build behavior is fixed.
- Once the fix is stable and the workaround no longer needs to load by default, move the narrative case into a historical section to keep skill context lean.

## 14. Error-code Management Addendum

This addendum is part of the active SKL execution contract.

Dogfood on 2026-07-15 showed that ATM error-code handling must become a shared
skill surface, not scattered prose inside each specialist skill.
`docs/ERROR_CODES.md` is currently a generated source-location index; it does
not yet provide enough operator knowledge for live recovery.

`TASK-SKL-0013` adds the missing shared resolver lane:

- one canonical structured source or generated projection for user-visible
  `ATM_*` codes;
- a shared `atm-error-code-resolver` skill that other ATM skills can invoke or
  reference;
- consistent fields for meaning, category, common cause, remediation,
  retryability, human-approval requirement, and related commands/runbooks;
- graceful handling for unknown or newly introduced codes.

This keeps router, dispatch, evidence, handoff, Team, and commit skills from
maintaining private error-code tables that drift apart.

## 15. Framework Temp Claim Addendum

Dogfood around `ATM-GOV-0196` exposed a separate SKL usability gap: framework
temporary-claim quickfix work is currently documented as scattered
`framework-mode status/claim` CLI snippets across existing skills, but it is not
yet a first-class friendly AI route.

`TASK-SKL-0014` adds that missing lane. The target design is:

```text
skill intent -> tool/playbook surface -> CLI fallback -> structured evidence
```

The lane must preserve normal ATM lifecycle authority. It is not a second task
model and it must not become a hard-coded emergency bypass. The route must:

- prefer structured tools/playbook output in tool-capable editors;
- fall back to explicit CLI commands only when tools are unavailable or blocked;
- distinguish normal task claim, framework temp claim, runner-sync release work,
  and emergency ledger/history recovery;
- route `ATM_*` blockers through the shared error-code resolver;
- derive task id, actor, branch, dirty files, queue state, and blocker decisions
  from runtime output instead of hard-coded data;
- consume the sealed `ATM-GOV-0196` summary before final dogfood acceptance.

This addendum is intentionally P1 because the gap affects agent entry safety and
operator clarity before additional framework quickfix work should rely on the
raw CLI path.

## 16. Entry Skill Governance-Flow Backwrite Addendum

The 2026-07-20 ATM 2.0 / 2.1 Captain handoff exposed a reusable skill-growth
case. The handoff contains stable governance-flow rules that every future
Captain, dispatcher, handoff writer, and evidence operator should see early:

- every card should record consumed sealed summaries, missing data, assumption
  changes, stop rule, and whether it touched a shared-write gate;
- every shared-write gate should be checked against `INV-ATM-008` before a
  blocker is normalized as expected;
- repairs should be generalized and data-driven rather than hard-coded to one
  actor, task id, queue id, path, date, or incident string;
- closeout should check telemetry windows, watermarks, counters, timings,
  compact digests, and explicit unavailable receipts;
- runner, release, broker shared-write, first-layer, or generated integration
  changes need frozen runner smoke evidence, not only source tests;
- new dogfood friction should be captured in backlog or shared learning
  references instead of remaining only in chat.

Those stable rules belong in entry skills. Historical 2.0 / 2.1 state from the
handoff does not. `TASK-SKL-0015` captures this boundary and requires source
skill-template updates before installed editor copies are refreshed.
