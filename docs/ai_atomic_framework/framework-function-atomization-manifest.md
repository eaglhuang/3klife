<!-- doc_id: doc_other_0089 -->
# Framework Function Atomization Manifest

> 靘?隞餃?嚗ATM-2-0050`?瑼 ATM dogfooding ??coverage ?嚗???ATM framework Layer 2 ??賢???券ㄐ?曉 atom?tomic map?dapter facade ?迤撘?憭?撠???
## ?文?蝯?

- coverage gate 銝駁???`ATM-2-0050` 摰?嚗? `ATM-2-0051` 撌脫??self-coverage / finding route / blocker promotion follow-up??- CLI protocol / commands 撌脤脣 covered-existing嚗蒂??task-router / adapter route / rule-guard contract ?踵??- manifest ?芸楛銋?銝璇?self-coverage meta-surface嚗??coverage gate ?芰恣?乩犖??蝞∟撌晞?- machine-readable inventory ??fixture 敹???撠?嚗alidator ?? drift ?嗆?憭望???- 2026-05-09 鋆 done-card acknowledgement嚗ATM-2-0006 / 0009 / 0014 / 0020 / 0021 / 0022` ?????歇? framework ?臬??刻?閮嚗amily row ?乩???蝥嚗?蝬剜? `open-card`??- 2026-05-09 鋆 `ATM-2-0053` family closure backwrite嚗ATM-2-0023 / ATM-2-0042 / ATM-2-0043 / ATM-2-0044 / ATM-2-0045 / ATM-2-0046` 撌脫? Atomic Map schema / generator / provenance 鋆?摰 foundation嚗?甇方府 row 甇???? `covered-existing`??- 2026-05-09 鋆 `ATM-2-0054` task intake / lock stability backwrite嚗ATM-2-0048 / ATM-2-0049` 撌脫? task-router / onboarding / lock ?漱?惜?嗆???canonical stable path嚗?054 ?芾? validator?oc-id ?揣撘?閮嚗???status??
## Layer Boundary

