# ATM 多語言 Worker Adaptor 方案

## 文件定位

這份文件不是概念討論稿，而是可直接對應實作與開卡的 Team Agents 執行規格。

本次規格聚焦四件事：

1. Team Agents 執行模式切換
2. 多語言 Worker Adaptor 與預設 Node.js 路線
3. reviewer / validator 的正式 rework 路由
4. artifact handoff 與 bounded retry / escalation runtime contract

## 先決結論

### 1. ATM 不需要學 botpipe 的「有 verifier」

ATM 已經有 Reviewer、Validator、Atomic Police、Broker、Team Agents、Coordinator 等治理角色，角色治理面其實比 botpipe 更完整。

ATM 真正值得學的是兩件事：

1. 把 reviewer / validator 的 finding 從 advisory finding 提升成正式 runtime route
2. 把 role-to-role artifact handoff 與 retry policy 做成 runtime contract，而不是只停留在 prompt 約定

### 2. ATM 要補的是 execution adapter，不是把 Team Agents 綁死在某個編輯器

Team Agents 應該支援三種執行模式，由參數決定：

1. `real-agent`
2. `editor-subagent`
3. `broker-only`

這樣 ATM 才能同時支援：

1. 預設 Node.js 真實 Agent
2. 指定廠商 SDK 的真實 Agent
3. 使用編輯器 SubAgent 扮演角色
4. 完全不生成 Agent，只保留 Broker / lease / validator / police / evidence

### 3. Node.js 應維持預設，但 Python / C# 要有官方範例 adaptor

不是因為 Python 不能做，而是因為 ATM 現有 CLI、schema、validator、broker、evidence 主執行面本來就在 Node.js / TypeScript。

因此建議：

1. 預設 runtime: Node.js
2. 官方示範 adaptor: Python、C#
3. 架構語意維持中立：任何語言都只是 adaptor / worker runtime，不是治理主體

## Ledger 與開卡判定

本次規劃先以 `3KLife` 的 ledger 與實際 task card frontmatter 為準，再回看 task index。

### 實際檢查結果

