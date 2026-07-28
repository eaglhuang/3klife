---
doc_id: doc_atm_gov_auto_batch_perf_plan_v3
title: ATM 3.0 真平行治理一致性與收官計畫
status: active
family_dir: governance-optimization
owner: atm-core
predecessor: doc_atm_gov_auto_batch_perf_plan_v2
supersedes_open_acceptance_from: doc_atm_gov_auto_batch_perf_plan_v2
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
created_at: 2026-07-21T09:19:26+08:00
updated_at: 2026-07-24T00:00:00+08:00
createdByCommand: atm plan doc create
---

# ATM 3.0 真平行治理一致性與收官計畫

## 定位與決策

Plan 2.2 保留為歷史基線，停止新增工作。Plan 3.0 是唯一 active successor，只接管 2.2 未被真實證據滿足的驗收，以及 TASK-SKL-0014／0015 並行 dogfood 揭露的產品缺口。已驗證完成的 2.2 能力不重做；已關閉任務卡若與現場狀態矛盾，必須由 3.0 對帳、修復及重新驗證，不能引用舊 `done` 狀態跳過。

固定決策：

- 唯一正式票券模型仍為 `atm.brokerTicket.v1`，不得建立第二套 queue、BCR authorization 或平行任務模型。
- BCR、freeze、direction lock、queue view 都只能是 canonical ticket state 的可重建 projection 或不可變 receipt，不得各自持有可寫授權。
- helper、normalizer、scope inference 與 matcher 必須資料驅動；不得對 TASK-SKL-0014、TASK-SKL-0015、特定 actor、日期或三個歷史路徑寫控制流程特例。
- circuit breaker 預設開啟；安全、正確性或觀測門檻失敗即退回 `queue-only`。
- 歷史 0014／0015 可作 replay scenario 與證據標籤，但驗收引擎必須能接受任意兩張卡、任意 linked-surface graph 與任意共享資源集合。
- 不直接刪改 `.atm` runtime/history；舊 BCR 與 residue 僅能由正式 migrate/reconcile/cancel CLI 處理。
- 波次 B1 真平行施工開始前，所有缺少 canonical authority generation 與 dimension-preserving grant 的 legacy BCR 必須 fail closed 並回到正式 re-arbitration/ticket 路徑；不得刪改 sidecar，也不得用裸拒絕取代 ticket。
- 0226 census 開始前，所有 backlog finding 必須存在 canonical item shard；generated Markdown projection 不得是唯一資料來源。多卡 wave 開始前，protected governance state、runner-sync shared build 與 actor continuity 必須先通過 readiness gates。

## 問題陳述

0014／0015 的並行施工提供了高價值負向證據：broker 能找出三個 shared paths、建立三張 BCR、排定 serial release 並阻止未授權寫入；但整體仍不具線性一致性。

1. 三張 BCR 指定 0015 先發布，實際卻由 0014 先 delivery；兩卡關閉後 BCR 仍保留 `currentAllowedTaskId`，形成 stale authorization。
2. canonical ticket、queue、BCR、freeze 與 direction lock 是分離狀態來源，沒有同一個 CAS generation、transaction commit 或一致 reconcile。
3. 0015 的 scope amendment 不是因「範圍過大」，而是 linked/generated surface 未在 claim 前推導完成，直到 commit gate 才發現 `.agents/skills/atm-next/SKILL.md` 不在 direction lock。
4. runner-sync reservation 綁定過期 SHA 後，若同 task claim 仍 active，cleanup 會誤判健康；release 又要求不可能存在的 receipt，造成 queue-head deadlock。
5. runner-sync required command 使用不同 task-id normalizer，且缺少 temp claim 與 `--files` prerequisite，無法直接執行。
6. task import 的 fenced shell `#` 診斷曾錯誤；現有測試與 projection 已出現修復跡象，但 backlog 仍 Open，顯示 closeback reconciliation 也必須納入驗收。
7. `tasks import --reconcile-mirror` 曾回報成功但未修改 planning source；後續 `taskflow close` 要求 active claim，而終態任務又不可 claim，形成無合法 recovery 的循環。
8. 0014 closure packet 把其他並行 commit 的檔案納入 `targetCommitDelta`，使 changed-files、tree、parent、command-run 與 git-head evidence 全部不一致，直到 pre-push 才被 commit-range guard 攔下。
9. 既有 evidence 缺少可比較的 `waitedMs`、實際 overlap window、wakeup 次數、starvation 與 paired baseline，不能把負向 correctness 樣本誤稱為效能證明。
10. legacy BCR reader 將帶資源範圍的裁決壓縮成 foreign task-id set，claim admission 與 Git gate 因而可能把 file/path grant 放大成 task 級授權，錯誤抑制 atom CID 或其他維度的阻擋。
11. 歷史 evidence 曾出現 outer decision、`gateResults` 與 conflict detail 不一致；目前 source probe 已無法重現，但缺少 frozen/source 同源 closeback 與防回歸 counter。
12. circuit breaker 雖能退回 `queue-only`，既有門檻未量測非注入 trip 與 queue-only residency，可能在形式上安全、實際上長期序列化而仍被誤判完成。
13. 29 份現存 legacy BCR 都缺少 canonical `authorityGeneration`，但 reader 仍可把 `blockedTaskIds` 轉成 task 級授權；若等到 0233 才遷移，0228–0232 的自我 dogfood 會在已知不安全的授權路徑上執行。
14. legacy migration 若只有 apply 而沒有 immutable pre-migration receipt 與正式 rollback，revert code 後 runtime state 仍可能停在不可恢復的新格式。
15. replay 若可由 source/dev 入口單獨執行，可能重演 0206 的 source test 綠燈、frozen onefile 仍壞；驗收必須綁定 frozen launcher 與 runner digest。
16. overlap `> 0` 與 unresolved starvation `= 0` 目前只有存在性敘述；缺少預先 sealed 的 overlap/serialization 下限與 starvation threshold，就無法排除幾乎全序列化或人工判定。
17. 合成 replay 只能證明機制，不足以證明真實任務治理可用；最終 close 前還需要兩張未交付、故意保留交集的真實任務作 dogfood。
18. `ATM-BUG-2026-07-20-213` 至 `ATM-BUG-2026-07-21-218` 目前只有 generated Markdown rows、沒有 canonical item shards；下一次 projection rebuild 會讓 0014／0015 負向證據消失，0226 census 因而讀到錯誤基線。
19. 現行 `protected-ledger-destructive-guard` 實測仍為紅燈：tracked task-event deletion 未讓 task-scoped commit bundle fail closed。多卡 wave 中，一條 cleanup/commit lane 可能刪除另一張 live task 的 canonical ledger。
20. `taskflow close` 曾在 live ledger、target commit 與 planning closeback 都完成後仍回 `ATM_PLANNING_SOURCE_IDENTITY_DRIFT`；若 operator 依 failure 重試，會直接產生 duplicate side effect。
21. runner-sync queue-head actor 與 ambient editor identity 仍可能在 enqueue/build 間漂移；build command 若沒有 canonical actor manifest，五路 actor wave 會把合法 steward 誤判為 foreign actor。
22. backlog Open 不等於產品仍壞。current source discrimination 已證明 same-task evidence serialization、orphan imported-task claim、framework-temp admission 與 foreign dirty-owner probes 通過；這些項目需要 frozen parity/closeback，而非重複實作。

## 目標

- 讓一張 canonical ticket 成為 shared-write arbitration 的唯一 authority，並使所有 projection 可驗證、可重建、可撤銷。
- 在 claim/admission 前推導 linked surfaces，若施工中 scope graph 改變則自動 re-arbitrate，而非到 commit 才要求人工補 scope。
- 讓 stale SHA reservation 可在不偽造 receipt、不先釋放合法 task claim 的情況下 cancel、expire、coalesce 或 revalidate。
- 所有 recovery 以 `atm.commandManifest.v1` 的 `executable`、`argv[]`、`cwd`、allowlisted env、timeout 與 digest 表達，預設 `shell=false`。
- 以真多行程、獨立 actor、isolated proposal、共享 publish 重演 0014／0015 的故障形狀，證明零 stale authorization、零 silent overwrite、零 duplicate side effect、零 unresolved starvation。
- 在任何新 broker implementation 前先封存現行 frozen runner 的紅色鑑別力基線；同一 sealed scenario 必須在新版本轉綠。
- 以正式 frozen `node atm.mjs` 子行程完成 controlled replay 與真實交集任務 dogfood，並量測非零且達門檻的平行程度，而非只證明曾短暫重疊。
- 產出完整 window/watermark/sealed digest 與 paired queue-only 對照，才能關閉 3.0 及 2.2 的未完成驗收。
- 讓 backlog、task/event/evidence ledger 與 close transaction 本身先具備可重建、不可靜默刪除、可重試且 exactly-once 的證據基礎，避免用有 race 或假失敗的治理層驗證平行治理。

## 任務圖與執行順序



### Plan 3.1 SKL validator and test-case transition (2026-07-24)

Plan 3.1 remains executable while the SKL validator/test-case catalog initiative
is being built. It must not wait for a new runner merely to perform a correct
feature repair, but it also must not continue to copy broad repository commands
into every remaining card.

All still-planned Plan 3.1 cards therefore carry the compatible
`skl_validator_transition` frontmatter block. The block is descriptive and
auditable until `TASK-SKL-0029` installs the parser, selector, structured
execution receipt, and close gate. Existing listed validators remain mandatory
during the transition; the new block never weakens a current gate.

After the SKL gates are available, each transition block becomes executable:

- `causalImpactEdges` selects the direct behavior and integration seams that
  the card actually changes;
- `requiredTestCaseIds` are task-close evidence and must emit non-zero,
  candidate-bound execution receipts;
- `phaseTestCaseIds` are centralized batch/milestone/release obligations, not
  copied per-card broad validation;
- `testContributions` names a decentralized integration-group contribution
  that the feature card may design and add during its own TDD cycle;
- `advisoryTestCaseIds` can inform review but can never satisfy acceptance.

The canonical machine surface remains `scripts/test-catalog.config.json`,
evolved by SKL rather than replaced. No global sequential test-ID allocator or
parallel registry is permitted. The IDs already assigned to Plan 3.1 cards use
the deterministic `test_task_*` / `test_int_*` grammar from
`SKL-validator-governance-test-case-catalog-plan.md`; SKL must validate their
digest and group membership when it imports these cards.

The dependency policy is deliberately narrow. Implementation cards do not
hard-depend on unfinished SKL infrastructure, because that would turn a
validator migration into a delivery freeze. `ATM-GOV-0245`, the only final
Plan 3.1 verdict, does depend on `TASK-SKL-0029` and `TASK-SKL-0030`: it cannot
claim autonomous, fast, causally selected validation until the contracts are
enforced and replayed against historical evidence. Until then its verdict is
`inconclusive`, never a manual waiver.

Ledger coordination is also explicit: `ATM-GOV-0237`, `ATM-GOV-0238`, and
`ATM-GOV-0258` already have imported target ledgers. Their source-card seals
are now intentionally stale because this transition contract changed. Before
any of those cards is claimed, an authorized owner must reseal it by official
force re-import; no worker may bypass the drift or hand-edit ledger state.
Every other still-planned card remains source-only and can be imported normally
when its dispatch wave opens. No source card may receive this transition update
after it has an active claim; later changes require a bounded amendment card.

| Planned card family | Task-close cases | Centralized phase cases | Contribution owner |
|---|---|---|---|
| 0237/0238/0242 | actor-local dashboard behavior | two-card safe-compose replay | 0242 orchestrator |
| 0240/0243/0244/0245/0246 | harness, rollback, dashboard behavior | red-green, AB/BA, final verdict | 0242/0243/0245 |
| 0248/0252/0253 | proposal, closure, durability behavior | authority/closeback integration | 0253 saga |
| 0258/0259/0261/0263 | commit queue, write ticket, candidate, recovery behavior | governance integration groups | respective feature card |

### Plan 3.1 commit-candidate isolation clarification (2026-07-23)

Pathspec-based precise commit is not an ATM core capability. It is a useful Git adapter primitive and an emergency repair technique, but ATM must not depend on Git's index or pathspec semantics as its concurrency model.

Plan 3.1 final verification therefore gains a hard dependency on `ATM-GOV-0261`:

- ATM core must own a VCS-neutral commit-candidate envelope with actor, task/lane, base seal, allowed resource keys, candidate payload digests, evidence refs, validation plan, and adapter target.
- The shared-write broker/steward must admit, queue, compose, revalidate, or reject commit candidates before any repository adapter writes.
- The local Git adapter may use pathspec/`--only` only after ATM has admitted the candidate; adapter evidence must prove the persisted commit contains exactly the admitted candidate plus allowed provenance.
- Direct native pathspec or `--no-verify` commits remain emergency/anomaly repair evidence and must not count as autonomous parallel-delivery success.
- The final Plan 3.1 verdict must report normal candidate count, Git-adapter pathspec count, emergency pathspec count, false-block count, and unrelated-index-residue isolation count. If normal delivery still requires direct native pathspec, Plan 3.1 fails and the gap rolls into Plan 3.2.

## 2026-07-24 execution-wave clarification

The deep-module hardening update defined the dependency graph correctly, but the
captain side also needs an execution rule: the next waves should maximize
capability unlock while minimizing repeated broker collisions and captain
supervision overhead.

The preferred remaining order is:

1. `TASK-SKL-0028` in parallel with `TASK-LANE-0022`
2. `ATM-GOV-0265` in parallel with `TASK-SKL-0023` and `TASK-SKL-0024`
3. `TASK-SKL-0025` in parallel with `TASK-SKL-0026`
4. `TASK-SKL-0029` in parallel with `ATM-GOV-0246`
5. `ATM-GOV-0242` -> `ATM-GOV-0243` -> `ATM-GOV-0244` -> `ATM-GOV-0245`
6. `TASK-SKL-0030` as the SKL historical verdict before or alongside the final
   Plan 3.1 verdict, never as an implementation prerequisite

Why this is now the preferred wave order:

