---
doc_id: doc_atm_gov_plan_3x_4x_false_green_closeout_20260809
title: Plan 3.0–4.0 False-Green Correction and Complete Closeout Runbook
status: active
family_dir: governance-optimization
owner: atm-core
predecessor: doc_atm_gov_quality_gauntlet_plan_v4
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo_plus_planning_closeback
created_at: 2026-08-09T14:49:05+08:00
updated_at: 2026-08-09T15:44:32+08:00
createdByCommand: atm plan doc create
---

# Plan 3.0–4.0 False-Green Correction and Complete Closeout Runbook

## Purpose

本文件是 Plan 3.0、Plan 3.1、Plan 3.2、Plan 4.0 假綠修正與完整收口的唯一執行方案。完成本文件的全部工作包、退出條件與最終檢查表，才可以重新宣告四個計畫完成。

本文件不是新的 completion authority，也不取代原始計畫。它只定義如何修正錯誤收口、如何重建證據，以及如何讓原始 objective matrix 得到合法更新。任何 task ledger 的 `done/released`、單一 focused test、closure packet、runner-sync receipt 或 Doctor 綠燈，都不能單獨把計畫標成完成。

## Follow-up: projection freshness after canonical closeout

`ATM-GOV-0374` owns only regeneration of the runbook-completion and
release-authority projections when a later canonical closeout changes their
inputs. It deliberately does not reopen the historical implementation cards or
change their verifier logic. A refreshed `not-complete` verdict is correct
progress evidence, not a failure to be overwritten.

`ATM-GOV-0375` owns deterministic replay of the release-review projection.
Validation must reuse a sealed projection timestamp only for identical declared
inputs; changed authority inputs remain fail-closed and require regeneration.

目前正式裁決固定為：

> `NOT COMPLETE / FALSE-GREEN CORRECTION REQUIRED`

只有本文件最後的「總完成門檻」全部勾選，並由獨立 reviewer 產生 fail-closed certificate 後，才可改變此裁決。

## Scope

- 修正 framework target repo 內的影子認證、循環驗證與錯誤完成宣告。
- 恢復 3KLife planning repo 的單一規劃權威，並完成 planning/target/closure closeback。
- 重驗 Plan 3.0 的 17 條、Plan 3.1 的 23 條、Plan 3.2 的 29 條、Plan 4.0 的 17 個 section anchors；總分母固定為 86，不可縮成四列摘要。
- 稽核並處置 `--no-verify`、protected override、emergency lease、repair-closure、task reset、detached rescue worktree 與事後補證據。
- 修復 validator baseline、CI 選擇面、`validate:test-facade` 與所有 release-grade gates。
- 以真實觀測取代呼叫者自填 boolean、字串與 object literal 的假證據引擎。
- 完成真實 shadow comparison、六 adapter parity、雙 captain hostile dogfood、paired A/B 與 rollback replay。
- 建立可重建、具時間窗、水位、分母、來源與 digest 的可靠數據儀表。
- 重新產生完整 backlog census，修復或正式處置每個 open-like item。
- 以第一性原理、deep-module 與 INV-ATM-001..010 重做最終獨立認證。

不在本文件內直接執行的高風險動作：revert、reset、rebase、merge、force-push、刪除 worktree、刪除 rescue 目錄、清除 foreign residue。需要這些動作時，必須另有 ATM route、具名 receipt、精確範圍與 owner 核准。

## Authority contract

| Authority | Canonical location | Rule |
| --- | --- | --- |
| Planning authority | `C:/Users/User/3KLife/docs/ai_atomic_framework/governance-optimization/` | 原始計畫、objective matrix、本文件與後續 source cards 只在此維護 |
| Target authority | `C:/Users/User/AI-Atomic-Framework/` | 程式、測試、schema、runtime receipts、ATM task/evidence ledger |
| Backlog authority | target repo `docs/governance/atm-bug-and-optimization-backlog.items/*.json` | item shard 是權威，Markdown 是生成 projection |
| Closure authority | target ledger + planning objective matrix + backlog census + release/push provenance | 四者必須 digest-bound 且一致；任一缺失即 `not-complete` |
| Highest authority | AtomicCharter | 不得用本文件、task card、owner note 或 emergency path 覆蓋憲章 |

禁止在 framework repo 內建立第二份 Plan 3.x/4.0 planning matrix、completion checklist 或人工摘要來替代 planning authority。既有 `governance-optimization/plan-3x-4x-objective-*` 影子檔只能作為 correction 對象，不得再被任何 validator 當成完成來源。

## Authoritative inputs

執行前必須讀取並封存 digest：

- `end-to-end-auto-batch-performance-plan-v3.md`
- `end-to-end-auto-batch-performance-plan-v3-2.md`
- `end-to-end-auto-batch-performance-plan-v4.md`
- `plan-3x-4x-execution-checklist-2026-08-08.md`
- `plan-3x-4x-objective-evidence-matrix-2026-07-31.md`
- `plan-3x-4x-objective-audit-2026-07-31.json`
- `plan4-phase-readiness-2026-07-31.json`
- `plan4-backlog-disposition-census-2026-07-31.json`
- `ATM-GOV-3.0-captain-handoff-2026-07-21.md`
- `ATM-GOV-3.1-captain-handoff-2026-07-22.md`
- `ATM-GOV-3.1-captain-handoff-2026-07-25.md`
- `ATM-GOV-3.2-captain-handoff-2026-07-30.md`
- target repo `docs/governance/skills/ATM-SKL-captain-audit-2026-08-08-claude-007.md`
- target repo `docs/governance/skills/ATM-SKL-captain-handoff-2026-08-08-codex.md`
- Claude 隊長稽核輸入 `C:/Users/User/.codex/attachments/61b415cc-78d3-4bbf-8813-215add4a23d3/pasted-text.txt`

最後一項與聊天稽核只屬 finding input，不是規劃或完成權威。任何數量、SHA、狀態與因果推論都必須由 command-backed census 重現後才能進正式證據。

## Known starting findings to reproduce

以下是待重現假說，不可直接當成最終事實：

| Finding | Reported observation | Required reproduction |
| --- | --- | --- |
| Shadow certificate | framework 內 716-byte audit、660-byte matrix、四列 `proven` | 比對 planning/target digest、來源路徑、validator reader path |
| Circular final test | final test 只斷言自寫 JSON 為 `proven` | mutation/negative control 必須讓 incomplete authority fail |
| Governance bypass | 64 次 `--no-verify`、28 次 broker override、102 protected-override events、72 emergency leases | 由 Git log、audit shards、lease receipts 重新計數；輸出 source availability 與 digest |
| Empty evidence engines | 約 30 個模組無 production caller，只由 focused fixture 呼叫 | 產生 module/caller/source inventory；逐模組確認，不靠檔名推論 |
| Stale mirror | 多張 target ledger `done`、planning source 仍 `planned` | 對每張卡輸出 source/ledger/projection status tuple |
| Backlog divergence | 舊 census 378/169；後續回報 384/167；目前另有 2026-08-09-001..005 | 以 item shards 重建單一 census；差異本身必須有 disposition |
| Test façade red | pre-burst `51ab0b3fe` 因 `hash-placeholders` 失敗；`a548eb381` 已修復該功能缺陷；current HEAD `0d50ba508` 的 `validate-skew-matrix` 單跑可綠，但完整 façade 仍可能因 120 秒硬 timeout 翻紅 | 分開封存「歷史功能紅已修」與「目前效能邊際 flake」；不得把兩者合併成已完成 |
| Rescue topology | registry 現存 23 個 detached `ATM-rescue-*`；3KLife 的 `atm next` 可重現 `ATM_PLANNING_ROOT_AMBIGUOUS` | evidence hold；列出每個 worktree、HEAD、purpose、receipt、write history、repair commit 對應與合法 disposition，封存前禁止 prune/remove |

