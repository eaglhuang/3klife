<!-- doc_id: doc_other_0089 -->
# Framework Function Atomization Manifest

> 來源任務：`ATM-2-0050`。本檔是 ATM dogfooding 的 coverage 真相：所有 ATM framework Layer 2 功能都必須能在這裡找到 atom、atomic map、adapter facade 或正式例外的對應。

## 判定結論

- coverage gate 主體由 `ATM-2-0050` 完成，且 `ATM-2-0051` 已接手 self-coverage / finding route / blocker promotion follow-up。
- CLI protocol / commands 已進入 covered-existing，並由 task-router / adapter route / rule-guard contract 承接。
- manifest 自己也有一條 self-coverage meta-surface，避免 coverage gate 只管別人、不管自己。
- machine-readable inventory 與 fixture 必須持續對齊；validator 會把 drift 當成失敗。

## Layer Boundary

| Layer | 原子化要求 | 範圍 |
|---|---|---|
| Layer 1 Constitutional | 不要求原子化，只能 hash-lock + migration gate | `atomic-spec.schema.json`、`registry.schema.json`、canonical ID pattern、hash algorithm |
| Layer 2 Governed | 必須有 atom / atomic map / governed adapter facade coverage | CLI commands、registry manager、test runner、police plugins、adapter interfaces、evidence / report、task lifecycle、generator、map、PEV workflow |
| Layer 3 Mutable | 不要求原子化，只需 git / adapter config 管理 | `.atm/profile`、host-specific adapter config、project-local policy override |

## Coverage Status

| Status | 意義 |
|---|---|
| `covered-existing` | 已由 done card 或現有 atom / map / validator 覆蓋 |
| `open-card` | 已有 open / in-progress 任務卡承接，不再重複開卡 |
| `planned-gap` | 確認缺口，必須由 `ATM-2-0050` 或其 follow-up 連到任務卡 |
| `constitutional-exception` | Layer 1 自驗證悖論，不做 atom，只做 hash-lock / migration |
| `mutable-exception` | Layer 3 host config，不做 atom |

## Function Inventory