- `TASK-SKL-0028` has the highest captain-productivity leverage per unit time:
  it reduces future skill projection, ignore-state, dispatch, and canary drift
  across all captains.
- `TASK-LANE-0022` is the next hard Plan 3.1 blocker. Mutation capability
  replay and WIP continuity must be repaired before finalization/publication
  work can claim autonomy.
- `ATM-GOV-0265` must wait for `TASK-LANE-0022`, but it does not need to wait
  for the entire SKL line.
- `TASK-SKL-0029` is deliberately late. Starting it before `0025 + 0026 + 0028`
  only creates churn and partial contracts.

### Captain fit guidance

| Work shape | Preferred captain |
|---|---|
| deep runtime governance, lane authority, finalization/publication, verdict synthesis | Claude |
| skill corpus, canary rewrites, validator catalog, projection/compiler work | Cursor |
| planning repair, dependency correction, deep-module review framing, cross-plan sequencing | Codex captain |

### Cohesion-first dispatch rule

Execution order also follows the authoring rule tightened by the SKL work:

- keep one card equal to one complete capability seam;
- do not split essential deliverables into another card merely to bypass local
  ignore rules, staging friction, adapter quirks, or projection tooling gaps;
- if tooling is the blocker, fix the admission/compiler/projection path or add
  a named tooling follow-up without changing the semantic meaning of the
  original card.

## Plan 3.1 證據可信度與 compose-first 修復補充（2026-07-22）

### 補充定位

Plan 3.1 不是另一套產品或任務模型，而是 Plan 3.0 的後續驗收補充。它不重做已完成的 intent、proposal、adapter、transactional composer、steward writer、ticket policy 與 shared-delivery 實作；它修復的是「測試沒有真正走過這些協定，卻因 receipt 形狀存在而被視為已證明」的驗收漏洞。`ATM-GOV-0239` 至 `ATM-GOV-0263` 都沿用既有 GOV family，並作為 0234／0235 歷史交付後的 continuation repair lineage，不建立新的 task series 或 evidence authority。

本次事故的因果、反證、Five Whys 與組織學習收官門檻記錄於 [Plan 3.0 假綠燈收官 Lessons Learned](plan-3-0-false-green-lessons-learned-2026-07-22.md)。該文件判定治理機制、可執行驗收契約與 AI 執行行為共同造成偏差；Plan 3.1 的目標不是要求隊長靠記憶避免重犯，而是讓缺少真實語意證據的 closure 在系統上只能 `inconclusive`／`remain-open`。

跨隊長實作請以 [Plan 3.1 Captain Handoff](ATM-GOV-3.1-captain-handoff-2026-07-22.md) 的 dependency-gated dispatch waves 為操作入口；該 handoff 只投影本計畫與 source cards 的依賴，不另建 task lifecycle 或 closure authority。

2026-07-22 dogfood 仲裁新增 `ATM-BUG-2026-07-22-229`：`tasks release` 不得在任務仍有 in-scope source dirty WIP 時把 claim 釋放成 ownerless 工作區狀態。Plan 3.1 不採用 stash 或 temp worktree 作為主路徑；MVP 收斂為 fail-close recovery：完成並 close、broker-managed governed non-delivery WIP commit 後 release、或明確 discard receipt 後 release。WIP commit 必須明確標記為不可 close／不可 release／不可滿足 evidence，且不能被 delivery-grade full typecheck/pre-commit gate 擋死；它仍須保留 scope、actor、index isolation、protected-state 與 line-budget/split 防護。`ATM-GOV-0258` 必須把此 recovery 納入 transactional commit queue 驗收；`ATM-GOV-0245` 在 229 仍無 command-backed 證據前不得給出 global close verdict。

2026-07-22 Antigravity/Gemini 3.6 dogfood 再揭露 `ATM-GOV-0259`：ATM 目前主要在 commit／close 階段治理 scope，無法在 AI 寫檔前阻止或導引 out-of-scope 意圖；因此外部隊長可先手改 `.atm/history/**` 或修改卡外 source，之後才由總隊長人工辨識。Plan 3.1 新增 write-ticket/editor guard 與 scope amendment workflow：scope 外寫入不是立即定罪，而是先回 `ATM_WRITE_SCOPE_AMENDMENT_REQUIRED`；若已寫入則記為 `ATM_WRITE_SCOPE_UNATTACHED_WIP` 並要求 scope-amend-and-attach、non-delivery WIP commit、discard receipt 或 split-to-new-task；只有繞過這些路徑仍要 commit/close/push 才升級為 `ATM_WRITE_TICKET_SCOPE_VIOLATION`。0259 完成前，Plan 3.1 不得宣稱已具備 autonomous high-coupling parallel development；final verdict 必須消耗 0259 的 command-backed replay evidence，包含 wrong actor id、malformed scope amendment path、direct `.atm/history/**` mutation、out-of-scope dirty source WIP 與 deterministic recovery，並統計 manual captain interventions、false blocks、post-write detections 與 true write-ticket violations。

2026-07-22 0258 retry 又揭露 `ATM-GOV-0260`：即使 Gemini 3.6 依派工單只 stage 九個 keep-list 檔案、focused validators 全綠，且 `git-governance/implementation.ts` 已由 Codex 總隊長收斂為 `1 insertion / 1 deletion` 的 minimal semantic patch，governed commit 仍回 `ATM_GIT_COMMIT_FAILED`；nested attempt 才顯示 `ATM_TOUCHED_PHYSICAL_LINE_BUDGET_BLOCKED`。根因不是 0258 patch 過大，而是 line-budget gate 把未 staged 的其他 dirty WIP／formatter residue 也算進此次 commit candidate。這會讓單一 canonical worktree 的正常並行場景中，另一隊長留下的未提交 WIP 擋死本隊長的小型精準提交。Plan 3.1 因此新增 0260：commit line-budget 必須以 staged candidate 或 ATM 明確 commit candidate set 為基準；whole-worktree dirty 只能走 foreign-WIP／unattached-WIP gate，不得膨脹 delivery candidate 的物理行數。0260 也必須讓 `ATM_GIT_COMMIT_FAILED` 在 top-level JSON surface nested root cause、attempt path、numstat／affected files 與可執行 recovery，並為 `ATM_GIT_COMMIT_FAILED`、`ATM_TOUCHED_PHYSICAL_LINE_BUDGET_BLOCKED`（以及若新增的 candidate-specific code）建立 exact registry entries。0260 是 0258 retry 的 unblocker，不能硬依賴 0258 done；0259 消耗 0260 evidence 做 write-ticket/final-verdict 判定，但也不是 0260 claim prerequisite。0260 未完成前，0258 不得被要求清理 Cursor 0257 WIP 或 unrelated receipt residue 才能重試 delivery commit，Plan 3.1 final verdict 也不得把「高耦合治理可自主 commit」列為通過。

2026-07-23 追加確認：`atm.dev.mjs tasks release --wip-commit` 雖能讀到 0258 新增的 source command option，但內層 Git pre-commit hook 仍執行 frozen `atm.mjs hook pre-commit`，因此舊 hook 沒有 `ATM_COMMIT_WIP=1` 旁路與 candidate-scoped line-budget policy，WIP park 再次被 `ATM_TOUCHED_PHYSICAL_LINE_BUDGET_BLOCKED` 擋下。0260 驗收因此擴充到 hook path：source-first recovery 不能被 stale frozen hook 重新套用 whole-worktree line-budget；WIP commit 與 delivery commit 都必須在 hook／wrapper 層使用一致的 candidate-scoped policy 或明確 WIP bypass。
2026-07-22 codebase 對帳確認，`WriteIntent` 已能攜帶 atom、content anchor 與 source range；同一物理檔案會先由 proposal overlap、format adapter、mutation batch planner 與 transactional composer 判斷是否可交換／可序列化。可合併的同檔案 proposals 進入同一 compose batch，由 neutral steward 一次落到 canonical worktree 並以 shared delivery receipt 歸屬給所有成員；只有真正的 CID／anchor／range 衝突、stale base／CAS、無法解析的格式或 fairness bound 才退回 revalidation、steward escalation 或 queue。因此「同檔案必然 queue」不是 Plan 3.1 的前提，也不能成為驗收答案。

本補充新增四個架構判準：刻意保留交集卻得到 `not-required` 屬於 `INV-ATM-008`；控制流程硬編碼 actor、task、path、日期、delay 或 cost 屬於 `INV-ATM-009`；正常平行開發以單一 canonical worktree 與邏輯 intent 隔離為基底、不得以 Git branch/worktree 當並行治理機制，另立 `INV-ATM-010`；evidence producer 與 closure oracle 必須分離，最終 verdict 從 canonical sources 重建，禁止呼叫端注入健康值。`INV-ATM-010` 新增而不併入 008，因 008 定義仲裁結果，010 定義仲裁成立所需的執行基底，兩者必須保持低耦合。

版本控制系統只透過 repository adapter 進入 ATM delivery boundary，但 adapter 的 mutation surface 仍是 Tier-2 shared-write。ATM 必須先以 VCS-neutral commit-candidate envelope 完成 broker/steward admission、queue/compose/revalidation 與 evidence sealing，Git adapter 才能操作 index/staging/pathspec、建立單一 commit 並核對 HEAD/CAS；Git index 不是 ATM ownership 的真相來源。AI worker 不得建立、切換或合併 branch/worktree 來隔離正常任務；緊急復原、歷史唯讀鑑別與非開發性的 sealed packaging 只能走封閉例外並留下具名 receipt。

2026-07-22 steward enforcement audit 進一步確認：composer、steward apply 與 real shared-delivery commit executor 各自存在，但目前尚未形成不可繞過的同一條 provenance chain。pre-commit 對「提交者本身也是 shared file claim owner」的 multi-claim staged mutation 仍會放行；`broker batch execute --surface commit --apply` 也能根據呼叫端提供的 task/file slices 建立 shared commit，卻不要求該 staged blob 必須等於 transactional composer 的 output、也不要求有效的 steward-apply receipt。另一方面，現行 `applyStewardPlan` 逐 proposal 寫檔，同一檔案可能被寫入多次，尚未證明「兩 proposal 先在記憶體 compose，再由 steward 對每個 output file 單次落盤」。因此 Plan 3.1 新增 0249／0250；在兩卡完成前，「steward 唯一 writer」只能視為契約宣告，不能作為 dogfood 或論文證據。

同日 post-compose audit 再確認一個獨立缺口：現有 patch overlap／serializability proof 只證明 proposal 可依某個合法順序組合，不證明組合後仍能通過型別、import、schema 或 targeted behavior。現有 transactional composer 雖攜帶 `validatorRefs`，但不執行 validator；TypeScript shared surface 也不能假設一定走 text-range adapter。因此 Plan 3.1 新增 `TASK-ERR-0006` 與 `ATM-GOV-0254`，在 compose 與 steward 之間建立 workload-neutral 的 candidate materialization + semantic-validation gate。此閘門重用 task/proposal validator、language adapter 與 test catalog，不在 core 硬編碼語言、路徑或測試名稱；任何 failed／unavailable validation 都必須在 canonical write 前 fail closed。

Fresh closure review 補上四個橫切條件。第一，凡 safety／governance runtime gate 會由 frozen `node atm.mjs` 對外執行，owning card 必須在 close 前持有自己的 source/frozen behavior-parity receipt；runner-sync build 可以跨卡共享，但 parity attribution 不可延後由 0244 一次補做。第二，cross-authority durability 由 sealed authority manifest 宣告 local commit 與 remote visibility 條件；需要 remote 的 authority 在 exact SHA 可由 declared remote/ref 到達前只能 `closeback-pending`。第三，two-key verifier 採風險分層：per-card predicate 可用 locked-policy 或真正無 producer write scope 的 separate actor，Plan-global verdict 則強制 pre-sealed locked-policy，不能用另一位同目標 actor 的簽署取代。第四，validator policy 必須先於 locked negative-control payload reveal 封存，事後修改 oracle 直接使 cell 無效。這些規則都是 capability／risk metadata，不在控制流程列舉 host、task 或 provider 特例。

### 2026-07-23 全 backlog 盤點與插單裁決

本輪掃描 canonical item shards 共 319 筆，其中 116 筆尚非 terminal。Plan 3.1 只吸收會改變高耦合並行正確性、自主完成率或最終證據可信度的缺口；已有 TEAM／RFT／SKL owner、一般 UI／文件改善、或與 N=2 canonical-worktree 證明無直接因果的項目不重複開 GOV 卡。

- **立即插單**：`ATM-GOV-0262` 消費 `ATM-BUG-2026-07-20-213`，統一所有 Broker overlap call sites；完成前 0239 與真 dogfood 不可信。`ATM-GOV-0263` 消費 `ATM-BUG-2026-07-20-206`、`ATM-BUG-2026-07-21-219`、`ATM-BUG-2026-07-22-227`、`ATM-BUG-2026-07-22-237`，保證 batch 能略過終態卡、所有 emitted command 可執行、正確任務卡可自行走到下一安全點。
- **既有卡直接吸收**：0241 吸收 evidence journal／observed telemetry／obligation seal（07-19-018、027、036、044）；0252／0253 吸收 close dry-run/write parity、跨任務 stale residue、planning-source/CAS 與 commit-bundle exactly-once（07-11-098、07-12-119、126、162、163）；0256 吸收 runner frozen/source、Windows manifest、post-close receipt/source recovery（07-14-183、07-20-212、07-21-220、07-22-225、234）；0257 吸收 identity provenance/emergency author continuity（07-12-115、07-22-226、236）；0258／0261 吸收 unified index/steward、post-close artifacts、receipt residue、path-bounded candidate isolation（07-12-134、07-15-202、205、07-16-013、07-18-005、07-19-001、020、023、07-20-211、07-21-221、07-22-228、229、235）；0259 吸收 glob/CSV/scope amendment/write spillover（07-16-005、007、012、07-19-005、038、07-22-231、232）；0260 吸收 wrapper/hook parity、nested failure 與 stale frozen-hook bootstrap（07-13-162、07-22-230、233）。
- **只做 terminal disposition，不重做**：已有 0218／ERR／TEAM／SKL owner 的 07-20-214、215、07-21-217、218，以及已由其他 family 承接的 provider、巨檔 refactor、一般 planning UX 項目，只由 0244/0245 驗證 owner、evidence 與 non-blocking rationale。
- **排序規則**：先收 0260；再依共享面完成 0257 → 0256 → 0258 → 0259 → 0261；0262 可在不重疊時並行但必須早於 0239；0263 等 0257/0261 後完成。之後才允許 0239、0240/0241、0252/0253/0254/0250、0246、0242/0243、0244、0245。任何被標示「既有卡吸收」的 backlog 若 owning card close 時仍無 command-backed disposition，立即停下補 scope 或開 Plan3.2 follow-up，不得由 0245 忽略。