### 2026-08-09 supplemental adjudication — test façade and rescue topology

本節吸收 2026-08-09 Claude 隊長後續唯讀定位報告。提交存在性、`scripts/validate-test-facade.ts` 的 `--validator-timeout-ms 120000` 與 23 個 worktree registry entries 已由第二次唯讀核對確認；執行秒數仍須在 Wave 0 轉成 sealed command receipts，不能只引用聊天文字。

| Evidence point | Current adjudication | Required durable evidence |
| --- | --- | --- |
| `51ab0b3feb3f7661983cf426f9fa5d9c849007ed` | pre-burst baseline；報告觀測 `validate-skew-matrix` 於 110.2 秒後因六個 plugin-sdk smoke 的 `hash-placeholders` 失敗 | command、環境、exit code、stdout/stderr digest、source/release SHA |
| `a548eb381436c741272cf751fd0f234331a16ab3` | `fix: remove registry hash placeholder` 是應正式認列的真實功能修復；必須保留其 red/green 與回歸責任 | repair diff、failing-before/passing-after receipt、catalog/profile ownership |
| `0d50ba508a866d92fc4e26501a060ac539024140` | 報告觀測單跑 118.6 秒、完整 façade 參數單跑 113.6 秒且 exit 0；完整 `validate:test-facade` 仍於 `performanceRun.exitCode === 0` 斷言翻紅 | cold/warm/loaded 重複樣本、p50/p95/max、timeout/exit/host load、run ID 與 output digest |
| 120 秒 timeout | 現有 1.2–8.4 秒、約 1–7% 的觀測餘裕不足以構成可靠 gate；這是 timing-margin flake，不是 `hash-placeholders` 復發 | 以分布與資源負載決定修復；timeout 必須維持 fail-closed，不得 suppress、retry-to-green 或降級成 pass |
| 23 個 rescue worktrees | 目錄為 `0287 0288 0289 0290 0291 0296 0297 0298 0299 0300 0302 0303 0305 0307 0312 0313 0314 0318 0319 0320 0321 0322 SKL0037`；現況已阻斷 planning-root 確定性 | registry snapshot、每個 HEAD、creation window、對應 repair commit、filesystem write history、exception/approval receipt、INV-ATM-010 verdict |

立即裁決：

- 目前仍是 `NOT COMPLETE`。`a548eb381` 的修復功勞要認列，但不能抵銷另一個尚未修復的 timeout flake。
- 23 個 rescue worktrees 是治理稽核現場；本 runbook 明確禁止現在執行 `git worktree prune`、`git worktree remove` 或刪除目錄。
- 清理只能在 Wave 2 證據封存完成後，另由 owner 核准的 path-bounded cleanup card 執行；清理前後都要有 registry snapshot 與 rollback/recovery 說明。
- 本次文件回寫不接管歷史 actor。後續實作卡由實際 worker 依 identity/claim playbook 採用自己的 actor ID，不得沿用 Claude 或先前 captain 身分。

## Non-negotiable evidence tuple

86 個 objective row 每一列都必須具備下列欄位；任何欄位是 `unknown`、`unavailable`、`stale`、`historical-only` 或 prose-only，該列維持 `not-complete`：

1. 原始 source clause/section anchor、planning commit SHA 與內容 digest。
2. 唯一 owning task card、causal dependencies、start conditions 與 owner atom/map。
3. 可逐條對應 acceptance 的 `requiredTestCaseIds`。
4. focused red/green/negative-control command receipt，含 command、exit code、runner kind、時間與 output digest。
5. 真實執行或 dogfood receipt；fixture 只能補測，不可取代真實證據。
6. target delivery commit、governed tree SHA、runner/source/release digest 與 remote-reachable push provenance。
7. rollback、retry、fail-closed 與 prior-authority restoration replay。
8. known bug/incident refs、generic fixture、repair commit 與 backlog disposition。
9. `atm.deepModuleReviewReport.v1` 或有證據的 non-applicable rationale。
10. source availability、evidence window、watermark、counters、duration、compact digest、non-claims 與 unavailable receipts。

禁止用同一個 writer 自填 `status: proven` 再由同一 writer 的測試斷言該欄位。證書只能由 evidence compiler 讀取上述十項的原始來源後導出。

## Engineering method profiles

- 所有架構與 evidence-engine 重做：`deep-module-refactor`。
- 大型共享模組拆分前：先做 atom/map semantics 與 deletion test，不做旁路 facade 疊加。
- 所有 bug 修復：先依 INV-ATM-009 建立 generalized/data-driven rule；incident ID、actor、日期、路徑與閾值不得硬編碼進 control flow。
- 所有 ErrorCode 新增、變更或退役：經 canonical ErrorCode registry 與 `atm-error-code-resolver`。

## Global stop rules

任一條成立就停止本波實作，保留 prior authority，產生 blocked/unavailable receipt：

- `node atm.mjs next --prompt "<current goal>" --json` 沒有提供合法 mutation route。
- source plan、planning mirror、target ledger 或 projection 無法唯一對應。
- actor identity、claim、ScopeLock、direction lock 或 batch queue head 不明確。
- 要求使用 `--no-verify`、未核准 override、未具名 emergency lease 或 normal-development detached worktree 才能繼續。
- focused test 綠，但 standard/full、test-facade、catalog、neutrality、module-boundary 或 release parity 有紅燈。
- evidence engine 只接受呼叫者自填的成功 boolean/string，沒有可追溯 observer/source adapter。
- dogfood 沒有不同 actor、不同 OS process、同一 canonical worktree 或真實 shared-write surface。
- backlog census 有未分類項、未知狀態或 projection 與 shards 不一致。
- final reviewer 曾參與該 certificate 的 writer/generator/repair 路徑。

## Task authoring and execution protocol

本文件使用既有 governance-optimization / GOV family，不建立新 task series。每個工作包開始前：

1. 用 `node atm.mjs plan card create --planning-root "C:\Users\User\3KLife\docs\ai_atomic_framework" --series GOV --title "<work package title>" --dry-run --json` 取得下一合法 ID。
2. 用同一命令 `--write` 建卡；不得手寫 task card。
3. 卡片需列出 scope、deliverables、validators、evidence、rollback、atomizationImpact、causalGraph 與本文件章節。
4. 執行 `node atm.mjs tasks import --from <generated-card.task.md> --dry-run --json`，確認沒有 fallback 到舊卡。
5. worker 執行前重新跑 prompt-scoped `next`，只照 playbook claim/edit/close。
6. 一張卡只擁有一個 cohesive behavior、interface、evidence contract 或 rollback boundary。
7. shared writes 只走 broker ticket／compose steward；不得以 branch/worktree 當正常隔離。
8. 每卡 close 後先完成 batch checkpoint 與 delivery commit window，才能 claim 下一卡。