| Layer | ????瘙?| 蝭? |
|---|---|---|
| Layer 1 Constitutional | 銝?瘙?摮?嚗??hash-lock + migration gate | `atomic-spec.schema.json`?registry.schema.json`?anonical ID pattern?ash algorithm |
| Layer 2 Governed | 敹???atom / atomic map / governed adapter facade coverage | CLI commands?egistry manager?est runner?olice plugins?dapter interfaces?vidence / report?ask lifecycle?enerator?ap?EV workflow |
| Layer 3 Mutable | 銝?瘙?摮?嚗? git / adapter config 蝞∠? | `.atm/profile`?ost-specific adapter config?roject-local policy override |

## Coverage Status

| Status | ?儔 |
|---|---|
| `covered-existing` | 撌脩 done card ???atom / map / validator 閬? |
| `open-card` | 撌脫? open / in-progress 隞餃??⊥?伐?銝???? |
| `planned-gap` | 蝣箄?蝻箏嚗?? `ATM-2-0050` ? follow-up ??隞餃???|
| `constitutional-exception` | Layer 1 ?芷?霅?隢?銝? atom嚗??hash-lock / migration |
| `mutable-exception` | Layer 3 host config嚗???atom |

## Function Inventory

| Framework function | Layer | Coverage | Source / task cards | Required next check |
|---|---|---|---|---|
| Atomic Spec schema | Layer 1 | constitutional-exception | `ATM-1-0003`?ATM-1-0011` | validator 蝣箄? schema ?芷?hash-lock / migration gate嚗?閬??芣? atom |
| Spec loader / parser | Layer 2 | covered-existing | `ATM-2-0001` | manifest ?? atom home / registry entry ??蝣箸???pre-generator backfill |
| Scaffold builder | Layer 2 | covered-existing | `ATM-2-0002`?ATM-2-0038`?ATM-2-0039` | 敹?蝬?AtomGenerator / source template provenance |
| Test runner / report schema | Layer 2 | covered-existing | `ATM-2-0003`?`ATM-2-0016`?`ATM-2-0025` | report ?????? atom / map validation evidence |
| Registry / HashLock / version history | Layer 2 | covered-existing | `ATM-2-0004`?ATM-2-0014`?ATM-2-0034`?ATM-2-0047` | `ATM-2-0014` 撌脣???`currentVersion` / `versions[]` version history slice嚗?蝥? registry entry?ash-lock?RN routing |
| Police plugin API / rule guards | Layer 2 | covered-existing | `ATM-2-0005`?`ATM-2-0010`?`ATM-2-0030`?`ATM-2-0031`?`ATM-2-0035`?`ATM-3-0012` | ?? rule guard ???? independent governed atom ? map member???? `trigger / scope / severity / action` ? machine-readable findings |
| Adapter API / Plugin SDK | Layer 2 | covered-existing | `ATM-2-0006`?ATM-3-0001`?ATM-3-0006`~`ATM-3-0011` | `ATM-2-0006` 撌脣???lifecycle-aware SDK slice嚗dapter facade 敺?隞??舀???monolith |
| Evidence / artifact log store | Layer 2 | covered-existing | `ATM-2-0009`?ATM-3-0014` | `ATM-2-0009` 撌脣???replayable store contract嚗ATM-3-0014` ?芣??usage-feedback shadow adapter |
| Context budget / summarization | Layer 2 | covered-existing | `ATM-2-0011` | context budget guard ????governance bundle map |
| Evolution proposal / review / rollback | Layer 2 | covered-existing | `ATM-2-0015`?ATM-2-0017`?ATM-2-0020`?ATM-2-0021`?ATM-2-0022`?ATM-2.5-0004` | `ATM-2-0020 / 0021 / 0022` 撌脣???proposal / review / rollback core slice嚗?蝥 family integration |
| Atom identity / behavior / state machine | Layer 2 | covered-existing | `ATM-2-0026`?ATM-2-0027`?ATM-2-0028`?ATM-2-0029` | behavior pack manifest 敹?閬? 10 behaviors |
| Atomization / infection adapter contract | Layer 2 | covered-existing | `ATM-2-0033`?ATM-4-0004`?ATM-4-0005` | atomize / infect 銝?頝喲? neutrality scan / dry-run proposal |
| AtomGenerator / provenance audit | Layer 2 | covered-existing | `ATM-2-0038`?ATM-2-0039`?ATM-2-0040`?ATM-2-0041` | ??atom 銝?蝜? generator嚗re-generator atom 敹???backfilled witness |
| Atomic Map schema / generator / provenance | Layer 2 | covered-existing | `ATM-2-0023`?ATM-2-0042`?ATM-2-0043`?ATM-2-0044`?ATM-2-0045`?ATM-2-0046` | recheck only when `ATM-2-0024`?ATM-2-0025`?ATM-4-0008` changes map-level evolution / integration contracts |
| Task router / onboarding | Layer 2 | covered-existing | `ATM-2-0048`?ATM-2-0054` | onboarding / router contract 撌脰◤ 0048 ?嗆?嚗?054 ?芾? task-intake stability validator ??canonical route smoke |
| Governance shard strategy | Layer 2 | covered-existing | `ATM-2-0049`?ATM-2-0054` | shard strategy / lock guard 撌脰◤ 0049 ?嗆?嚗?054 ?芾? shard / doc-id / manifest ?神隤? |
| Task card lifecycle atomic map | Layer 2 | covered-existing | `ATM-3-0015` | task lifecycle member atoms ??orchestration ??撌脣?蝢抬?銝?隤斤?冽???coverage |
| CLI protocol / commands | Layer 2 | covered-existing | `ATM-1-0004`?ATM-2.5-0001`?ATM-2-0038`?ATM-2-0042`?ATM-2-0048`?ATM-2-0050`?ATM-2-0051` | CLI command surfaces now route through atom / map / adapter coverage |
| Framework Function Atomization Manifest / self-coverage | Layer 2 | covered-existing | `ATM-2-0051` | validator / manifest / fixture / schema contract must stay aligned |
| Public lifecycle / semver / PEV docs | Layer 2 | covered-existing | `ATM-5-0003`?ATM-5-0005` | ?辣閬?閬?? coverage manifest ??compatibility matrix |
| Host profile / adapter config | Layer 3 | mutable-exception | `ATM-0-0010`?ATM-3-0002` | ?芸?閮?config / adapter mapping嚗?閬? atom |

## Open-Card Closure Register

These surfaces were previously `open-card`; after backlog closeout they are now tracked as `covered-existing` with explicit next-check rules.

| Surface | Decision | Rule |
|---|---|---|
| Test runner / report schema | covered-existing | keep `open-card`, require card-linked validator evidence |
| Police plugin API / rule guards | covered-existing | keep `open-card`, require machine-readable finding contract |
| Adapter API / Plugin SDK | covered-existing | keep `open-card`, prevent monolith backslide |
| Evidence / artifact log store | covered-existing | keep `open-card`, require replay/usage evidence continuity |
| Evolution proposal / review / rollback | covered-existing | keep `open-card`, require PEV and semver linkage |
| Atom identity / behavior / state machine | covered-existing | keep `open-card`, require behavior-pack coverage |
| Atomization / infection adapter contract | covered-existing | keep `open-card`, require neutrality + dry-run preconditions |
| Public lifecycle / semver / PEV docs | covered-existing | keep `open-card`, require compatibility matrix linkage |
## Required Gate

`ATM-2-0050` / `ATM-2-0051` ?? coverage gate 霈? deterministic validator + self-coverage gate??
1. `## Machine-Readable Inventory` 敹?撠? JSON block ??fixture??2. 瘥?Layer 2 function ?賢??? source task / atom / map / adapter facade 撠???3. `constitutional-exception` ?芾? Layer 1??4. `mutable-exception` ?芾? Layer 3??5. `planned-gap` 敹??? open task id ??routeHint??6. ?啣? framework function ???芸 manifest / fixture ?箇閬??fail??7. `framework-function-atomization-manifest-self-coverage` 敹?靽???covered-existing meta-surface嚗??manifest ?芸楛瞍雯??## Planning Backwrite

