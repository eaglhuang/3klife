<!-- doc_id: doc_other_0089 -->
# Framework Function Atomization Manifest

> 來源任務：`ATM-2-0050`。本檔是 ATM dogfooding 的 coverage 真相：所有 ATM framework Layer 2 功能都必須能在這裡找到 atom、atomic map、adapter facade 或正式例外的對應。

## 判定結論

目前 ATM 任務卡已涵蓋「框架功能必須原子化」的理念與多個局部實作，但尚未形成可機器驗證的全框架 coverage gate。

- 已涵蓋：seed self-governance、neutrality scanner atom、AtomGenerator、MapGenerator、generator provenance、task card system atomic map、adapter Phase 2 原子化路線。
- 缺口：沒有一份 framework function inventory 逐項列出 CLI、registry、spec / scaffold、test / report / evidence、police、adapter、task lifecycle、map、PEV / lifecycle docs 等功能的原子化狀態。
- 補法：`ATM-2-0050` 建立本 manifest 與 validator；既有功能先映射到既有卡，不重複開卡。

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
| Test runner / report schema | Layer 2 | covered-existing | `ATM-2-0003`、`ATM-2-0016`、`ATM-2-0025` | report 必須可映射到 atom / map validation evidence |
| Registry / HashLock / version history | Layer 2 | covered-existing | `ATM-2-0004`、`ATM-2-0014`、`ATM-2-0034`、`ATM-2-0047` | registry entry 必須有 generator provenance 或 backfilled witness |
| Police plugin API / rule guards | Layer 2 | open-card | `ATM-2-0005`、`ATM-2-0010`、`ATM-2-0030`、`ATM-2-0031`、`ATM-2-0035`、`ATM-3-0012` | 每個 rule guard 要能成為 independent governed atom 或 map member |
| Adapter API / Plugin SDK | Layer 2 | open-card | `ATM-2-0006`、`ATM-3-0001`、`ATM-3-0006`~`ATM-3-0011` | adapter facade 不可成為 monolith；背後能力需拆 ATM-GOV atoms |
| Evidence / artifact log store | Layer 2 | open-card | `ATM-2-0009`、`ATM-3-0014` | evidence schema / usage-feedback 必須列入 atom caller-count 與 validation evidence |
| Context budget / summarization | Layer 2 | covered-existing | `ATM-2-0011` | context budget guard 應列入 governance bundle map |
| Evolution proposal / review / rollback | Layer 2 | open-card | `ATM-2-0015`、`ATM-2-0017`、`ATM-2-0020`、`ATM-2-0021`、`ATM-2-0022`、`ATM-2.5-0004` | PEV / semver docs 必須連到 atom compatibility matrix |
| Atom identity / behavior / state machine | Layer 2 | open-card | `ATM-2-0026`、`ATM-2-0027`、`ATM-2-0028`、`ATM-2-0029` | behavior pack manifest 必須覆蓋 10 behaviors |
| Atomization / infection adapter contract | Layer 2 | open-card | `ATM-2-0033`、`ATM-4-0004`、`ATM-4-0005` | atomize / infect 不得跳過 neutrality scan / dry-run proposal |
| AtomGenerator / provenance audit | Layer 2 | covered-existing | `ATM-2-0038`、`ATM-2-0039`、`ATM-2-0040`、`ATM-2-0041` | 新 atom 不得繞過 generator；pre-generator atom 必須有 backfilled witness |
| Atomic Map schema / generator / provenance | Layer 2 | open-card | `ATM-2-0023`、`ATM-2-0042`、`ATM-2-0043`、`ATM-2-0044`、`ATM-2-0045`、`ATM-2-0046` | new map 不得繞過 map generator |
| Task router / onboarding | Layer 2 | open-card | `ATM-2-0048` | 所有入口導回 AtomGenerator / MapGenerator canonical path |
| Governance shard strategy | Layer 2 | open-card | `ATM-2-0049` | shard strategy 本身要產出可被 coverage validator 讀取的 manifest |
| Task card lifecycle atomic map | Layer 2 | open-card | `ATM-3-0015` | 僅覆蓋 task lifecycle；不得誤當全框架 coverage |
| CLI protocol / commands | Layer 2 | planned-gap | `ATM-1-0004`、`ATM-2.5-0001`、`ATM-2-0038`、`ATM-2-0042`、`ATM-2-0048`、`ATM-2-0050` | `ATM-2-0050` 必須列出每個 CLI command 對應 atom / map / adapter facade |
| Public lifecycle / semver / PEV docs | Layer 2 | open-card | `ATM-5-0003`、`ATM-5-0005` | 文件規則要連回 coverage manifest 與 compatibility matrix |
| Host profile / adapter config | Layer 3 | mutable-exception | `ATM-0-0010`、`ATM-3-0002` | 只允許 config / adapter mapping，不要求 atom |

## Required Gate

`ATM-2-0050` 需新增 deterministic validator，最低檢查：

1. 每個 Layer 2 function 至少有一個 source task / atom / map / adapter facade。
2. `constitutional-exception` 只能用於 Layer 1。
3. `mutable-exception` 只能用於 Layer 3。
4. `planned-gap` 必須有 open task id。
5. 任一 new framework function 若沒有 manifest entry，validation fail。

## Planning Backwrite

本 manifest 必須被下列文件引用：

- `docs/ai_atomic_framework/AI_Atomic_Framework_Roadmap.md`
- `docs/ai_atomic_framework/AI原子框架開發計畫書.md`
- `docs/ai_atomic_framework/ATM框架演進執行規劃書.md`
- `docs/ai_atomic_framework/關於進化版的原子提案.md`
