<!-- doc_id: doc_other_0267 -->
# APF-0012 — PoliceFinding Evidence Schema Bridge

## 1. 為何需要

APF-0002 定義了 PoliceFinding 的 `evidenceRefs[]` 與 `readModel`，但若把所有 artifact ref 都稱為 upstream evidence type，會造成 schema fragmentation。本卡把欄位分成 upstream official `EvidenceRecord.evidenceType` 與 police-local artifact/readModel ref，並把 PoliceFinding 接到既有 `ReviewAdvisoryFinding.metadata.policeFinding`。

## 2. EvidenceRef 分層

```ts
type OfficialEvidenceType =
  | 'usage-feedback'
  | 'quality-baseline'
  | 'quality-comparison'
  | 'rollback-proof'
  | 'human-review-decision';

type PoliceLocalArtifactRef =
  | 'map-propagation-log'
  | 'fingerprint-snapshot'
  | 'neutrality-scan'
  | 'dep-graph-snapshot'
  | 'caller-graph-snapshot'
  | 'dry-run-patch';

type EvidenceRef =
  | { layer: 'official-evidence-type'; type: OfficialEvidenceType; path: string }
  | { layer: 'police-local-artifact-ref'; type: PoliceLocalArtifactRef; path: string };
```

| ref type | 分層 | 來源 upstream module | 使用 family |
|---|---|---|---|
| usage-feedback | official evidence type | `ATOM_EVOLUTION_PLAN.md` evidence | demand / quality |
| quality-baseline | official evidence type | `regression-compare` baseline | quality |
| quality-comparison | official evidence type | `regression-compare` report | quality / dedup |
| rollback-proof | official evidence type | rollback evidence | lifecycle / atomization |
| human-review-decision | official evidence type | human review evidence | all review-gated police |
| map-propagation-log | police-local artifact ref | `map-curator` report | map-integration |
| fingerprint-snapshot | police-local artifact ref | `RegistryIndex` snapshot | dedup |
| neutrality-scan | police-local artifact ref | `neutrality-scanner` output | atomization |
| dep-graph-snapshot | police-local artifact ref | `dependency-graph.ts` output | dependency-graph |
| caller-graph-snapshot | police-local artifact ref | caller distribution / graph snapshot | demand |
| dry-run-patch | police-local artifact ref | behavior-pack dry-run envelope | atomization |

## 3. Routing pipeline（複述 APF-0002 §3）

```
PoliceFinding
   │
   ├── policeFamily=='lifecycle'  ──►  LifecyclePoliceFinding（既有）
   │
   └── (其他 10 family)
         │
         ▼
   ReviewAdvisoryFinding {
     trigger: 'machine-finding',
     metadata: { policeFinding: PoliceFinding },
     evidenceRefs: PoliceFinding.evidenceRefs.map(path)
   }
         │
         ▼ routeHint=='needs-review'   ──►  HumanReviewQueue supplemental context
         │ routeHint=='follow-up-task' ──►  follow-up-task generation flow
         │ routeHint=='report-only'    ──►  artifact emit only
         │
         (no independent task routing model)
```

## 4. ReviewAdvisory.machine-finding 規格

```ts
// upstream 已有 ReviewAdvisoryFinding.metadata，本卡只規範 metadata 內容
interface ReviewAdvisoryFinding {
  trigger: 'semantic-anomaly' | 'behavior-route-risk'
         | 'policy-coverage-gap' | 'provider-health'
         | 'machine-finding';
  metadata?: {
    policeFinding?: PoliceFinding;
    [key: string]: unknown;
  };
}
```

`payload` 只能列入未來 additive API proposal；在 upstream type/schema 未變更前，不得把 `payload` 寫成現況。

## 5. follow-up-task 生成規則

當 `routeHint='follow-up-task'`：
- 由 adopter governance bundle 的 task-card flow 生成子卡；upstream core 不新增獨立任務路由器。
- 子卡 frontmatter `related: [<原 finding id>]`，便於追蹤。
- 子卡狀態初始為 `open`，由 owner 接續處理。

## 6. ban list

下列 finding 屬於 lifecycle 寫入特權，**禁止** 透過本 bridge 路由：
- `LifecyclePoliceFinding.action='quarantine'`（保留給 lifecycle quarantine writer）
- 任何宣告 `policeFamily!='lifecycle'` 卻 `action='quarantine'` 的 finding → orchestrator reject。

## 7. alphaGate

`validate:police` + `validate:review-advisory`；目前這是 APF 目標 gate，非本文件已套用 upstream runtime 的宣告。

## 8. fixture plan

| Fixture | 預期 |
|---|---|
| positive/quality-finding-to-advisory | `ReviewAdvisoryFinding.trigger=machine-finding` 且 `metadata.policeFinding` 存在 |
| positive/demand-finding-with-evidence | evidenceRefs 同時含 official `usage-feedback` 與 police-local `caller-graph-snapshot` |
| positive/lifecycle-quarantine | 走 `LifecyclePoliceFinding` 路徑，**不** 進本 bridge |
| negative/non-lifecycle-quarantine | orchestrator reject |
| negative/payload-as-current-contract | reject；`payload` 只能是未來 additive proposal |