| Framework function | Layer | Coverage | Source / task cards | Required next check |
|---|---|---|---|---|
| Atomic Spec schema | Layer 1 | constitutional-exception | `ATM-1-0003`、`ATM-1-0011` | validator 確認 schema 只進 hash-lock / migration gate，不要求自我 atom |
| Spec loader / parser | Layer 2 | covered-existing | `ATM-2-0001` | manifest 需列出 atom home / registry entry 或明確標為 pre-generator backfill |
| Scaffold builder | Layer 2 | covered-existing | `ATM-2-0002`、`ATM-2-0038`、`ATM-2-0039` | 必須經 AtomGenerator / source template provenance |
| Test runner / report schema | Layer 2 | open-card | `ATM-2-0003`?`ATM-2-0016`?`ATM-2-0025` | report ?????? atom / map validation evidence |
| Registry / HashLock / version history | Layer 2 | covered-existing | `ATM-2-0004`、`ATM-2-0014`、`ATM-2-0034`、`ATM-2-0047` | registry entry 必須有 generator provenance 或 backfilled witness |
| Police plugin API / rule guards | Layer 2 | open-card | `ATM-2-0005`?`ATM-2-0010`?`ATM-2-0030`?`ATM-2-0031`?`ATM-2-0035`?`ATM-3-0012` | ?? rule guard ???? independent governed atom ? map member???? `trigger / scope / severity / action` ? machine-readable findings |
| Adapter API / Plugin SDK | Layer 2 | open-card | `ATM-2-0006`、`ATM-3-0001`、`ATM-3-0006`~`ATM-3-0011` | adapter facade 不可成為 monolith；背後能力需拆 ATM-GOV atoms |
| Evidence / artifact log store | Layer 2 | open-card | `ATM-2-0009`、`ATM-3-0014` | evidence schema / usage-feedback 必須列入 atom caller-count 與 validation evidence |
| Context budget / summarization | Layer 2 | covered-existing | `ATM-2-0011` | context budget guard 應列入 governance bundle map |
| Evolution proposal / review / rollback | Layer 2 | open-card | `ATM-2-0015`、`ATM-2-0017`、`ATM-2-0020`、`ATM-2-0021`、`ATM-2-0022`、`ATM-2.5-0004` | PEV / semver docs 必須連到 atom compatibility matrix |
| Atom identity / behavior / state machine | Layer 2 | open-card | `ATM-2-0026`、`ATM-2-0027`、`ATM-2-0028`、`ATM-2-0029` | behavior pack manifest 必須覆蓋 10 behaviors |
| Atomization / infection adapter contract | Layer 2 | open-card | `ATM-2-0033`、`ATM-4-0004`、`ATM-4-0005` | atomize / infect 不得跳過 neutrality scan / dry-run proposal |
| AtomGenerator / provenance audit | Layer 2 | covered-existing | `ATM-2-0038`、`ATM-2-0039`、`ATM-2-0040`、`ATM-2-0041` | 新 atom 不得繞過 generator；pre-generator atom 必須有 backfilled witness |
| Atomic Map schema / generator / provenance | Layer 2 | open-card | `ATM-2-0023`、`ATM-2-0042`、`ATM-2-0043`、`ATM-2-0044`、`ATM-2-0045`、`ATM-2-0046` | new map 不得繞過 map generator |
| Task router / onboarding | Layer 2 | covered-existing | `ATM-2-0048` | onboarding / router ???????? router contract ????? |
| Governance shard strategy | Layer 2 | covered-existing | `ATM-2-0049` | shard strategy ??? coverage validator ????? shard ??????? |
| Task card lifecycle atomic map | Layer 2 | covered-existing | `ATM-3-0015` | task lifecycle member atoms 與 orchestration 邊界已定義；不得誤當全框架 coverage |
| CLI protocol / commands | Layer 2 | covered-existing | `ATM-1-0004`、`ATM-2.5-0001`、`ATM-2-0038`、`ATM-2-0042`、`ATM-2-0048`、`ATM-2-0050`、`ATM-2-0051` | CLI command surfaces now route through atom / map / adapter coverage |
| Framework Function Atomization Manifest / self-coverage | Layer 2 | covered-existing | `ATM-2-0051` | validator / manifest / fixture / schema contract must stay aligned |
| Public lifecycle / semver / PEV docs | Layer 2 | open-card | `ATM-5-0003`、`ATM-5-0005` | 文件規則要連回 coverage manifest 與 compatibility matrix |
| Host profile / adapter config | Layer 3 | mutable-exception | `ATM-0-0010`、`ATM-3-0002` | 只允許 config / adapter mapping，不要求 atom |

## Required Gate

`ATM-2-0050` / `ATM-2-0051` 會把 coverage gate 變成 deterministic validator + self-coverage gate。

1. `## Machine-Readable Inventory` 必須對齊 JSON block 與 fixture。
2. 每個 Layer 2 function 都必須有 source task / atom / map / adapter facade 對應。
3. `constitutional-exception` 只能留在 Layer 1。
4. `mutable-exception` 只能留在 Layer 3。
5. `planned-gap` 必須指向 open task id 與 routeHint。
6. 新增 framework function 時，未在 manifest / fixture 出現要直接 fail。
7. `framework-function-atomization-manifest-self-coverage` 必須保留為 covered-existing meta-surface，避免 manifest 自己漏網。
## Planning Backwrite

本 manifest 必須被下列文件引用：

- `docs/ai_atomic_framework/AI_Atomic_Framework_Roadmap.md`
- `docs/ai_atomic_framework/AI原子框架開發計畫書.md`
- `docs/ai_atomic_framework/ATM框架演進執行規劃書.md`
- `docs/ai_atomic_framework/關於進化版的原子提案.md`

