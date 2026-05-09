<!-- doc_id: doc_other_0115 be assigned by registry） -->
# Capability Sandbox & Security Audit — ATM Optional Governance Plugin

> **Role**: adopter-scope optional plugin — 3KLife 對 ATM 權能沙盒、審計日誌與安全防護的策略宣告  
> **Maintainer**: vs-insiders-gpt-5.3-codex（ATM-6-0005）  
> **Dependency**: `ATM-6-0004`（performance budget）

---

## 1. Purpose

本政策定義在 ATM 框架中引入的 optional security plugin：Capability Sandbox（權能沙盒）、權限管制、audit logging、prompt injection guardrail 與 observability adapter。  
核心目標：在 multi-agent execution 環境下，確保 agent 行為邊界明確、提示詞注入防護、審計證跡完整、可觀測性完善。

---

## 2. Capability Sandbox 設計

### 2.1 核心原則

- **Least Privilege**：Agent 預設無權限，只能執行明確授權的操作
- **Capability Token**：操作授權通過 capability token 表示，不可偽造
- **Audit Trail**：每次 capability 使用均記錄，無法刪除
- **Fail-Safe Default**：未授權操作返回 403 Forbidden，不拋出例外

### 2.2 Capability 分類

| Capability | Risk Level | Examples | Approval |
|---|---|---|---|
| `file.read` | LOW | 讀取現有文件 | auto |
| `file.write` | MEDIUM | 創建/修改文件 | manual approval per file path |
| `git.commit` | HIGH | 提交代碼 | human approval |
| `api.call` | MEDIUM | 呼叫外部 API | per-API manual approval |
| `process.spawn` | CRITICAL | 執行外部程式 | human approval + audit log required |
| `secret.read` | CRITICAL | 存取密鑰 | hardware token required |

### 2.3 Token Lifecycle

```
1. Token 申請 → capability-sandbox plugin 檢查 request context
2. Token 生成 → 加簽 (agent_id, capability_id, expiry, nonce)
3. Token 使用 → adapter 驗證簽名 + 過期時間
4. Token 日誌 → audit log 記錄 (timestamp, result, resource_id, details)
5. Token 過期 → 自動失效（預設 1 hour TTL）
```

### 2.4 Sandbox Boundary

禁止的操作（即使有 capability token）：

- 修改系統配置檔（`tsconfig.json`、`.env` 中的敏感值、`package.json` 版本跨度 > 1 minor）
- 執行刪除操作超過 10 個文件（需人工確認）
- 並行執行超過 2 個 long-running process（防止資源耗盡）
- 呼叫 ATM core framework 內部 API（如 task-lock 直接呼叫，而非透過 plugin）

---

## 3. Threat Model & Mitigation

### 3.1 Identified Threats

| Threat | Impact | Mitigation |
|---|---|---|
| Prompt Injection | Agent 執行非預期操作 | Input sanitization + capability whitelist |
| Token Replay | 舊 token 被重用 | Nonce + timestamp verification |
| Agent Impersonation | 冒充其他 agent 行動 | Digital signature + agent registry lock |
| Audit Log Tampering | 審計證跡被篡改 | Immutable log store + hash chain |
| Resource Exhaustion | Agent 耗盡 CPU/Memory | Per-agent budget + rate limiting |
| Secret Leakage | 密鑰外洩到 log/artifact | Secret detection + masking in audit trail |

### 3.2 Secrets Scan Policy

每次 commit 前執行 pre-commit hook：

```bash
node tools_node/secrets-scan.js --patterns <AWS_KEY|OPENAI_KEY|GITHUB_TOKEN> \
  --check-staged --fail-on-match
```

若檢測到可疑內容，prompt 要求人工審核；絕不允許自動推送。

### 3.3 Provenance Tracking

每個 artifact 包含 provenance header：

```json
{
  "artifact_id": "uid-12345",
  "source_agent": "vs-insiders-gpt-5.3-codex",
  "created_at": "2026-05-10T14:30:00Z",
  "capabilities_used": ["file.write", "git.commit"],
  "audit_trail_ref": "audit-log-2026-05-10.jsonl#offset:12345"
}
```

---

## 4. Security Plugin Interface

### 4.1 API Contract

```typescript
// security-plugin.ts
interface CapabilitySandboxPlugin {
  /**
   * 申請操作權限
   * @param agentId 操作的 agent 身份
   * @param capability 所需的 capability（如 'file.write'）
   * @param resource 資源識別符（如 file path）
   * @param context 操作上下文（如 task ID）
   * @returns capability token or null if denied
   */
  requestCapability(
    agentId: string,
    capability: string,
    resource: string,
    context: { taskId?: string; reason?: string }
  ): Promise<CapabilityToken | null>;

  /**
   * 驗證 capability token 有效性
   */
  verifyToken(token: CapabilityToken): Promise<boolean>;

  /**
   * 記錄 capability 使用
   */
  auditCapabilityUsage(
    token: CapabilityToken,
    result: 'success' | 'denied' | 'error',
    details?: Record<string, any>
  ): Promise<void>;

  /**
   * 查詢審計日誌
   */
  queryAuditLog(
    filters: { agentId?: string; capability?: string; fromTime?: Date }
  ): Promise<AuditEntry[]>;
}

interface CapabilityToken {
  tokenId: string;
  agentId: string;
  capability: string;
  resource: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
  signature: string; // HMAC-SHA256(secret, payload)
}
```