### 2026-07-24 canonical Broker Admission Facade 補強

0261 完成後的實測證明 VCS-neutral candidate isolation 是必要條件，但
仍不足以讓高耦合 claim 自動並行。ATM-GOV-0263 與 TASK-SKL-0022 沒有
shared path，卻因同屬 `atom-cli-router` 在 bounded proposal comparison
之前被 freeze。Codebase audit 顯示七層 conflict matrix 仍存在，但最終
判決分散在 core decision、proposal overlap、claim parallel preflight、
claim admission 與 conflict log；其中 atom-id 分支可在沒有 material
shared-write surface 時先行阻擋，而 claim preflight 又會重新推導自己的
Broker verdict。這是決策 locality 與 caller parity 缺口，不是七層模型
本身缺失。

新增 `TASK-LANE-0021` 與 `ATM-GOV-0264`。0021 先補 lane capability
secrecy 與 borrowed actor hard gate，確保總隊長不能只靠 `--actor`
字串執行 worker lane 的 close/commit/runner-sync，也不能從普通報告讀到
可重放票據。0264 再以 TASK-SKL-0027 的 replaceable deep-module
provider 先產生 sealed architecture review，再建立單一 canonical Broker
Admission Facade。七層檢查、bounded proposal、compose、queue、
revalidation、ticket、recovery manifest 與 metrics 全部藏在該 module
後面；CLI/core callers 只正規化輸入與消費同一 sealed decision，不得
自行把 atom/CID match 升格成 freeze。0021 與 0264 未完成前，
0246/0242/0245 不得把 same-atom 平行開發或 captain-mediated closeout
列為 autonomous success。

### 主要差異流程卡

```mermaid
flowchart TD
    A["Plan 3.0 假綠燈<br/>候選卡 + command-shaped receipts"] --> P["ATM-GOV-0247<br/>INV-ATM-010：單一 canonical worktree"]
    A --> EP["ATM-GOV-0251<br/>acceptance predicates + realness taxonomy"]
    EP --> EG["TASK-ERR-0005<br/>evidence/verification/closeback codes"]
    P --> W["ATM-GOV-0248<br/>非 Git bounded proposal workspace"]
    P --> TA["ATM-GOV-0249<br/>transactional candidate + steward 單次落盤 seam"]
    TA --> TQ["ATM-GOV-0258<br/>transactional stage/commit queue + WIP recovery"]
    TQ --> WT["ATM-GOV-0259<br/>write-ticket + scope amendment guard"]
    RC["ATM-GOV-0260<br/>candidate-scoped line budget + nested recovery"] --> CI["ATM-GOV-0261<br/>VCS-neutral commit-candidate isolation"]
    TQ --> CI
    WT --> CI
    BR["ATM-GOV-0262<br/>canonical overlap matcher parity"] --> C
    CI --> AR["ATM-GOV-0263<br/>autonomous continuation + executable recovery"]
    AR --> LG["TASK-LANE-0021<br/>capability secrecy + proxy gate"]
    AR --> AF["TASK-SKL-0027 → ATM-GOV-0264<br/>Deep Module review + canonical admission facade"]
    LG --> AF
    E --> SE["TASK-ERR-0006<br/>semantic validation exact codes"]
    TA --> SV["ATM-GOV-0254<br/>candidate 物化 + post-compose semantic validation"]
    SE --> SV
    SV --> WG["ATM-GOV-0250<br/>direct-write fail-closed + receipt-bound shared commit"]
    P --> C["ATM-GOV-0239<br/>假綠燈先 fail closed"]
    EP --> C
    C --> VG["ATM-GOV-0252<br/>two-key independent closure gate"]
    EG --> VG
    C --> D["ATM-GOV-0240<br/>同 scenario：舊 runner 紅／新 runner 綠"]
    C --> E["ATM-GOV-0241<br/>事件推導 intent、compose、steward 與 fallback"]
    W --> L["ATM-GOV-0246<br/>sealed manifest + 唯讀儀表"]
    WG --> L
    D --> L
    E --> L
    L --> CA["Codex／ATM-GOV-0237<br/>同檔案邏輯區域 A proposal"]
    L --> CL["Claude／ATM-GOV-0238<br/>同檔案邏輯區域 B proposal"]
    CA --> B{"Broker + adapter<br/>可合併且可序列化？"}
    CL --> B
    B -->|"是：主成功路徑"| M["transactional compose batch<br/>兩 proposal 同批"]
    M --> V{"exact candidate<br/>語意 validator 全通過？"}
    V -->|"是"| S["neutral steward 唯一落盤<br/>一個 shared commit、完整 member attribution"]
    V -->|"否／不可用"| J
    B -->|"否：真衝突／stale"| Q["queue 或 revalidate<br/>條件解除後 automatic wakeup"]
    S --> F["ATM-GOV-0242<br/>兩張真卡 close + fallback cell receipt"]
    Q --> F
    L --> G["ATM-GOV-0243<br/>compose-first 對 queue-only 的 matched AB/BA"]
    CI --> F
    CI --> G
    AF --> F
    F --> H["ATM-GOV-0244<br/>backlog、rollback、parity、breaker"]
    G --> H
    VG --> XS["ATM-GOV-0253<br/>cross-authority closeback saga"]
    H --> I{"ATM-GOV-0245<br/>canonical evidence verdict"}
    XS --> I
    I -->|"任一缺件"| J["remain-open + queue-only"]
    I -->|"全部成立"| K["Plan 3.1 close<br/>才可宣稱正確性與效能結論"]
```

### 2026-07-25 Deep Module 核心模組 hardening 與依賴去重

本節是尚未開工卡的最新排程權威；若較早段落列出更長的依賴清單，
以本節與各任務卡 frontmatter 為準。規劃採 `to-tickets` 的
cohesion-first 原則：一張卡交付可用的完整能力，只有真正的因果
blocker 才形成 hard dependency；回歸樣本、歷史證據與可平行輸入用
soft relation／acceptance 引用，不重複成排程邊。

Deep Module 掃描確認五個優先主題：

1. **Lane mutation authority + WIP continuity（P0 security）**：
   `TASK-LANE-0022` 一次完成 protected mutation capability call-site
   parity、single-use proxy、防 secret 洩漏，以及 release/handoff/reclaim
   的 WIP ownership journal。它只依賴 `TASK-LANE-0021`。
2. **Shared mutation finalization + sealed runner publication（P0
   liveness）**：`ATM-GOV-0265` 內含兩個清楚的 deep modules，但作為
   一張 end-to-end 卡交付：branch commit coordinator 與 runner
   publication lifecycle。它只依賴 `TASK-LANE-0022`，並鎖定 orphan
   branch lock、post-close framework-temp hygiene、receipt residue 與
   release surface dirty 等反例。
3. **Cross-authority close saga（P0 consistency）**：不開新卡，直接由
   `ATM-GOV-0253` 擴充為 `executeTaskCloseSaga` 的唯一 close plan；
   dry-run/write/backend/reconcile 只保留薄 adapter。
4. **Validation contract（P1 correctness/efficiency）**：不開新卡，由
   `TASK-SKL-0026` 定義純 `evaluateValidationContract`，再由
   `TASK-SKL-0029` 接入 evidence/pre-close/pre-push。每卡只跑直接
   causal impact 與指定 integration case IDs；更廣 suite 由 batch、
   milestone、plan verdict、release phase owner 執行。
5. **Skill corpus projection（P1 maintainability）**：不重開已 done 的
   0019；由 `TASK-SKL-0028` 補上 sealed source snapshot 與
   `compileSkillCorpus` projection contract，鎖定 0027 ignored-template
   反例。

所有上述重構卡在設計前必須實際呼叫
`atm-deep-module-refactor`，封存 interface、ports、state ownership、
adapter inventory、deletion test 與 review fingerprint。Skill 是可替換
review provider，不是驗收替代品；任務仍須以卡片 validators 與
command-backed evidence close。

```mermaid
flowchart LR
    L21["TASK-LANE-0021 done"] --> L22["TASK-LANE-0022<br/>mutation capability + WIP continuity"]
    L22 --> G265["ATM-GOV-0265<br/>branch finalization + sealed runner publication"]

    S23["SKL-0023"] --> S26["SKL-0026<br/>validation contract"]
    S24["SKL-0024"] --> S26
    S26 --> S29["SKL-0029<br/>lifecycle integration"]
    S28["SKL-0028<br/>corpus projection + canaries"] --> S29

    C252["ATM-GOV-0252"] --> C253["ATM-GOV-0253<br/>single close saga"]
    E5["TASK-ERR-0005"] --> C253

    G265 --> D246["ATM-GOV-0246<br/>sealed readiness dashboard"]
    C253 -. "可平行實作；避免同時修改 taskflow" .- G265
    D246 --> D242["ATM-GOV-0242<br/>N=2 real dogfood"]
    D242 --> D243["ATM-GOV-0243<br/>matched AB/BA"]
    D243 --> D244["ATM-GOV-0244<br/>rollback/backlog"]
    D244 --> D245["ATM-GOV-0245<br/>final verdict"]
    C253 --> D245
    G265 --> D245
    S29 --> D245
```

排程規則：

- Wave A 可平行：`TASK-LANE-0022` 與 SKL 0023/0024/0026 路線。
- Wave B：`ATM-GOV-0265` 與 SKL 0028 可平行；0253 在其既有依賴完成
  後可實作，但因與 0265 共享 taskflow seam，不安排兩者同時寫入。
- Wave C：0246 只在 0265 及既有 canonical admission/semantic gates
  都完成後開始；0242 只直接依賴 0246、0240、0241，不重複列出 0246
  已封存的 lane/admission/publication 依賴。
- Wave D：0243 → 0244 → 0245。0245 hard dependencies 只保留 immediate
  phase gates；所有較早卡仍由 canonical evidence discovery fail-closed
  驗證，不以大量 frontmatter edges 維持正確性。
- 任何卡若因本機 ignore、staging、scope 或 adapter 工具問題受阻，
  先修 governed admission 或 amendment；不得把原卡 essential
  deliverable 拆到新微型卡。

### 後續派工波次與可平行流程

```mermaid
flowchart LR
    S0["現場收斂<br/>0260 close、0017 等待"] --> W1
    subgraph W1["Wave 1：可平行前置"]
      A1["0257<br/>actor continuity"]
      A2["0262<br/>overlap matcher parity"]
      A3["0251／0247<br/>已完成則只讀取證據"]
    end
    A1 --> A4["0256<br/>sealed runner freshness"]
    A4 --> A5["0258<br/>transactional commit + WIP recovery"]
    A5 --> A6["0259<br/>write ticket + scope amendment"]
    A6 --> A7["0261<br/>VCS-neutral candidate isolation"]
    A7 --> A8["0263<br/>autonomous continuation"]
    A8 --> A8b["TASK-LANE-0021<br/>borrowed actor hard gate"]
    A8 --> A9["SKL-0027 → 0264<br/>Deep Module review／canonical admission"]
    A8b --> A9
    A2 --> B1["0239<br/>closure truth"]
    A9 --> B2
    B1 --> B2
    subgraph B2["Wave 2：可平行證據／closure 基礎"]
      B21["0240<br/>frozen red-green"]
      B22["0241<br/>event/telemetry receipts"]
      B23["0252 → 0253<br/>acceptance gate／closeback saga"]
      B24["0248／0254／0250<br/>proposal → semantic gate → receipt-bound write"]
    end
    B21 --> C1["0246<br/>sealed dashboard preflight"]
    B22 --> C1
    B23 --> C1
    B24 --> C1
    C1 --> D1["0242<br/>雙卡真 dogfood"]
    D1 --> D2["0243<br/>matched AB/BA + A/A"]
    D2 --> D3["0244<br/>backlog/parity/rollback"]
    D3 --> D4["0245<br/>final verdict"]
```

Wave 內只有 target scope 無重疊、Broker 回 execute/compose ticket 且沒有 foreign dirty ownership 時可同時派工；共享 `runner-sync`、Git adapter、closure packet、projection/release surface 仍由 ticket/steward 排序。等待中的隊長只收到一句等待指示，不反覆消耗 token。任一卡出現 task-card contract 錯誤、無 recoveryCommand 的安全 blocker、或需要新增共享 scope，先回寫 backlog／amend card，再恢復該 wave。

