<!-- doc_id: doc_other_0265 -->
# APF-0010 — Roadmap Backwrite & Promotion Gate

## 1. Alpha 排程對齊

| 階段 | 範圍 | APF 對應任務 |
|---|---|---|
| alpha0 | upstream contract surface 凍結 | APF-0001 / 0002 / 0011 / 0012 |
| alpha1 | Default Governance Bundle 上線 | APF-0003 ~ 0008 |
| alpha1+ | full profile + advisory→blocker promotion | APF-0009 / 0010 |

引用：3KLife AI 原子框架開發計畫書 §alpha-phasing；三角策略規劃書 shadow adapter pathway。

## 2. Shadow Adapter Pathway

3KLife 不直接 mutate upstream registry。所有 police productization 走：

```
3KLife (adopter)
    │ uses
    ▼
shadow adapter (3KLife-specific governance bundle)
    │ delegates
    ▼
AI-Atomic-Framework upstream police runtime
    │ produces
    ▼
ReviewAdvisory.machine-finding queue
```

shadow adapter 是唯一允許 3KLife 加私有 routing 的層次；upstream police runtime 必須保持 adopter-neutral。

## 3. Upstream backwrite list

| 上游檔案 | 補入內容 | 引用任務 |
|---|---|---|
| `docs/ATOM_EVOLUTION_PLAN.md` | police family registry 章節 | APF-0009 |
| `docs/governance/behavior-taxonomy.md` | behavior × police trigger 矩陣 | APF-0001 |
| `packages/plugin-sdk/src/police.ts` | `PoliceFinding` superset 型別 | APF-0002 |
| `schemas/police-finding.schema.json` | evidence schema bridge | APF-0012 |
| `packages/core/src/police/index.ts` | family registry 註冊 | APF-0009 |
| `package.json` scripts | `police:report` CLI | APF-0009 |

## 4. Per-family advisory / blocker 標記

對齊主計畫書 §7 里程碑表：

| Family | alpha0 | alpha1 | alpha1+ |
|---|---|---|---|
| schema | blocker | blocker | blocker |
| dependency-graph | blocker | blocker | blocker |
| boundary | blocker | blocker | blocker |
| lifecycle | blocker | blocker | blocker |
| registry-consistency | blocker | blocker | blocker |
| quality | n/a | blocker (gates 既有) | blocker |
| map-integration | n/a | advisory | blocker |
| dedup | n/a | advisory | blocker (滿足 promotion 條件) |
| demand | n/a | advisory | blocker (滿足 promotion 條件) |
| atomization | n/a | advisory | blocker |
| orchestrator | n/a | advisory | advisory (永遠 telemetry) |

## 5. `demandThreshold` 補入路徑

upstream 缺 `demandThreshold` 識別字，本 backwrite 將其補入：
- `schemas/governance-bundle.schema.json` 加 `demandThreshold: number` (default=2)
- `packages/core/src/guidance/legacy-route-plan.ts` 接讀
- `validate:guidance` fixture 補 positive / negative case

## 6. Release note guidance

每次 promotion（advisory → blocker）必須在 release note 註明：
- 哪些 family 升 blocker
- 哪些 validator profile 起 enforce
- shadow adapter migration steps（若有）
- rollback 條件（連續 2 release fail 即降回 advisory）

## 7. 中立性檢查

backwrite 寫入 upstream 時必須 100% adopter-neutral：
- 禁止出現 3KLife / Cocos / 私有原子名稱
- 禁止假設 adopter 的目錄結構
- 禁止假設 adopter 的 CI 提供商
