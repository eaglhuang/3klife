# Framework Function Atomization Manifest — Function Inventory 與 Gate

> 這是 `framework-function-atomization-manifest.md` 的「Function Inventory 與 Gate」分片。完整索引見 `docs/ai_atomic_framework/framework-function-atomization-manifest.md`。

## Function Inventory

| Framework function | Layer | Coverage | Source / task cards | Required next check |
|---|---|---|---|---|
| Atomic Spec schema | Layer 1 | constitutional-exception | `ATM-1-0003`、`ATM-1-0011` | validator 確認 schema 只進 hash-lock / migration gate，不要求自我 atom |
| Spec loader / parser | Layer 2 | covered-existing | `ATM-2-0001` | manifest 需列出 atom home / registry entry 或明確標為 pre-generator backfill |
| Scaffold builder | Layer 2 | covered-existing | `ATM-2-0002`、`ATM-2-0038`、`ATM-2-0039` | 必須經 AtomGenerator / source template provenance |
| Test runner / report schema | Layer 2 | open-card | `ATM-2-0003`?`ATM-2-0016`?`ATM-2-0025` | report ?????? atom / map validation evidence |
| Registry / HashLock / version history | Layer 2 | covered-existing | `ATM-2-0004`、`ATM-2-0014`、`ATM-2-0034`、`ATM-2-0047` | `ATM-2-0014` 已完成 `currentVersion` / `versions[]` version history slice；後續只重查 registry entry、hash-lock、URN routing |
| Police plugin API / rule guards | Layer 2 | open-card | `ATM-2-0005`?`ATM-2-0010`?`ATM-2-0030`?`ATM-2-0031`?`ATM-2-0035`?`ATM-3-0012` | ?? rule guard ???? independent governed atom ? map member???? `trigger / scope / severity / action` ? machine-readable findings |
| Adapter API / Plugin SDK | Layer 2 | open-card | `ATM-2-0006`、`ATM-3-0001`、`ATM-3-0006`~`ATM-3-0011` | `ATM-2-0006` 已完成 lifecycle-aware SDK slice；adapter facade 後續仍不可成為 monolith |
| Evidence / artifact log store | Layer 2 | open-card | `ATM-2-0009`、`ATM-3-0014` | `ATM-2-0009` 已完成 replayable store contract；`ATM-3-0014` 只承接 usage-feedback shadow adapter |
| Context budget / summarization | Layer 2 | covered-existing | `ATM-2-0011` | context budget guard 應列入 governance bundle map |
| Evolution proposal / review / rollback | Layer 2 | open-card | `ATM-2-0015`、`ATM-2-0017`、`ATM-2-0020`、`ATM-2-0021`、`ATM-2-0022`、`ATM-2.5-0004` | `ATM-2-0020 / 0021 / 0022` 已完成 proposal / review / rollback core slice；後續收 family integration |
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