| 面向 | Plan 3.0 現行弱證據 | Plan 3.1 修正目標 |
|---|---|---|
| 執行基底 | 多個 worker label，或用獨立 worktree 物理隔離 | 兩個 actor／OS process 共用同一 canonical worktree、base 與 HEAD；worker 只產 bounded proposals |
| 同檔案交集 | 交集一律被想像成 queue | 以 atom／anchor／range 與 format adapter 判定；安全交集 compose-first，真衝突才 fallback |
| Dogfood | 只執行 decision，後續 lifecycle 為附加文字 | 兩張 registered cards 真 claim、ticket、proposal、batch compose、steward apply、shared commit、validator、close |
| Queue 證據 | 要求主成功路徑至少 queue 一次 | 主 safe-compose cell 應可 `waitedMs = 0`；另以 sealed conflict/stale cell 證明 queue、revalidation 與 wakeup |
| Admission | `not-required` 仍被算為 parallel | execute／batch／queue 只能由 canonical ticket event 推導；同檔安全 cell 預期 batch／compose |
| Correctness | 未提供 counter 就補 0 | 從事件、serializability proof、member attribution、file digest 與 side-effect journal 推導 |
| Performance | arm-specific sleep 與固定 cost | 相同 workload/base/build 的 compose-first 與 policy-generated queue-only，AB/BA 各至少 3 repeats |
| Git 邊界 | branch/worktree 可能被誤當 task isolation | Git 只承接 steward 後的共享 delivery；正常治理不依賴 AI Git 拓樸操作 |
| Direct-write 防繞道 | multi-claim shared file 可由其中一個 claim owner 直接 stage/commit | shared staged blob 必須帶可驗證的 composition + steward-apply provenance；缺件、偽造、stale 或 digest 不符一律 fail closed |
| Steward 寫入 | steward 可逐 proposal 套 patch，但未證明同檔只落盤一次 | transactional composer 先產生 bounded output；steward 以 CAS 驗證後，每個 output file 單次原子替換，再交 shared-delivery commit |
| Compose 後語意 | range／anchor 不衝突或 serializable 即可能被視為安全；validator refs 可存在但未執行 | exact candidate 在 steward 前執行 sealed validator union；failed/unavailable 都是零 canonical write，serializability 不可替代語意正確性 |
| 驗收證據 | 自然語言 acceptance + command／receipt 形狀 | machine-readable predicate 指定 authority、derivation、realness、negative control、verifier 與 missing-data verdict |
| 關閉權限 | producer 可同時產生健康值並呼叫 final helper | closure-critical claim 需要 pre-sealed locked policy 或無 producer write scope 的 separate actor 第二把鑰匙 |
| 跨 repo 收官 | target `done`、planning `planned`／Plan `active` 可同時存在 | durable two-phase saga；兩個 authority receipt 都完成前只允許 `closeback-pending` |
| Final verdict | 呼叫端傳入空 backlog 與理想 boolean | verifier 自動讀取 ledger、tickets、compose、delivery、backlog、rollback、parity 與 breaker evidence |

### Plan 3.1 任務圖

| 波次 | 任務卡 | 依賴 | 交付重點 |
|---|---|---|---|
| R0A | `ATM-GOV-0247` | 無 | 新增 `INV-ATM-010` 與純資料驅動 topology policy；定義 canonical worktree、邏輯 intent 與 Git 外層邊界。 |
| R0B | `ATM-GOV-0248` | 0247 | 將 Team 的 detached-worktree provider 改為 bounded、non-Git proposal workspace，直接重用既有 composer/steward。 |
| R0C | `ATM-GOV-0249` | 0247 | 將 transactional composer output 接到 neutral steward；同一 compose batch 的每個 output file 只允許一次 CAS-guarded canonical write。 |
| R0D | `TASK-ERR-0004` | 0249 | 註冊 steward receipt 缺失與無效兩個 exact ErrorCode，固定 retry／recovery contract，避免 hook、ATM Git 與 broker commit 各自發明錯誤語意。 |
| R0E | `ATM-GOV-0250` | 0249、ERR-0004 | 建立 receipt-bound shared-write admission；multi-claim shared staged mutation 無有效 composition/steward provenance 時 fail closed，shared commit 只能承接 exact steward output。 |
| R0F | `ATM-GOV-0251` | 無 | 定義可重用的 machine-readable acceptance predicates 與 closed realness taxonomy；missing evidence 固定為 inconclusive。 |
| R0G | `TASK-ERR-0005` | 0251 | 註冊 semantic evidence、independent verifier 與 cross-authority pending 三個 exact ErrorCode/recovery contracts。 |
| R0H | `ATM-GOV-0255` | 0227、0233、0247 | 使 `team broker resolve` 產生的 BCR 與 claim admission 消費的 authority/ticket contract 完全一致，並以命令到重試的紅綠證據證明可解凍。 |
| R0I | `ATM-GOV-0256` | 0230、0231 | 將 runner-sync ticket、cache key、receipt 與 release 綁定同一 immutable source snapshot；禁止舊 HEAD cache hit 偽裝完成新 source sync。 |
| R0J | `ATM-GOV-0257` | 0231 | 保持 Captain actor 在 next／claim／Broker／runner-sync／closeout 的 authority continuity；legacy editor identity 只能作 provenance，不能靜默換人。 |
| R0K | `ATM-GOV-0258` | 0231、0249、0250、0256、0257；closes `ATM-BUG-2026-07-22-228`、`ATM-BUG-2026-07-22-229` | 建立 broker-managed transactional stage/commit queue；多 actor 只提交 scoped commit request，由 ATM 排序、stage、commit、清 index 並回傳證據；post-close release artifacts、backlog/projection commit，以及 dirty-release non-delivery WIP commit/discard recovery 不再靠人類逐步指導。 |
| R0L | `ATM-GOV-0259` | 0247、0250、0258 | 建立 write-ticket/editor guard 與 scope amendment workflow；AI 寫檔前先以 ticket 驗 scope，scope 外合法需求導向 amendment，已寫出的卡外 WIP 被記錄為 unattached WIP 並提供 recovery，Antigravity/Gemini 3.6 手改 `.atm/history` 與卡外 source 的反例必須在下次被提早警告與記錄。 |
| R0M | `ATM-GOV-0260` | 0255 | 讓 line-budget、hook 與 nested commit failure 只評估 admitted candidate；unrelated worktree residue 不得膨脹 candidate，top-level JSON 必須攜帶 exact nested root cause 與 recovery。 |
| R0N | `ATM-GOV-0261` | 0258、0259、0260 | 建立 VCS-neutral commit-candidate envelope 與 broker/steward admission；Git index/pathspec 僅是 admitted candidate 的 adapter mutation surface，direct native pathspec 只算 emergency/anomaly evidence。 |
| R0O | `ATM-GOV-0262` | 0255；closes `ATM-BUG-2026-07-20-213` | 建立 canonical resource-overlap matcher 與 call-site inventory；physical/conflict/proposal decision 不得再以不同 exact/glob 規則產生互斥判決。 |
| R0P | `ATM-GOV-0263` | 0257、0261；closes 206、219、227、237 | 讓 `next`／batch 自動略過終態卡並讓所有 status/recovery command 以可執行 manifest 交付；正確任務卡可零人工修指令走到下一安全點。 |
| R0P-L | `TASK-LANE-0021` | TASK-LANE-0017、TASK-LANE-0020；closes 239 | 讓 lane capability 而非 `--actor` 字串成為 mutation authority；captain 可核准／監控／仲裁，但不可直接借 worker actor close/write/commit/runner-sync/push。普通報告只揭露 ticket fingerprint/status，不揭露可重放 key。 |
| R0Q | `ATM-GOV-0264` | 0262、0263、TASK-LANE-0021、TASK-SKL-0027 | 以 sealed deep-module review 建立 canonical Broker Admission Facade；七層檢查、proposal/compose/queue/revalidate、ticket 與 recovery manifest 只有一個最終判決來源。同 atom、無 shared path 或 bounded disjoint intent 不得在 proposal comparison 前被整體 freeze。 |
| R1 | `ATM-GOV-0239` | 0234、0235、0247、0251、0255、0262 | 修正 closure truth gate；候選卡、receipt 形狀或把同檔案直接序列化都不得 ready-to-close。 |
| R1.5 | `ATM-GOV-0252` | 0239、0251、ERR-0005 | 將 acceptance predicates 接到 closure packet/pre-close；per-card 支援兩種 verifier，Plan-global 強制 pre-sealed locked-policy。 |
| R1.6 | `ATM-GOV-0253` | 0252、ERR-0005 | 以 durable two-phase saga 收束 target/planning authority；local commit、remote visibility 與 exactly-once reconcile 由 authority manifest 決定，未完成只能 closeback-pending。 |
| R2A | `ATM-GOV-0240` | 0239 | 舊/新 frozen runner 同 scenario digest 的可鑑別紅綠基線。 |
| R2B | `ATM-GOV-0241` | 0239 | 定義事件推導 intent、compose batch、serializability、steward、shared commit 與 queue fallback receipt contract。 |
| R2C | `TASK-ERR-0006` | 0241、0249 | 註冊 compose candidate 語意驗證 failed／unavailable 的 exact ErrorCode 與 recovery contract。 |
| R2D | `ATM-GOV-0254` | 0241、0249、ERR-0006 | 從 immutable base 物化 exact candidate，執行通用 post-compose semantic validation；通過後才可交 steward。 |
| R2.5 | `ATM-GOV-0246` | 0240、0241、0248、0249、0250、0252、0254、0263、0264 | 建立 sealed run manifest 與唯讀 live/post-run 儀表，先讓人與機器可判讀 safe compose、semantic validation、fallback、autonomous continuation、same-atom proposal disposition 與 acceptance predicate readiness。 |
| R3A | `ATM-GOV-0242` | 0240、0241、0246、0261、0263、0264 | Codex 執行 0237、Claude 執行 0238；以 canonical admission facade 與正常 commit-candidate lane完成主 safe-compose cell 與真衝突 fallback，不得靠 atom-wide grant、native pathspec／manual stage 仲裁。 |
| R3B | `ATM-GOV-0243` | 0240、0241、0242、0246、0261 | 先消耗 passing dogfood receipt，再以同一真 ATM workload 完成 compose-first／queue-only matched AB/BA 與 pre-sealed A/A noise calibration。 |
| R4 | `ATM-GOV-0244` | 0242、0243 | 核銷 backlog 213–221，完成 rollback、source/frozen/release parity 與 breaker trip/reset drill。 |
| R5 | `ATM-GOV-0245` | 0244、0250、0252、0253、0254、0255、0256、0257、0258、0259、0260、0261、0262、0263、0264 | 建立單一 evidence aggregator，由 canonical 來源自動產生最終 verdict；另強制 A/A noise calibration、VCS-neutral candidate isolation、executable autonomous continuation、canonical same-atom admission 與 N=2 claim boundary。 |

0251 與 0247 可先並行，分別建立 evidence 與 execution topology 的純政策。現場解鎖順序固定為 0260 → 0257 → 0256 → 0258 → 0259 → 0261；0262 可在不重疊時並行，但必須早於 0239。0263 等 0257 與 0261 後驗證 autonomous continuation。若 0263 佔用 `atom-cli-router` 而讓 SKL-0022 freeze，SKL 隊長暫停 0022，改做已由 0018 解鎖且 scope 獨立的 0027；0027 完整 close 後產生 sealed Deep Module review。0263 完成後先插入 TASK-LANE-0021，確保 borrowed actor / ticket secrecy hard gate 成立；再由 0264 同時消耗 0027 review 與 0021 lane-boundary evidence，修復 canonical admission。ERR-0005 在 0251 schema 穩定後註冊 exact operator contracts；0255 已證明官方 Broker resolution 命令可被 claim admission 接受，但 0262 尚須證明所有 overlap call sites 使用同一規則，兩者皆成立後 0239 才能重新 claim。完成後由 0252 接到 closure packet 與 two-key verifier，再由 0253 建立跨 authority closeback saga。0240 與 0241 可在 0239 完成後並行。ERR-0004 在 0249 receipt schema 穩定後註冊 steward contracts；ERR-0006 在 0241 event contract 與 0249 candidate/apply seam 穩定後註冊 semantic-validation contracts。0254 等待 0241、0249、ERR-0006，0250 再等待 0249、0254 與 ERR-0004，使任何 shared-write admission 都必須綁定 exact passing candidate。0246 必須等 proposal provider、唯一寫入、防繞道、post-compose semantic gate、event contract、acceptance gate、TASK-LANE-0021 與 0264 canonical admission 都完成。0242 只有在 0246、0261、0263、TASK-LANE-0021、0264 passing 後開始；0243 再消耗 0242 passing dogfood receipt。所有 0255–0264 與 TASK-LANE-0021 evidence 都必須在 0245 global verdict 前完成。所有平行 worker 共用 canonical worktree；私有計算狀態是 in-memory／bounded proposal tree，不是 Git worktree 或 branch。

0027 與 0028 的依賴邊界固定為語意完整性而非工具便利性：0264 依賴
0027，是因為 0027 代表完整 sealed Deep Module review/provider contract。
不得為了繞過 local ignore、staging 或 admission blocker，把 0027 的必要
deliverables 移到 0028，否則未來讀者會無法從卡號與標題判斷 capability
是否真正完成。若 0027 遇到 ignored `templates/**` deliverable，應停下走
ATM-governed ignored-deliverable recovery 或人類明確修訂卡片語意；0028 只負責
skill corpus audit、canary rewrite，並把這條 cohesion-first / to-tickets
教訓寫入 `atm-task-card-authoring`、`atm-plan-authoring`、`atm-dispatch`
等 reusable skills。

### Plan 3.1 planned ErrorCode catalog

| Code | Exact trigger | Category | Retryable | Human approval | Required recovery |
|---|---|---|---:|---:|---|
| `ATM_BROKER_STEWARD_RECEIPT_REQUIRED` | multi-claim shared mutation 抵達 pre-commit、ATM Git 或 broker commit boundary，但沒有 composition/steward receipt | `team-broker` | yes | no | 回到 broker compose／neutral-steward delivery 取得 receipt |
| `ATM_BROKER_STEWARD_RECEIPT_INVALID` | receipt malformed、unsupported、stale、replayed，或 base/HEAD、member attribution、file/blob digest、write count 任一不符 | `team-broker` | yes | no | 重新以 current base/HEAD compose，取得 fresh steward receipt |
| `ATM_BROKER_COMPOSE_SEMANTIC_VALIDATION_FAILED` | exact composed candidate 已執行 required validators，至少一項 command-backed result 失敗 | `team-broker` | yes | no | 修復／重算 proposal，於 current base/HEAD 重新物化 candidate 並重跑同一 sealed validator set；不得 canonical write |
| `ATM_BROKER_COMPOSE_SEMANTIC_VALIDATION_UNAVAILABLE` | required language/project validator 無法解析、執行，或缺 command-backed result | `team-broker` | yes | no | 恢復／解析宣告 validator 後對 exact candidate 重驗；不得以跳過或 healthy boolean 代替 |
| `ATM_TASK_CLOSE_ACCEPTANCE_EVIDENCE_INSUFFICIENT` | closure-critical predicate 缺 source、低於 realness、negative control 無鑑別力、failed 或 inconclusive | `task-ledger` | yes | no | 依 predicate manifest 產生／重驗 canonical evidence 後重跑 pre-close |
| `ATM_TASK_CLOSE_INDEPENDENT_VERIFIER_REQUIRED` | separate-actor 與 pre-sealed locked-policy 兩種 verifier 都未成立 | `task-ledger` | yes | no | 執行宣告的 independent verifier 後重跑 pre-close |
| `ATM_TASKFLOW_CROSS_AUTHORITY_CLOSEBACK_PENDING` | target/planning 未同時 durable，或 prepare 後 authority CAS 移動 | `taskflow` | yes | no | 診斷並 resume/reconcile 既有 saga receipt，不重播已完成 side effects |

