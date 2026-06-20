# ATM 多廠商 Agent Runtime 與 Integration 藍圖

## 目標

在 ATM 的治理框架下，讓 Team Agents 可以用同一套 runtime contract 接上多家 vendor 的 agent / SDK / editor-subagent execution surface，同時保留：

1. vendor-neutral 的抽象層
2. 可配置但不耦合的權限層
3. adopter repo 本地化的 vendor integration 設定
4. 跨廠商、跨功能、可查詢的 observability / log
5. role 級別的 provider / capability 選擇與預設值
6. 對 OpenAI、Azure OpenAI、Claude Code、Gemini、Microsoft Foundry 的擴充路徑

## 核心原則

### 1. 先抽象，後接廠商

ATM framework 只定義 Team runtime provider contract、permission broker contract、observability contract、selection policy contract。任何 vendor-specific bridge 都必須經過這些 contract 進入 Team runtime。

### 2. 權限治理強制存在，但不耦合 vendor

vendor bridge 不可自行決定：

- 能不能寫檔
- 能不能關 task
- 能不能寫 evidence
- 能不能發動高權限 tool

這些全部由 ATM 的 permission broker / lease / broker lane / steward lane 決策。

### 3. vendor 設定在 adopter repo，不在 ATM framework repo

ATM framework repo 只提供：

- config schema
- config loader contract
- integration capability wiring
- scaffold/template

實際的 vendor settings、model defaults、deployment names、project endpoints、editor bridge settings，全部放在被 ATM 治理的 adopter repo。

### 4. 所有 agent 執行都產生同一套 observability event

無論是 OpenAI、Azure OpenAI、Claude Code、Gemini、Microsoft Foundry，執行期都必須落到共同事件格式，並可依 task、teamRun、role、provider、sdk、model、artifact、error 查詢。

### 5. provider 可混用，但必須可預設

同一個 Team run 中：

- implementer 可以用 OpenAI
- reviewer 可以用 Claude Code
- validator 可以維持 broker-only
- research / planner 可以用 Microsoft Foundry Agent

同時也必須支援 repo-level default 與 role-level override。

### 6. worker 永遠不是治理 owner

worker / subagent / hosted agent 的 authority boundary 固定如下：

- 不可直接 git write
- 不可直接 self-close
- 不可 final-write evidence
- 不可繞過 broker / lease / validator / police

## 分層架構

### Layer A: Vendor-neutral Runtime Contracts

- `TeamAgentProvider`
- `TeamPermissionBroker`
- `TeamObservabilitySink`
- `TeamProviderSelectionPolicy`
- `TeamWorkerLaunchRequest/Result`
- `TeamArtifactEnvelope`

### Layer B: Execution Orchestrator

負責：

- team run session lifecycle
- role dispatch
- retry / cancel / timeout
- artifact handoff normalization
- reviewer / validator rework route integration

### Layer C: Permission and Governance Boundary

由 ATM 控制：

- allowedFiles
- role permissions
- tool permissions
- network permissions
- vendor permissions
- closure authority

### Layer D: Provider Bridges

- OpenAI direct bridge
- Azure OpenAI direct bridge
- Claude Code editor bridge
- Gemini direct/editor bridge
- Microsoft Foundry provider family bridge

### Layer E: Integration Wiring

把 adopter repo 的 vendor integration config 接上 Team runtime：

- capability discovery
- manifest verification
- doctor / welcome / integration verify health

### Layer F: Observability and Query

輸出共同事件流與查詢能力。

## Adopter Repo 檔案樹藍圖

```text
<governed-repo>/
  agent-integrations/
    vendors/
      openai/
        provider.config.json
        models.json
      azure-openai/
        provider.config.json
        deployments.json
      claude-code/
        provider.config.json
        editor-bridge.json
      gemini/
        provider.config.json
        models.json
      microsoft-foundry/
        provider.config.json
        projects.json
        agents.json
        toolboxes.json
    defaults/
      team-runtime-defaults.json
      role-provider-policy.json
    observability/
      retention-policy.json
      redaction-policy.json
```

## Framework Repo 檔案樹藍圖

