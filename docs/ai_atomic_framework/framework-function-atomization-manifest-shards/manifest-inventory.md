# Framework Function Atomization Manifest — Function Inventory 與 Gate

> 這是 `framework-function-atomization-manifest.md` 的「Function Inventory 與 Gate」分片。完整索引見 `docs/ai_atomic_framework/framework-function-atomization-manifest.md`。

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
| CLI protocol / commands | Layer 2 | planned-gap | `ATM-1-0004`、`ATM-2.5-0001`、`ATM-2-0038`、`ATM-2-0042`、`ATM-2-0048`、`ATM-2-0050`、`ATM-2-0051` | `ATM-2-0051` 承接每個 CLI command 到 atom / map / adapter facade 的 blocker promotion / self-coverage / finding route |
| Public lifecycle / semver / PEV docs | Layer 2 | open-card | `ATM-5-0003`、`ATM-5-0005` | 文件規則要連回 coverage manifest 與 compatibility matrix |
| Host profile / adapter config | Layer 3 | mutable-exception | `ATM-0-0010`、`ATM-3-0002` | 只允許 config / adapter mapping，不要求 atom |

## Required Gate

`ATM-2-0050` ??? deterministic validator??????

1. `## Machine-Readable Inventory` ? JSON block ???????? fixture ?????
2. ?? Layer 2 function ????? source task / atom / map / adapter facade?
3. `constitutional-exception` ???? Layer 1?
4. `mutable-exception` ???? Layer 3?
5. `planned-gap` ??? open task id ? routeHint?
6. ?? new framework function ??? manifest entry?validation fail?
## Planning Backwrite

本 manifest 必須被下列文件引用：

- `docs/ai_atomic_framework/AI_Atomic_Framework_Roadmap.md`
- `docs/ai_atomic_framework/AI原子框架開發計畫書.md`
- `docs/ai_atomic_framework/ATM框架演進執行規劃書.md`
- `docs/ai_atomic_framework/關於進化版的原子提案.md`