前兩個 steward codes 由 `TASK-ERR-0004` 登錄；兩個 post-compose semantic codes 由 `TASK-ERR-0006` 登錄；後三個 acceptance/closeback codes 由 `TASK-ERR-0005` 登錄。所有 generated docs 與 operator manifests 來自 canonical registry；GOV 卡只能引用，不得自行定義平行錯誤碼或 generic fallback。

### 雙隊長真實 dogfood 執行契約

- 0246 的 dashboard 與 sealed run manifest 必須先可用；任何 canonical source 缺失時顯示 `not-ready`，不得先 claim 再補儀表。
- manifest 在執行前封存 run id、兩張卡、provider／role、runtime actor ids、PID、runner/build/base/HEAD digests、唯一 canonical worktree root、non-Git proposal roots、共享實體檔案、各自 atom／anchor／range intent、私有輸出、時間窗、門檻與 stop rule。Codex／Claude 只作 scenario data，harness 不得出現 provider-specific 分支。
- Codex 負責 0237、Claude 負責 0238；兩者使用不同 actor 與 OS process，但共用同一 canonical worktree/base/HEAD。worker 不得在 shared file 直接落盤，只能輸出 patch/mutation proposal；neutral steward 是 shared file 的唯一 writer。
- 在正式 safe-compose cell 前先執行 adversarial bypass cell：任一有 shared-file claim 的 worker 直接修改並 stage 該檔案、但缺少有效 composition/steward receipt 時，pre-commit、ATM git commit 與 broker shared-delivery execute 都必須拒絕，並回傳 compose/steward reroute 指引。只有 receipt 綁定相同 base、composition plan、member attribution、before/after digest、staged blob 與 current HEAD/CAS 時才可放行。
- 主 safe-compose cell 中，兩張卡都宣告 `dashboard-view-model.ts`，但使用不同的 semantic anchors／bounded ranges。Broker 必須以既有 adapter 與 transactional composer 判定可合併、將兩 proposal 放入同一 batch、產出 serializability proof，再由 steward 落盤並建立一個含雙方 attribution 的 shared delivery commit。此 cell 的 queue wait 可以且預期為 0；若因「同檔案」本身就被序列化，dogfood 失敗。
- serializability proof 之後、steward 之前，必須從 immutable base 物化 exact combined candidate，執行兩張卡宣告 validators、resolved language-adapter fast static checks 與 catalog-targeted tests 的 sealed union。任一 required validator failed／unavailable／not-run 都必須零 canonical write；不得以各 lane 私有測試通過、final build 通過或 receipt label 補證。
- validator-policy/union 與 selection-input digest 必須在參與 producer 可讀取 locked semantic-break payload 前封存；negative-control reveal／execute 是較晚事件。若 reveal 後修改 union，該 cell 直接 invalid，不得用 post-hoc validator selection 迎合結果。
- 必須包含一個 locked semantic-break negative cell：兩 proposal 的 anchors/ranges 與 patch application 均不衝突，但合併後破壞 static check 或 targeted behavior。此 cell 必須在 steward 前被攔截，以證明 ATM 沒有把「可序列化」誤當「語意正確」。
- steward apply receipt 必須證明每個 composed output file 的 canonical write count 恰為 1；同檔案兩 proposal 不得退化成兩次 live-worktree patch apply。shared commit 必須實際包含該 exact after digest，且 foreign staged content 不得被吸收。
- 另以相同 schema/workload adapter 執行 sealed fallback cell，故意製造同一 logical range／CID collision 或 stale base。只有此 cell 要求 canonical queue/revalidation、正 `waitedMs`（若進 queue）及 automatic wakeup；不得把 fixture label 當成 conflict decision。
- 儀表只讀 canonical task-events、tickets、proposal/adapter decisions、compose batch、serializability proof、steward journal、shared-delivery receipts 與 sealed artifacts；refresh 不得改 queue 或 runtime state。
- 任一隊長不可用、actor/PID 不獨立、canonical root/base/HEAD 不一致、用 Git branch/worktree 隔離、shared intersection 為空、intent 無法定位、ticket 為 `not-required`、人工 wakeup、scope shrink、直接 `.atm` mutation 或 bypass 時，立即 `remain-open + queue-only`。

### Plan 3.1 完成門檻

- `broker replay status` 必須在現有弱證據下回 `remain-open`，且指出缺少的 exact lifecycle/evidence class。
- pre-commit／ATM git commit／broker batch commit 三個 side-effect boundary 都必須用同一個純政策與 receipt verifier；不能靠 worker 紀律。raw write、caller-shaped attribution、stale/forged receipt、composition output 與 staged blob digest 不符均須 locked negative test 證明 fail closed。
- repaired checker 必須把現行 fake-green fixture（420 份 synthetic receipts、`not-required` dogfood 與 hardcoded/fixed cost input）判為 `remain-open`；不得更新 fixture 來迎合實作。
- 每個 closure-critical acceptance claim 必須具有 machine-readable authoritative sources、derivation rule、最低 realness、negative control 與 missing-data verdict；per-card predicate 全部 pass 且具有有效 locked-policy／separate-actor 第二把鑰匙才可 close，Plan-global verdict 則必須另有 pre-sealed locked-policy key，separate-actor 不構成充分條件。
- 缺失、不可用、低 realness、無法鑑別或 producer 自證的 evidence 一律是 `inconclusive`／`remain-open`，不得正規化成 0、空陣列、true 或 healthy label。
- 舊 frozen runner 與新 frozen runner 使用同一 scenario/assertion/threshold digest：舊版必紅，新版必綠；任一邊不成立即測試作廢。
- 0237/0238 由不同 actor 與 OS process 在同一 canonical worktree 留下重疊 active interval，原始同檔交集全程保留；兩 proposal 同批 compose、serializability proof 成立、steward 唯一落盤、shared commit 完整歸屬且兩卡最終 close。
- exact composed candidate 在 canonical write 前通過 sealed、command-backed semantic validator union；failed/unavailable/inconclusive 都是零 canonical write，且 semantic-break negative control 能把 serializable-but-broken candidate 判紅。
- sealed fallback cell 必須以真衝突或 stale condition 觸發 queue/revalidation；進入 queue 時必須自動 wakeup。主 safe-compose cell 不要求也不鼓勵 queue wait。
- claim、intent、ticket、proposal、adapter decision、compose、steward apply、shared delivery、validation、fallback、wakeup 與 close 均有實際 command/event receipt；純 lifecycle label 不具語意。
- AB/BA 使用同 sealed base/config/build/workload 與同一 compose/steward/shared-delivery code path，queue-only 只由 policy CLI trip 關閉 compose，各至少 3 repeats；樣本不足或配對失敗只能 `inconclusive`。時間必須拆為 proposal generation、proposal validation、compose planning、steward apply、shared commit；效能提升只能歸因於前兩段的重疊與可證明的批次減少，不得宣稱實體寫入並行。
- correctness、serializability、member attribution、makespan、throughput、cost、queue residency 與 starvation 全部由同一組 sealed receipts 推導，不得使用預填 0、arm-specific delay 或固定 cost ratio。
- `ATM-BUG-2026-07-20-213`–`218` 與 `ATM-BUG-2026-07-21-219`–`221` 皆具有 canonical terminal disposition；deferred 必須有 owner card 與不阻擋 Plan 3.1 的理由。
- rollback drill、source/frozen/release parity、healthy breaker 零非注入 trip、故障 trip 與 passing-digest reset 全部有 command-backed receipt。
- 每張被分類為 safety／governance runtime gate 的 owning card 都在自身 close 前持有 attributable source/frozen behavior-parity receipt；可共用一份 runner-sync build receipt，但不得 source-green 先 close、再等待 0244 聚合補證。
- `ATM-GOV-0245` 必須從 canonical 來源自動讀取 blocker，禁止呼叫端傳入理想 boolean 或空 backlog 清單來 close。
- target ledger、planning card 與 Plan status 必須由 0253 saga 對帳；sealed authority manifest 要求的 local commit 與 remote-reachable SHA receipts 全部 durable 前只允許 `closeback-pending`，不可對外宣告 Plan 完成。
- 官方 `team broker resolve` 的產物必須可由同一版 frozen runner 的 claim preflight 直接消費；只產生 sidecar 但仍 freeze、需要人工補欄位或手改 `.atm/runtime` 都判定失敗。
- runner-sync 的 queue ticket、cache decision、receipt 與 drift clearance 必須綁定同一 sealed source/config/output digest；舊 HEAD 的 `cacheHitSkip` 不得清除新 source 的 `ATM_RUNNER_SYNC_REQUIRED`。
- claim、Broker、runner-sync 與 closeout 必須保留同一顯式 actor authority；ambient `AGENT_IDENTITY` 與 repo default 不得在 shared-write 邊界靜默取代 active lane owner。
- `ATM-BUG-2026-07-22-224`–`226` 必須有 canonical backlog item、owning card 與 terminal disposition，才可產生 Plan 3.1 final verdict。
- 本計畫「全 backlog 盤點與插單裁決」列出的 blocking/absorbed items 必須全部具有 owning card、command-backed terminal disposition 或明確 non-blocking owner rationale；不能只因 item 狀態仍是 `Open` 就一律重做，也不能只因後續卡存在就假設已修。
- `ATM-GOV-0262` 的 call-site parity 與 `ATM-GOV-0263` 的零人工命令修復 replay 必須通過；任一 overlap call site 漂移、done queue head 重現、emitted command 回 `ATM_CLI_USAGE`，或正常流程仍需總隊長補指令，都使 autonomous verdict 為 fail。

### Stop rule

任一 safety runtime card 缺自身 attributable frozen parity、任一 authority 只 local-committed 但未滿足 manifest 的 remote visibility、Plan-global verdict 缺 pre-sealed locked-policy、validator union 在負控 reveal 後被修改、舊/新 runner 無法用同 digest 對比、官方 BCR command 無法解除其宣稱可解的 bounded claim freeze、runner cache hit 與 current sealed source 不一致、shared-write command 的 actor 與 active ticket/lane owner 漂移、safe-compose cell 被同檔案檔鎖式序列化、raw write 能繞過 steward、同檔 compose batch 對 canonical file 寫入超過一次、exact candidate 未在 steward 前完成 command-backed semantic validation、semantic-break negative control 無鑑別力、shared commit 未綁 exact composition/validation/steward digests、fallback cell 無法在真衝突後 queue/revalidate 並自動前進、AB/BA 無法使用同 build/workload/code path，或 correctness 仍需呼叫端預填時，立即停在 `remain-open + queue-only`，不得以「protected closure 已通過」作為 waiver。

## 2026-07-21 evidence repair closeback

## 2026-07-22 protected closure repair closeback（歷史紀錄，已由 Plan 3.1 推翻）

以下段落保留當時判定供稽核，不代表目前 closure authority。Plan 3.1 的 locked fake-green regression 必須證明這組輸入現在得到 `remain-open`；目前 authoritative quick check 仍是：

```text
node atm.mjs broker replay status --json
```

Historical result that must no longer pass:

- `verdict: ready-to-close`
- `blockerCount: 0`
- dogfood candidates: `2/2`
- command-backed matrix: `420/420`

Validation evidence:

- `node atm.mjs broker replay dogfood --surface docs/governance/atm-3-replay-evidence.md --json`
- `node --strip-types scripts/run-paired-ab-v4.ts --mode command-backed`
- `node --strip-types scripts/run-paired-ab-v4.ts --mode validate`
- `node --strip-types tests/cli/plan3-evidence-closure-diagnostic.test.ts`
- `npm run typecheck`
- `node --strip-types scripts/run-validators.ts standard --run-id standard-plan3-repair-20260722 --json` => 87/87 passed

Architecture note for future maintainers: validator parallelism is governed by generic metadata (`executionMode`, `resourceProfile`, `resourceLocks`) and isolated rerun diagnostics. Add new shared fixtures by declaring resources in validator metadata, not by adding validator-specific branches to the runner.

Evidence limitation: the repaired evidence satisfies the protected closure checker, but the dogfood broker ticket state is `not-required`. Treat it as frozen CLI multiprocess receipt evidence, not as a queued shared-write wait benchmark.

本輪稽核推翻了「Plan 3.0 已完全收官」的先前結論：target ledger 中
`ATM-GOV-0234`／`ATM-GOV-0235` 雖曾標成 `done`，但原始證據不足以證明真實
平行開發與 >=25% 效能提升。Target repo 已新增 evidence-gate hardening：

- replay worker 不再以 `node atm.mjs --version` 冒充 broker dogfood；acceptance
  必須含 frozen `broker decision` command receipts。
- 沒有 serial/parallel makespan 時，throughput gain 不再預設為 `1.25`，而是
  `inconclusive`。
- final verdict 新增 evidence-derived helper；沒有 broker command receipts 或未
  達 420-cell matrix 時不得 close。
- `ATM-BUG-2026-07-21-222` 已由 target repo 修復為 runner-sync／batch-checkpoint
  recovery repair；這解除 pre-push／runner-sync deadlock 類 blocker，但不是 Plan 3
  close waiver。
- `ATM-BUG-2026-07-21-223` 已補上 validator resource-aware scheduler；`validate:standard`
  可平行執行，但必須依 `executionMode`、`resourceProfile`、`resourceLocks` 與
  `schedulerLane` 將 global fixture、runner-sync、release mirror、git worktree 等
  validator 放入 serial／isolated lanes，而不是把所有 validator 盲目併發。