## Registered execution card set

下列 19 張 source cards 已透過 ATM plan CLI 建立。GOV 卡負責可長期保留的治理／產品行為；ERR 卡唯一擁有 exact ErrorCode registry 更新；TMP 卡只承載一次性、owner-approved cleanup。卡片檔案本身是完整派工契約，執行者仍須以 prompt-scoped `next` 取得當下 playbook，不得只按表格直接修改。

| Order | Card | Cohesive ownership | Hard dependencies |
| --- | --- | --- | --- |
| 1 | `ATM-GOV-0325` | false-green evidence freeze | — |
| 2 | `TASK-ERR-0007` | `ATM_PLANNING_ROOT_AMBIGUOUS` exact registry contract | 0325 |
| 3 | `ATM-GOV-0326` | planning/target/closure authority reconciliation | 0325 |
| 4 | `ATM-GOV-0327` | bypass and rescue-history audit | 0325, ERR-0007 |
| 5 | `TASK-TMP-0008` | archived, path-bounded rescue cleanup after separate owner approval | 0327, ERR-0007 |
| 6 | `ATM-GOV-0328` | measured test-façade timeout policy | 0325 |
| 7 | `ATM-GOV-0329` | catalog/profile/CI coverage | 0326, 0328 |
| 8 | `ATM-GOV-0330` | observed evidence source adapters | 0326, 0329 |
| 9 | `ATM-GOV-0331` | production caller migration and shallow-shell deletion | 0330 |
| 10 | `ATM-GOV-0332` | reproducible dashboards and 86-row gate | 0329, 0331 |
| 11 | `ATM-GOV-0333` | Plan 3.0 17-row replay | 0327, 0332 |
| 12 | `ATM-GOV-0334` | Plan 3.1 23-row replay | 0333 |
| 13 | `ATM-GOV-0335` | Plan 3.2 29-row replay | 0334 |
| 14 | `ATM-GOV-0336` | Plan 4 foundation-chain replay | 0335 |
| 15 | `ATM-GOV-0337` | real selected/full shadow | 0336 |
| 16 | `ATM-GOV-0338` | six-editor sealed-source parity | 0337 |
| 17 | `ATM-GOV-0339` | hostile dual-captain dogfood, paired experiments, saturation | 0327, 0338 |
| 18 | `ATM-GOV-0340` | backlog census and open-like disposition | 0339 |
| 19 | `ATM-GOV-0341` | independent certificate and governed release | 0340 |

允許的早期平行 frontier 只有：0326、0327、0328 在 0325 完成後處理互不交疊的 authority/audit/performance surface；ERR-0007 可與 0326/0328 平行，但 error registry 只由 ERR-0007 寫。TMP-0008 不屬完成主鏈的自動執行步驟；它只有在 owner 審閱 0327 archive 後另行批准才可動作。其餘主鏈按上表依賴序列收斂。

Authoring verification（2026-08-09）：19/19 source cards 已通過 target frozen runner 的 `tasks import --from <absolute-card-path> --dry-run --json`，沒有 acceptance coverage、frontmatter fidelity 或 unresolved case errors。規劃來源已由 commit `261d893658808b02643768c240a72617b3aee9fb` 封存，19 張卡均已匯入 target ledger。初次未封存匯入留下的 `ATM-GOV-0325` null `planningCommitSha` 以一次受稽核、保留 active claim 的 `tasks import --force --write` 修復；該 emergency lease 與 protected-override audit 皆在 target `.atm` 留存。這項修復不降低任何卡片完成門檻。

## Execution waves

Wave 0–5 是 **Correction Phase**：先修正權威、治理與證據生產能力，不得宣告任何計畫完成。Wave 6–10 是 **Closeout Phase**：只消費已修正的 authority、validators 與 evidence engines 來重跑計畫。

同一個 Wave 只是管理容器，不代表其中工作可並行。只有 task card 的 `causalGraph` 顯示 start conditions 已滿足、scope 不交疊、沒有共同 shared-write surface 時才可並行；文件中標示「序列」的鏈必須逐節封存 evidence 後再進下一節。

### Wave 0 — Preserve evidence and freeze false-green authority

工作包 `WP-00 Evidence Freeze`：

- [ ] 記錄 planning HEAD、target HEAD、origin SHA、runner digest、worktree status 與 current time。
- [ ] 產生 affected-card census、commit-window census、protected-override census、emergency-lease census、worktree census、backlog census。
- [ ] 每份 census 記錄 command、source availability、window、watermark、count、sorted-ID digest 與 unavailable sources。
- [ ] 封存 shadow certificate、原始 authority 與所有 handoff 的 digest，不修改內容。
- [ ] 重現 `validate:test-facade`、`validate:module-boundaries`、quick、standard 的 current-HEAD baseline。
- [ ] 封存本節三點 commit evidence：`51ab0b3fe`、`a548eb381`、`0d50ba508`；將 `hash-placeholders` 功能失敗與 timeout 邊際失敗拆成兩條 lineage，不准以單一 first-bad 結論覆蓋。
- [ ] 對 `validate-skew-matrix` 做 cold、warm 與 façade 前置負載後的重複計時；每次保存 host/process、run ID、duration、exit、timedOut、stdout/stderr digest，不以一次綠燈證明穩定。
- [ ] 對 23 個 rescue worktrees 建立 evidence-hold manifest；在 manifest 與每個 HEAD/write-history digest 封存前，禁止 prune、remove 或手動刪除。
- [ ] 不 revert、不 reset、不清 worktree、不重開卡；本波只讀。

退出條件：所有 reported counts 都已被重現或標為 conflicting/unavailable；有一份不可變的 pre-correction snapshot。

### Wave 1 — Restore one authority and invalidate false completion

工作包 `WP-01 Authority Reconciliation`：

- [ ] 將本文件、原始 objective matrix/audit/checklist/census 納入 planning Git，取得 planning commit SHA。
- [ ] 建立 planning source seal，明確宣告 3KLife 是唯一 planning authority。
- [ ] 以 governed correction route 將 framework shadow certificate 標為 invalid/retired；不得靜默刪除歷史。
- [ ] 讓 final certification validator 只讀 planning-sealed authority 或其 digest-bound imported projection。
- [ ] 針對 0317、0316、0315、0314、0324、0313 與 affected-card census 逐卡執行 `tasks status`/`taskflow diagnose`。
- [ ] 使用每張卡診斷回傳的合法 reconcile/reopen/correction route；禁止直接 `tasks reset --to open`。
- [ ] 更新 planning mirrors，使 source/ledger/projection/closure packet 狀態一致。
- [ ] 產生 `atm.authorityReconciliationReceipt.v1`，列出 retired authority、canonical authority、digest 與 rollback。

退出條件：不存在第二份可被 validator 消費的 completion authority；所有 false-green cards 都有合法 correction disposition；原始 matrix 仍 fail-closed。

### Wave 2 — Audit bypasses and restore canonical execution substrate

工作包 `WP-02 Governance Bypass Disposition`：