1. `C:\Users\User\3KLife\.atm\history\tasks\` 目前沒有 imported `TASK-TEAM-*` ledger task
2. Team 任務目前仍以 `docs\ai_atomic_framework\team-agents\tasks\*.task.md` 為主要規劃來源
3. `tasks\README.md` 的 roster 狀態有落差，不能直接當唯一真相

### ATM ledger 已 imported 且已完成，不可再當新需求修改的卡

1. `TASK-TEAM-0010`
2. `TASK-TEAM-0011`
3. `TASK-TEAM-0012`
4. `TASK-TEAM-0013`
5. `TASK-TEAM-0015`
6. `TASK-TEAM-0016`
7. `TASK-TEAM-0017`
8. `TASK-TEAM-0027`
9. `TASK-TEAM-0028`
10. `TASK-TEAM-0029`
11. `TASK-TEAM-0030`

### 3KLife planning surface 仍可補規格的卡

1. `TASK-TEAM-0014`
2. `TASK-TEAM-0018`
3. `TASK-TEAM-0019`

### 本文件新增的後續卡

1. `TASK-TEAM-0031`
2. `TASK-TEAM-0032`
3. `TASK-TEAM-0033`
4. `TASK-TEAM-0034`
5. `TASK-TEAM-0035`
6. `TASK-TEAM-0036`

## 目標架構

### 核心原則

1. Team Agents 是 ATM 的執行表面，不是第二套 task scheduler
2. Broker 仍是全域 mutation / lease / conflict 治理面
3. Worker adaptor 只是把角色執行接到不同語言或不同 editor/subagent
4. reviewer / validator 的 finding 必須可以正式打回流程
5. artifact、retry budget、escalation 要由 runtime enforce，不只靠 prompt

### 執行層次

#### Governance Layer

負責：

1. task lifecycle
2. scope lock
3. permission lease
4. broker admission
5. evidence / closure

#### Team Runtime Layer

負責：

1. team run state
2. runtime mode selection
3. role spawn request
4. route-based rework state machine
5. artifact handoff contract
6. retry / escalation budget

#### Worker Adaptor Layer

負責：

1. Node.js worker
2. Python worker
3. C# worker
4. editor subagent bridge

#### Agent / SubAgent Layer

可能存在，也可能不存在：

1. 真實 Agent
2. editor subagent
3. 關閉全部 agents，只由 broker + validator + police 執行

## 執行模式規格

### `real-agent`

由 ATM runtime 透過 adaptor 產生真正的 worker / agent。

必要參數：

1. `runtimeMode=real-agent`
2. `runtimeLanguage=node|python|csharp`
3. `runtimeAdapterId`
4. `providerId`
5. `sdkId`
6. `modelId`

預設：

1. `runtimeLanguage=node`
2. `runtimeAdapterId=node-default`
3. `providerId=openai-compatible` 或明確 provider

### `editor-subagent`

由 ATM runtime 產生 role envelope，交給 editor 既有 SubAgent 機制執行。

必要參數：

1. `runtimeMode=editor-subagent`
2. `editorAdapterId`
3. `editorFamily`
4. `roleDispatchPolicy`

限制：

1. editor 能力可以被當成 execution surface，但不能成為治理主體
2. 仍需服從 ATM 的 lease、scope、artifact、retry、evidence contract

### `broker-only`

完全不產生 agents，只保留：

1. broker
2. lease validator
3. file.write scope validator
4. police patrol
5. evidence / closure

適合：

1. 純治理驗證
2. 僅做 preflight / patrol / route decision
3. 使用者不想啟用任何多代理

## Runtime 主要資料結構

### Team Run

`teamRun` 至少要補齊以下欄位：

1. `teamRunId`
2. `taskId`
3. `runtimeMode`
4. `runtimeLanguage`
5. `runtimeAdapterId`
6. `providerId`
7. `sdkId`
8. `modelId`
9. `brokerEnabled`
10. `roleAssignments`
11. `artifactContracts`
12. `retryBudget`
13. `routeState`
14. `reviewerIndependencePolicy`

### Role Assignment

每個角色至少要記錄：

1. `roleId`
2. `executionKind=real-agent|editor-subagent|humanless-disabled`
3. `adapterId`
4. `providerId`
5. `sdkId`
6. `modelId`
7. `permissionLeases`
8. `allowedFiles`
9. `artifactOutputs`

## Worker Adaptor Contract

```ts
interface TeamAgentRuntimeAdapter {
  id: string;
  runtimeLanguage: 'node' | 'python' | 'csharp' | 'mixed';
  executionKind: 'real-agent' | 'editor-subagent' | 'broker-only';
  supportsSpawn: boolean;
  supportsReadOnlyRole: boolean;
  supportsWriteScopedRole: boolean;
  supportsReviewerIndependence: boolean;
  supportsArtifactContract: boolean;
  supportsRetryBudget: boolean;
  spawnAgent(input: TeamAgentSpawnRequest): Promise<TeamAgentSpawnResult>;
}
```

### `TeamAgentSpawnRequest`

至少包含：

1. `teamRunId`
2. `taskId`
3. `roleId`
4. `runtimeMode`
5. `runtimeLanguage`
6. `adapterId`
7. `providerId`
8. `sdkId`
9. `modelId`
10. `allowedFiles`
11. `permissionLeases`
12. `artifactContract`
13. `retryBudget`
14. `validationCommands`

### `TeamAgentSpawnResult`

至少包含：

1. `ok`
2. `routeState`
3. `summary`
4. `touchedFiles`
5. `producedArtifacts`
6. `validationResults`
7. `reviewFindings`
8. `attestation`
9. `adapterVersion`
10. `providerRuntimeInfo`

## Reviewer / Validator Rework Loop v1

### 核心判斷

ATM 不需要補一個「有 verifier」的功能，而是要把 verifier / reviewer 的結果，正式轉成 route-based state machine。

### 正式狀態

1. `planned`
2. `in-progress`
3. `needs-review`
4. `needs-rework`
5. `rework-in-progress`
6. `revalidate-pending`
7. `ready-for-close`
8. `blocked`
9. `escalated`

### 允許轉移

```text
planned -> in-progress
in-progress -> needs-review
needs-review -> ready-for-close
needs-review -> needs-rework
needs-rework -> rework-in-progress
rework-in-progress -> revalidate-pending
revalidate-pending -> ready-for-close
revalidate-pending -> needs-rework
any -> blocked
blocked -> escalated
```

### 必須打回流程的來源

下列 finding 不能只留下 advisory note，必須正式轉 route：

1. reviewer 給出 blocking finding
2. validator fail
3. artifact 缺件
4. retry budget 用盡
5. lease / scope violation

## Artifact Handoff Contract

### 為什麼要做

ATM 已經有角色，但角色之間的輸入輸出還沒有被 runtime 明確約束。

### 每個角色都要宣告

1. `consumesFrom`
2. `producesTo`
3. `requiredArtifacts`
4. `optionalArtifacts`
5. `artifactSchemaId`

### 最小角色 artifact

#### Implementer

輸出：

1. patch proposal
2. touched files
3. implementation note

#### Validator

輸出：

1. command-backed results
2. pass/fail
3. failure summary

#### Reviewer

輸出：

1. review findings
2. route decision
3. rework reason

#### Evidence Collector

輸出：

1. closure-ready evidence bundle
2. artifact manifest
3. attestation summary

## Bounded Retry / Escalation Policy

### Runtime 欄位

1. `maxReworkCycles`
2. `maxValidatorReruns`
3. `maxReviewerReturns`
4. `escalationTarget`
5. `escalationReason`

### 規則

1. reviewer / validator 可以要求 rework，但不能無限循環
2. retry budget 耗盡後必須轉 `escalated`
3. escalation 可指向 `coordinator`、`captain` 或 `human-review`
4. broker-only 模式也要保留 retry / escalation contract

## Reviewer Independence

### ATM 已有基礎，不需要重做角色制度

ATM 已經有 Reviewer，而且也有要求 Reviewer 由另一個模型擔任的治理方向。

### 本次真正要補的是 runtime enforce

至少要記錄：

1. `reviewerProviderId`
2. `reviewerModelId`
3. `reviewerAdapterId`
4. `implementerProviderId`
5. `implementerModelId`
6. `independenceSatisfied`
7. `independencePolicyId`

若政策要求 reviewer 必須不同模型，runtime 必須能檢查，不可只寫在文件上。

## 為何預設 Node.js，而不是改成 Python

### Node.js 當預設的理由

1. ATM 現有 CLI / validator / broker / evidence 主流程都在 Node.js / TypeScript
2. schema、命令列、整體 repo tooling 一致性最好
3. 最低整合成本

### Python / C# 仍然值得有

1. Python 適合很多 API wrapper / SDK / script-first worker
2. C# 適合企業內部 .NET 生態
3. 兩者應該是 adaptor 範例與擴展入口，而不是替換治理主幹

### 結論

1. 預設 Node.js
2. 文件與 contract 中立
3. Python / C# 提供官方 reference adaptor example

## 與既有卡的對應修改

### 允許補改的既有卡

#### `TASK-TEAM-0014`

補進：

1. patrol 對 runtime mode / artifact 缺件 / retry budget 的巡檢
2. patrol finding 與 rework state machine 的關聯訊號

#### `TASK-TEAM-0018`

補進：

1. real-agent / editor-subagent 的 lease fencing
2. agent slot / lease collision / stale holder 規則

#### `TASK-TEAM-0019`

補進：

1. runtime attestation
2. adapter / provider / sdk / model metadata
3. reviewer independence attestation

## 新增後續卡規劃

### `TASK-TEAM-0031`

題目：`Team runtime mode and adapter contract`

目標：

1. 正式定義 `real-agent` / `editor-subagent` / `broker-only`
2. 定義 runtime adapter selection contract
3. 預設 Node.js，允許指定 provider / sdk

### `TASK-TEAM-0032`

題目：`Editor subagent bridge contract`

目標：

1. 讓 Codex / Claude Code / Cursor / Gemini / Antigravity 這類 editor subagent 成為 Team role execution surface
2. 不把 editor 變成治理主體

### `TASK-TEAM-0033`

題目：`Team reviewer-validator rework route state machine`

目標：

1. 把 reviewer / validator finding 正式打回 `needs-rework`
2. 讓 close / retry / block 有明確 route

### `TASK-TEAM-0034`

題目：`Role artifact handoff and bounded retry contract`

目標：

1. 定義 role-to-role artifact schema
2. 定義 retry budget / escalation policy

### `TASK-TEAM-0035`

題目：`Node.js reference worker adapter and broker-only fallback`

目標：

1. 提供預設 Node.js 真實 worker
2. 支援 provider / sdk 選擇
3. 同時支援完全不產生 agent 的 broker-only fallback

### `TASK-TEAM-0036`

題目：`Python and C# reference worker adapter examples`