2026-07-21T22:27:31+08:00 補充核對：

- target repo `main` local/remote SHA 一致：`b5242bc145e8e9d30953fd95ff70b0f122316a20`。
- `validate:standard` 的 current run `validator-resource-profile-standard-current`
  通過 87/87，耗時 755,881ms，且為 resource-aware parallel run。
- `node atm.mjs doctor --json` 通過；`node atm.mjs hook pre-push --base origin/main --head HEAD --json`
  通過，git-head evidence missing 為 diagnostic only。
- planning repo `master` 在本次 closeback repair 前 local/remote SHA 一致：
  `c708a30bfc62b34f14394f47e6e0676b33e441bc`。

2026-07-21T22:37:00+08:00 補充診斷：

- target repo 新增 fail-closed 診斷器 `scripts/diagnose-plan3-evidence-closure.ts`
  與測試 `tests/cli/plan3-evidence-closure-diagnostic.test.ts`，並推到
  `main@7c5780058af252365375f23da0e8693456bfdffe`。
- 診斷命令 `node --strip-types scripts/diagnose-plan3-evidence-closure.ts --json --allow-inconclusive`
  目前 verdict 為 `remain-open`，精確列出三個 blocker：
  1. real dogfood registered candidates 為 `0/2`；
  2. 沒有 public frozen `node atm.mjs broker replay ...` CLI surface；
  3. 現有 420 cells 中 `0/420` 具有 command/workload receipts。
- 因此 Plan 3.0 現在不再只是「等 validator 跑完」；卡點已可由診斷器直接重現與引用。

因此本計畫保持 `active`。`TASK-TMP-0004`、`TASK-ERR-0003`、`ATM-GOV-0234`
與 `ATM-GOV-0235` 依 target ledger 保持歷史終態 `done`，不重開、不改寫其 task/event/evidence
歷史；但 0234／0235 的既有證據 disposition 為 `superseded-for-plan-closure`，不得再用來滿足
Plan 3.0／3.1 的 semantic closure predicates。真正的 420-cell command-backed matrix、真實未交付
交集卡 dogfood、paired AB/BA performance verdict 與 source/target/remote closeout，由 0239–0261
continuation repair lineage 承接；在新 evidence verdict 通過前，本計畫維持 `active`。

| 波次 | 任務卡 | 依賴 | 交付與驗收 |
|---|---|---|---|
| R0 | `TASK-TMP-0004` | 無 | 將 projection-only 的 `-213` 至 `-218` 轉為 canonical backlog item shards，重建 projection；這是 0226 census 的資料完整性前置。 |
| A0 | `TASK-ERR-0003` | 無 | 註冊 Plan 3.0 使用的 exact ErrorCode 與 executable recovery contracts，包含授權維度不符；GOV 卡不得自行發明 code。 |
| A | `ATM-GOV-0226` | ERR-0003、TMP-0004 | 建立 divergence census、current-source discrimination、歷史證據封存、通用 replay scenario schema、backlog/closed-card 對帳矩陣，並依卡片 metadata 預配置 atom-map ownership。 |
| B0 | `ATM-GOV-0227` | 0226 | 定義 canonical arbitration authority、dimension-preserving grants 與 decision coherence；先讓無 generation/grant 的 legacy BCR fail closed，再開放後續真平行 wave。 |
| B0.5 | `ATM-GOV-0236` | 0227 | 修復 protected governance state destructive guard 與 close post-side-effect reconciliation；先消滅 ledger deletion 與 duplicate close side effect。 |
| B0.6 | `ATM-GOV-0230` | 0236 | 修復 stale reservation，並封證 terminal-task parity、foreign WIP preservation、framework-temp steward 與 single-build-steward contract。 |
| B0.7 | `ATM-GOV-0231` | 0230 | 統一 actor/task ID normalizer、runner actor continuity 與 command manifest recovery chain。 |
| B1 | `ATM-GOV-0228` | 0231 | 將 ticket 到 queue/freeze/direction lock/BCR view 的投影改為 CAS generation 與 crash-safe reconcile。 |
| B1 | `ATM-GOV-0229` | 0231 | 建立資料驅動 linked-surface closure graph 與 claim 前 scope preflight。 |
| B1 | `ATM-GOV-0232` | 0231 | 驗證 task-import／orphan claim／closeback repair，並對帳已完成但 backlog 未關項。 |
| D | `ATM-GOV-0233` | 0228、0229、0230、0231、0232、0236 | 整合完成/取消/失主/喚醒 exactly-once lifecycle、isolated index close、正式 BCR migration 與舊授權消費端遷移。 |
| E | `ATM-GOV-0234` | 0233、0232 | frozen-runner controlled replay、故障注入、paired queue-only 對照、兩張真實交集任務 dogfood 與 canonical telemetry seal。 |
| F | `ATM-GOV-0235` | 0234 | 重跑 census、readiness、circuit breaker、backlog 與 2.2 遺留並做最終 verdict。 |

`ATM-GOV-0227` 是 authority bootstrap gate；`0236 -> 0230 -> 0231` 是 execution-substrate readiness chain，都不得與 B1 implementation 同時開工。只有 TMP-0004 canonical backlog、0226 紅色基線、0227 legacy fail-closed、0236 protected-state/close-idempotency、0230 safe single-steward runner-sync 及 0231 actor continuity 全部以 frozen evidence 通過後，0228/0229/0232 才能在同一 canonical worktree 以不同 actor、OS process 與 non-Git bounded proposals 真平行施工；shared file 只由 canonical composer/steward 落盤，Git 僅承接外層 shared delivery。

## 公開介面

- 延用並收斂 `atm.brokerTicket.v1`：新增或明確化 `generation`、`authorityDigest`、`projectionDigests`、`releaseCondition`、`wakeupKey`、`waitedMs`、`ownerHealth`、`cancelReason`、`reconciledAt`，以及 dimension-preserving `authorizationGrants[]`。每筆 grant 包含 resource kind/dimension、normalized keys、operation、consumer gate 與 authority generation/digest；task id 只作關聯，不作獨立授權。
- 新增 `atm.brokerProjection.v1`：每份 queue/BCR/freeze/direction-lock view 都包含 ticket id、generation、authority digest、projection digest、watermark 與 terminal state；projection 不具有獨立授權語意。
- 新增 `atm.linkedSurfaceClosure.v1`：以 producer/consumer、template/projection/compiler/manifest/validator/build output 關係推導閉包，回 provenance、confidence、owner atom/map 與 re-arbitration requirement。
- 沿用 `atm.commandManifest.v1`：禁止 default-on 路徑輸出 shell command string；舊 `requiredCommand` 僅作一版 deprecated display，canonical action 為 argv manifest 或 ordered manifests。
- 新增 `atm.parallelReplayScenario.v1`：scenario 使用角色、capability、resource graph、fault schedule 與 assertions，不以固定 task id/path 驅動；另包含 `runnerEntrypoint`、`starvationThresholdMs`、threshold source、`minimumParallelOverlapRatio`、`maximumSerializedAdmissionRatio`，全部在 run 前 seal，禁止看到結果後調參。
- 所有 producer 使用 `atm.telemetryObservation.v1`，summary 必須有 window、watermark、sample count、runner digest、canonical behavior projection digest、parallel/serialized ratios、unavailable receipts 與 sealed digest。
- legacy migration 延用既有 broker migrate 命令族，新增 immutable pre-migration snapshot receipt 與 `broker migrate --rollback <receiptDigest>`；apply/rollback 都必須 exactly-once、可重試且保留 append-only audit。
- `TASK-ERR-0003` 登錄或明確重用 `ATM_PROTECTED_GOVERNANCE_STATE_DESTRUCTIVE_WRITE`：trigger 為未具精確 disposition authority 的 protected task/event/evidence deletion；category 為 governance integrity、retryable after reconcile、無 blanket human bypass，recovery 必須是 status/disposition command manifest。registry 與 generated docs 仍是唯一 ErrorCode authority。

## 正確性不變量

- `INV-ATM-008`：不同任務的 overlap 產生 execute/queue/batch ticket，不以 terminal refusal 代替 broker 仲裁。
- `INV-ATM-009`：控制流程不得硬編碼 actor、task、path、日期或單次 incident；資料 fixture 可以保存歷史標籤。
- `INV-ATM-010`：正常平行開發共用單一 canonical worktree/base/HEAD，以 atom／anchor／range intent、proposal、adapter、composer 與 steward 做邏輯隔離；同一物理檔案不是檔案鎖。AI worker 不得用 Git branch/worktree/index 拓樸取代 ATM 仲裁，Git 僅位於 shared-delivery 外層。緊急復原、歷史唯讀鑑別及非開發性 sealed packaging 為封閉例外，必須有具名 receipt。
- bounded、可合併的同檔案 proposals 必須能進入同一 mutation batch；只有真正 conflict、stale base/CAS、unsupported adapter 或 fairness bound 才能 queue/revalidate。不得以保守全序列化取得假綠燈。
- shared file 的實體落盤只能由 neutral steward 執行；worker proposal、compose member attribution、serializability proof、before/after digest 與 shared commit receipt 必須可相互對帳。
- 同一 ticket generation 最多一位有效 publisher；terminal ticket 不得再授權 write。
- BCR release order 與實際 publish order 必須來自同一 authority generation；若 generation 改變，所有舊 projection 立即失效。
- shared-write authorization 必須保留被仲裁的資源維度與 normalized resource keys；path、atom id、atom CID、surface 或 range 的 grant 只能授權同維度且同資源的操作，task id 不得單獨構成授權，也不得跨維度放大。
- outer decision、conflict matrix、gate result 與 conflict detail 必須來自同一 arbitration result；同一 generation 內不得同時宣告 clear 與 block/freeze。
- 缺少 canonical authority generation、dimension-preserving grant 或 terminal ticket linkage 的 legacy artifact 不得授權；reader 必須 fail closed 到 re-arbitration/ticket，而不是回傳 task-id entitlement。
- scope amendment 若新增 shared surface，必須在寫入前 re-arbitrate；禁止只補 direction lock 而不更新 ticket read/write set。
- cancel、adopt、close、publish、release、wakeup 與 migration 都必須可重試且 side effect exactly-once。
- migration apply/rollback 必須以同一 receipt generation 往返驗證；rollback 後 canonical state digest 必須等於 pre-migration digest，append-only audit metadata 除外。
- `queue-only` fallback 不得遺失現有 ticket、proposal 或 evidence；reset 必須引用新的 passing evidence digest，且長期停留 queue-only、非注入故障 trip 與 recovery latency 都必須可觀測。

## 驗證矩陣

### L0 紅色鑑別力基線

- 0226 在任何 broker implementation 前，以現行 frozen `node atm.mjs` 及隔離 fixture 執行 sealed scenario；至少重現 stale authorization、dimension-mismatched authorization 或 release-order divergence 中的已知失敗形狀。
- 若現行 frozen baseline 意外全綠，scenario 判定為 invalid/inconclusive，必須先修正 scenario 或證明故障已由既有版本消除；不得直接把綠燈當 Plan 3.0 成功。
- 同一 scenario digest、assertions 與 threshold policy 必須由 0234 在新 frozen runner 重跑並轉綠，才能證明測試具鑑別力。

### L1 單元與 schema

- ticket state machine、generation/CAS、terminal authorization、projection digest、dimension-preserving authorization grants。
- 成對 fixtures：file/path grant 不得抑制 atom CID block，atom grant 不得授權無關 path/surface；同維度同資源的有效 grant 必須授權，避免以全拒絕取得假綠燈；terminal/stale generation 一律不授權；outer decision 與 gate/conflict detail 必須一致。
- linked-surface graph closure、cycle handling、unsupported/unavailable provenance。
- actor/task normalizer、command manifest prerequisite chain、Windows argv rendering。
- Markdown fence state、source-line diagnostics、backlog reconciliation。
- protected governance path policy、tracked deletion guard、close post-side-effect journal/idempotency、same-task concurrent evidence preservation、orphan claim adoption 與 runner actor continuity。

### L2 Frozen-runner parity

- 0227、0236、0230、0231、0228、0229、0232、0233，以及所有被 acceptance contract 分類為 safety／governance runtime gate 的 Plan 3.1 owning cards，在 close 前都必須以相同 card-defined probe 分別取得 source 與 frozen `node atm.mjs` 結果。現行最小集合包含 0239、0248、0249、0250、0252、0253、0254；集合由 capability/risk metadata 擴張，不由 task-id control-flow hardcode。
- runner-sync build 是可共享的 Tier 2 window：同一 sealed build receipt 可供多卡引用，不要求每卡重建；但每張卡必須留下綁定其 probe、behavior projection 與 source/frozen digests 的 attributable parity receipt，且不得先 source-green close、再由 0244 聚合補證。
- 比對 schema 定義的 canonical behavior projection digest；允許排除的非決定欄位必須由 schema allowlist 宣告，不得在 test 內臨時忽略差異。
- evidence 必須封存 source/frozen runner digest、projection digest 與 build receipt；source-only 或 `packages/*/dist` 綠燈不能滿足 acceptance。

### L3 Controlled 多行程破壞與 replay