- [ ] 對每個 `--no-verify`、override、emergency lease、repair-closure、historical backend、reset 事件建立一對一 audit row。
- [ ] 欄位至少包含 actor、command、time、task、affected files、HEAD before/after、approval、receipt、reason、normal-route availability、result 與 disposition。
- [ ] `approvedBy: NONE` 不得視為批准；缺失批准一律 `unauthorized/unproven`。
- [ ] 對 23 個 `ATM-rescue-*` 與其他非 canonical worktree 分類為合法 closed exception 或違規 normal contribution。
- [ ] 合法例外必須有具名 receipt；未證明者保持 blocker。刪除 worktree 另需 owner 核准，不在本卡自動執行。
- [ ] 精確稽核 `ATM-rescue-0287/0288/0289/0290/0291/0296/0297/0298/0299/0300/0302/0303/0305/0307/0312/0313/0314/0318/0319/0320/0321/0322/SKL0037`；逐一把 detached HEAD 對應到 `chore: repair Plan 4 <X> closure evidence` 或其他實際用途。
- [ ] 若 worktree 被用於正常 per-card 寫入／提交，且沒有 AtomicCharter 允許的具名例外 receipt，該列判為 INV-ATM-010 violation；Git 拓撲不能替代 canonical worktree 仲裁或 broker/steward shared-write contract。
- [ ] 將 `ATM_PLANNING_ROOT_AMBIGUOUS` 納入 negative control：evidence hold 期間允許它維持已知 blocker；完成合法 disposition 與 owner-approved cleanup 後，`atm next --prompt ... --json` 必須不再因 rescue sibling roots 阻斷。
- [ ] cleanup card 必須與 audit/disposition card 分離，列出精確絕對路徑、保留的 archive digest、可復原性及 owner approval；禁止用廣域 glob 或未解析路徑做遞迴刪除。
- [ ] 修復或開卡處理 2026-08-09-001、002、003：checkpoint commit window、released ownership cleanup、pending-commit-aware diagnostics。
- [ ] 增加 checkpoint → pending commit → next claim、stale direction-lock reconcile、runner-sync pending commit 的回歸測試。
- [ ] 證明正常路徑只使用一個 canonical worktree/base/HEAD，shared writes 由 broker ticket 或 compose steward 處理。

退出條件：INV-ATM-008/010 有 command-backed pass receipt；23/23 rescue rows 全部有 disposition；證據封存後的獨立 cleanup 已獲 owner 核准並完成或明確保留；`next` 不再因 rescue planning roots 歧義。

### Wave 3 — Repair validator baseline and CI coverage

工作包 `WP-03 Validator and CI Baseline`：

- [ ] 修復 `npm run validate:test-facade`；證據 lineage 固定拆成：(a) `51ab0b3fe` 的 `hash-placeholders` 功能紅，(b) `a548eb381` 的真實修復，(c) `0d50ba508` 的 120 秒 timing-margin flake。保存各點 failing/passing command、stdout/stderr digest 與修後重跑結果。
- [ ] 另開並註冊 `WP-03A Test Facade Performance Margin` owning card，同步寫入 ATM Bug and Optimization Backlog；不得把此缺口塞入任一舊卡的事後 closure evidence。
- [ ] `WP-03A` 先量測 cold/warm/loaded duration 分布與 p50/p95/max，再選擇降低 `validate-skew-matrix` 成本、拆出 deterministic façade fixture、調整 profile，或以量測安全餘裕提高 timeout；禁止只因本機一次通過就拍腦袋改常數。
- [ ] façade 的介面／排程／performance-output 行為應由快速 deterministic fixture 驗證；真實 `validate-skew-matrix` 整合成本另由 slow/release profile 負責，兩者都必須保留 fail-closed timeout semantics。
- [ ] 修後在無負載與 façade 前置負載兩種條件重複執行，證明沒有 timeout、orphan child 或 retry-to-green；樣本數、停止規則與可接受 margin 必須在卡片 acceptance 中事前宣告。
- [ ] 保持 `npm run validate:module-boundaries` 綠；negative fixtures 至少覆蓋 public-api、consumer、adapter、unlisted-module 四類 breach，輸出分類與 offending import path。
- [ ] 確認所有 Plan 4 focused tests 在 canonical test catalog、quick/standard/full 選擇器與 CI 中有明確責任。
- [ ] 主 CI 至少執行 typecheck、lint、test、standard；release lane 執行 full、release parity、runner smoke 與 SBOM/package checks。
- [ ] `validate:full` 必須使用可 resume/status 的 run ID；timeout 必須產生 partial summary 並清理 owned children。
- [ ] 禁止只挑 focused test + typecheck + validate:cli + git-head 作為 phase/final close 的全部證據。
- [ ] 增加 mutation/negative controls：wrong manifest digest、stale coverage、uncovered obligation、fake incident、self-issued certificate 都必須紅。
- [ ] 記錄每個 profile 的 DAG、選取原因、cache hit/miss、duration、skipped/failed/timeout 與 output digest。

Profile 責任固定如下：

| Profile | Responsibility | Required timing |
| --- | --- | --- |
| focused | 單卡 red/green/negative control；不能代表 phase 完成 | 每卡 edit/close 前 |
| quick | touched/focus-path 快速回饋；不能代表 release | 每批實作後 |
| standard | typecheck/lint/test 之外的主 CI 治理基線 | 每個 delivery commit 與 CI |
| full | 完整 validator DAG、跨 profile/重型/release-grade 信心 | 每個 phase exit 與 final certification |
| release | full + neutrality + catalog + release parity + frozen/root-drop/onefile smoke | 發布與 final push 前 |

baseline 修復與 release 觀測不得混為同一證據：先讓 baseline gate 綠，再由新的 source commit 執行 release profile。

最低命令集：

```powershell
npm run typecheck
npm run lint
npm test
npm run validate:test-facade
npm run validate:module-boundaries
npm run validate:quick
npm run validate:standard
npm run validate:full
```

退出條件：current HEAD 的所有必要 validator 綠；CI/release profile 能選到修正後的 Plan 4 tests；沒有未擁有的紅燈。

### Wave 4 — Replace shell evidence engines with deep modules

工作包 `WP-04 Evidence Engine Replacement`：

- [ ] 先產生 module inventory：public interface、owner atom、production callers、source adapters、test adapters、schemas、fixtures、duplicate seams。
- [ ] 對約 30 個 Plan 4 evidence modules 逐一做 deletion test；沒有 production caller 的模組不得稱為已整合。
- [ ] 以 observer/collector adapter 讀真實 fs、Git、ATM ledger、lock、broker、validator、adapter install 與 process evidence。
- [ ] 純 reducer 只負責正規化與判定；不得讓呼叫者自行宣稱 `recovered`、`rollbackPreserved`、`smoke:true` 或 `status:proven`。
- [ ] 每個 replaceable seam 至少有兩個 concrete adapters；只有一個 adapter 的 seam 保持 internal。
- [ ] 使用 replace-don't-layer：新介面接上 production caller 後移除或退役舊 shallow module/test，不保留雙重權威。
- [ ] 修正 adapter parity：source/compiler/manifest 任一 digest mismatch 必須 blocked；reinstall/frozen smoke 必須由命令 receipt 導出。
- [ ] 修正 structural coverage：stale、uncovered obligation、unknown denominator 必須 fail closed。
- [ ] 修正 incident corpus：讀取 `tests/fixtures/governance-incidents/` 的真實 sealed fixtures，不能在 test 內虛構全綠 incident rows。
- [ ] 修正 0324：修改真正的 record-commit、pre-commit、runner-sync admission、close orchestration 路徑，而非另加未接入 object factory。
- [ ] 每個工作包產生 `atm.deepModuleReviewReport.v1`：interface、invariant、dependency class、adapter count、deletion test、rollback、validators、non-claims。
- [ ] 通過 line-budget 不得靠把整個模組壓成單行；格式化與可讀性 gate 必須檢查 symbol/complexity，而非只看行數。

