<!-- doc_id: doc_other_0257 -->
# APF-0002 — PoliceFinding Contract

## 1. 共存原則：不另立第三套

| 既有 finding type | 用途 | APF PoliceFinding 對應策略 |
|---|---|---|
| `LifecyclePoliceFinding` | lifecycle quarantine writer 專用 | **保留不動**；APF contract 為 lifecycle 的 superset 唯讀視圖 |
| `ReviewAdvisoryFinding` (trigger=`machine-finding`) | 進 advisory queue | **所有非 lifecycle police finding 走這個入口** |
| 新 `PoliceFinding` | 收斂共用欄位 | 預設放在 `ReviewAdvisoryFinding.metadata.policeFinding`；`payload` 僅是未來 additive API proposal |

## 2. Contract 欄位（與主計畫書 §5 對齊）

```ts
interface PoliceFinding {
  findingId: string;                     // sha256:<hash> 可重跑
  policeFamily: PoliceFamilyName;        // 11 種家族之一
  behaviorId?: string;                   // behavior.* 建議
  trigger: string;                       // 觸發事件
  scope: string;                         // 掃描範圍
  severity: 'info'|'advisory'|'warning'|'block'|'error';
  action: 'report-only'|'propose'|'follow-up-task'|'needs-review'|'quarantine'|'hard-fail';
  routeHint: RouteHint;                  // 見 §3
  readModel: string;                     // artifact path / URI / snapshot id
  mode: 'fast'|'slow';
  evidenceRefs: EvidenceRef[];           // official evidence type 或 police-local artifact ref，見 APF-0012
}

type PoliceFamilyName =
  | 'dedup' | 'demand' | 'quality' | 'map-integration'
  | 'atomization' | 'lifecycle' | 'boundary' | 'dependency-graph'
  | 'registry-consistency' | 'schema' | 'orchestrator';
```

## 3. Route pipeline（不新增獨立任務路由器）

```
PoliceFinding
   │
   ├── policeFamily=='lifecycle'  ──►  LifecyclePoliceFinding（既有路徑，含 quarantine writer）
   │
   └── (其他 10 family)
         │
         ▼
   ReviewAdvisoryFinding { trigger='machine-finding', metadata.policeFinding=PoliceFinding }
         │
         ▼ routeHint=='needs-review'    ──►  HumanReviewQueue
         │ routeHint=='follow-up-task'  ──►  follow-up-task 卡 (existing task-card flow)
         │ routeHint=='report-only'     ──►  report artifact only
         │ routeHint=='quarantine'      ──►  只有 lifecycle 可用，其他 family 拒絕
```

上游目前已有 `ReviewAdvisoryFinding.metadata?: Record<string, unknown>`，因此 APF 預設使用 `metadata.policeFinding`。若未來要新增頂層 `payload` 欄位，必須走 additive schema / type proposal，不得在本文件階段宣稱現況已存在。

## 4. severity → ReviewAdvisory / blocker 映射

| Police severity | ReviewAdvisory severity | ReviewAdvisory action | blocking 語意 |
|---|---|---|---|
| `info` | `info` | `monitor` | report-only |
| `advisory` | `low` | `needs-review` 或 `monitor` | advisory queue，不 fail CI |
| `warning` | `medium` | `needs-review` | reviewer 必看，但不直接 hard fail |
| `block` | `high` | `request-human-review` | 只有該 family 已在 profile 中 blocker 時才造成 deterministic fail |
| `error` | `high` | `request-human-review` 或既有 hard fail | lifecycle / schema / dependency-graph / boundary 可沿用既有 hard fail；其他 family 先進 ReviewAdvisory |

## 5. mode → validator profile

| mode | 目標 profile | 預設行為 |
|---|---|---|
| fast | APF 目標 `validate:quick / standard` | deterministic，CI 即刻決定 |
| slow | APF 目標 `validate:full + scheduled` | advisory queue，後台跑 |

注意：目前 upstream `validate:police` 在 `full` profile；本表是 APF orchestrator 目標，不是現況。

## 6. Migration notes

- 既有 `runPoliceChecks` 的 `violations[]`：在 wrapper 層轉為 PoliceFinding，policeFamily 由 check.kind 推導。
- 既有 `LifecyclePoliceFinding`：不重寫；如需統一視圖，只從 report 派生 read-only PoliceFinding view。
- 既有 `ReviewAdvisoryFinding`：使用 `metadata.policeFinding` 承載 APF finding content，不要求上游先新增頂層欄位。