```text
packages/
  core/
    src/
      team-runtime/
        provider-contract.ts
        provider-registry.ts
        provider-selection.ts
        permission-broker.ts
        observability.ts
        execution-orchestrator.ts
        artifact-normalizer.ts
        providers/
          openai.ts
          azure-openai.ts
          claude-code.ts
          gemini.ts
          microsoft-foundry.ts
  cli/
    src/
      commands/
        team.ts
        integration.ts
schemas/
  governance/
    team-agent-observability-event.schema.json
    team-agent-permission-policy.schema.json
    team-agent-provider-config.schema.json
examples/
  team-runtime/
    README.md
    vendor-config-sample/
scripts/
  validate-team-agents.ts
  validate-integration-adapter.ts
```

## Provider Family 策略

### OpenAI

- execution kind: direct provider bridge
- 適合作為第一個可運行 vendor

### Azure OpenAI

- execution kind: direct provider bridge
- 與 OpenAI 共用大部分抽象，但需額外處理 endpoint / deployment / api-version / Azure auth

### Claude Code

- execution kind: editor-subagent bridge
- 重點在 role envelope、editor invocation、result normalization

### Gemini

- execution kind: direct bridge 或 editor/CLI bridge
- 必須統一進入 Team runtime event model

### Microsoft Foundry

建議分成兩型：

1. `microsoft-foundry-chat`
   - app-owned agent
   - Foundry project endpoint / Responses path
2. `microsoft-foundry-agent-service`
   - service-managed prompt/hosted agent
   - agent reference / hosted agent path

## 可觀測事件模型

共同事件欄位至少包括：

- `teamRunId`
- `taskId`
- `role`
- `agentId`
- `providerId`
- `sdkId`
- `modelId`
- `runtimeMode`
- `sessionId`
- `stepId`
- `actionType`
- `toolName`
- `permissionDecision`
- `artifactIds`
- `tokenUsage`
- `latencyMs`
- `costHint`
- `result`
- `errorCode`
- `timestamp`

至少支援：

- 依 `taskId` 查
- 依 `providerId/sdkId/modelId` 查
- 依 `agentId/role` 查
- 依 `artifactId` 追上下游

## Provider 選擇策略

支援三層 override：

1. framework default
2. adopter repo default
3. run / role override

## 免費測試門檻快照（2026-06-19）

- Anthropic Claude API：官方文件寫明新用戶有少量免費 credits 可測試 API。
- Azure OpenAI / Microsoft Foundry：官方提供 Azure free account / free trial / free tier 路線，但不應假設存在一把常態免費、獨立發放的 API key；通常仍需 Azure subscription、RBAC 與配額條件。
- OpenAI：不應假設有常態免費 API key；官方可見的是正常計費與研究者計畫等特定 credits 路線。

## 實作分期

### Phase 1: Contracts and Governance Kernel

- provider contract
- permission broker
- observability contract
- provider selection policy

### Phase 2: Runtime Bridges

- OpenAI
- Azure OpenAI
- Microsoft Foundry
- Claude Code
- Gemini

### Phase 3: Integration Wiring

- adopter repo vendor config discovery
- integration manifest capability fields
- `atm integration verify` / `atm doctor` / `team start` 接線

### Phase 4: Cross-vendor Validation

- fake provider fixtures
- provider-by-role matrix
- close / evidence / artifact / retry / lease regression

## 對應 Task Card 群

- `TASK-TEAM-0037` vendor-neutral provider contract and orchestration kernel
- `TASK-TEAM-0038` permission broker and configurable policy layer
- `TASK-TEAM-0039` governed-repo vendor integration config surface
- `TASK-TEAM-0040` cross-vendor observability and query log
- `TASK-TEAM-0041` provider selection defaults and role overrides
- `TASK-TEAM-0042` OpenAI and Azure OpenAI runtime bridges
- `TASK-TEAM-0043` Claude Code and Gemini execution bridges
- `TASK-TEAM-0044` Microsoft Foundry provider family bridge
- `TASK-TEAM-0045` integration capability manifest and verification wiring

## TypeScript 介面初稿

介面初稿位於：

- `docs/ai_atomic_framework/team-agents/blueprints/team-agent-runtime-contract.draft.ts`

這份初稿是 planning artifact，不是 ATM framework 已採用的穩定 API。