- 同時 enqueue/publish/close、publisher 中止、失主 adopt、stale base、重複 wakeup。
- HEAD 連續移動、同 task 保持 active、舊 SHA 不可達、receipt 不存在。
- projection 寫到一半中止、CAS 衝突、Windows rename sharing violation、重複 migration。
- migration apply 後注入失敗並以 immutable receipt rollback；重複 apply/rollback 不得產生 duplicate side effect，round-trip state digest 必須一致。
- scope graph 在施工中新增 linked/generated surface，確認寫入前重新仲裁。
- tracked task/event/evidence deletion、同 task 兩個 evidence writers、close 在各 side-effect 邊界中止、foreign dirty source、terminal ghost queue head 與 enqueue/build actor identity drift。
- 0234 以 0226 的同一 sealed scenario 執行 controlled replay；每個 worker 都由 frozen `node atm.mjs` 啟動並封存 runner digest，source/dev replay 只能作輔助。
- `maxConcurrentWorkers >= 2`、observed overlap window `> 0`、`parallelAdmissions > 0`，且 canonical closure scenario 的 `parallelOverlapRatio >= 0.30`、`serializedAdmissionRatio <= 0.70`。
- starvation 以 scenario 預先 sealed 的 `starvationThresholdMs` 判定，threshold source 必須引用 policy 或 paired queue-only baseline；任何 eligible ticket 超過閾值且沒有 terminal/recovery disposition即計入 unresolved starvation。
- BCR/projection release order 等於 observed publish order，terminal 後 active authorization 為 0；stale reservation 可處置且 queue 繼續前進，不需偽造 receipt 或釋放無關 claim。
- escaped conflict、silent overwrite、duplicate side effect、unresolved starvation、stale authorization、dimension-mismatched authorization、decision contradiction 均為 0。

### L4 真實任務 dogfood

0234/3.1 另選兩張真實、未交付、故意保留 declared intersection 的 registered tasks，由兩個獨立 OS process/actor 與 Captain 在同一 canonical worktree 施工；task selection 依 capability/resource graph，不在控制流程預先列 id/path。要求：

- 每個 worker 都由 frozen `node atm.mjs` 啟動，綁定同一 base/HEAD/canonical root；shared surfaces 全數有 canonical ticket，並另有 disjoint private work。worker 的私有施工載體為 bounded non-Git proposal tree，不得是 branch/worktree/index。
- scope amendment 不得首次出現在 commit gate；若 runtime graph 新增 surface，必須留下 pre-write re-arbitration receipt。
- 真實 dogfood 不得用 scope amendment 移除原先 declared intersection；只允許新增 linked surface，且必須 pre-write re-arbitrate。兩位 Captain 都必須取得 execute/queue/batch ticket，不得收到 terminal refusal；主 safe-compose cell 必須以同檔案 disjoint intent 進入 batch/compose，不得因同檔案本身退化為 queue。
- shared file 只能出現在 steward 的 apply/shared-delivery packet；各 task closure packet 以 compose member attribution、logical intent 與私有 changed files 對帳，不得把 steward 的共同產物錯算成另一 lane 越權。全程不得手改 `.atm`、偽造 receipt、使用 `--no-verify` 或人工釋放他人 claim。
- 另以 sealed true-conflict/stale cell 證明 queue/revalidation；若 ticket 進 queue，必須由 successor wakeup 自動前進。此 fallback receipt 不得取代主 safe-compose cell 的成功證據。
- 兩卡 terminal 後 active authorization 為 0，且 L3 的七個 correctness counters 與 ratio/starvation assertions 同樣適用。

### L5 Paired A/B 效能與觀測

- 以同一個「同檔案、disjoint bounded intents」workload 比較 compose-first 與相同 sealed base/config/build 的 queue-only AB/BA，至少 3 repeats；queue-only arm 必須由 policy CLI trip 產生，不得換 build、移除交集或改用另一份 workload。correctness 與 performance 必須來自同一組有效 sealed cells；不足樣本只能 `inconclusive`，且 0235 不得 close。
- AB/BA 前先執行 pre-sealed A/A null-control cell：同一 arm、workload、base/build/runner、validator union 與 timing segmentation 重複配對，以 command/event receipts 推導雜訊分布。報告至少包含 median 與預先宣告的 dispersion statistic（例如 IQR）；AB/BA 增益除了達到 25% 外，還必須超過封存的 A/A noise bound，落在雜訊帶內一律 `inconclusive`。
- median makespan 與 active throughput 沿用 2.2 門檻：各改善至少 25%；production cost ratio 不高於 1.10。
- 所有 shared-write producer observed coverage 100%；每份 task summary 有 window/watermark/sealed digest。
- 必填數據：enqueue/dequeue/publish timestamps、intent/anchor/range digest、adapter decision、compose batch membership、serializability proof digest、steward apply latency、shared commit/member attribution、`waitedMs`、overlap duration、wakeup count、revalidation count、scope amendment phase、terminal authorization count、`breakerTripCount`、`unexpectedBreakerTripCount`、`timeInQueueOnlyMs`、`timeInQueueOnlyRatio`、trip reason 與 recovery latency。
- healthy replay segment 要求 `unexpectedBreakerTripCount = 0` 且 `timeInQueueOnlyRatio = 0`；fault-injection segment 的每次 trip 必須對應已注入原因、保留 evidence，並以較新的 passing digest 完成 recovery。

## 0014／0015 Replay Preflight

| 歷史失敗 | Primary closure owner | Supporting cards | 修復後預期 |
|---|---|---|---|
| 三張 BCR 與 publish order 不一致 | 0233 | 0227、0228 | BCR 只投影同一 ticket generation；不可能保留不同 release authority。 |
| file/path 裁決被放大成 task 級授權並抑制 atom CID block | 0233 | 0227、ERR-0003 | ticket grant 保留資源維度與 keys；所有 CLI 消費端逐維度比對，task id 不再單獨授權。 |
| 兩卡 done 後仍有 `currentAllowedTaskId` | 0233 | 0228 | terminal transition 原子撤銷所有 projection；reconcile 將 stale view fail closed 並遷移。 |
| linked skill projection 到 commit 才要求 scope amendment | 0229 | 0226 | claim 前 closure graph 列出 template/compiler/validator/projection/manifest；新增 surface 在 write 前 re-arbitrate。 |
| stale SHA queue-head 無 receipt 可釋放 | 0230 | 0233 | 以 reachability、generation 與 owner health判定 cancel/expire/revalidate，不要求完成 build receipt。 |
| required command task id 不一致且缺 prerequisite | 0231 | ERR-0003 | 單一 normalizer；ordered command manifests 包含 temp claim、files、enqueue/build/release。 |
| fenced `#` parser 與 backlog 狀態分歧 | 0232 | 0226 | fixture 驗證真實 parser；功能已修則以 evidence 關 backlog，未修才改 code。 |
| mirror reconcile 成功但未寫入，終態 repair 又要求不可取得的 claim | 0232 | ERR-0003 | reconcile 驗證宣告 mirror 的實際 mutation；終態 closeback 使用專責 repair authority，不依賴 active work claim。 |
| closure packet 混入並行 commit 的檔案與 tree/evidence | 0233 | 0226、0228 | packet 由 task-owned commit slice 與同 generation git-head evidence封裝；pre-close 即驗證 changed-files/tree/parent/commands。 |
| 無 waitedMs/overlap/wakeup paired data | 0234 | 0235 | 真多行程 sealed telemetry 與 queue-only paired verdict。 |
| breaker 頻繁退回 queue-only 但不被完成門檻看見 | 0234 | 0235 | 健康 replay 禁止非注入 trip，封存 trip count、queue-only residency 與 recovery latency。 |
| outer decision 與 gate/conflict detail 自相矛盾的歷史疑點 | 0226 | 0227、0234 | frozen/source probe 先判定現況；已修則 closeback `-213`，未修才交由 canonical arbitration contract 修復。 |
| legacy BCR 在 0233 前仍可 task-level 授權 | 0227 | 0226、0233 | 0226 先封紅色基線；0227 讓缺 generation/grant 的 artifact fail closed，0233 再正式遷移。 |
| migration apply 後無合法逆向 recovery | 0233 | 0227、0235 | immutable pre-migration receipt、正式 rollback CLI 與 round-trip digest。 |
| source replay 綠燈但 frozen onefile 仍壞 | 0234 | 0227、0236、0230、0231、0228、0229、0232、0233、0235 | worker 強制由 `node atm.mjs` 啟動並封 runner digest；canonical behavior projection parity。 |
| 合成 replay 無法證明真實開發可用 | 0234 | 0235 | 兩張未交付且故意有交集的真實任務完成正式 claim/ticket/wakeup/close，全程不得移除原始交集。 |
| `-213` 至 `-218` 只有 projection row、重建會消失 | TMP-0004 | 0226、0235 | 六份 canonical item shards 先落地；projection rebuild deterministic，projection-only count 為 0。 |
| cleanup／commit bundle 可刪 live task ledger | 0236 | ERR-0003、0234 | schema-driven protected path policy 在 mutation 前阻擋，合法 lifecycle 更新仍通過。 |
| close side effects 全成卻回 failure | 0236 | 0233、0234 | side-effect journal 辨識 completed/reconciled；重試不重複 commit、closeback、push 或 wakeup。 |
| runner-sync actor 在 enqueue/build 間漂移 | 0231 | 0230、0234 | ordered manifest 攜帶 queue-head actor；ambient editor identity 不覆蓋 authority。 |
| frozen/source shared-build、terminal ghost task 或 foreign WIP 破壞 B1 | 0230 | 0231、0234 | single build steward、terminal parity、foreign digest preservation 與 framework-temp admission 在 B1 前通過。 |
| backlog Open 但 source 已有 passing regression | 0226 | owning card、0235 | current source/frozen discrimination；已修只 closeback，仍紅才改 code，避免重複修復。 |

結構 preflight 的判定是「所有已知故障都有唯一 owner 與可執行 acceptance，依賴圖無循環」；它不代表現行 ATM 已通過 replay。只有 0226–0234 的產品交付與真實證據完成後，0235 才能判定 solved。

## 2026-07-21 第二輪 Review Disposition

| 建議 | 判定 | 融合方式 |
|---|---|---|
| G1 legacy BCR exposure window | 接受，P0 | 0226 先封 L0 紅色基線；0227 成為 B0 safety gate，讓缺 generation/grant 的 artifact fail closed；B1 依賴改到 0227。 |
| G2 migration rollback | 接受 | 0233 新增 immutable pre-migration receipt、正式 rollback CLI、apply/rollback exactly-once 與 round-trip digest。 |
| G3 replay execution carrier | 接受並修正做法 | 0234 worker 強制使用 frozen `node atm.mjs`；不用 raw JSON bitwise compare，改用 schema-defined canonical behavior projection digest，避免時間戳等合法欄位造成假差異。 |
| G4 parallelism degree | 接受 | scenario 加入 run 前 sealed ratios；canonical closure profile 要求 overlap ratio >=0.30、serialized ratio <=0.70，correctness/performance 使用同一 cells。 |
| G5 starvation definition | 接受 | scenario 宣告 `starvationThresholdMs` 與 policy/paired-baseline source；超時且無 terminal/recovery disposition 才計數。 |
| G6 staleReleases reporting | 接受 | 0230 acceptance 明確要求 reported count、entries、mutation ids 一致。 |
| G7 real development evidence | 接受，不新增純證據卡 | 0234 增加 L4 real-task dogfood segment；新增的 0236 是有 live red test 的產品 readiness gate，不是證據轉交卡。 |
| L0/L1/L2/L3/L4/L5 layered proof | 接受 | 驗證矩陣改為紅色基線、成對 fixture、frozen parity、controlled replay、真實 dogfood、paired A/B 六層。 |

本 amendment 不新增 task series、ticket model 或第二套 evidence authority。

## 2026-07-21 Backlog Readiness Review Disposition

| 分類 | Exact items | 判定與 owner |
|---|---|---|
| census 資料完整性 blocker | `ATM-BUG-2026-07-20-213` 至 `ATM-BUG-2026-07-21-218` | `TASK-TMP-0004` 必須先補 canonical shards，再允許 0226。 |
| current red、B1 前必修 | `ATM-BUG-2026-07-19-045`、`ATM-BUG-2026-07-19-015`、`ATM-BUG-2026-07-20-208` | 0236 修 protected ledger/close idempotency；0231 修 actor continuity。 |
| runner substrate 必須在 B1 前證明 | `ATM-BUG-2026-07-14-183`、`-184`、`ATM-BUG-2026-07-19-011`、`-046`、`ATM-BUG-2026-07-20-209`、`-214` | 0230 從 B1 移到 prelude；已修 probe 只 closeback，仍紅才修。 |
| current source 已通過、不得重做 | `ATM-BUG-2026-07-19-018`、`-012`、`-014`、`ATM-BUG-2026-07-19-046` 的現行 covered branches | 0226/0232/0230 補 frozen parity 與 item closeback；若 frozen 不同才回 owning card。 |
| B1 後、真 replay 前必修 | `ATM-BUG-2026-07-13-161` | 0233 isolated index／canonical index lease；0234 前必須完成。 |

不另建「Plan 2.9」或第二份 readiness 計畫。資料修復由合法 TMP family 承擔，產品修復留在 Plan 3.0 GOV DAG，避免兩份計畫同時宣告 closure authority。

## 2026-07-21 Authoring Preflight 結果

### 計畫與任務卡

- `TASK-TMP-0004`、`TASK-ERR-0003`、`ATM-GOV-0226` 至 `ATM-GOV-0236` 共 13 張卡全部通過 dry-run import：每卡 task count 1、manifest diagnostics 0、errors 0、warnings 0。
- 新 DAG 無 missing dependency 且 acyclic；topological order 為 TMP-0004/ERR-0003 -> 0226 -> 0227 -> 0236 -> 0230 -> 0231 -> 0228/0229/0232 -> 0233 -> 0234 -> 0235。
- 新 B1 只含 0228/0229/0232，exact/glob-containment scope overlap count = 0；0230/0231 已提前成 shared-build/identity readiness。
- 0226 先依所有卡片 metadata 預配置 atom-map ownership；後續平行卡的 `mapUpdates` 為空，避免共享 map shard 變成未宣告寫入面。
- UTF-8 touched guard 通過，沒有 BOM、U+FFFD 或 mojibake。

### 現行產品基線