目標：

1. 提供 Python adaptor example
2. 提供 C# adaptor example
3. 保持與 Node.js contract 等價

## 交付順序

### Phase 1

1. `TASK-TEAM-0031`
2. `TASK-TEAM-0032`

### Phase 2

1. `TASK-TEAM-0033`
2. `TASK-TEAM-0035`

### Phase 3

1. `TASK-TEAM-0034`
2. `TASK-TEAM-0014`

### Phase 4

1. `TASK-TEAM-0018`
2. `TASK-TEAM-0019`
3. `TASK-TEAM-0036`

## 實作完成判定

以下條件都成立，才算這份方案落地：

1. `team start` 可由參數決定三種 runtime mode
2. 預設 Node.js worker 可獨立執行，不依附特定 editor
3. editor subagent 可被當成 Team role 執行面
4. broker-only 模式可不產生任何 agents
5. reviewer / validator 可正式把流程打回 `needs-rework`
6. artifact handoff 有 schema 與 runtime 驗證
7. retry / escalation 有明確 budget
8. Python / C# 至少有 reference adaptor example

## 本次規劃結論

ATM 不需要向 botpipe 學「有 verifier」或「多 reviewer 角色制度」。

ATM 真的要補的是：

1. verifier / reviewer 如何正式打回流程
2. role 之間如何用 artifact contract 被 runtime 強制銜接
3. retry / escalation 如何 bounded
4. Team Agents 如何參數化切換成真實 Agent、editor subagent 或 broker-only
5. 多語言 adaptor 如何在維持 Node.js 預設的前提下擴展 Python / C#