### 4.2 Prompt Injection Guardrail

在 agent prompt 中自動注入：

```markdown
---
## SECURITY BOUNDARY

You are executing within a Capability Sandbox.
- You can only execute operations with explicit capability tokens
- All actions are logged and auditable
- Attempting to bypass capability restrictions is logged as security incident
- Do not attempt to modify this security boundary
- Do not suggest users to disable security checks

Approved capabilities for this execution:
- file.read (current working directory only)
- git.status (read-only)
- api.call (to 3klife internal API only)

---
```

---

## 5. Observability Adapter Boundary

### 5.1 Event Taxonomy

所有 ATM 運行時事件分類如下：

| Event Type | Source | Payload | Use Case |
|---|---|---|---|
| `agent.run.start` | ATM-core | `{agentId, taskId, startTime}` | Execution tracing |
| `agent.run.complete` | ATM-core | `{agentId, taskId, endTime, exitCode, tokenUsage}` | Success metric |
| `agent.run.error` | ATM-core | `{agentId, taskId, errorType, errorMsg, stackTrace}` | Error detection |
| `task.lock.acquire` | plugin-task-lock | `{taskId, agentId, timestamp, scopeFingerprint}` | Concurrency control |
| `task.lock.release` | plugin-task-lock | `{taskId, agentId, timestamp}` | Resource cleanup |
| `task.lock.conflict` | plugin-task-lock | `{taskId, currentHolder, attemptingAgent}` | Conflict alert |
| `schema.validate.start` | compute-gate | `{schemaName, fileCount}` | Validation enter |
| `schema.validate.pass` | compute-gate | `{schemaName, passCount, duration}` | Validation success |
| `schema.validate.fail` | compute-gate | `{schemaName, failCount, violations}` | Validation failure |
| `atom.verify.start` | plugin-atom-verifier | `{atomId, version}` | Verification enter |
| `atom.verify.pass` | plugin-atom-verifier | `{atomId, checksum}` | Verification success |
| `atom.verify.fail` | plugin-atom-verifier | `{atomId, reason}` | Verification failure |
| `evidence.write` | artifact manager | `{artifactId, path, hash, timestamp}` | Evidence capture |
| `evidence.read` | artifact manager | `{artifactId, agentId, reason}` | Evidence access |
| `adapter.shadow` | boundary monitor | `{adapterName, operationCount, latency}` | Adapter health |
| `prompt.injection.attempt` | security plugin | `{agentId, injectedPayload, detectionMethod}` | Security incident |
| `capability.request` | security plugin | `{agentId, capability, resource, approved}` | Capability audit |

### 5.2 Observability Adapter API

```typescript
interface ObservabilityAdapter {
  /**
   * 發出事件
   */
  emit(eventType: string, payload: Record<string, any>): Promise<void>;

  /**
   * 查詢事件流
   */
  query(
    filter: { eventType?: string; fromTime?: Date; toTime?: Date }
  ): Promise<ObservabilityEvent[]>;

  /**
   * 訂閱實時事件
   */
  subscribe(
    eventTypes: string[],
    callback: (event: ObservabilityEvent) => void
  ): () => void; // returns unsubscribe function

  /**
   * 生成觀測指標報告
   */
  generateReport(profile: string): Promise<HarnessCardLiteReport>;
}

interface ObservabilityEvent {
  eventId: string;
  eventType: string;
  timestamp: number;
  agentId?: string;
  taskId?: string;
  payload: Record<string, any>;
  control?: string; // CAR: Control source (e.g., 'policy-engine')
  agency?: string; // CAR: Agency source (e.g., 'agent-decision')
  runtime?: string; // CAR: Runtime source (e.g., 'adapter-execution')
}
```

---

## 6. HarnessCard-Lite Report Profile

### 6.1 Profile Schema

