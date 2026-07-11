---
doc_id: doc_team_vocab_canon_replan_2026_07_10
owner: Project Captain
status: planning
created_at: 2026-07-10
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
related_plan:
  - "docs/ai_atomic_framework/team-agents/TEAM-BROKER-ENFORCEMENT-INTEGRATION-PLAN-2026-07-10.md"
  - "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
sources: "6-subagent full-directory audit of team-agents/** (71 files), 2026-07-10"
---

# Team Agents 分級詞彙正典與重新規劃(2026-07-10 全目錄稽核版)

## 0. 裁決:L1~L5 不是本計畫的正典詞彙

6 個 subagent 全文讀完 team-agents/ 下全部 71 份文件(3 份主計畫書、4 份 runtime 藍圖、
5 份交接/派工文件、8 份模板、50 張任務卡)後確認:**沒有任何一份文件定義過 L1~L5 五級制**。
先前對話中出現的「L1~L5 對應」屬自創詞彙,與計畫書不一致,即日起廢止;一切分級敘述
改用下表正典詞彙。

## 1. 分級詞彙正典表(單一真實來源索引)

| 軸 | 正典值 | 定義出處(唯一來源) |
|---|---|---|
| Runtime 實作選型 Tier | `raw-api`(Tier A)/ `agent-sdk`(Tier B)/ `editor`(Tier Editor) | 團隊自動化代理分工計畫.md §8.9 |
| Runtime mode | `real-agent` / `editor-subagent` / `broker-only` | ATM多語言WorkerAdaptor方案.md「執行模式規格」;TEAM-0031 |
| Execution surface | `agent-runtime` / `editor-subagent` / `broker-governance` | blueprints/team-agent-runtime-contract.draft.ts |
| 決策等級 decisionClass | `auto-execution` / `human-signoff-required` / `adr-required` / `blocked` | CAPTAIN-DISPATCH-2026-07-02 §A;enum 唯一重述處為 TEAM-0046 |
| Blocked/rework reason | `scope-violation`、`evidence-missing`、`validator-failed`、`reviewer-independence-missing`、`human-signoff-required`、`adr-required`、`broker-conflict-blocked`、`policy-downgrade-request` | CAPTAIN-DISPATCH-2026-07-02 §C |
| Permission decision | `allow` / `deny` / `escalate` | runtime contract draft |
| Team sizing | `small` / `medium` / `large`(+ Lieutenant 升級規則) | TEAM-0007/0008;sizing→roster 生效於 TEAM-0051(之前僅 advisory) |
| Patrol severity | `info` / `warning` / `critical`;findings 分 warning/blocker | templates/patrol-report.md;TEAM-0014 |
| 治理通道 Channel | `fast` / `normal` / `batch` | 計畫書 §2 原則 5(Team 不取代 Channel) |
| Route state | planned → in-progress → needs-review → needs-rework → rework-in-progress → revalidate-pending → ready-for-close / blocked / escalated(9 態) | WorkerAdaptor 方案;TEAM-0033 |
| 知識層 | canonical(`.atm/knowledge/**`)/ generated cache(`.atm/runtime/knowledge/**`);retention `hot/warm/archive-candidate` | TEAM-0020/0023;team-memory-shard.md |
| Reviewer independence | `different-provider` / `different-model-family` / `different-certification` | 計畫書 §8.9 |
| 架構分層 | Layer A~F(contracts/orchestrator/governance/bridges/wiring/observability) | 多廠商藍圖「分層架構」 |
| 里程碑 | M0~M9I,後綴軸 K=知識、H=硬化、R=runtime、P=planning/preflight、N=負控、I=integration、E=enforcement、X=execution | tasks/README + 各卡 frontmatter |
| 「Level」唯一合法用法 | Level 1 = 同 branch/worktree domain 內 distinct writer key ≥ 2 的多寫手升級門檻(僅此一級) | ATM 多 Agent 寫入治理里程碑計劃.md M1 |

## 2. 稽核發現的詞彙/狀態不一致(修復清單)

1. `executionKind` 第三態同文件內兩寫法:`humanless-disabled` vs `broker-only`(WorkerAdaptor 方案)。裁決:統一為 `broker-only`。
2. 「Phase 1~4」雙重定義:多廠商藍圖(分期主題)與 WorkerAdaptor 方案(卡片分組)各一套。裁決:引用時必附文件名,不得裸用 Phase N。
3. 主控角色四名並存:Coordinator / Captain / Task Captain / transaction owner。裁決:治理契約層用 Coordinator,人機操作層用 Captain,兩者對照寫入正典表。
4. `broker-only` 三重身分(first-class mode / fallback / repo 預設值字串)。裁決:它是 runtime mode;0035 的 fallback 是「行為描述」;0051 落地時預設值物件須把 providerId/modelId/runtimeMode 分欄,不得串接。
5. 預設供應商立場相反:SOP 綁 GPT-5.4(-mini) 實操預設,計畫書綁 Anthropic 並宣稱中立。裁決:兩者分屬「操作預設」與「架構中立」,SOP 補一句引用計畫書中立原則即可。
6. 狀態鏡像漂移(planning vs ledger):0008/0009/0011/0012/0043/0044/0045 卡面或 roster 落後 ledger(實際皆 done);0028 ledger=abandoned 而卡面 done;roster 缺 0046~0048、0050~0052 列;0026 Phase 1 語意需補記。

## 3. 重新規劃(取代先前含 L1~L5 說法的任何版本)

### Lane 1 — M10X 執行落地(實作主線,順序固定)
1. `TASK-TEAM-0050` team start --execute 真實 per-role spawn 接線(P0)
2. `TASK-TEAM-0051` per-role provider config surface + sizing→roster 生效 + 手動旗標(P0)
3. `TASK-TEAM-0052` 異質多 bot E2E proof(P1)

### Lane 2 — `TASK-TEAM-0049` 文件收斂卡(doc-only,可與 Lane 1 並行)
範圍:(a) 本文件 §2 全部六項修復;(b) tasks/README roster 全表對齊 AAF ledger 並補
0046~0052 列;(c) 把 §1 正典表節錄進 tasks/README 作為分級詞彙附錄;(d) 0028 abandoned
緣由補記。closure_authority: planning_repo,commit 1 次收斂。

### Lane 3 — 既有 backlog 承接(不新開 TEAM 卡)
- 跨 repo mirror 三角化 root-cause 修復維持走 ATM-BUG-2026-07-10-074/077/078/080/081
  簇(framework 側),與 0049 的文件面修復互補不重疊。

## 4. 驗收

- 全 repo 搜尋不再有裸用 L1~L5 指涉 Team Agents 分級的文字。
- tasks/README roster 與 AAF ledger 零漂移(0002~0048 done、0028 abandoned、0050~0052 planned)。
- M10X 三卡關閉後,§1 的 sizing/mode/decisionClass 詞彙在 CLI 輸出中全部可觀測。