- `task-import-diagnostic-contract` 與 `task-import-canonical-id-boundary` 測試通過；`validate:skill-templates` 亦通過 17 source templates 與 5 adapters。`ATM-BUG-2026-07-20-216` 與 `ATM-BUG-2026-07-21-217` 很可能是已修功能但未 closeback，須由 0226/0232 以 frozen/source evidence 正式對帳。
- parallel admission 現為 `mode=enforce`、`fallbackMode=queue-only`、circuit breaker enabled；這一層已存在，不需重建。
- runner-sync queue 此刻為 0，只表示現場已清空，不證明 stale SHA lifecycle 已修。CLI help 仍沒有正式 cancel/expire/revalidate action。
- runtime 仍有 29 份 legacy BCR sidecar 帶 `currentAllowedTaskId`，且全部缺少 canonical `authorityGeneration`；現行 reader 仍可回傳 `blockedTaskIds`。0226 必須先封存紅色基線，0227 必須在 B1 前令其失去獨立授權能力，0233 再以正式 migrate/rollback 處置。
- runner-sync task id 兩個 emitter 對目前 dotted actor 已產生相同結果，但仍各自維護 regex，對連續非允許字元可能漂移；`buildRunnerSyncEnqueueCommand` 仍只輸出 enqueue，沒有 temp claim 與 `--files` prerequisite chain。因此 `ATM-BUG-2026-07-21-218` 仍是 live generic gap。
- 本次 current-source discrimination：`scripts/validate-evidence-command-runs.ts`、`next-claim-orphaned-in-progress`、`runner-sync-framework-temp-hotfix`、`runner-sync-foreign-dirty-owner` 通過；`protected-ledger-destructive-guard` 失敗於 expected false/actual true。前四項先列 frozen parity/closeback，最後一項由 0236 保留紅色 baseline 並修復。

### Preflight Verdict

- **Plan coverage: PASS**。新揭露的 canonical backlog、protected ledger、close idempotency、runner actor continuity 都有唯一 owner；13 張卡 import、DAG、B1 scope 與 15-file encoding 驗證通過。
- **Current product replay: FAIL**。文件與任務卡本身不等於產品修復；在 0227、0236、0230、0231 與後續 implementation cards 完成前重演，仍可能遇到 stale BCR authorization、protected ledger deletion、close duplicate side effect、runner-sync stale reservation 無合法終止及不完整 recovery chain。
- **Post-plan expectation: conditionally solvable**。只有 L0 紅色基線能由同 scenario 在新 frozen runner 轉綠、0234 controlled replay 與真實交集任務 dogfood 都通過、正確性七個零值與完整 telemetry 成立，且 0235 circuit breaker/closure 通過，才可回答「並行開發已解決所有已知問題」。

## 完成門檻

`ATM-GOV-0235` 只有在下列條件全部成立時才能關閉：

- 0226 census 的每個 divergence 都有 terminal disposition 與 evidence digest。
- `TASK-TMP-0004` 已 target-close，canonical backlog item shards 完整且 projection-only count = 0；`ATM-GOV-0236` 已 target-close，protected ledger 與 close retry fault matrix 通過。
- 0226 現行 frozen 紅色基線有效，且 0227 fail-closed guard 在任何 B1 平行 claim 前已部署並以 frozen runner 證明 legacy active authorization 為 0。
- 0227、0236、0230、0231、0228、0229、0232、0233 的 source、frozen runner、release artifacts 與 adopter projection parity 全數通過。
- 0233 migration apply/rollback round-trip、exactly-once 與 immutable receipt 通過。
- 0234 的歷史 evidence 保持 `superseded-for-plan-closure`；0239–0261 continuation lineage 重新產生 controlled replay、真實交集任務 dogfood、paired A/B、write-ticket、candidate-scoped recovery 與 VCS-neutral commit-candidate isolation evidence，有效結果不能以 deterministic fixture、歷史 `done`、native emergency pathspec 或移除 declared intersection 取代。
- exact composed candidate 在 neutral-steward apply 前已通過 sealed、command-backed semantic validator union；semantic-break negative control 具有鑑別力，failed/unavailable/inconclusive cell 的 canonical write count 為 0。
- 所有 safety／governance runtime gates 在各自 close 前具有 card-attributable source/frozen parity；共用 build 不得弱化逐卡證據。
- 所有 closure-critical claims 都由 0251 predicate contract 與 0252 independent gate 判定；command exit 0、producer label、低 realness 或 missing-to-zero fallback 不得滿足驗收。
- Plan-global closure 具有 pre-sealed locked-policy verifier receipt；另一位 actor 的簽署只能作補充 review，不能獨立 close Plan。
- correctness 七個零值成立，observed coverage 100%，沒有 active stale BCR/ticket/direction-lock authorization。
- `parallelOverlapRatio >= 0.30`、`serializedAdmissionRatio <= 0.70`，且 unresolved starvation 由 pre-sealed threshold 自動判定。
- paired performance 必須具有 pre-sealed A/A null-control 與 dispersion evidence；AB/BA 的 25% 增益若未超過 A/A noise bound，結果只能是 `inconclusive`。
- 0245 最終宣稱只涵蓋已實證的 N=2、單一 canonical worktree/base/HEAD、同檔 disjoint bounded intents；N>2 fairness 與任意 workload 並行保持未證明，不得由 N=2 結果外推。
- healthy replay 沒有非注入 breaker trip 且 queue-only residency 為 0；故障演練能自動 trip 到 `queue-only`，並只能以新的 passing evidence digest reset。
- 2.2 未完成驗收被逐項映射為 `satisfied`、`superseded-with-evidence` 或仍 `open`；只要有一項 open，3.0 保持 active。
- target/planning closeback 具有 0253 durable saga receipt；任一 authority 的 manifest-required remote SHA 不可達、push receipt 缺失、pending、CAS drift 或 reconcile 未完成時，3.0 保持 active。

## Out Of Scope

- 不重寫已驗證完成的 2.2 功能，不重新建立 batch/ticket/task 模型。
- 不把 Git branch/worktree merge 變成正式平行 lane。
- 不為單一 skill、actor 或三個歷史 shared paths 增加特例。
- 不以人工刪除 `.atm` 狀態、偽造 receipt、`--no-verify` 或 waiver 取得綠燈。
- 不在本計畫擴張 Python adapter、無關 UI、定價或其他 ATM 全域 backlog。

## Rollback

任何 default-on 變更失敗時，以 policy CLI `trip` 回 `queue-only`，保留 ticket/proposal/evidence 並停止新 compose publish。程式回退使用 revert commit；0227 legacy fail-closed guard 不得因回退而重新啟用無 generation/grant 的授權。runtime disposition 使用正式 reconcile/migrate/cancel 命令，不直接改 JSON。0233 migration 在 apply 前必須產生 immutable snapshot receipt，並可用 `broker migrate --rollback <receiptDigest>` exactly-once 復原 canonical state；沒有 passing rollback drill 不得 rollout。Plan 3.0 不回寫或抹除 2.2 歷史證據。

## 2026-07-21 Protected Closure Repair Update - validator scheduler and replay surface

Target repo framework `main@8920995675ada7c26786cacaa09ae2321e34b6ab` is pushed and verified against `origin/main`. This repair resolves the prior public frozen replay CLI gap and the validator orchestration ambiguity without closing Plan 3.0.

Evidence now available:

- Frozen `node atm.mjs broker replay status --json` exists and fail-closes with `verdict: remain-open`. Remaining blockers are exactly: real dogfood registered candidates `0/2`, and command-backed 420-cell matrix `0/420`.
- `validate:standard` run `standard-20260721232112` completed `87/87 passed`. The runner now emits `atm.validatorSchedulerDiagnostics.v1` and distinguishes parallel-only resource contention from true validator failure via isolated rerun.
- The observed `validate-tasks-surface` failure was classified as `true-validator-failure`, not resource contention. The generic repair changed the release artifact authority rule: runtime values are checked from release dist JS; type/source contract is checked from the root-drop TypeScript source, because current package build does not promise per-module `.d.ts` files.

Plan 3.0 remains active. The public frozen replay surface and standard validator orchestration are no longer blockers, but 0234/0235 cannot close until real two-card dogfood and command-backed 420-cell performance evidence exist.

## 2026-07-27 Runner-sync Continuity Addendum

Real Plan 3.1 dogfood exposed a missing resilience boundary: a coalesced
runner-sync reservation can expire during a valid full build, while an unrelated
parallel commit can advance HEAD after the build seal. A whole-HEAD equality
rule would incorrectly make normal parallel delivery depend on every captain
remaining idle; merely increasing a fixed TTL would preserve the same shallow
coupling.

`ATM-GOV-0266` is the single owner for this correction. It introduces a durable
runner-sync session with immutable `sealedSourceSha`, aggregate
`runnerInputTreeHash`, and a content-addressed runner input/output graph. At
publication, the session classifies the delta from seal to current HEAD by
runner-affecting paths. Non-runner changes remain publishable with the existing
verified build. A runner-input change rebuilds only its declared graph closure,
reuses outputs whose recorded input digests still match, and regenerates one
fenced aggregate manifest; an unknown dependency fails closed. One version
manifest records the distinct development candidate, sealed-and-verified local
runner, and externally published release states, so no surface can relabel an
unpublished artifact as a release. The session renews its build lease, persists
a provisional receipt before publication, and reconciles interrupted builds from
fenced evidence rather than manual lock cleanup.

Task admission obtains its execution runner from this registry rather than
assuming that one global latest build must serve every task. The registry returns
the highest trusted version compatible with the card's declared capabilities,
validator/schema contract, required surfaces, and sealed-input boundary. A
non-latest selection is valid only with an attributable compatibility receipt;
otherwise ATM fails closed and requests revalidation or a new build.

Coalesced build evidence has two levels: an immutable group manifest naming all
member tasks and a child receipt attributable to each member. A head-owner
receipt is insufficient evidence for another task. After receipt publication,
the steward remains in durable `receipt-published` state until an explicit
release or reconciliation records the terminal outcome; the queue may not
silently disappear while presenting an auto-release command. This requirement
comes from the 2026-07-27 three-card dogfood recovery, where a valid build was
sealed but only the head owner had a receipt.

The retained dist/release outputs from that recovery are scope-admission inputs
for ATM-GOV-0266, not publishable delivery artifacts. They remain unstaged and
cannot be used to close a non-head member until the repaired lifecycle creates
the group manifest and every child receipt.

Every runner-backed task writes its selection receipt at admission and execution
attestation at close. `ATM-GOV-0267` then independently recomputes those choices
from sealed registry snapshots, runs a deterministic counterfactual corpus, and
uses future task cards only in shadow mode. A successful task is valuable
telemetry, but never sufficient proof that the version-selection policy was
correct or safe to promote.

### Runner Version Development Order

| Order | Card / boundary | May run with | Required outcome |
|---|---|---|---|
| 0 | Current 0240/0248/0029 coalesced closeout evidence capture | No manual release, receipt edit, rebuild, close, or push | Preserve the head-owner-only receipt and vanished queue as the recovery fixture; park or transfer blocked lanes through normal lifecycle commands. |
| 1 | 0266 governed recovery, deep-module review, lifecycle-record bridge, and Phase A contract handoff | 0267 planning and fixture review only | Repair the receipt/reconcile path and persist each parked card's blocked/released history without releasing the active recovery claim; then seal the version/selection receipt schema, public requirement/version contract, and deterministic fixture digest. |
| 2A | 0266 durable session, input graph, registry, and publication implementation | 0267 verifier/replay work | Build the production owner module and its thin adapters. |
| 2B | 0267 pure verifier and counterfactual replay | 0266 session implementation | Consume Phase A read-only fixtures; do not modify registry or lifecycle evidence adapters. |
| 3 | 0266 + 0267 integration checkpoint | Ordinary tasks only in shadow selection mode | Verify task receipt/attestation against the sealed registry and collect disagreement telemetry. |
| 4 | 0267 policy-promotion verdict | No concurrent policy promotion | Promote only after the independent report passes with zero false-compatible grants. |

#### 2026-07-28 amendment: ATM-GOV-0268 producer-contract prerequisite

A read-only preflight of `ATM-GOV-0267` found that the Phase A surface sealed by
`ATM-GOV-0266` is narrower than what an independent qualifier can consume. There
is no serializable registry snapshot, no `policyVersion` on the selection
receipt, no explicit candidate ordering behind the plan's "highest trusted
compatible version" wording, no representable revalidation boundary, and
`runnerExecutionAttestation` exists only as card prose with no type, schema, or
producer. The taskflow selection adapter also has no caller, so shadow mode has
no production integration point.

`ATM-GOV-0268` is inserted as the producer-side owner of exactly those gaps, and
`ATM-GOV-0267` is narrowed to a pure consumer: ports, verifier, counterfactual
replay, and qualification report. Shadow feedback moves out of 0267 — its sink
boundary belongs to 0268, and live shadow rollout stays at Order 3.

| Order | Card / boundary | May run with | Required outcome |
|---|---|---|---|
| 2A-bis | 0268 producer contract: registry snapshot, policy version, total candidate ordering, revalidation boundary, execution attestation, shadow sink boundary | 0267 planning and corpus authoring only | Additive, versioned, behaviour-frozen extension of the 0266 surface. No task may be granted a different runner than before. |
| 2B (revised) | 0267 pure verifier, counterfactual corpus, and qualification report | 0268 delivery and ordinary tasks | Consume 0268 values through consumer-owned ports; never edit the registry or the lifecycle evidence adapter. |

Neither card introduces a new `ATM_*` error code. 0267 verdicts
(`qualified`, `unqualified`, `pending-contract`, `revalidation-required`) are
data-shaped per `INV-ATM-009`, which also removes the shared-write contention on
`docs/governance/error-code-registry.json` that a code-based design would have
created.


This ordering lets validation begin as soon as the contract is stable, while
keeping a single production decision owner. A live missing-attribution receipt
is a recovery trigger for 0266, not a reason to leave already-delivered cards
permanently uncloseable. The order avoids the false choice between waiting for
every implementation detail and allowing two cards to edit the same registry
policy.

This is not a retrospective blocker for a current build that already has a
matching sealed input proof. It is a required gate before the next shared
multi-captain runner-sync window. The design preserves `INV-ATM-010`: workers
may make independent normal commits; the neutral steward alone decides whether
those commits affect its runner input boundary.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan doc create","createdAt":"2026-07-21T01:19:26.105Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/end-to-end-auto-batch-performance-plan-v3.md","contentDigest":"sha256:77768264cb2be6c40233560fd4b46d7a5c9fb8bf04dabf1c9d6ae862a002c927"} -->