退出條件：所有計畫關鍵 evidence module 都有 production caller、真實來源、兩 adapter 或合理 internal seam、interface tests、deletion receipt 與 rollback。

### Wave 5 — Rebuild reliable dashboards

工作包 `WP-05 Reliable Evidence Dashboard`：

- [ ] 建立 validator、task/close、dogfood/replay 三層 dashboard schema；dashboard 是 read-only projection，不是 completion authority。
- [ ] validator 層明確消費 `atm.validatorRunSummary.v1`、`atm.validatorDag.v1`、`atm.validatorUsageTelemetry.v1`、`atm.validatorUsageCounter.v1`。
- [ ] task/close 層對齊 `atm.taskViewDashboard.v1`；dogfood/replay 層對齊 replay lifecycle observation/snapshot schema。
- [ ] 從 raw ledgers/receipts 重建，不接受人工填寫 pass/fail。
- [ ] 支援相同輸入 byte-stable replay，並由獨立 validator 重算 digest。
- [ ] 每個 dashboard 顯示 unknown/unavailable/conflicting，不得省略或補零。

每份 dashboard 必備欄位：

| Dimension | Required fields |
| --- | --- |
| Identity | schemaId、specVersion、producer、task/batch/wave、participants、actor/process/OS、readOnly、artifactPaths |
| Time | generatedAt、observedAt、windowStart/windowEnd、watermark、duration |
| Authority | planning/source/runner/release commit 與 digest、policy epoch、catalog digest |
| Denominator | total/selected/skipped/uncovered/unknown/unavailable counts、denominator digest |
| Correctness | pass/fail/false-block/escaped-defect/rollback/retry/idempotency counters |
| Performance | A/A、AB/BA、N、p50/p95、CLI logic/wrapper/process time、cache hit/miss |
| Concurrency | shared surface、logical intents、overlap、queue wait、CAS、steward attribution |
| Validation | validator DAG、commands、exit codes、timeouts、skips、source availability、output digests |
| Closure | readiness、blockers、liveStatus、partialClose、fields、delivery SHA、validation digest、close digest、nextSafeCommand |
| Backlog | total/open-like/terminal/by-severity/by-family、sorted-ID digest、unclassified count |
| Governance | override/emergency/no-verify counts、approval status、receipt refs、INV-ATM verdicts |
| Claims | explicit non-claims、unavailable receipts、stop rule、legacy authority state |

退出條件：dashboard 可由 sealed raw data 重建；所有數字有來源、時間窗、分母與 digest；`artifactPaths` 非空且指向 durable artifacts。

### Wave 6 — Revalidate Plan 3.0, 3.1 and 3.2

原始主鏈必須保留，不得把 objective replay 壓平成沒有因果順序的計分表：

- Plan 3.0：`TMP-0004 + ERR-0003 → 0226 → 0227 → 0236 → 0230 → 0231 → 0228/0229/0232 → 0233 → 0234 → 0235`。
- Plan 3.1：`0247/0251 → 0248/0249/0239/ERR-0005 → 0240/0241/0252/ERR-0004 → 0253 → ERR-0006 → 0254 → 0250 → 0246 → 0237/0238 → 0242 → 0243 → 0244 → 0245`。
- Plan 3.2：`0269 → 0270 → 0271 → 0272 → 0273`。

斜線代表同層候選，只有 scope/causalGraph 證明無 shared-write 衝突時才可並行；箭頭代表硬序列。

工作包 `WP-06 Plan 3.0 Objective Replay`：逐條重驗 §820–§836，共 17 條。必須包含 divergence terminal disposition、protected fault matrix、source/frozen/release/adopter parity、migration rollback、exactly-once receipt、real continuation replay、semantic union、closure predicates、locked-policy verifier、七個 correctness zeroes、telemetry coverage、overlap/admission/starvation、A/A null control、AB/BA bound、N=2 non-extrapolation、breaker/reset、backlog open-item rule、target/planning remote-SHA closeback。

工作包 `WP-07 Plan 3.1 Objective Replay`：逐條重驗 §526–§548，共 23 條。必須包含 exact missing class、shared pure verifier、fake-green rejection、machine authority/realness/two-key close、inconclusive evidence、old/new frozen same-digest red-green、two-process overlap、compose/steward、conflict queue/wakeup、full lifecycle receipts、AB/BA 至少三次、同一 sealed set 的 correctness/performance/cost、incident terminal dispositions、rollback/parity/breaker、runner-sync digest binding、actor continuity、完整 backlog inventory、自主零人工命令 replay。

工作包 `WP-08 Plan 3.2 Objective Replay`：逐條重驗 §124–§135、§166–§177、§179–§183，共 29 條。必須包含 validator progress/partial timeout summary、freshness binding、legal recovery lane、public attestation、target/planning close seam、runner saga、sealed bundle/tree subset、authorized shared delivery、sealed apply、HEAD CAS、queue-only/no override、foreign-work fail-close、compose attribution、deferral order、batch split/handoff、stale repair、parallel prepare、provenance mismatch、stale-batch routing 與每個 incident 的 generic Plan 4 fixture。

這三個工作包可並行做只讀 inventory，但真實 shared-write dogfood 與 final row promotion 按 3.0 → 3.1 → 3.2 序列。每列只在十項 evidence tuple 完整時改為 `verified`。

退出條件：17/17、23/23、29/29 verified；不是只完成 mapping，也不是只看舊卡 done。

### Wave 7 — Rebuild Plan 4 foundation and incident closure

工作包 `WP-09 Plan 4 Foundation Chain` 按原始 causal graph 重驗，不因舊 ledger `done` 跳步：

`0285 → 0306 → 0313 → 0293 → 0294 → 0305 → TASK-SKL-0037 → 0321 → 0318 → 0288 → 0289 → 0322 → 0296 → 0297 → 0298 → 0282 → 0299 → 0290 → 0291 → 0300 → 0302 → 0303 → 0319 → 0320 → 0312 → 0307 → 0287 → 0324 → 0281 → 0283`

此列是保守 topological consumption order，不等同每節只有單一 dependency。每個節點真正的啟動條件以其 source card `causalGraph.causalDependencies` 與 `startConditions` 為準；captain 每節都必須重新跑 status/next，不得只按此文字 claim。`0313` lane 未 released 或 correction disposition 未完成時，後續 catalog-dependent 節點全部停止。

