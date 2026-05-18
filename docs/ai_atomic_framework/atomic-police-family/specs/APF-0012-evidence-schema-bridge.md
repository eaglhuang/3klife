<!-- doc_id: doc_other_0267 -->
# APF-0012 — PoliceFinding Evidence Schema Bridge

## 1. 為何需要

APF-0002 定義了 PoliceFinding 的 `evidenceRefs[]` 與 `readModel` 兩個欄位，但若沒對應到上游既有 evidence types，就會漂浮為新 schema，造成 fragmentation 與重複 evidence storage。本卡把欄位接到上游既有 evidence types 與 ReviewAdvisory routing。

## 2. Evidence schema mapping

```ts
type EvidenceRef =
  | { type: 'usage-feedback';        path: string }
  | { type: 'quality-baseline';      path: string }
  | { type: 'quality-comparison';    path: string }
  | { type: 'rollback-proof';        path: string }
  | { type: 'map-propagation-log';   path: string }
  | { type: 'fingerprint-snapshot';  path: string }
  | { type: 'neutrality-scan';       path: string }
  | { type: 'dep-graph-snapshot';    path: string }
  | { type: 'caller-graph-snapshot'; path: string }
  | { type: 'dry-run-patch';         path: string };
```

| evidence type | 來源 upstream module | 使用者 family |
|---|---|---|
| usage-feedback | `ATOM_EVOLUTION_PLAN.md` evidence | demand / quality |
| quality-baseline | `regression-compare` | quality |
| quality-comparison | `regression-compare` | quality / dedup |
| rollback-proof | rollback evidence | lifecycle / atomization |
| map-propagation-log | `map-curator` 報告 | map-integration |
| fingerprint-snapshot | `RegistryIndex` snapshot | dedup |
| neutrality-scan | `neutrality-scanner` output | atomization |
| dep-graph-snapshot | `dependency-graph.ts` output | dependency-graph |
| caller-graph-snapshot | RegistryIndex caller graph | demand |
| dry-run-patch | behavior-pack dry-run envelope | atomization |

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
     payload: PoliceFinding,
     evidenceRefs: PoliceFinding.evidenceRefs
   }
         │
         ▼ routeHint=='needs-review'   ──►  HumanReviewQueue.push(record)
         │ routeHint=='follow-up-task' ──►  task-card generation flow
         │ routeHint=='report-only'    ──►  artifact emit only
         │
         (no task-router — 已禁用)
```

## 4. ReviewAdvisory.machine-finding 規格

```ts
// upstream 已有 ReviewAdvisoryFinding，本卡只擴充 payload 規範
interface ReviewAdvisoryFinding {
  trigger: 'semantic-anomaly' | 'behavior-route-risk'
         | 'policy-coverage-gap' | 'provider-health'
         | 'machine-finding';   // ← 本卡 polic finding 入口
  payload?: PoliceFinding;       // ← 本卡新增
  // 其他既有欄位略
}
```

## 5. follow-up-task 生成規則

當 `routeHint='follow-up-task'`：
- 由 governance bundle 的 task-card-opener 生成 `TASK-APF-<n>` 之外的子卡（系統前綴依 finding scope 決定）。
- 子卡 frontmatter `related: [<原 finding id>]`，便於追蹤。
- 子卡狀態初始為 `open`，由 owner 接續處理。

## 6. ban list

下列 finding 屬於 lifecycle 寫入特權，**禁止** 透過本 bridge 路由：
- `LifecyclePoliceFinding.action='quarantine'`（保留給 lifecycle quarantine writer）
- 任何宣告 `policeFamily!='lifecycle'` 卻 `action='quarantine'` 的 finding → orchestrator reject。

## 7. alphaGate

`validate:police` + `validate:review-advisory`。

## 8. fixture plan

| Fixture | 預期 |
|---|---|
| positive/quality-finding-to-advisory | ReviewAdvisoryFinding.trigger=machine-finding 寫入 |
| positive/demand-finding-with-evidence | evidenceRefs 內含 usage-feedback + caller-graph-snapshot |
| positive/lifecycle-quarantine | 走 LifecyclePoliceFinding 路徑，**不** 進本 bridge |
| negative/non-lifecycle-quarantine | orchestrator reject |