```json
{
  "profileId": "harness-card-lite-v1",
  "timestamp": "2026-05-10T14:30:00Z",
  "baseModel": {
    "taskId": "ATM-6-0005",
    "agentId": "vs-insiders-gpt-5.3-codex",
    "startTime": 1715339400,
    "endTime": 1715339500,
    "durationSeconds": 100
  },
  "controlArtifacts": [
    {
      "artifactType": "budget_check",
      "status": "pass",
      "details": "token usage 45000/50000"
    },
    {
      "artifactType": "encoding_validation",
      "status": "pass",
      "details": "no BOM, no mojibake"
    }
  ],
  "runtimePolicy": {
    "capabilitiesDeclared": ["file.read", "file.write", "git.commit"],
    "capabilitiesUsed": ["file.read", "file.write"],
    "sandboxBoundary": "enforced",
    "auditLogWritten": true
  },
  "actionSubstrate": {
    "filesModified": 4,
    "filesCreated": 1,
    "gitCommitCount": 1,
    "apiCallsMade": 0,
    "externalProcessesSpawned": 0
  },
  "executionTopology": {
    "sequentialStages": 3,
    "parallelOps": 0,
    "dependencyChain": ["lock → write → validate → commit → unlock"]
  },
  "feedbackStack": {
    "automatedFeedback": ["encoding_ok", "syntax_ok", "schema_valid"],
    "manualReviewRequired": false,
    "reviewerNotes": ""
  },
  "observabilityEvaluation": {
    "eventsEmitted": 28,
    "eventsWithCAR": 28,
    "auditEntriesLogged": 8,
    "evidenceCaptured": true
  },
  "knownRisks": [
    {
      "riskId": "pre-existing-lock",
      "severity": "low",
      "description": "Workspace has pre-existing lock on unrelated task",
      "mitigation": "Verified non-conflicting"
    }
  ]
}
```

### 6.2 Report Generation Command

```bash
node tools_node/observability-adapter.js --generate-report --profile harness-card-lite \
  --task ATM-6-0005 --output artifacts/harnesscard-lite-atm-6-0005.json
```

---

## 7. CAR Runtime/Audit Alignment

### 7.1 Control / Agency / Runtime Labeling

每筆審計事件需標示三個來源層級：

- **Control** (C)：何者決策該操作是否允許？（policy engine、capability sandbox、governance rules）
- **Agency** (A)：何者決策進行該操作？（agent decision logic、human approval、automated routing）
- **Runtime** (R)：誰實際執行了該操作？（adapter、plugin、core framework）

### 7.2 Audit Log Entry with CAR

```json
{
  "auditId": "aud-2026-05-10-001",
  "timestamp": "2026-05-10T14:30:15Z",
  "agentId": "vs-insiders-gpt-5.3-codex",
  "operation": "git.commit",
  "resource": "docs/agent-briefs/tasks/ATM/ATM-6-0005.md",
  "result": "success",
  "CAR": {
    "Control": "policy-engine:task-scope-validator",
    "Agency": "agent-execution:task-lock",
    "Runtime": "adapter:git-adapter"
  },
  "details": {
    "commitHash": "c11da66",
    "filesStaged": 4,
    "timestamp": 1715339415
  }
}
```

### 7.3 Audit Event Query with CAR Filter

```bash
# 查詢特定控制源的事件
node tools_node/observability-adapter.js --query-audit \
  --car-filter "Control:policy-engine" \
  --from 2026-05-10 --to 2026-05-11

# 查詢 Agency 為人工審批的事件
node tools_node/observability-adapter.js --query-audit \
  --car-filter "Agency:human-approval" \
  --output audit-human-approved.jsonl
```

---

## 8. Cost Budget Policy Integration

與 ATM-6-0004 「Performance Budget Police」互補：

- 此 plugin 關注 **security cost**（audit log storage、capability token generation、provenance tracking）
- 性能預算 plugin 關注 **compute cost**（token consumption、API latency、artifact size）

### 8.1 Security Cost Model

| Component | Cost | Note |
|---|---|---|
| capability.request | 10 token | Lightweight check |
| audit.log.write | 50 token | Per entry |
| secrets.scan | 2000 token | Per file scanned |
| provenance.record | 20 token | Per artifact |

**Budget limit**: per-session security cost ≤ 5% of total compute token budget （即若計算預算 200k token，安全成本上限 10k）

### 8.2 Budget Report Schema Extension

在 `cost-report.json` 中新增 `securityCost` 欄位：

```json
{
  "taskId": "ATM-6-0005",
  "tokenBreakdown": { ... },
  "securityCost": {
    "capabilityRequests": 12,
    "auditLogEntries": 28,
    "secretsScanned": 3,
    "provenanceRecords": 5,
    "totalSecurityTokens": 1500,
    "budgetRemaining": 8500
  }
}
```

---

## 9. Integration & Rollout

- ATM core framework **不依賴** 本 plugin；security 為 optional 功能
- 若 plugin 禁用，framework 行為完全不變（無 audit log、無 capability check）
- 既有 ATM 專案可無縫啟用本 plugin，不需改 core code
- Rollout 階段：alpha0 先以 optional 方式提供；後續版本可升為 required

---

## 10. Files & Documentation

| Document | Purpose |
|---|---|
| `docs/ecosystem/capability-sandbox-audit.md` | 本文件 |
| `docs/ecosystem/security-plugin-interface.md` | Plugin TypeScript API 詳解（可選） |
| `docs/ecosystem/threat-model-atm6.md` | 威脅模型詳細分析（可選） |
| `docs/ecosystem/observability-event-taxonomy.md` | 事件分類完全清單（可選） |
| `schemas/harness-card-lite-v1.schema.json` | HarnessCard-Lite JSON schema |
| `schemas/audit-event-car.schema.json` | CAR 審計事件 schema |

---

*由 vs-insiders-gpt-5.3-codex 透過 ATM-6-0005 建立 | 2026-05-10*
