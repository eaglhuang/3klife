<!-- doc_id: doc_other_0107 -->
# ATM Plugin SDK Guide

本文件定義 ATM Plugin SDK 的實作者契約，包含 ProjectAdapter、LanguageAdapter、Capability、Police、InjectorPlugin 與 run-report/evidence 邊界。

## 1. 設計目標

1. 讓第三方專案可在不改 core 的前提下接入 ATM。
2. 保持 core 中立，不內建 host domain 邏輯。
3. 用 deterministic gate 與 typed evidence 保證可驗證性。

## 2. 主要介面（文件化契約）

以下為文件化契約示意，實作可依 SDK 版本做增量擴充。

```ts
export type AtomLifecycleMode = 'birth' | 'evolution';

export interface ProjectAdapter {
  adapterName: string;
  adapterVersion: string;
  initialize(context: AdapterContext): AdapterResult;
  prepareWorkItem(context: AdapterContext, workItem: WorkItem): AdapterResult;
  finalizeWorkItem(context: AdapterContext, workItem: WorkItem): AdapterResult;
}

export interface LanguageAdapter {
  parse(source: string): unknown;
  detectImports(ast: unknown): string[];
  detectSideEffects(ast: unknown): string[];
  generateCodeStub(spec: AtomicSpec): string;
}
```

```ts
export interface CapabilityPlugin {
  capabilityId: string;
  run(input: unknown, context: AdapterContext): CapabilityResult;
}

export interface PolicePlugin {
  policeId: string;
  validate(input: unknown, context: AdapterContext): ValidationResult;
}

export interface InjectorPlugin {
  injectorId: string;
  beforeLifecycle?(mode: AtomLifecycleMode, context: AdapterContext): void;
  afterLifecycle?(mode: AtomLifecycleMode, context: AdapterContext): void;
}
```

## 3. Governance Stores 契約（最小集合）

```ts
export interface TaskStore {
  createTask(workItem: WorkItem): WorkItem;
  getTask(workItemId: string): WorkItem | null;
  updateTaskStatus(workItemId: string, status: WorkItemStatus): WorkItem;
  listTasks(): WorkItem[];
}

export interface LockStore {
  acquireLock(workItem: WorkItem, files: string[], actor: string): ScopeLock;
  releaseLock(workItemId: string, actor: string): ScopeLock;
}
```

```ts
export interface DocumentIndex {
  resolveDocumentId(documentId: string): string | null;
  searchDocuments(query: string): string[];
}

export interface RuleGuard {
  runGuard(guardId: string, context: unknown): CapabilityResult;
}

export interface EvidenceStore {
  writeEvidence(workItemId: string, evidence: EvidenceEnvelope): EvidenceEnvelope;
  listEvidence(workItemId: string): EvidenceEnvelope[];
}
```

## 4. AdapterResult / Evidence 契約

```ts
export interface AdapterResult {
  ok: boolean;
  messages: string[];
  artifacts?: ArtifactRef[];
  evidence?: EvidenceEnvelope[];
}

export interface ArtifactRef {
  artifactPath: string;
  artifactKind: 'report' | 'file' | 'log' | 'trace';
  producedBy: string;
}

export interface EvidenceEnvelope {
  evidenceKind: 'validation' | 'handoff' | 'decision' | 'audit';
  summary: string;
  artifactPaths: string[];
}
```

## 5. AdapterReport（run report / typed evidence）

AdapterReport 的目標是「執行證據」，不是取代 core 契約。

建議欄位：

```json
{
  "workItemId": "ATM-5-0002",
  "adapterName": "@3klife/project-adapter-shadow",
  "lifecycleMode": "evolution",
  "ok": true,
  "messages": [
    "prepareWorkItem completed via shadow adapter"
  ],
  "artifacts": [
    {
      "artifactPath": "artifacts/atm-3-0001/reports/shadow-mode-report.json",
      "artifactKind": "report",
      "producedBy": "@3klife/project-adapter-shadow"
    }
  ],
  "evidence": [
    {
      "evidenceKind": "validation",
      "summary": "parity checks passed",
      "artifactPaths": [
        "artifacts/atm-3-0001/reports/shadow-mode-report.json"
      ]
    }
  ]
}
```

## 6. Core Neutrality Guardrail

1. `core` 不直接依賴 host 專案路徑與命名。
2. host policy 放在 adapter/police plugin，不進 core。
3. 版本升級以 `LIFECYCLE` / `ATOM_COMPATIBILITY` / `GOVERNANCE` 契約收斂。

## 7. 3KLife 實作參考

1. ProjectAdapter façade：`tools_node/adapters/atm-3klife/project-adapter.js`
2. Governance stores wrapper：`tools_node/adapters/atm-3klife/governance-adapter.js`
3. RuleGuard adapter：`tools_node/adapters/atm-3klife/rule-guard-adapter.js`

## 8. Hosted Adapter Example

請參考：

1. `examples/hosted-adapter-impl/README.md`
2. `examples/hosted-adapter-impl/project-adapter-sample.js`
3. `examples/hosted-adapter-impl/adapter.config.json`

## 9. 驗證建議

1. 編碼檢查：`npm.cmd run check:encoding:touched -- --files ...`
2. 規則檢查：`node tools_node/run-rule-guard.js --profile atm`
3. Task-store 真相同步：`node tools_node/sync-atm-stabilization-milestone.js --check --strict`