- [ ] 每個節點重新確認 dependency/start condition、planning seal、source/ledger/projection fidelity。
- [ ] 0313 完成 canonical test catalog、alias/lineage migration、full catalog green 與合法 closure attribution。
- [ ] 0307 重播 009/010/011/270/0276/runner-sync/stale-mixed-batch incident families。
- [ ] 0324 真正修復 2026-07-31-002..008 operator regression cluster，逐 bug 提供 red/green、repair commit、rollback 與 fresh evidence。
- [ ] 0312 quality certificate 不得使用 compensating score；任何 unknown/hard blocker 讓 phase blocked。

退出條件：Plan 4 的 17 個 section anchors 每個都有完整 tuple；foundation chain 無 stale mirror、無缺失 incident、無 fixture-only 宣稱。

### Wave 8 — Real shadow, six adapters and hostile dual-captain dogfood

工作包 `WP-10 Real Plan 4 Phase Exit` 必須序列執行：

硬依賴固定為 `0314 → 0315 → 0316 → 0317`，且 `0317` 同時硬依賴已封存的 `0324`。任何節點未通過退出條件，後續節點不得 claim；本 Wave 不允許四張 phase cards 並行。

1. **0314 shadow comparison**：同一 sealed candidate 真正執行 selected 與 full/legacy profile；收集 selected/skipped/false-block/escaped/unknown/latency/cache。任何 escaped defect 使 policy epoch invalid。
2. **0315 six-adapter parity**：Codex、Claude Code、Cursor、Copilot、Gemini、Antigravity 分別 reinstall、verify、frozen-runner smoke；保存 source/compiler/manifest digest 與 degradation diagnostics。
3. **0316 hostile dogfood**：兩個不同 actor、不同 OS process、同一 canonical worktree，真實觸發 shared-index、CAS-head-moved、queue race、close deferral、runner-sync、provenance mismatch、stale batch、foreign dirty 等條件；禁止 override/emergency success path。
4. **paired experiments**：A/A null control；AB/BA 每個方向至少三次；固定 workload/seed/threshold，記錄 correctness、latency、cost、overlap、queue wait 與 rollback。
5. **saturation**：每個 incident family 有 recurrence count、stopping rule、new-family count 與 unknown disposition。

退出條件：真實 receipts 全部進 dashboard；沒有人工 outcome；legacy authority 仍可獨立執行；rollback replay 成功。

每個 hostile branch 的 artifact contract 固定為：sealed input digest、兩 actor/process identity、觸發命令、expected failure/recovery phase、HEAD/index/lock/broker before-after snapshot、exit code、receipt path、rollback result、dashboard row digest。缺任一欄位，該 branch 不算 covered。

### Wave 9 — Complete backlog disposition

工作包 `WP-11 Backlog Census and Repair`：

- [ ] 從 item shards 重建 projection 與 census，先解決 378/384、169/167 等 count divergence。
- [ ] 每個 open-like item 只能有三種 disposition：已由 generic family + owning repair card + test + fresh evidence 修復；有 durable rationale/owner 的 non-confirmed/duplicate；owner-approved deferred exception。
- [ ] deferred exception 仍是 final-verdict blocker，不能轉成 clean。
- [ ] 優先修復本輪 2026-08-09-001..005、2026-07-31-002..012、runner-sync protected-state、stale/mixed batch、warm latency、crash matrix。
- [ ] 每個 confirmed incident 產生 incident-learning candidate、breadth/depth pressure tests 與 owning family；candidate 不得充當 fix evidence。
- [ ] 執行 projection rebuild/validation，確認 Markdown 與 shards byte-consistent。

退出條件：`unclassified=0`；`open-like=0` 才能 final pass。若存在 owner-approved deferred exception，整體維持 `not-complete`。

### Wave 10 — Independent final certification and release

工作包 `WP-12 Independent Four-Plan Certification`：

- [ ] certificate writer、test/fixture generator、implementer、reviewer 至少角色分離；final reviewer 不得改寫受驗 evidence。
- [ ] reviewer actor 不得是任何受驗 row 的 implementer、evidence producer、fixture generator、closure actor 或 protected override approver；只能讀 sealed artifacts 並產生自己的 review receipt。
- [ ] certificate compiler 與 reviewer 使用不同輸出路徑；reviewer 以 raw source digests 獨立重算，不讀 writer 的 overall verdict 作為輸入。
- [ ] certificate compiler 直接讀 planning-sealed 86-row matrix、target receipts、backlog census、dashboard artifacts、runner/release provenance。
- [ ] 分別輸出 objective verdict、card-state verdict、incident/backlog verdict、evidence-freshness verdict、charter verdict、release/push verdict；不得用一個 `status: proven` 遮蔽子維度。
- [ ] 任何 unresolved/unknown/unavailable/stale/override/no-verify/unauthorized receipt 都使 overall `not-complete`。
- [ ] 執行所有 focused validators、typecheck、lint、test、test-facade、module-boundaries、quick、standard、full、catalog、neutrality、release parity、frozen runner smoke。
- [ ] 重建 release runner，證明 source/frozen/root-drop/onefile digest parity。
- [ ] 透過 governed commit/push 發布；保存 remote-reachable SHA 與 planning/target closeback receipt。
- [ ] 獨立 reviewer 重新從 raw sources 重算 certificate digest，結果必須 byte-stable。

WP-03、WP-05 與 WP-11 必須新增並註冊兩個機器化 final gates；命令名稱可由實作卡定案，但 canonical responsibilities 不可更動：

- `validate:four-plan-objectives`：直接計算 authoritative 86-row denominator，拒絕 missing/duplicate row，輸出各 plan verified/not-complete/unknown counts 與 sorted-row digest。
- `validate:backlog-census`：直接讀 item shards、比對 projection，輸出 total/open-like/terminal/unclassified、status histogram 與 sorted-open-like-ID digest。

兩個 gate 都必須進 standard/full/release profile；final certificate 禁止自行重寫相同計數邏輯。

退出條件：總完成門檻全部通過，才可 reversible retirement legacy authority；否則保留 legacy authority 並列出精確 blockers。

## Per-wave rollback

| Wave | Rollback |
| --- | --- |
| 0 | 不修改狀態；丟棄不完整 snapshot 並重跑 |
| 1 | 保留原始 planning authority；撤回 correction projection，不刪歷史 |
| 2 | trip parallel admission；回到 queue-only；保留 audit events |
| 3 | 回復最後全綠 validator selection/profile；不得 suppress red gate |
| 4 | production caller 回切 last-known-good interface；保留新 raw evidence 供診斷 |
| 5 | dashboard 退回 unavailable，不沿用 stale counters |
| 6–8 | 對失敗 row 保持 not-complete；恢復 prior policy epoch/legacy runner；不回滾有效 raw observations |
| 9 | 保留 item shards；若 projection 錯誤，重建 projection，不手改 Markdown |
| 10 | 不退休 legacy authority；不發布 completion claim；輸出 blocked certificate |

## Failure routing

