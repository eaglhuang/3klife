---
doc_id: doc_team_broker_enforcement_plan_2026_07_10
owner: Project Captain
status: planning
created_at: 2026-07-10
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
related_plan:
  - "docs/ai_atomic_framework/team-agents/ATM 多廠商 Agent Runtime 與 Integration 藍圖.md"
  - "docs/ai_atomic_framework/team-agents/CAPTAIN-DISPATCH-2026-07-02-framework-sync-candidates-and-task-recommendations.md"
supersedes: none
---

# Team Broker 實戰強制性整合計畫（M8E Enforcement Lane）

## 0. 一句話結論

sidecar 稽核提案（conflict resolution command / override gate parity / conflict UX / dogfood replay）**與既有計畫完全相容，予以採納**，但提案中的 `TASK-TEAM-0042/0043/0044` 編號與既有 M9I 廠商橋接卡衝突，**改編為 `TASK-TEAM-0046/0047/0048`**；四張卡組成新里程碑 **M8E（Broker Enforcement）**，插在已完成的 M8I 核心與未開工的 M9I 橋接之間，讓所有 vendor bridge「一出生就在硬閘之下」。

## 1. 現況基線（2026-07-10 盤點）

以 AAF `.atm/history/tasks` ledger 為權威來源：

- **已完成**：TASK-TEAM-0002~0039、0041 全數 done（0028 ledger 標 abandoned，roster 待修）。M0~M8I 含 permission broker（0038, commit `86b51db3`）、provider contract/kernel（0037）、vendor config surface（0039）、provider selection（0041）皆落地於 `packages/core/src/team-runtime/`。
- **未完成**：0026 Phase 1（safe mirror reconciliation）、0040（cross-vendor observability）、0042~0045（M9I 廠商橋接 + capability manifest 收口）。
- **剛補上的硬閘**：普通 `backend.gitHookBypass` 不能越過 Broker conflict；越過需高權限 `backend.brokerConflictOverride` + `atm.brokerConflictResolution.v1` artifact。
- **稽核警訊**：`tasks audit` 有 1 個 active warning — `ATM-FRAMEWORK-TEMP-codex-team-broker` stale lock（見 §6 衛生項）。

缺口定性（採納 sidecar 判斷）：**「基礎完成、實戰強制性不足」**——artifact 可被要求，但沒有正式命令生成它；override 閘只在 git commit 入口生效；衝突時 CLI 只說 blocked 不給下一步。

## 2. 編號更正（強制）

| sidecar 提案編號 | 衝突對象 | 更正後編號 |
|---|---|---|
| TASK-TEAM-0042 | 既有卡：OpenAI/Azure runtime bridges（M9I, planned） | **TASK-TEAM-0046** |
| TASK-TEAM-0043 | 既有卡：Claude Code/Gemini bridges（M9I, planned） | **TASK-TEAM-0047** |
| TASK-TEAM-0044 | 既有卡：Microsoft Foundry bridge（M9I, planned） | **TASK-TEAM-0048** |
| TASK-MAO-0059 | 無衝突（ledger 至 0058） | **TASK-MAO-0059**（維持） |

任何後續 dispatch、brief、ledger import 一律使用更正後編號；禁止重用 M9I 已占編號。

## 3. 新里程碑 M8E：Broker Enforcement Lane

### TASK-TEAM-0046 — Team Broker Conflict Resolution Command（P0，第一優先）

- **Goal**：新增 `tasks parallel resolve`（或 `team broker resolve`）正式命令，自動生成 `atm.brokerConflictResolution.v1` artifact。
- **Artifact 必含**：task ids、shared paths、CID/atom overlap、owner ack/timeout、resolution order、validator plan。
- **Schema 對齊（關鍵融合點）**：artifact 欄位必須套用 2026-07-02 派工文件的共用治理欄位——`decisionClass`（auto-execution / human-signoff-required / adr-required / blocked）、`decisionReason`、`violationStatus`、`escalationTarget`；blocked 語意沿用既定 `broker-conflict-blocked`。不得另創平行詞彙。
- **scopePaths（草案）**：`packages/core/src/team-runtime/permission-broker.ts`、`packages/cli/src/commands/team.ts` 或 `tasks.ts`、`schemas/governance/broker-conflict-resolution.schema.json`、`scripts/validate-team-agents.ts`、`atomic_workbench/atomization-coverage/path-to-atom-map.json`。
- **validators**：`npm run typecheck`、`npm run validate:cli`、`node --strip-types scripts/validate-team-agents.ts --case broker-conflict-resolution`、`git diff --check`。

### TASK-TEAM-0047 — Broker Override Gate Parity（P0，依賴 0046）

- **Goal**：把 `backend.brokerConflictOverride` 檢查接到四個入口：`team start`、`next --claim`、`taskflow close`、`git commit`，消除「只有 commit 會擋」的旁路。
- **Acceptance**：四入口在 active-task overlap 且無有效 resolution artifact 時一致回 `broker-conflict-blocked`；override 路徑必附 artifact 引用；任何入口不得自我授權（沿用 0038 non-goal）。
- **nonGoals**：不新增第二 scheduler、不動 Coordinator-only lifecycle 所有權。

### TASK-TEAM-0048 — Conflict UX / Captain Playbook（P1，依賴 0046）