??manifest 敹?鋡思???隞嗅??剁?

- `docs/ai_atomic_framework/AI_Atomic_Framework_Roadmap.md`
- `docs/ai_atomic_framework/AI??獢?閮??md`
- `docs/ai_atomic_framework/ATM獢瞍脣銵??.md`
- `docs/ai_atomic_framework/??脣???????.md`

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
    "coverageStatus": "covered-existing",
    "coverageKind": "atom",
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
      "docs/agent-briefs/tasks/ATM/ATM-2-0004.md",
      "docs/agent-briefs/tasks/ATM/ATM-2-0014.md"
    ],
    "nextCheck": "ATM-2-0014 completed currentVersion / versions[] version history slice; recheck when registry entry, hash-lock, or URN routing changes",
    "routeHint": null,
    "findingContract": null
  },
  {
    "functionId": "police-plugin-api-rule-guards",
    "label": "Police plugin API / rule guards",
    "layer": "layer2",
    "surfaceKind": "police-surface",
    "coverageStatus": "covered-existing",
    "coverageKind": "atom",
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
    "coverageStatus": "covered-existing",
    "coverageKind": "atom",
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
    "nextCheck": "ATM-2-0006 completed lifecycle-aware SDK slice; wait for adapter-phase cards to close and keep the facade from becoming a monolith",
    "routeHint": "ATM-2-0006 done -> ATM-3-0001 -> ATM-3-0006~ATM-3-0011",
    "findingContract": null
  },
  {
    "functionId": "evidence-artifact-log-store",
    "label": "Evidence / artifact log store",
    "layer": "layer2",
    "surfaceKind": "doc-surface",
    "coverageStatus": "covered-existing",
    "coverageKind": "atom",
    "taskRefs": [
      "ATM-2-0009",
      "ATM-3-0014"
    ],
    "artifactRefs": [
      "docs/agent-briefs/tasks/ATM/ATM-2-0009.md"
    ],
    "nextCheck": "ATM-2-0009 completed replayable store contract; keep usage-feedback aligned with caller-count and validation evidence",
    "routeHint": "ATM-2-0009 done -> ATM-3-0014 usage-feedback shadow adapter",
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
    "coverageStatus": "covered-existing",
    "coverageKind": "atom",
    "taskRefs": [
      "ATM-2-0015",
      "ATM-2-0017",
      "ATM-2-0020",
      "ATM-2-0021",
      "ATM-2-0022",
      "ATM-2.5-0004"
    ],
    "artifactRefs": [
      "docs/agent-briefs/tasks/ATM/ATM-2-0015.md",
      "docs/agent-briefs/tasks/ATM/ATM-2-0017.md",
      "docs/agent-briefs/tasks/ATM/ATM-2-0020.md",
      "docs/agent-briefs/tasks/ATM/ATM-2-0021.md",
      "docs/agent-briefs/tasks/ATM/ATM-2-0022.md"
    ],
    "nextCheck": "ATM-2-0020 / 0021 / 0022 completed proposal / review / rollback core slice; keep PEV and semver docs aligned with compatibility matrix",
    "routeHint": "ATM-2-0015 / ATM-2-0017 / ATM-2-0020 done / ATM-2-0021 done / ATM-2-0022 done / ATM-2.5-0004",
    "findingContract": null
  },
  {
    "functionId": "atom-identity-behavior-state-machine",
    "label": "Atom identity / behavior / state machine",
    "layer": "layer2",
    "surfaceKind": "manager-facade",
    "coverageStatus": "covered-existing",
    "coverageKind": "atom",
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
    "coverageStatus": "covered-existing",
    "coverageKind": "atom",
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
    "coverageStatus": "covered-existing",
    "coverageKind": "atomic-map",
    "taskRefs": [
      "ATM-2-0023",
      "ATM-2-0042",
      "ATM-2-0043",
      "ATM-2-0044",
      "ATM-2-0045",
      "ATM-2-0046"
    ],
    "artifactRefs": [
      "docs/agent-briefs/tasks/ATM/ATM-2-0023.md",
      "docs/agent-briefs/tasks/ATM/ATM-2-0042.md",
      "docs/agent-briefs/tasks/ATM/ATM-2-0043.md",
      "docs/agent-briefs/tasks/ATM/ATM-2-0044.md",
      "docs/agent-briefs/tasks/ATM/ATM-2-0045.md",
      "docs/agent-briefs/tasks/ATM/ATM-2-0046.md"
    ],
    "nextCheck": "recheck when map-level evolution, compare/report, or consumer integration changes the canonical map contract",
    "routeHint": "ATM-2-0024 / ATM-2-0025 / ATM-4-0008",
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
      "ATM-2-0048",
      "ATM-2-0054"
    ],
    "artifactRefs": [
      "docs/agent-briefs/tasks/ATM/ATM-2-0048.md",
      "docs/agent-briefs/tasks/ATM/ATM-2-0054.md"
    ],
    "nextCheck": "recheck only if router, onboarding, or task-intake stability contract changes",
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
      "ATM-2-0049",
      "ATM-2-0054"
    ],
    "artifactRefs": [
      "docs/agent-briefs/tasks/ATM/ATM-2-0049.md",
      "docs/agent-briefs/tasks/ATM/ATM-2-0054.md"
    ],
    "nextCheck": "recheck only if shard strategy, lock routing, or manifest routing changes",
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
    "coverageStatus": "covered-existing",
    "coverageKind": "atom",
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