| Failed condition | Return to | Owner boundary |
| --- | --- | --- |
| authority/source/ledger mismatch | Wave 1 | authority reconciliation owner |
| unauthorized override/worktree/commit path | Wave 2 | governance substrate owner |
| rescue worktree evidence 未封存或 `ATM_PLANNING_ROOT_AMBIGUOUS` | Wave 2 | governance substrate owner；禁止先清理再補證據 |
| focused/quick/standard/full/CI red，或 timeout margin/flaky | Wave 3 | validator/CI owner；timeout 不得降級為 pass |
| shallow module、no production caller、one fake adapter | Wave 4 | owning deep module card |
| dashboard stale/irreproducible/missing source | Wave 5 | dashboard/evidence contract owner |
| Plan 3.x row incomplete | Wave 6 | owning original-chain card，不回 final cert |
| Plan 4 foundation/incident incomplete | Wave 7 | owning causal node |
| shadow/adapter/hostile/AB evidence incomplete | Wave 8 | owning phase card |
| backlog open-like/unclassified/projection drift | Wave 9 | backlog item/family owner |
| independent review or release parity failure | Wave 10；必要時回到最早失敗 Wave | certificate/release owner |

## Final completion checklist

### Authority and governance

- [ ] Planning authority 已進 Git，有 commit SHA 與 content digest。
- [ ] Framework 影子 matrix/certificate 已合法 invalidated/retired，不再被 validator 讀取。
- [ ] source card、target ledger、planning mirror、projection、closure packet 全部一致。
- [ ] 所有 bypass/override/emergency/no-verify/reset/repair 事件均已分類並有 disposition。
- [ ] 正常開發只有一個 canonical worktree/base/HEAD；例外都有具名 receipt。
- [ ] 23/23 rescue worktrees 已封存 HEAD/write-history/receipt 並完成 INV-ATM-010 disposition；任何 cleanup 都有獨立 owner approval 與前後 registry snapshot。
- [ ] `atm next --prompt ... --json` 不再回傳 rescue roots 引起的 `ATM_PLANNING_ROOT_AMBIGUOUS`。
- [ ] INV-ATM-001..010 每一條都有 command-backed verdict；不是只引用憲章文字。

### Objective evidence

- [ ] Plan 3.0：17/17 verified。
- [ ] Plan 3.1：23/23 verified。
- [ ] Plan 3.2：29/29 verified。
- [ ] Plan 4.0：17/17 verified。
- [ ] 86/86 rows 都有完整十項 evidence tuple。
- [ ] 所有 architecture rows 有 deep-module receipt、owner atom、interface tests、兩 adapter 或 non-applicable rationale。

### Real execution and dashboard

- [ ] shadow selected/full 是同一 sealed candidate 的真實執行。
- [ ] 六 adapter reinstall/verify/frozen smoke 全部 command-backed。
- [ ] hostile dogfood 使用兩 actor、兩 process、同一 canonical worktree，且無 override/emergency success path。
- [ ] A/A 與 AB/BA 達到計畫樣本數，保留 workload/seed/threshold。
- [ ] dashboards 有 window、watermark、denominator、counters、timing、source availability、digest 與 unavailable receipts。
- [ ] dashboard 可由 raw sources byte-stable 重建，`artifactPaths` 非空。

### Tests, backlog and release

- [ ] fake-green、wrong digest、stale coverage、unknown、uncovered obligation 都有會紅的 negative control。
- [ ] typecheck、lint、test、test-facade、module-boundaries、quick、standard、full 全綠。
- [ ] `validate:test-facade` 在 cold/warm/loaded 的事前宣告樣本集均無 timeout flake；120 秒常數已由量測與 profile 責任取代或獲得足夠、可解釋的安全餘裕。
- [ ] `a548eb381` 的 hash-placeholder 修復有獨立 red/green regression evidence，不被 timeout 修復覆蓋或誤判為未完成。
- [ ] catalog、neutrality、release parity、Git-head evidence、frozen runner smoke 全綠。
- [ ] full validator 沒有 failed/timeout/orphan；若 resume，summary 覆蓋完整 run ID。
- [ ] backlog census 與 shards/projection 一致，unclassified=0、open-like=0。
- [ ] 2026-08-09-001..005 與 2026-07-31-002..012 都有 terminal repair evidence。
- [ ] source/frozen/root-drop/onefile parity 通過，runner sync queue 為空。
- [ ] target 與 planning commits 都 remote-reachable；closeback receipt 綁定兩邊 SHA。
- [ ] final certificate 由獨立 reviewer 重算且 byte-stable。
- [ ] final certificate 分維度報告，沒有被單一 overall label 掩蓋的 blocker。

## Definition of complete

只有同時滿足以下等式才算全部完成：

```text
Complete =
  authority reconciled
  AND 86/86 objective rows verified
  AND real dogfood/replay complete
  AND reliable dashboards reproducible
  AND backlog open-like = 0
  AND all required validators green
  AND INV-ATM-001..010 proven
  AND source/frozen/release parity green
  AND planning/target remote closeback complete
  AND independent certificate reproducible
```

任何一項為 false、unknown、unavailable、stale 或 conflicting，結果都是 `NOT COMPLETE`。

## Wave 3 recovery follow-up: current-task close evidence classification

Observed during `ATM-GOV-0349`: a successful governed commit can generate a
current-task live-index reconciliation receipt after bundle planning. The next
pre-close then classifies that same receipt as unexpected staged residue because
bundle assembly and pre-close use different recognition rules. This creates an
evidence-only commit loop and violates the plan's false-green correction goal.

`ATM-GOV-0350` owns the generalized repair. It extracts one current-task close
evidence result contract, used by both bundle assembly and pre-close. The
contract admits only supported, task-identified evidence types; foreign and
unknown evidence remains fail-closed. The required proof is a focused
idempotence fixture, not a task-ID-specific exception or a broad validator run.

## Wave 3 recovery follow-up: deferred foreign index transaction atomicity

Observed while delivering `ATM-GOV-0350`: a governed commit using
`--defer-foreign-staged` can fail after entering the shared-index path and leave
staged deletions or other altered foreign entries behind. This is a generic
transaction-boundary regression, not a 0350-specific evidence rule.

`ATM-GOV-0351` owns the repair. It extracts one deferred-index transaction
module with exact path/mode/blob baselines and one finalization boundary for
success, failure, and unprovable-restore outcomes. The focused fixtures must
prove that injected post-mutation failure restores the entire pre-state and
that successful task-scoped commits preserve multiple foreign entries. No raw
index repair, alternate worktree, hard-coded task ID, or broad validation run
may substitute for that proof. This recovery is a prerequisite for resuming
0350/0349 closeout and the Wave 3 runner publication lane.

## Wave 3 recovery follow-up: current authority snapshots for cross-task mutation

Observed during the correction runner-publication window: an old frozen runner
can classify the historical scope of terminal/released tasks as a live source
owner, then preserve that obsolete incident indefinitely. This is neither a
valid lock nor a valid active claim, and clearing foreign staged evidence or
incident files by hand would conceal—not repair—the authority split.

`ATM-GOV-0369` owns the general repair and publication. Cross-task source
ownership must consume a current canonical authority snapshot: a terminal
released task cannot own a source path, while a live claim, active lock, or
broker intent still blocks. Foreign task-history evidence remains fail-closed
for every task state. The proof includes a terminal-scope negative case, a
foreign-history preservation case, stale-incident reconciliation, and a fresh
frozen-runner doctor result. This is a Wave 3 prerequisite; until it passes,
the validator/runner path remains `NOT COMPLETE`.

## ErrorCode Registry Migration Note