- **Goal**：偵測到 overlap 時 CLI 輸出可執行的下一步階梯：① 跑 parallel analysis → ② 生成 resolution artifact（0046 命令）→ ③ 申請 high-authority override。
- **融合點**：playbook 文字併入 SKL-0009（role-routing matrix / playbook slices）的 dispatch brief 欄位，避免兩套 playbook。
- **Deliverables**：CLI guidance 輸出、`TEAM_AGENTS_CAPTAIN_LED_SOP.md` 增補一節、templates/captain-decision.md 增加 broker-conflict 決策範例。

### TASK-MAO-0059 — Dogfood Replay Benchmark（P1，依賴 0046+0047）

- **Goal**：以 `TASK-RFT-0019` vs `TASK-AAO-0155` 真實事故做 replay fixture，驗證雙 AI 衝突被強制導向 resolution artifact，而非依賴隊長自律。
- **Acceptance**：replay 中無 artifact 時四入口全部 blocked；有 artifact 時按 resolution order 放行；fixture 進 regression suite。
- **注意**：fixture 需排除 `release/**`（onefile nested launcher 教訓），且不得寫入 `.atm/runtime/**` 真實狀態。

## 4. 與既有三條車道的融合關係

```
M8I (done)  0037 kernel → 0038 broker → 0039 config → 0041 selection
                 |
M8E (new)   0046 resolve cmd → 0047 gate parity → 0048 UX ─┐
                 |                                          ├→ MAO-0059 replay
SKL lane    SKL-0008 role boundary → SKL-0009 routing ──────┘ (playbook/欄位對齊)
                 → SKL-0010 manifest (承載 decisionClass 欄位)
                 |
M9I (後移)  0040 observability (吃 0046 artifact 事件)
            → 0042/0043/0044 vendor bridges (出生即受 0047 硬閘)
            → 0045 capability manifest 收口
```

三個融合決策：

1. **M8E 先於 M9I**：廠商橋接延後到 enforcement 落地之後。理由：0042~0044 的卡片本來就規定 bridge 不得自我授權；先有 gate parity，橋接的驗收才能直接引用 0047 的四入口證據，省一輪返工。
2. **0040 observability 吸收 conflict 事件**：0046 的 artifact 生成/消費事件納入 0040 的 event schema 需求，`broker-conflict-blocked` 命中率成為 SKL-0012 觀測指標之一。0040 依賴清單增加 `TASK-TEAM-0046`。
3. **SKL-0008/0009 與 0046/0048 並行但共用詞彙**：SKL 卡定義角色邊界與欄位 contract，TEAM 卡做 runtime 強制；兩邊都消費同一組 decisionClass / blocked reason 詞彙表，由 SKL-0010 manifest 收斂為單一來源。

## 5. 建議派工順序（取代 07-02 文件的順序，該文件不作廢、僅時序調整）

1. `TASK-TEAM-0046`（本計畫第一刀）
2. `TASK-SKL-0008`（可與 0046 並行：docs contract vs runtime code，路徑不相交）
3. `TASK-TEAM-0047`
4. `TASK-SKL-0009` ∥ `TASK-TEAM-0048`（共用 playbook 詞彙，merge 時後者引用前者）
5. `TASK-MAO-0059`（replay 收口 M8E）
6. `TASK-SKL-0010` → `TASK-TEAM-0040`（observability 接 artifact 事件）
7. `TASK-SKL-0011/0012` pilot 與觀測
8. M9I：`0042` / `0044` / `0043` → `0045` 收口
9. `TASK-TEAM-0026` Phase 1 handoff（維持原排程，不進本 lane）

Dispatch 紀律沿用既定 contract：Phase 0 read-only planner + Phase 1 external builder 雙代理拆分；AAF 嚴格 2-commit；forbidden_files 至少含 `C:/Users/User/3KLife/**`、`.atm/runtime/**`、`.atm/history/**`；每卡附 condition_review。

## 6. 隨行衛生項（不開新卡，收口時順手處理）

- 清除 stale lock `ATM-FRAMEWORK-TEMP-codex-team-broker`（走正式 lock release，不手改 runtime 檔——0604 事故教訓）。
- 修 `tasks/README.md` roster：多張已完成卡仍標 planned/draft；`TASK-TEAM-0028` 依 ledger 更正為 abandoned 或補記緣由。
- `TASK-RFT-0005` mailbox lane split 進行中，M8E 卡的 scopePaths 避開 `scripts/captain-dispatch-mailbox/**` 直到該卡關閉。

## 7. 驗收定義（M8E 完成 = 論文宣稱可展示）

M8E 全關後應能演示：兩個代理同時 claim 重疊 atom → 四個入口一致 `broker-conflict-blocked` → 跑 `tasks parallel resolve` 生成 `atm.brokerConflictResolution.v1` → 按 resolution order 放行 → replay benchmark 綠燈。這條鏈就是「原子交集並行調度」論文敘事的可重現證據。
## Follow-up: paid direct-provider execution repair (2026-07-11)

`TASK-TEAM-0066` live dogfood exposed three linked execution defects after the
Gemini direct bridge closeback: explicit global `real-agent` selection loses to
the implicit Coordinator `broker-only` default, built-in direct provider
contracts are rejected because readiness only recognizes integration manifest
capabilities, and `team start --execute` returns success when zero provider
roles execute. `TASK-TEAM-0067` owns the bounded repair and deterministic
regression before the paid OpenAI and Anthropic dogfood resumes.