## Machine-Readable Inventory

<!-- ATOMIZATION_COVERAGE_MANIFEST:BEGIN -->
```json
[
  {
    "functionId": "atomic-spec-schema",
    "label": "Atomic Spec schema",
    "layer": "layer1",
    "surfaceKind": "registry-surface",
    "coverageStatus": "constitutional-exception",
    "coverageKind": "constitutional-exception",
    "taskRefs": [
      "ATM-1-0003",
      "ATM-1-0011"
    ],
    "artifactRefs": [
      "docs/agent-briefs/tasks/ATM/ATM-1-0003.md"
    ],
    "nextCheck": "keep hash-lock / migration gate only; do not force self-atomization",
    "routeHint": null,
    "findingContract": null
  },
  {
    "functionId": "spec-loader-parser",
    "label": "Spec loader / parser",
    "layer": "layer2",
    "surfaceKind": "manager-facade",
    "coverageStatus": "covered-existing",
    "coverageKind": "atom",
    "taskRefs": [
      "ATM-2-0001"
    ],
    "artifactRefs": [
      "docs/agent-briefs/tasks/ATM/ATM-2-0001.md"
    ],
    "nextCheck": "recheck only when parser or registry path changes",
    "routeHint": null,
    "findingContract": null
  },
  {
    "functionId": "scaffold-builder",
    "label": "Scaffold builder",
    "layer": "layer2",
    "surfaceKind": "manager-facade",
    "coverageStatus": "covered-existing",
    "coverageKind": "atom",
    "taskRefs": [
      "ATM-2-0002",
      "ATM-2-0038",
      "ATM-2-0039"
    ],
    "artifactRefs": [
      "docs/agent-briefs/tasks/ATM/ATM-2-0002.md"
    ],
    "nextCheck": "recheck when AtomGenerator source templates or provenance change",
    "routeHint": null,
    "findingContract": null
  },
  {
    "functionId": "test-runner-report-schema",
    "label": "Test runner / report schema",
    "layer": "layer2",
    "surfaceKind": "validator",
    "coverageStatus": "open-card",
    "coverageKind": "open-task",
    "taskRefs": [
      "ATM-2-0003",
      "ATM-2-0016",
      "ATM-2-0025"
    ],
    "artifactRefs": [
      "docs/agent-briefs/tasks/ATM/ATM-2-0003.md"
    ],
    "nextCheck": "recheck when report schema or validation evidence format changes",
    "routeHint": "ATM-2-0016 / ATM-2-0025",
    "findingContract": null
  },
  {
    "functionId": "registry-hashlock-version-history",
    "label": "Registry / HashLock / version history",
    "layer": "layer2",
    "surfaceKind": "registry-surface",
    "coverageStatus": "covered-existing",
    "coverageKind": "atom",
    "taskRefs": [
      "ATM-2-0004",
      "ATM-2-0014",
      "ATM-2-0034",
      "ATM-2-0047"
    ],
    "artifactRefs": [
      "docs/agent-briefs/tasks/ATM/ATM-2-0004.md"
    ],
    "nextCheck": "recheck when registry entry, hash-lock, or URN routing changes",
    "routeHint": null,
    "findingContract": null
  },
  {
    "functionId": "police-plugin-api-rule-guards",
    "label": "Police plugin API / rule guards",
    "layer": "layer2",
    "surfaceKind": "police-surface",
    "coverageStatus": "open-card",
    "coverageKind": "open-task",
    "taskRefs": [
      "ATM-2-0005",
      "ATM-2-0010",
      "ATM-2-0030",
      "ATM-2-0031",
      "ATM-2-0035",
      "ATM-3-0012"
    ],
    "artifactRefs": [
      "docs/agent-briefs/tasks/ATM/ATM-2-0005.md"
    ],
    "nextCheck": "recheck when any rule guard changes its trigger / scope / severity / action contract",
    "routeHint": "ATM-2-0010 / ATM-2-0030 / ATM-2-0031 / ATM-2-0035 / ATM-3-0012",
    "findingContract": {
      "trigger": "rule guard violation, coverage drift, or scope ambiguity",
      "scope": "registry, docs, task lifecycle, adapter, evidence, and map governance",
      "severity": "advisory|warn|error",
      "action": "emit machine-readable findings and route low-risk drift to advisory or follow-up tasks",
      "timing": [
        "authoring-time",
        "transition-time",
        "sweep-time"
      ],
      "policeClass": "mixed"
    }
  },
  {
    "functionId": "adapter-api-plugin-sdk",
    "label": "Adapter API / Plugin SDK",
    "layer": "layer2",
    "surfaceKind": "adapter-facade",
    "coverageStatus": "open-card",
    "coverageKind": "open-task",
    "taskRefs": [
      "ATM-2-0006",
      "ATM-3-0001",
      "ATM-3-0006",
      "ATM-3-0007",
      "ATM-3-0008",
      "ATM-3-0009",
      "ATM-3-0010",
      "ATM-3-0011"
    ],
    "artifactRefs": [
      "docs/agent-briefs/tasks/ATM/ATM-2-0006.md"
    ],
    "nextCheck": "wait for adapter-phase cards to close; facade must not become a monolith",
    "routeHint": "ATM-2-0006 -> ATM-3-0001 -> ATM-3-0006~ATM-3-0011",
    "findingContract": null
  },
  {
    "functionId": "evidence-artifact-log-store",
    "label": "Evidence / artifact log store",
    "layer": "layer2",
    "surfaceKind": "doc-surface",
    "coverageStatus": "open-card",
    "coverageKind": "open-task",
    "taskRefs": [
      "ATM-2-0009",
      "ATM-3-0014"
    ],
    "artifactRefs": [
      "docs/agent-briefs/tasks/ATM/ATM-2-0009.md"
    ],
    "nextCheck": "keep evidence schema aligned with caller-count and validation evidence",
    "routeHint": "ATM-2-0009 + ATM-3-0014 follow-up",
    "findingContract": null
  },
  {
    "functionId": "context-budget-summarization",
    "label": "Context budget / summarization",
    "layer": "layer2",
    "surfaceKind": "validator",
    "coverageStatus": "covered-existing",
    "coverageKind": "atom",
    "taskRefs": [
      "ATM-2-0011"
    ],
    "artifactRefs": [
      "docs/agent-briefs/tasks/ATM/ATM-2-0011.md"
    ],
    "nextCheck": "recheck when context-budget guard or summarization policy changes",
    "routeHint": null,
    "findingContract": null
  },
  {
    "functionId": "evolution-proposal-review-rollback",
    "label": "Evolution proposal / review / rollback",
    "layer": "layer2",
    "surfaceKind": "doc-surface",
    "coverageStatus": "open-card",
    "coverageKind": "open-task",
    "taskRefs": [
      "ATM-2-0015",
      "ATM-2-0017",
      "ATM-2-0020",
      "ATM-2-0021",
      "ATM-2-0022",
      "ATM-2.5-0004"
    ],
    "artifactRefs": [
      "docs/agent-briefs/tasks/ATM/ATM-2-0015.md"
    ],
    "nextCheck": "keep proposal / review / rollback docs aligned with compatibility matrix",
    "routeHint": "ATM-2-0015 / ATM-2-0017 / ATM-2-0020 / ATM-2-0021 / ATM-2-0022 / ATM-2.5-0004",
    "findingContract": null
  },
  {
    "functionId": "atom-identity-behavior-state-machine",
    "label": "Atom identity / behavior / state machine",
    "layer": "layer2",
    "surfaceKind": "manager-facade",
    "coverageStatus": "open-card",
    "coverageKind": "open-task",
    "taskRefs": [
      "ATM-2-0026",
      "ATM-2-0027",
      "ATM-2-0028",
      "ATM-2-0029"
    ],
    "artifactRefs": [
      "docs/agent-briefs/tasks/ATM/ATM-2-0026.md"
    ],
    "nextCheck": "close behavior pack and state machine coverage before promoting the family",
    "routeHint": "ATM-2-0026~ATM-2-0029",
    "findingContract": null
  },
  {
    "functionId": "atomization-infection-adapter-contract",
    "label": "Atomization / infection adapter contract",
    "layer": "layer2",
    "surfaceKind": "adapter-facade",
    "coverageStatus": "open-card",
    "coverageKind": "open-task",
    "taskRefs": [
      "ATM-2-0033",
      "ATM-4-0004",
      "ATM-4-0005"
    ],
    "artifactRefs": [
      "docs/agent-briefs/tasks/ATM/ATM-2-0033.md"
    ],
    "nextCheck": "keep neutrality scan / dry-run proposal as required preconditions",
    "routeHint": "ATM-2-0033 / ATM-4-0004 / ATM-4-0005",
    "findingContract": null
  },
  {
    "functionId": "atomgenerator-provenance-audit",
    "label": "AtomGenerator / provenance audit",
    "layer": "layer2",
    "surfaceKind": "manager-facade",
    "coverageStatus": "covered-existing",
    "coverageKind": "atom",
    "taskRefs": [
      "ATM-2-0038",
      "ATM-2-0039",
      "ATM-2-0040",
      "ATM-2-0041"
    ],
    "artifactRefs": [
      "docs/agent-briefs/tasks/ATM/ATM-2-0038.md"
    ],
    "nextCheck": "recheck when generator provenance or audit evidence changes",
    "routeHint": null,
    "findingContract": null
  },
  {
    "functionId": "atomic-map-schema-generator-provenance",
    "label": "Atomic Map schema / generator / provenance",
    "layer": "layer2",
    "surfaceKind": "atomic-map",
    "coverageStatus": "open-card",
    "coverageKind": "open-task",
    "taskRefs": [
      "ATM-2-0023",
      "ATM-2-0042",
      "ATM-2-0043",
      "ATM-2-0044",
      "ATM-2-0045",
      "ATM-2-0046"
    ],
    "artifactRefs": [
      "docs/agent-briefs/tasks/ATM/ATM-2-0042.md"
    ],
    "nextCheck": "keep map generator canonical and do not bypass provenance",
    "routeHint": "ATM-2-0023 / ATM-2-0042~ATM-2-0046",
    "findingContract": null
  },
  {
    "functionId": "task-router-onboarding",
    "label": "Task router / onboarding",
    "layer": "layer2",
    "surfaceKind": "manager-facade",
    "coverageStatus": "covered-existing",
    "coverageKind": "atom",
    "taskRefs": [
      "ATM-2-0048"
    ],
    "artifactRefs": [
      "docs/agent-briefs/tasks/ATM/ATM-2-0048.md"
    ],
    "nextCheck": "recheck only if router or onboarding contract changes",
    "routeHint": null,
    "findingContract": null
  },
  {
    "functionId": "governance-shard-strategy",
    "label": "Governance shard strategy",
    "layer": "layer2",
    "surfaceKind": "doc-surface",
    "coverageStatus": "covered-existing",
    "coverageKind": "atom",
    "taskRefs": [
      "ATM-2-0049"
    ],
    "artifactRefs": [
      "docs/agent-briefs/tasks/ATM/ATM-2-0049.md"
    ],
    "nextCheck": "recheck only if shard strategy or manifest routing changes",
    "routeHint": null,
    "findingContract": null
  },
  {
    "functionId": "task-card-lifecycle-atomic-map",
    "label": "Task card lifecycle atomic map",
    "layer": "layer2",
    "surfaceKind": "atomic-map",
    "coverageStatus": "covered-existing",
    "coverageKind": "atomic-map",
    "taskRefs": [
      "ATM-3-0015"
    ],
    "artifactRefs": [
      "docs/agent-briefs/tasks/ATM/ATM-3-0015.md"
    ],
    "nextCheck": "recheck only if lifecycle map or orchestration boundaries change",
    "routeHint": null,
    "findingContract": null
  },
  {
    "functionId": "cli-protocol-commands",
    "label": "CLI protocol / commands",
    "layer": "layer2",
    "surfaceKind": "cli-command",
    "coverageStatus": "covered-existing",
    "coverageKind": "adapter-facade",
    "taskRefs": [
      "ATM-1-0004",
      "ATM-2.5-0001",
      "ATM-2-0038",
      "ATM-2-0042",
      "ATM-2-0048",
      "ATM-2-0050",
      "ATM-2-0051"
    ],
    "artifactRefs": [
      "docs/agent-briefs/tasks/ATM/ATM-2-0051.md",
      "tools_node/atomic-framework/task-router.js",
      "tools_node/adapters/atm-3klife/rule-guard-adapter.js",
      "tools_node/adapters/atm-3klife/rule-pack.json",
      "tools_node/run-rule-guard.js"
    ],
    "nextCheck": "recheck when CLI command surfaces, task-router, or adapter routes change",
    "routeHint": null,
    "findingContract": null
  },
  {
    "functionId": "framework-function-atomization-manifest-self-coverage",
    "label": "Framework Function Atomization Manifest / self-coverage",
    "layer": "layer2",
    "surfaceKind": "validator",
    "coverageStatus": "covered-existing",
    "coverageKind": "atom",
    "taskRefs": [
      "ATM-2-0051"
    ],
    "artifactRefs": [
      "docs/ai_atomic_framework/framework-function-atomization-manifest.md",
      "docs/ai_atomic_framework/framework-function-atomization-manifest-shards/manifest-summary.md",
      "docs/ai_atomic_framework/framework-function-atomization-manifest-shards/manifest-inventory.md",
      "docs/ai_atomic_framework/framework-function-atomization-manifest-shards/manifest-machine-readable.md",
      "tools_node/validate-framework-atomization-coverage.js",
      "tools_node/atomic-framework/fixtures/framework-function-atomization-coverage.fixture.json",
      "tools_node/schemas/police/coverage-finding.schema.json"
    ],
    "nextCheck": "revalidate when manifest, shard, fixture, or validator contract changes",
    "routeHint": null,
    "findingContract": null
  },
  {
    "functionId": "public-lifecycle-semver-pev-docs",
    "label": "Public lifecycle / semver / PEV docs",
    "layer": "layer2",
    "surfaceKind": "doc-surface",
    "coverageStatus": "open-card",
    "coverageKind": "open-task",
    "taskRefs": [
      "ATM-5-0003",
      "ATM-5-0005"
    ],
    "artifactRefs": [
      "docs/agent-briefs/tasks/ATM/ATM-5-0003.md"
    ],
    "nextCheck": "keep public lifecycle docs linked to coverage manifest and compatibility matrix",
    "routeHint": "ATM-5-0003 / ATM-5-0005",
    "findingContract": null
  },
  {
    "functionId": "host-profile-adapter-config",
    "label": "Host profile / adapter config",
    "layer": "layer3",
    "surfaceKind": "adapter-facade",
    "coverageStatus": "mutable-exception",
    "coverageKind": "mutable-exception",
    "taskRefs": [
      "ATM-0-0010",
      "ATM-3-0002"
    ],
    "artifactRefs": [
      "docs/agent-briefs/tasks/ATM/ATM-0-0010.md"
    ],
    "nextCheck": "keep host-only config out of atomization and under adapter mapping",
    "routeHint": null,
    "findingContract": null
  }
]
```
<!-- ATOMIZATION_COVERAGE_MANIFEST:END -->