本計畫不授權搬移 ErrorCode registry。若修正工作需要新增、變更或退役 `ATM_*` code，必須使用既有 ERR family 與 canonical `docs/governance/error-code-registry.json`；同步更新 emitter、generator、schema、`docs/ERROR_CODES.md` 與 focused tests。

## Governance substrate follow-up: operation-owned transient residue lifecycle

Observed during the 0359/0360 runner publication window: failed, timed-out or
stale-CAS build attempts can leave generated outputs whose producer is known
but whose durable cleanup ownership is not. A later queue-head can safely
reconcile them only after reconstructing an exact digest-bound takeover plan.
Fail-closed primary behavior is necessary but insufficient when the operation
externalizes its cleanup cost to the next actor.

`ATM-GOV-0363` owns the generalized correction. It promotes operation-owned
transient-artifact lifecycle management to `INV-ATM-012`, introduces one deep
cleanup receipt contract, a normal `atm cleanup` facade and the
`atm-residue-cleanup` skill. Every success, failure, timeout and cancellation
must end in byte-identical restoration or a durable, owned, resumable recovery
receipt. Unowned residue, broad cleanup and incident-specific allowlists are
forbidden. This follow-up does not change the current four-plan verdict:
until 0363 and the original completion gates are command-backed, the result
remains `NOT COMPLETE`.

## Wave 3 recovery follow-up: authoritative committed context for evidence-only closeback

Observed while closing `ATM-GOV-0372`: the task's source delivery and canonical
task ledger were already committed, but the normal evidence-only closeback
bundle was rejected because the pre-commit hook recognized task context only
when the ledger or transition was staged again. Re-staging an unchanged ledger
would create an endless closeback loop; bypassing the hook would hide it.

`ATM-GOV-0373` owns the generalized repair. Protected evidence admission must
resolve one semantic task identity from payloads and admit an evidence-only
bundle only when an authoritative committed ledger proves that same identity.
Missing, malformed, mismatched, multi-task or filename-only context remains
fail-closed. The implementation extracts a committed-context result contract
from the near-limit hook facade, with focused positive and negative Git-backed
fixtures. This remains a prerequisite for 0372/0362 closure and therefore does
not alter the current `NOT COMPLETE` verdict.

## Wave 10 recovery follow-up: sealed projection publication bundles

`ATM-GOV-0376` owns the general freshness rule for generated closeout
projections. A projection must validate its declared input snapshot against a
sealed, data-declared publication bundle, rather than assuming that only one
hard-coded output path may change after observation. The permitted descendant
delta is the bundle's declared generated artifacts plus durable governance
receipts; any other source, authority input, or undeclared projection change
must remain stale and fail closed. This repair restores reproducible dashboard
validation only. It does not alter the 112 objective rows, any Wave exit, or
the current `NOT COMPLETE` verdict.

## Wave 10 recovery follow-up: post-delivery projection rebase

`ATM-GOV-0377` owns the bounded convergence step after a projection producer
source delivery. Source and test changes are never publication-only: the
canonical projection must be regenerated from that committed producer head in
a separate projection-only publication. Subsequent closeback may add only
durable governance receipts already admitted by the sealed bundle. This does
not alter any objective evidence or the current `NOT COMPLETE` verdict.

## Wave 10 recovery follow-up: semantic planning snapshots

`ATM-GOV-0378` owns the planning-side counterpart. Closeback lifecycle fields
and durable task events are not planning-contract changes, so projection
freshness must bind a sealed semantic snapshot of the runbook and discovered
task-card contracts—not an incidental repository-wide planning HEAD or raw
task-card bytes. Any change to requirements, validators, acceptance,
dependencies, scope, deliverables, or contract fields remains fail-closed.
This repair does not alter the current `NOT COMPLETE` verdict.

## Wave 10 recovery follow-up: post-semantic-snapshot projection rebase

`ATM-GOV-0379` owns the one projection-only convergence publication after the
committed semantic-snapshot producer delivery. The producer is a real source
change and must stale any projection that predates it. The successor may change
only the canonical generated projection and must validate from the committed
producer HEAD after its own closeback. It must not convert the source delivery
into a freshness exception or promote the current `NOT COMPLETE` verdict.

## Wave 0 recovery follow-up: current-head evidence freeze replay

`ATM-GOV-0380` replays the Wave 0 evidence collector at the current sealed
authority snapshot. Its output preserves raw command receipts, timeout and
availability states, plus worktree and rescue observations; it never converts a
negative, missing, or unavailable observation into pass. This is a prerequisite
for independent Wave 0 exit evidence and does not change `NOT COMPLETE`.

## Wave 0 recovery follow-up: sealed freeze artifact verifier

`ATM-GOV-0381` adds a fast verifier for the sealed Wave 0 freeze artifact. It
checks receipt coverage, digests, current authority observations and explicit
`remain-open` semantics, allowing later completion mapping to consume one
heavy collector window rather than duplicate it. Malformed, missing or promoted
artifacts fail closed; this does not change `NOT COMPLETE`.

## Governance usability follow-up: lossless hook failure diagnostics

Observed in repeated governed-commit dogfood, including the Wave 3 recovery
work: a hook can correctly produce a structured failure envelope while the
governed commit wrapper exposes only a truncated fragment. Operators then must
re-run internal hooks or inspect opaque persisted output to identify the actual
blocking code and recovery command. This wastes recovery time and violates the
plan's fail-fast objective without changing the underlying guard decision.

`ATM-GOV-0401` owns one summary-first diagnostic transport contract shared by
the native pre-commit hook and governed commit wrapper. It must show a bounded
actionable summary immediately and provide a lossless, digest-addressable
structured diagnostic reference. Formatter/write failure remains fail-closed
and must preserve the original blocker; no task, claim, close, runner, release,
or admission rule is changed. This improves recovery ergonomics only and does
not change the current `NOT COMPLETE` verdict.

## Team Agents escalation follow-up: actionable, proportional coordination

`ATM-GOV-0402` is the completed source quickfix for proposal-first recovery:
it makes the existing Team plan/start block machine-actionable without creating
a proposal or weakening broker admission. `ATM-GOV-0403` follows with the
decision layer: `next` must classify observable coordination risk as advisory,
recommended, or required, and must name the minimum Team level and official
state-only recovery. `ATM-GOV-0404` consumes a current Team receipt only at a
proven expensive shared boundary—runner publication, certificate/release
transition, or multi-task closeout. Focused validation and isolated quickfixes
remain ungated. These follow-ups reduce coordination omissions without turning
L5 into a universal serialization mechanism and do not change the current
`NOT COMPLETE` verdict.

## Team Agents runtime follow-up: state-only start must not require execution

`ATM-GOV-0405` is a P0 bounded quickfix exposed by the first valid L5
proposal. Plain `team start` is contractually state-only, yet its current
admission rejects a valid plan when an editor-subagent execution backend is not
installed. State-only start must create no worker execution and must not depend
on execution capability; `team start --execute` remains strictly capability
validated and must return structured recovery when unavailable. This does not
permit a manifest to claim a nonexistent backend, and it does not change the
current `NOT COMPLETE` verdict.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan doc create","createdAt":"2026-08-09T06:49:05.547Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md","contentDigest":"sha256:f309fbdd97312c31602e50a6635ec3a95fd53aa12287b22c3c5991e343278fc7"} -->
