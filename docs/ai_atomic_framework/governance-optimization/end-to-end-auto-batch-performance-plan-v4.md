---
doc_id: doc_atm_gov_quality_gauntlet_plan_v4
title: ATM 4.0 Proof-Carrying Quality Gauntlet and Governance Coverage Closure Plan
status: active
family_dir: governance-optimization
owner: atm-core
predecessor: doc_atm_gov_auto_batch_perf_plan_v3_2
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
created_at: 2026-07-30T20:26:12+08:00
updated_at: 2026-07-31T23:53:02+08:00
createdByCommand: atm plan doc create
---

# ATM 4.0 Proof-Carrying Quality Gauntlet and Governance Coverage Closure Plan

The current four-plan audit ledger is
`governance-optimization/plan-3x-4x-objective-audit-2026-07-31.json`.
It is an evidence index, not a completion claim; its current
`completionVerdict` is `not-complete`.
The reproducible input snapshot is
`governance-optimization/plan-3x-4x-audit-snapshot-2026-07-31.json`.
The phase execution readiness ledger is
`governance-optimization/plan4-phase-readiness-2026-07-31.json`; all four
phase cards currently report `claimReady=false`.
Its recommended topological order is authoritative for dispatch; phase cards
must not be claimed across an unresolved dependency edge.
The order follows a first-principles gate: stabilize identity and evidence
denominators before optimizing selection, prove portability before hostile
contention, and certify only after rollback and legacy-authority preservation
are independently observed. Missing or stale observations preserve the prior
authority and cannot be waived into a pass.

## 0. Executive verdict

ATM 4.0 的主題不是再增加一批零散 validator，而是把 ATM 從「遇到 dogfood
缺陷後補測試」提升成「先建立可枚舉的治理義務，再以案例生成、變異、重播與獨立
證據持續消除缺口」的主動驗證系統。

本計畫採用一個外部 facade 與三個內部 deep modules：

1. `QualityGauntlet` 是 task close、check-in、phase suite 與 release 的唯一外部
   interface。
2. `CoverageUniverseCompiler` 將版本化治理模型編譯成有限、可重播、可證明分母的
   coverage obligations。
3. `ClosureAssuranceMachine` 執行「找缺口、產生案例、隔離執行、縮減、變異、裁決、
   續跑、簽證」迴圈。
4. `CausalRegressionFamily` 把每次真實缺陷編譯成故障指紋、因果鄰域、因素組合與
   累積 regression family；未來只在相關 impact cone 重跑該家族，新復發則擴張
   家族而不是覆蓋舊證據。

ATM 4.0 不承諾「軟體在無限輸入與所有未來環境下 100% 正確」。它能嚴格承諾的是：

> 對 sealed model、sealed bounds、sealed adapter set 與 sealed toolchain 所定義的
> 所有 reachable semantic obligations，已有 100% fresh、command-backed、
> independently-oracled、replayable evidence。

open-world、無可靠 oracle、工具不支援、flaky 未解、equivalent mutant 未證明或 budget
耗盡時，verdict 必須是 `inconclusive` 或 `bounded-sufficient-under-assumptions`，不得
冒充 100%。

## 1. Planning authority and family decision

| Authority | Canonical location |
| --- | --- |
| Planning authority | `C:/Users/User/3KLife/docs/ai_atomic_framework` |
| Planning family | `GOV / ATM-GOV` |
| Family directory | `governance-optimization` |
| Target authority | `C:/Users/User/AI-Atomic-Framework` |
| Closure authority | target repo ATM ledger and evidence |

沿用 GOV family，因為本計畫修改的是 ATM 的 test governance、quality evidence、
close admission、validator economics、multi-agent authority 與 release confidence。
它不是 ErrorCode registry migration、TMP cleanup、單純 oversized refactor 或 Git-only
boundary work。

Family exception：所有 skill template、skill schema、entry routing 與六
editor/provider skill projection 變更改由已註冊的 `SKL / TASK-SKL` family 擁有，
並由 ATM Captain 自己實作。GOV 卡只消費 typed skill/module contracts，不重複修改
skill source。

Plan 4.0 可以在 Plan 3.2 完成前先完成規格、模型與 read-only shadow design，但正式
production cutover 必須消費 Plan 3.2 的 resumable validation、evidence freshness、
legal recovery 與 closeback seams。

責任邊界如下：

- **Plan 3.2** 擁有「依 task causal cone 經濟地選擇、續跑、重用 fresh evidence 與
  合法 close」的 execution substrate。
- **Plan 4.0** 擁有「從真實 escaped defect 學習 semantic family、補因果鄰域與因素
  組合、累積 recurrence memory，再把 derived cases 交給 Plan 3.2 selector」的
  learning substrate。

因此不修改 Plan 3.2 的完成定義，也不在 3.2 臨時塞入第二套 family store；Plan 4.0
可以先做 schemas、in-memory interface tests 與 historical corpus，production routing
integration 則等待 Plan 3.2 seams 穩定。

## 2. Source article: ATM can learn

使用者提供文章的核心不是「人類不用看 AI 程式碼」，而是把人工審查從逐行 diff
上移到意圖、架構、測試預言機、風險與 evidence admission。ATM 應吸收下列能力：

| Article capability | ATM 4.0 interpretation |
| --- | --- |
| Unit tests | interface-level branch、boundary、error、rollback 與 invariant witnesses |
| Acceptance / Gherkin | task card acceptance 與外部 observable outcome 的獨立 oracle |
| Line/function/branch coverage | structural obligations；只證明執行，不單獨證明正確 |
| Changed-code coverage ratchet | check-in 快速層；changed obligations 必須單調不退化 |
| Mutation testing | 驗證測試是否能辨識語意破壞，不能只看是否執行 |
| Acceptance mutation | 分開計算 production mutant 被 acceptance tests 殺死，以及規格本身的變異抵抗力 |
| Cyclomatic complexity | basis-path 風險與 generator 優先序訊號 |
| CRAP | complexity 與 coverage 的 hotspot 指標，不作可抵銷總分 |
| Dependency structure | forbidden edge、cycle、跨層引用與 public-interface bypass hard gates |
| Module size | function/file/interface/dependency/diff blast radius；不只算 LOC |
| Property testing | 以 invariant 與 metamorphic relation 產生大量 witness |
| Model-based testing | 對 task、lane、broker、close、runner 等狀態轉移產生命令序列 |
| Torture / fuzz | random sequence、競態、重試、斷線、重啟、資源不足與長時間壓力 |
| Security / performance / memory / resilience | 各自獨立品質維度與不可互相抵銷 gate |
| Dependency visualization | 可重建 architecture graph 與 changed-edge report |
| Deterministic tool gauntlet | sealed commands、tool digests、environment、seed 與 replay |
| Context reset | 不依賴聊天記憶；以 plan、model、receipt、counterexample corpus 續跑 |
| Evidence review | 人類審查 proof、assumptions、unknowns、risk，而不是相信單一綠燈 |
| First-class tests as workflow | skills 在 bug intake、開卡、派工、evidence、handoff 各入口保存同一條 test-learning lineage |
| Independent exam authority | skills 只能收集、提議、路由與解釋；不能由 Writer skill 同時生成 oracle、降門檻與裁決 close |

ATM 現有 test catalog、causal selector、validator runner、micro receipts、
acceptance predicate、phase suite、realness taxonomy 與 neutral steward 是底座；Plan 4.0
不得建立第二套 test catalog 或第二套 runner。

每次 escaped defect 也必須被視為一次「模型不知道自己不知道什麼」的學習事件：
修復本身只處理當前 counterexample；Plan 4.0 還要沿根因與相鄰 seams 擴張測試，
保存成版本化 regression family。之後相同家族受影響時重跑新舊案例，不相關家族
則不進入 task-close profile；分類證據不足時阻擋 close 並要求補 causal mapping，
而不是全跑或空跑後放行。

## 3. Current evidence and why Plan 4.0 is necessary

Plan 3.1 final evidence 證明 ATM 已能完成多隊長治理與收口，但也留下重要缺口：

- `matrixCells = 70`，但 `commandBackedMatrixCells = 0`。
- formula/artifact-backed matrix 能說明 shape coverage，不能證明每個 cell 都有真實命令
  與正確 oracle。
- ATM-GOV-0269 claim dogfood 暴露 planning seal、import fidelity 與 failed-preflight
  no-write invariant 未被既有測試提前捕捉。
- 現行 repo 有大量 validator script，卻沒有一個 authoritative denominator 能回答
  「哪些治理狀態、轉移、錯誤、恢復與 adapter parity 尚未被證明」。
- 測試新增仍偏 incident-driven；缺少從 model inventory 自動產生 obligations、再由
  generator 填補缺口的閉環。

因此問題不是單純 line coverage 低，而是：

> governance state machine × outer adapters × Git/planning/runtime real states 的
> semantic state-space coverage 沒有被正式建模。

## 4. First principles

### 4.1 Correctness is an obligation relation

一個測試只有在它把一個明確 obligation 與一份獨立 oracle、一次真實 execution receipt
連起來時，才算 coverage evidence。測試檔存在、case 被選中、程式行被執行或 console
顯示綠燈都不等於 obligation 已被證明。

### 4.2 The denominator must not come from the tests

分母必須由 sealed source of truth 產生：

- task/lane/broker/close/runner state and transition definitions；
- public command and interface inventories；
- AtomicCharter invariants；
- task-card acceptance predicates and causal impact edges；
- ErrorCode registry and recovery relations；
- architecture dependency rules；
- language instrumentation inventory；
- adapter and projection manifests。

不能從「目前有哪些 tests」反推出分母，否則漏測的功能會因沒有 test metadata 而消失。

### 4.3 100% is model-relative

finite model 可以被完整列舉；open-world 只能持續搜尋。兩者必須是不同型別、不同
verdict，不能只在 prose 裡提醒。

### 4.4 Coverage and test strength are orthogonal

structural coverage 回答「走過哪裡」；mutation、negative controls、differential oracle
與 acceptance mutation 回答「測試是否能辨識錯誤」。兩個維度都必須存在。

### 4.5 Writer cannot own the exam

Writer 可改 admitted production code，也可提出 test proposal；不可在同一 candidate
epoch 修改 thresholds、oracle、baseline、exclusions、plugin pins、negative controls、
CI policy、waiver 或 final verdict。

Plan 4.0 將這句話落成兩種 operational modes：

1. **No-Team task-card mode**：未啟用 Team Agents 時，任務卡作者就是
   Test Generator。它必須在任務卡內先封存完整的測試 id 範圍，包括
   `testContributions`、`requiredTestCaseIds`、`advisoryTestCaseIds`、
   `phaseTestCaseIds`、oracle refs、expected red predicates、negative controls
   與 protected exam surfaces。任務執行者不得是寫卡者；若同一 actor 要兼任，
   必須有 owner-approved waiver，且不得回溯降低本次 candidate 的考卷。
2. **Team Agents mode**：啟用 Team Agents 時，新增獨立 Test Generator role。
   它在 Writer 開始實作前檢查任務卡目前引用的測試 id 是否合理、是否缺少
   breadth/depth/family/negative/rollback/concurrency/mutation/property coverage，
   並可提出補充、縮減或分層建議。Test Generator 與 Writer 必須是不同 actor，
   且預設使用不同 provider/model family；若 provider 分離不可得，必須留下
   unavailable receipt 與等效獨立性證明，否則只能 advisory，不可 hard close。

### 4.6 Unknown is not pass

缺資料、stale receipt、instrumentation gap、zero tests、unsupported adapter、timeout、
flaky、equivalent-suspected、oracle conflict 與 budget exhaustion 都不是 pass。

### 4.7 Improvement must be monotonic

generator 產生的新案例只有在不破壞既有 hard passes、沒有降低 assertion/oracle strength、
沒有擴大 mock/exclusion、沒有修改 protected exam surfaces，且品質向量 lexicographically
改善時才可被接受。

### 4.8 Evidence must be replayable

所有 case、seed、tool、runner、environment、model、adapter、oracle、input/output 與
receipt 必須可由 digest 綁定。相同 sealed inputs 應產生相同 obligation/case ordering；
非決定性必須被顯式分類。

## 5. Formal definition of proof-carrying 100%

令 sealed governance model 為：

```text
M = (S, A, T, G, I, E, P)
```

- `S`: 受 bounds 約束的 concrete states。
- `A`: commands、events 與 fault actions。
- `T`: transition relation。
- `G`: allow/block/queue/compose/revalidate/rollback guards。
- `I`: safety、liveness、authority 與 no-write invariants。
- `E`: errors and recovery relations。
- `P`: adapter/projection semantics。

以 machine-checkable abstraction relation `~` 形成 reachable quotient：

```text
R = Reachable(M) / ~
```

coverage universe：

```text
O =
  ReachableStateClasses
  ∪ TransitionEdges
  ∪ GuardOutcomes
  ∪ PositiveAndNegativeInvariantWitnesses
  ∪ ErrorRecoveryPairs
  ∪ ConcurrentPartialOrderClasses
  ∪ AdapterParityObligations
  ∪ StructuralObligations
  ∪ NonEquivalentMutants
  ∪ ReplayDeterminismObligations
```

每個 obligation `o ∈ O` 只有在存在 fresh evidence `e`，且：

```text
sealedCase(e)
∧ commandBacked(e)
∧ oracleIndependent(e)
∧ matchingModelAndToolDigests(e)
∧ requiredAssertionsPassed(e)
∧ negativeControlDiscriminates(e)
```

時才算 `proven(o)`。

`strict-model-100-percent` 的必要且充分條件：

```text
proven(O) = required(O)
uncovered(O) = ∅
unknown(O) = ∅
staleReceipts = ∅
falseGreenNegativeControls = ∅
survivingNonEquivalentCriticalMutants = ∅
adapterParityFailures = ∅
replayDivergences = ∅
```

### 5.1 Allowed claims

- `100% structural coverage for sealed changed obligations`
- `100% reachable semantic obligation coverage for model <digest> under bounds <digest>`
- `100% critical mutation discrimination for operator set <digest>`

### 5.2 Forbidden claims

- `ATM 在所有未建模環境下 100% 正確`
- `100% line coverage = semantic correctness`
- `pairwise coverage = full cross-product coverage`，除非有 abstraction proof
- `0/0 = 100%`
- 排除 unknown、unreachable-unproven、flaky 或 unsupported 後宣稱 100%

### 5.3 Structural 100% denominator rules

- statement、function、branch outcome 分開計算，不以平均值合併。
- generated/vendor/declaration-only exclusions 必須在 candidate seal 前由獨立 authority 核准。
- reachable code 不得以 coverage ignore comment 消失。
- unreachable 只有 solver/static proof 加 review receipt 才可移出分母。
- sourcemap、dynamic load、child process 或 instrumentation inventory 不完整時為
  `inconclusive`。
- changed、impacted cone、repository total 必須三層分開呈現。

## 6. Deep-module architecture

### 6.1 External seam: `QualityGauntlet`

```ts
export interface QualityGauntlet {
  advance(request: QualityGauntletRequest): Promise<QualityGauntletTransition>;
  inspect(runRef: string): Promise<QualityGauntletView>;
  replay(proofRef: string): Promise<QualityReplayReport>;
}
```

Caller 只提供：

```ts
interface QualityGauntletRequest {
  readonly kind: 'start-or-resume';
  readonly taskRef: string;
  readonly candidateRef: string;
  readonly checkpoint: 'check-in' | 'pre-close' | 'close' | 'phase' | 'release';
  readonly idempotencyKey: string;
  readonly expectedGeneration?: number;
}
```

Caller 不得提供 thresholds、coverage ratio、validator list、exclusions、oracle、seed、
baseline、waiver、plugin selection 或 final verdict。這些由 sealed authority 解析。

### 6.2 Internal deep module: `CoverageUniverseCompiler`

```ts
interface CoverageUniverseCompiler {
  compile(input: CoverageModelRef): Promise<CoverageManifest>;
}
```

它隱藏：

- inventory discovery and drift detection；
- transition graph and reachability；
- constraint solving and UNSAT proof；
- semantic quotient and abstraction proof；
- partial-order reduction；
- obligation IDs and canonical ordering；
- structural instrumentation reconciliation；
- model/adapter/bounds digest。

### 6.3 Internal deep module: `ClosureAssuranceMachine`

```ts
interface ClosureAssuranceMachine {
  advance(run: AssuranceRunRef): Promise<AssuranceTransition>;
  inspect(run: AssuranceRunRef): Promise<AssuranceView>;
}
```

它隱藏：

- gap selection；
- case synthesis and shrinking；
- validator/mutator scheduling；
- sandbox materialization；
- flaky/equivalent/oracle adjudication；
- evidence freshness and reuse；
- budget accounting and resume；
- stopping proof and certificate。

### 6.4 Internal deep module: `CausalRegressionFamily`

```ts
interface CausalRegressionFamily {
  observe(input: ConfirmedDefectObservation): Promise<FamilyRevision>;
  route(input: RegressionRoutingInput): Promise<RegressionSelection>;
}
```

`observe()` 同時處理首次 defect 與 recurrence：驗證真實 red-before/green-after、
建立 fault fingerprint、尋找或建立 family、擴張 causal neighborhood、生成受
constraints 約束的因素組合，並更新 same-family pack。`route()` 只決定哪些既有
catalog case IDs 因本次 change 與 family 有因果關係而必須執行；它不執行 tests、
不寫 closure evidence，也不取代 validation contract。

它隱藏：

- evidence-backed fingerprint normalization and semantic-family matching；
- upstream/downstream/adjacent-state/sibling-adapter neighborhood expansion；
- factor discovery、constraint solving、exhaustive or bounded combination generation；
- cumulative family revision、dedupe、lineage、minimization and recurrence memory；
- selected-versus-full shadow comparison and escaped-defect feedback。

LLM 可提出 root-cause/factor 候選，但不能單獨授權 family merge、test exclusion 或
close。決策必須回到 sealed observations、registered seams/invariants、constraint
proof 與可重播 receipt。

### 6.5 Internal seams, not caller APIs

```text
QualityAuthorityPort
QualityProbePort
GapGeneratorPort
CandidateSandboxPort
OraclePort
EvidenceJournalPort
ConstraintSolverPort
IncidentEvidencePort
RegressionFamilyStorePort
```

每個 seam 必須至少有兩個真實 adapters，或明確留在 in-process implementation。
不要公開 `discoverGaps()`、`runMutants()`、`openCoverageFile()`、`selectPlugin()` 等
內部步驟。

### 6.6 Deletion test

若刪除上述 modules，coverage denominator、authority resolution、case generation、
mutation、oracle、sandbox、convergence、certificate 與 replay policy 會重新散回
`run-validators`、test catalog、taskflow close、phase suite、各 tool scripts 與
steward callers。若只刪除 `CausalRegressionFamily`，fault fingerprint、因果鄰域、
同根因組合、復發記憶與 selective family routing 會散回 bug intake、incident
fixtures、test catalog、validation selector 與 close adapter。因此這些是真正有
depth、leverage 與 locality 的 modules，而不是 pass-through wrappers。

## 7. State machine and terminal semantics

```text
created
  -> sealing-inputs
  -> compiling-universe
  -> discovering-gaps
  -> synthesizing-cases
  -> minimizing-cases
  -> executing-probes
  -> executing-mutations
  -> adjudicating-uncertainty
  -> evaluating-stop

evaluating-stop
  -> discovering-gaps
  -> synthesizing-cases
  -> executing-probes
  -> executing-mutations
  -> stopped-proven
  -> stopped-sufficient
  -> stopped-indeterminate
  -> blocked-counterexample
  -> human-required
```

合法 terminal verdicts：

| Verdict | Meaning |
| --- | --- |
| `finite-model-proven` | sealed finite model obligations 全數有 proof |
| `open-world-sufficient-under-assumptions` | 已知 obligation 與 saturation policy 通過，但不是 exhaustive |
| `blocked-counterexample` | 已找到確定性錯誤或 surviving critical mutant |
| `indeterminate-flaky` | required evidence 不穩定 |
| `indeterminate-equivalent-mutant` | equivalent 只被懷疑，未被證明 |
| `indeterminate-oracle` | oracle missing/conflicting/heuristic-only |
| `indeterminate-budget-exhausted` | frontier 未空但 budget 用完 |
| `indeterminate-unsupported-adapter` | 所需工具或語言 adapter 不存在 |
| `indeterminate-inconsistent-evidence` | digest、receipt、projection 或 replay 不一致 |

budget exhaustion 是可恢復的停止事件，不是成功。

## 8. Canonical data contracts

### 8.1 `atm.qualityAuthority.v1`

包含：

- authority epoch and owner；
- policy digest；
- `sealedBeforeCandidate`；
- hard/ratchet/trend dimension policies；
- protected exam surfaces；
- plugin allowlist and pins；
- oracle/baseline/exclusion refs；
- negative controls；
- seed commitments；
- budgets and checkpoint profiles。

### 8.2 `atm.coverageManifest.v1`

包含：

- model、bounds、adapter、runner、environment digests；
- abstract reachable states；
- transitions、guards、invariants、errors/recoveries；
- structural obligations；
- partial-order classes；
- mutation operator inventory；
- infeasibility and abstraction proofs；
- deterministic obligation ordering；
- universe digest。

### 8.3 `atm.qualityObligation.v1`

每個 obligation 至少包含：

- stable ID；
- source ref and symbol/range；
- dimension and risk tier；
- precondition/action/expected outcome；
- invariant and acceptance refs；
- impact edges；
- required oracle strength；
- required realness；
- disposition: `required | excluded-authorized | unreachable-proven`。

### 8.4 `atm.qualityProbeReceipt.v1`

必須封存：

- candidate/policy/model/tool/plugin/runner/config digests；
- exact command manifest and cwd identity；
- environment whitelist digest；
- seed commitment and reveal；
- input/output artifact digests；
- exit、timeout、duration、flaky classification；
- source-map and instrumentation status；
- obligation/case bindings；
- evidence realness and producer identity。

### 8.5 `atm.qualityGap.v1`

gap reasons：

```text
uncovered
surviving-mutant
missing-oracle
forbidden-dependency
complexity-regression
security-finding
performance-regression
flaky-required-case
equivalence-unresolved
inconclusive-tooling
stale-evidence
adapter-divergence
```

### 8.6 `atm.testPatchProposal.v1`

Test Generator 只能產生 proposal，不直接寫 canonical source。Proposal 包含：

- gap/obligation refs；
- generator/tool/model digests；
- target test paths and patch digest；
- assertion/oracle refs；
- expected mutation kills；
- forbidden production/policy/config paths；
- deterministic seed/corpus refs；
- no-threshold-change attestation。

### 8.7 `atm.qualityCoverageCertificate.v1`

包含：

- verdict and explicit non-claims；
- model/universe/bounds/adapter/tool/candidate digests；
- non-compensating quality vector；
- uncovered/unknown obligations；
- surviving/equivalent/unexecuted mutants；
- stale/flaky/unsupported receipts；
- negative-control results；
- replay digest；
- assumptions and expiration/freshness rules。

### 8.8 `atm.failureFingerprint.v1`

語意家族鍵不得依賴 task ID、actor、vendor、日期、process ID 或本機路徑，至少包含：

- violated invariant/acceptance/error/recovery class；
- owning module、public seam、state/transition/guard；
- input/data-shape equivalence class and boundary class；
- root causal anchors、event ordering and externally observable outcome；
- write/no-write、rollback and environment class；
- root-cause confidence、supporting/contradicting evidence and canonical digest。

相同錯誤文字或 stack similarity 不足以合併 family；至少要有 invariant/transition 與
一個 root causal anchor 相容。

### 8.9 `atm.causalNeighborhood.v1`

包含 upstream producers、same-policy callers、downstream consumers、adjacent
states/transitions、sibling adapters、error/recovery seams、shared invariant/impact
edges，以及 boundary、timing、ordering、failure injection、write visibility 和
rollback factors。每個 node/edge 都要有 distance、provenance、included/excluded
reason、constraint set、model epoch 與 digest。

### 8.10 `atm.incidentRegressionFamily.v1`

這是既有 test catalog 的 derived shard，不是第二套 catalog。包含：

- stable semantic family ID、revision and digest；
- fingerprint/neighborhood history and incident lineage；
- minimal seed、old/new retained cases and semantic dedupe keys；
- factor model、valid combinations and infeasibility proofs；
- historical-red/current-green/root-cause-mutant discrimination receipts；
- recurrence count、escape rate、catalog group ID and gate-promotion policy。

Family revision 只能 append/expand；刪除 edge 或 case 需要 supersession proof，且不得
移除任何唯一 witness。

### 8.11 `atm.regressionFamilySelection.v1`

包含 sealed candidate/impact cone/catalog digest、selected family/case IDs、deterministic
causal reasons、explicit omissions and disjointness proofs、stale/ambiguous diagnostics、
baseline task/phase cases、estimated cost and selection digest。

Selection 只能補充既有 task-required/phase cases，不能移除它們。分類不充分時
`failClosed = true` 並阻擋 close，要求補 causal mapping；不得以 run-all 或空集合
掩蓋 unknown。

### 8.12 `atm.incidentLearningReceipt.v1`

封存 before/after family revision、accepted/rejected hypotheses、新增 neighborhood
edges/factors/combinations、retained/deduplicated/minimized cases、red/green/mutant
discrimination、selected/full shadow outcome、authority/tool/model/catalog digests 與
explicit non-claims。

## 9. Quality vector: no compensating score

禁止使用一個 `Quality Score = 87` 讓安全缺陷被 coverage 或文件分數抵銷。

```ts
interface QualityVector {
  readonly behavior: DimensionVerdict;
  readonly testStrength: DimensionVerdict;
  readonly structure: DimensionVerdict;
  readonly architecture: DimensionVerdict;
  readonly concurrency: DimensionVerdict;
  readonly security: DimensionVerdict;
  readonly performance: DimensionVerdict;
  readonly operations: DimensionVerdict;
  readonly governance: DimensionVerdict;
  readonly evidence: DimensionVerdict;
}
```

每個 dimension 為：

```text
pass | fail | inconclusive | ratchet-regression | advisory | not-applicable-proven
```

任何 hard dimension 非 `pass`，closure 不成立。

### 9.1 Hard blockers

- acceptance/invariant failure；
- forbidden dependency or cycle；
- critical security finding；
- data migration/recovery verification failure；
- protected exam surface unauthorized mutation；
- zero-test false green；
- stale/replayed evidence mismatch；
- critical surviving non-equivalent mutant；
- canonical worktree contamination；
- commit content attribution boundary violation；
- required adapter parity failure。

### 9.2 Ratchet metrics

- changed and impacted structural coverage；
- mutation score lower bound；
- CRAP and complexity hotspots；
- module/interface size；
- duplication；
- test duration and flaky rate。

### 9.3 Trend metrics

- escaped defects；
- false close / false block；
- generator rounds per closed gap；
- quarantine age；
- rollback rate；
- waiver age；
- time to first counterexample；
- time to stopping proof。

## 10. Coverage-gap closure algorithm

每個 round：

1. Seal candidate、authority、model、catalog、toolchain、environment 與 impact cone。
2. Compile complete obligation inventory；inventory drift 先於 test execution fail closed。
3. 先跑便宜 hard probes：parse/type/lint/schema/protected-surface/dependency。
4. 執行 structural coverage，將 statement/function/branch observations 對回 authoritative
   obligations，而不是直接相信工具百分比。
5. 執行 acceptance、property、metamorphic、negative-control 與 adapter-parity cases。
6. 對有 coverage 但辨識力未知的區域產生 mutation frontier。
7. 對高風險區域產生 fuzz、concurrency、fault、restart、resource-pressure 與 torture cases。
8. 將 observations 正規化為 gaps。
9. 依 lexicographic risk、marginal information gain、cost 與 deterministic digest 排序。
10. Generator 只看 public gap context，提出 test patch proposals。
11. 每個 proposal 在 isolated sandbox 套用，重跑 causal cone 與所有已通過 hard gates。
12. 只有單調改善的 proposal 才進入 candidate set。
13. 用 obligation set-cover、mutation kill-set 與 oracle strength 做 case minimization；縮減
    不得降低任何已證明 obligation。
14. 更新 receipts、frontier、budget 與 resume token。
15. 重複直到 finite proof、合法 bounded sufficiency、確定性 counterexample 或
    indeterminate stop。

當 round 的來源是真實 escaped defect 時，插入 incident learning sub-loop：

1. Seal minimal reproduction、failure observation、pre-fix red、post-fix green 與 oracle。
2. 將違反 invariant、state/transition、causal anchors、資料形狀、event order 與
   write/rollback outcome 正規化成 fault fingerprint。
3. 以 registered causal graph 擴張 upstream、same-policy callers、downstream、
   adjacent transitions、sibling adapters 與 recovery seams。
4. 從鄰域抽出因素與 constraints。critical finite domain 產生所有 valid combinations；
   其他 domain 明確標記 bounded，使用 covering array、boundary、mutation-directed
   與 fault-directed cases。
5. 新案例必須能重現 historical red、驗證 current green，或殺死代表同根因的 mutant；
   否則只保留為未證候選。
6. 將有效案例 append 到相同 semantic family；去重與縮減不得刪除唯一 witness。
7. 用 candidate impact cone 選擇 baseline cases 加相關 family packs；每個選取與省略
   都要有 deterministic causal reason。
8. causal mapping 不足、衝突或 stale 時阻擋 close 並要求補 mapping；不能退回全跑，
   也不能以空 selected plan 放行。
9. shadow 階段以 broad profile 比對 selected plan；若 broad profile 找到漏選的相關
   defect，回寫 escaped edge、擴張 neighborhood，並使 selector policy epoch 失效。
10. 相同 family 復發時 revision 必須單調增加，加入新因素、組合、鄰域邊與
    counterexample；不得只替同一案例換名字。

排序目標不是加權平均：

```text
O(candidate) =
  1. hard blocker count
  2. critical unknown obligation count
  3. critical surviving non-equivalent mutant count
  4. semantic coverage gap count
  5. structural coverage gap count
  6. ratchet regression count
  7. non-critical uncertainty count
  8. runtime and evidence cost
```

只有 `O(new) < O(old)` 且已通過 dimension 不退化時才接受 proposal。

## 11. Test-case generator portfolio

### 11.1 Example and branch generator

- boundary values；
- decision-table combinations；
- each guard allow/block outcome；
- error and rollback branches；
- source/target planning states；
- Git tracked/untracked/staged/unstaged/generated combinations。

### 11.2 Model-based state-sequence generator

- task reserve/promote/claim/release/close/reconcile；
- lane heartbeat/expiry/adopt/handoff；
- broker enqueue/proposal/compose/revalidate/publish/release；
- runner source/frozen sync and cache；
- planning seal/import/amendment；
- close saga and closeback。

### 11.3 Property and metamorphic generator

- idempotency；
- replay determinism；
- encode/decode and import/export round trips；
- same digest metadata upgrade preserves semantics；
- actor/lane renaming does not change policy；
- command order equivalence where transitions commute；
- failure implies no unauthorized write。

### 11.4 Mutation-survivor-directed generator

Governance-specific mutation classes：

- block -> allow；
- stale -> fresh；
- dependency blocked -> ready；
- missing receipt -> pass；
- neutral steward required -> bypass；
- same task second lane -> reentry；
- queue order ignored；
- rollback removed；
- equality/boundary/operator mutations；
- dropped machine-readable field；
- error recovery command omitted or changed。

### 11.5 Concurrency and torture generator

- bounded partial-order interleavings；
- duplicate requests；
- killpoints before/after state persistence；
- timeout and restart；
- stale CAS/base/HEAD；
- foreign staged/unstaged work；
- queue fairness and starvation；
- resource exhaustion；
- long-running validator resume；
- two captains overlapping physical and semantic scopes。

### 11.6 Acceptance mutation

分開兩個指標：

1. production business/governance mutants 是否被 acceptance suite 殺死；
2. acceptance specification mutation 是否被 invariant、property 或 independent oracle
   拒絕。

兩者不可合併成單一 mutation score。

### 11.7 Historical incident replay corpus

每個 dogfood defect 必須成為 generic incident fixture：

```text
tests/fixtures/governance-incidents/<semantic-family>/
```

fixture 不得以特定 task ID、actor、日期或本機路徑成為 production control flow。Incident
只提供 sealed observations、minimal counterexample、expected invariant 與 red/green runner
pair。

Initial required family: `governance-incidents/shared-index-commit-attribution/`.
It covers successful governed commits whose actual tree diff is not exactly the
sealed admitted bundle at path/mode/blob/provenance granularity, plus rejected
admission paths that must leave HEAD unchanged.

### 11.8 Incident-driven causal-neighborhood generator

這個 generator 回答「同一原因還可能在哪些條件組合下失敗」，不是把所有 tests 全跑：

- 從 fingerprint 找 direct match、shared invariant、same-policy caller、sibling
  adapter、upstream/downstream impact edge 與 adjacent recovery；
- 從每個 seam 提取 input class、state、ordering、adapter、environment、failure mode、
  write visibility 與 rollback factors；
- 使用 constraints 移除不可能組合；pairwise/covering array 只可聲稱 sampled
  coverage，critical 小型有限空間才可聲稱 exhaustive；
- 以 original counterexample、root-cause mutant 與 independent invariant 三角辨識；
- 相同 family 復發時提高 expansion radius 或補新 factor，不重置既有 corpus；
- 不相交 family 在 focused profile 明確跳過並留下 disjointness proof。

## 12. Mutation, flaky, oracle and uncertainty governance

### 12.1 Mutation accounting

```text
generated
invalid
killed
survived
equivalent-proven
equivalent-suspected
not-executed
infrastructure-failed
oracle-unresolved
```

只有 `equivalent-proven` 可移出有效分母。`equivalent-suspected` 仍是 uncertainty。

mutation score 必須回報 interval：

```text
lower = killed / (valid - equivalentProven)
upper = (killed + equivalentSuspected + oracleUnresolved)
        / (valid - equivalentProven)
```

close policy 看 lower bound，不看樂觀 upper bound。

### 12.2 Flaky policy

- required case 一次 pass/一次 fail 不可 majority-vote 成 pass。
- required flaky case 必須找到 deterministic replacement、seal environment cause 後重跑，
  或回 `indeterminate-flaky`。
- quarantine 不得讓 required obligation 從 universe 消失。
- attempts、outcome sequence、environment、scheduler lane 與 resource locks 必須入 receipt。

### 12.3 Oracle strength

```text
authoritative
differential-agreement
model-checked
metamorphic
negative-control-backed
heuristic
conflicting
missing
```

required obligation 使用 `heuristic/conflicting/missing` 不得 close。

### 12.4 Negative controls

每個 blocking gate 至少要有：

- one known-good witness；
- one known-bad witness；
- one false-green negative control。

若 known-bad 也通過，該 gate 全部 evidence invalid。

## 13. Authority and anti-gaming model

| Role | May do | Must not do |
| --- | --- | --- |
| Writer | 修改 admitted production scope、提出 tests | 改 policy、oracle、baseline、exclusion、waiver、final verdict |
| Test Generator | 在執行前檢查/產生 required/advisory/phase test case id 範圍、oracle refs、negative controls 與 family selection proposals | 降低既有 oracle、直接寫 production source、宣告 pass、兼任同一 candidate 的 Writer |
| Validator | 在 sealed sandbox 執行 deterministic tools | 信任 Writer 傳入 threshold/skip/healthy boolean |
| Reviewer | 裁決 equivalent、unreachable、合法 exclusion、risk acceptance | 無 receipt 地改當前結果 |
| Neutral Steward | 核對 authority separation、digests、negative controls 後 close | 自行重算另一套 coverage verdict |

### 13.1 Policy epoch

Writer 認為 threshold 不合理時只能開下一 epoch policy proposal。新 policy 不得回溯合法化
當前 candidate 的失敗。

### 13.2 Protected exam surfaces

至少保護：

- acceptance criteria and golden fixtures；
- quality thresholds and coverage/mutation exclusions；
- architecture/security rules；
- baseline and waiver records；
- plugin pins and CI workflows；
- negative controls and hidden challenge commitments；
- certificate/evidence schemas。

同一 Writer lane 修改 protected surface 時，當前 run 失效，除非存在獨立授權與分離
candidate epoch。

### 13.3 Exam-authority separation modes

Task cards are the canonical exam contract. A task is closure-eligible only if
its evidence shows one of these authority shapes:

- **No-Team task-card mode**: the card author generated or confirmed the
  complete test id range before implementation, and the Writer actor is not the
  card author. The card must bind required case ids, advisory case ids, phase
  case ids, oracle refs, negative controls, protected exam surfaces and expected
  red predicates. Later Writer proposals may add tests, but cannot remove,
  weaken or reclassify the sealed exam without a new policy epoch.
- **Team Agents mode**: before Writer implementation, a Test Generator role
  checks the sealed card's test id range and records a selection/amendment
  receipt. Test Generator and Writer must be different actors and must use
  different provider/model families by default, mirroring the Reviewer-vs-Writer
  independence rule. If provider diversity is unavailable, the run records an
  explicit unavailable receipt and falls back to advisory unless Reviewer and
  Steward both accept an equivalent independence proof.

Dispatch, task-card authoring, evidence and close must preserve the selected
mode, `examAuthorActorId`, `testGeneratorActorId`, `writerActorId`,
`providerModelSeparation`, `requiredTestCaseIds`, `advisoryTestCaseIds`,
`phaseTestCaseIds`, oracle refs and protected exam surface digests. Missing or
contradictory fields are `unknown`, not pass.

### 13.4 Seed commitment

Validator 在 candidate seal 前承諾 seed root digest；candidate seal 後以：

```text
seed = H(seedRoot, candidateDigest, runId, generatorId)
```

派生可重播 seeds，避免 Writer 預選容易通過的輸入。

## 14. Adapter architecture

### 14.1 Dependency classes

| Class | Plan 4.0 examples | Design rule |
| --- | --- | --- |
| `in-process` | reachability、canonicalization、coverage arithmetic、ordering | deepen directly; no artificial seam |
| `local-substitutable` | fixture/evidence store、clock、sandbox、solver | internal port + deterministic in-memory adapter |
| `remote-owned` | ATM CI executor、Team validator runtime | port + local child-process and remote-job adapters |
| `true-external` | coverage/mutation/security/performance tools | pinned adapter; raw pass never directly authorizes close |

### 14.2 Probe adapters

- Node built-in test/V8 coverage adapter；
- Istanbul/c8-compatible structural coverage adapter；
- StrykerJS mutation adapter；
- fast-check property/model/concurrency adapter；
- Cucumber/Gherkin acceptance adapter；
- TypeScript AST complexity/CRAP/module-size adapter；
- ATM module-boundary/dependency graph adapter；
- security scanner adapter；
- benchmark/performance/memory/resilience adapter；
- ATM validator runner and micro-receipt adapter。

Python/C# adapters follow the same contracts. Unsupported language capabilities 必須回
`unsupported/inconclusive`，不能回 pass。

### 14.3 Generator adapters

- example/branch generator；
- Gherkin scenario generator；
- property/metamorphic generator；
- mutation-survivor generator；
- fuzz corpus generator；
- concurrency schedule generator；
- historical incident replay generator；
- causal-neighborhood/factor-combination generator。

### 14.4 Sandbox adapters

至少兩個 real adapters：

- local ephemeral filesystem/process sandbox，不使用 normal-development Git branch/worktree；
- containerized CI sandbox。

另有 in-memory adapter 供 interface tests。Generator 永遠不直接取得 canonical writer。

### 14.5 Incident-learning adapters

至少包含：

- ATM ledger/evidence/bug-backlog historical incident adapter；
- governance model/test-catalog/validation-contract projection adapter；
- deterministic in-memory incident/family store adapter for interface tests。

第一個 adapter 將 command-backed red/green evidence 正規化成 confirmed observation；
第二個把 derived family 投影成既有 `atm.testCaseGroup.v1` shards，並將 selection 合併到
既有 validation contract 的 required cases、test contributions 與 causal impact
edges。任何 adapter 都不能繞過 catalog authority 直接執行或 close。

### 14.6 Skill-entry learning plane

Skills 是最靠近人類與 Agent 行為的入口，因此適合負責「何時問、收集什麼、把資料交給
誰」，但不適合保存另一套 root-cause policy、test catalog 或 final verdict。Plan 4.0
採以下責任表：

| Skill | Plan 4.0 responsibility | Produces / consumes | Must not |
| --- | --- | --- | --- |
| `atm-governance-router` / `atm-next` | 辨識 record-only、bug-fix、confirmed incident、recurrence 與 audit intent，選窄路徑 | consumes typed route/selection；surfaces unknown mapping | 自行猜 family 或以 full suite 代替分類 |
| `atm-bug-backlog` | 將「記 bug」升級為 incident-learning intake，記錄測試廣度與深度缺口 | produces `atm.incidentLearningCandidate.v1` | 宣告 root cause、family match、fix success 或 close |
| `atm-task-card-authoring` | 將 confirmed candidate 轉成 acceptance、case IDs、independent oracle、red/green、mutation、protected exam surfaces、exam-author mode 與 family-learning obligations | produces card validation/incident contract and gauntlet profile ref | 只列 validator command、降低 threshold、漏封 test id range 或讓 Writer 控制考卷 |
| `atm-dispatch` | 依風險分離 Writer、Test Generator、Validator/Reviewer；Team Agents 模式要求 Test Generator 先檢查 case id range 並與 Writer 不同 actor/provider/model family | consumes sealed card and current route | 把 Captain identity、oracle authority、Test Generator 權限或未封存猜測交給 worker |
| `atm-evidence` | 驗證 same-case red-before/green-after、independent oracle、selected/omitted reasons、mutation discrimination 與 zero-test | produces confirmed observation and receipts | 以 coverage、exit 0 或 Writer attestation 單獨證明修復 |
| `atm-handoff` | 傳遞 unresolved hypotheses、family revision、new factors、selected/skipped families 與 replay refs | consumes receipts, produces continuation summary | 把聊天推論升格為 canonical family memory |
| `atm-upgrade-scan` | 聚合 recurrent families、escape rate、CRAP/complexity/dependency hotspots，提出測試或 deep-module upgrade | consumes family/evidence trend | 用總分抵銷 blocker 或直接修改 production |
| `atm-deep-module-refactor` | 把 repeated-family evidence 當作 shotgun policy/caller complexity 的架構訊號 | consumes family lineage and causal neighborhood | 只因 file length 或單一 incident 強制抽模組 |
| `mailbox-worker-execution` | 只執行 sealed selection manifest，回報 progress、partial terminal 與 receipt | consumes selected cases | 重算 required set、freshness 或 family identity |

### 14.7 `atm.incidentLearningCandidate.v1`

`atm-bug-backlog` 的新輸出是候選 intake，不是 confirmed defect。至少包含：

- symptom/error/recovery class and affected public seam；
- violated invariant/acceptance refs or explicit `unknown`；
- failing command/receipt、minimal reproduction and externally observable wrong outcome；
- known preconditions、state/transition、data shape、ordering、adapter/environment factors；
- **breadth hypothesis**：upstream/downstream、same-policy callers、sibling adapters、
  adjacent transitions and shared invariants 還應檢查哪些；
- **depth hypothesis**：boundary、negative、rollback、retry、concurrency、mutation、
  property/metamorphic and independent-oracle tests 還缺哪些；
- existing tests that should have caught it and why they did not；
- failed quality-vector dimension and policy kind: `hard-blocker | ratchet | trend | unknown`；
- root-cause hypotheses with evidence/confidence，明確標為 non-authoritative；
- possible recurrence/family refs、privacy/redaction and source availability；
- disposition: `intake-only | needs-reproduction | confirmed-candidate |
  optimization-only | rejected-not-defect`。

Backlog skill 必須允許資訊不足時寫 `unknown/unavailable`，不能為了填滿欄位而虛構。
只有 `atm-evidence` 取得 command-backed same-scenario red/green 與 independent oracle 後，
`CausalRegressionFamily.observe()` 才可建立或擴張 family。

### 14.8 Skill-to-module learning loop

```text
human/agent reports defect
  -> atm-bug-backlog: incidentLearningCandidate
  -> atm-task-card-authoring: acceptance + case/evidence contract
  -> atm-dispatch: separated Writer / Generator / Validator authority
  -> atm-evidence: confirmed red/green observation
  -> CausalRegressionFamily.observe(): family revision + neighborhood + factors
  -> canonical test catalog projection
  -> atm-next / validation contract: focused family selection
  -> mailbox worker / QualityGauntlet: execute and prove
  -> atm-handoff + atm-upgrade-scan: recurrence and structural learning
```

Rollout 分兩期：

1. **Pre-module advisory**：skills 可先收集 candidate fields、指出 missing data、建立
   card/evidence obligations，但不得宣稱 family 已存在。
2. **Typed module active**：skills 只消費 `observe/route` 的 typed output；任何 projection
   不支援新欄位時 fail closed，不能把 machine field 降成 prose。

Skill 變更一律先修改 `templates/skills/*.skill.md` canonical corpus，再由 sealed source
snapshot 編譯至 Codex、Claude Code、Cursor、Copilot、Gemini 與 Antigravity。現有
`atm-bug-backlog` 只有 repo-local skill 而缺 canonical template，必須先補 template
authority、schema validation、projection parity 與 reinstall survival test，禁止只改
`.agents/skills/atm-bug-backlog/SKILL.md`。

Implementation ownership：

- `TASK-SKL-0036` owns incident-learning intake and canonical backlog skill.
- `TASK-SKL-0037` owns the remaining lifecycle skill projections and parity.
- Both cards remain in the ATM Captain's own implementation lane; GOV captains
  receive only their typed outputs and do not edit skill sources.

## 15. Execution profiles and economics

Plan 4.0 不得成為另一個 monolithic、每卡 30 分鐘以上、無進度的
`validate:standard`。

| Profile | Purpose | Required slices |
| --- | --- | --- |
| `check-in` | 秒級至低分鐘 changed-obligation feedback | seal、inventory drift、cheap hard gates、changed structural coverage |
| `task-close` | task causal cone proof | check-in + required acceptance/property + focused mutation + selected incident families |
| `phase` | 跨卡 shared seam 與 adapter parity | task-close + phase-owned obligations |
| `nightly` | deep fuzz、broad mutation、torture、trend | resumable full frontier |
| `release` | finite-model strict certificate and broad open-world assurance | all required dimensions、replay、negative controls |

所有 profile 都要：

- progress events；
- per-probe timings；
- budget and queue state；
- partial terminal summary on timeout；
- resume token；
- freshness reuse；
- information gain per second；
- explicit remaining frontier。

cache key 至少綁定 candidate、model、obligation、tool、config、oracle、environment、
adapter digests。

Focused selection 的效率規則：

- 永遠執行 profile baseline hard gates，再加 selected family packs；
- 「漏水」與「漏瓦斯」只有在 shared invariant、impact edge 或 adapter 重疊時才同跑；
- `nightly/release` 可作 broad audit，`task-close` 不因曾發生任何 defect 就全跑；
- ambiguity/unknown 不是 run-all，也不是 run-none-and-pass，而是阻擋 close 並要求補
  causal mapping；
- rollout 期間用 selected/full shadow 估計 recall；發現漏選即是 selector blocker；
- selection receipt 必須同時證明為何選與為何不選，不能只輸出 case list。

## 16. Interface tests

1. 相同 sealed input 兩次 compile 產生相同 universe digest。
2. 新增 state/command/error/adapter 但 inventory 未建模時 fail closed。
3. reachable state/action 沒有 total outcome 時 model contradiction。
4. prose-only unreachable 宣告不能縮小 denominator。
5. solver-backed UNSAT proof 可合法排除 infeasible obligation。
6. coverage 工具回 100%，但 authoritative inventory 有未知檔案時為 inconclusive。
7. statement 100%、branch 99% 時 strict structural coverage 失敗。
8. `0/0` 為 proven not-applicable，不是 100%。
9. positive case pass、negative control 也 pass 時為 false green。
10. command receipt 缺 nested validator/broker observation 不算 proof。
11. formula-generated shape 不算 real workload evidence。
12. stale runner/environment/adapter receipt 被拒絕。
13. 所有 states 有 witness，但一個 recovery edge 未證明時仍非 100%。
14. 所有 examples pass，但 non-equivalent mutant survived 時仍非 100%。
15. equivalent suspected 沒有 proof 時仍 unresolved。
16. adapter 對同一 abstract case 結果不同時 parity failure。
17. pairwise matrix 不得冒充 full cross-product。
18. concurrency reorder 造成不同結果時必須成為獨立 obligation。
19. open-world known cases 全 pass 只能 bounded sufficient，不能 finite proven。
20. required case alternating pass/fail 時 indeterminate-flaky。
21. mutation runner crash 是 infrastructure failure，不算 killed/survived。
22. mutation budget 用完且 frontier 未空時 indeterminate-budget-exhausted。
23. minimization 移除唯一 kill 某 mutant 的 case時拒絕。
24. generator 提高 coverage 但刪 assertion、擴 mock 或加 exclusion 時拒絕。
25. Writer 修改 protected policy 後，當前 run 不得 closure-ready。
26. frozen/source 對同一 fixture 的 normalized certificate parity。
27. replay events 可重建相同 state/proof digest。
28. 重送 idempotency key 不得重跑 external side effect。
29. failed operation 必須維持 canonical source、ledger、index 與 evidence no-write invariant。
30. close caller 傳 raw ratio 或 healthy boolean 無法改變 verdict。
31. 相同 semantic family 第二次 incident 必須增加 revision 並保留前代 cases。
32. task impact cone 只命中 family A 時，不相關 family B 不得進入 focused plan。
33. family A/B 共享 required invariant 時，兩者皆須被選入。
34. fingerprint/causal mapping unknown 時不得產生可 close 的 selected plan。
35. pairwise 組合不得被標記為 exhaustive root-cause combinations。
36. family minimization 不得移除 historical-red/current-green 唯一 witness。
37. selected plan 全綠但 shadow full 找到同家族 defect 時，selection policy 必須失效。
38. raw incident task ID、actor 或日期改變不得改變 semantic family identity。
39. backlog intake 缺 invariant/root-cause evidence 時保留 `unknown`，不得虛構 family。
40. backlog candidate 不能單獨建立 confirmed family 或授權 close。
41. skill projection 掉 `breadthHypothesis`、`depthHypothesis` 或 machine refs 時 fail closed。
42. Writer 與 Test Generator 產生相同誤解時，independent oracle/negative control 必須辨識。
43. 同一 typed skill output 投影至六種 editor/provider adapters 後 machine fields parity。
44. reinstall/refresh skills 後 canonical incident-learning instructions 與 digest 不漂移。
45. `atm-upgrade-scan` 對 recurrent family 提出 deep-module review，不直接改 production。
46. handoff 缺 family revision/selection digest 時標記 unavailable，不從聊天重建。

## 17. Implementation phases and proposed GOV cards

以下 IDs 依 2026-07-30 planning family 的下一個 free GOV ID `ATM-GOV-0277`
規劃。正式卡必須逐張以 `atm plan card create` 產生；本計畫不以手寫檔取代開卡。

### Phase 4.0-0 — Semantics and authority foundation

| Proposed card | Cohesive ownership | Hard dependency |
| --- | --- | --- |
| `ATM-GOV-0277` | model-relative coverage semantics、quality vector、strict 100% certificate vocabulary | `ATM-GOV-0276` |
| `ATM-GOV-0321` | sealed quality authority、policy epoch、protected exam surfaces、role capability matrix | 0277 |
| `ATM-GOV-0279` | obligation inventory schema and inventory-drift detector | 0277 |

Exit：

- finite/open-world 型別不可混淆；
- denominator 不由 tests 反推；
- Writer 無法控制 policy/oracle/verdict；
- 漏一個 registered state/command/error/public seam 可被 detector 捕捉。

### Phase 4.0-1 — Coverage universe deep module

| Proposed card | Cohesive ownership | Hard dependency |
| --- | --- | --- |
| `ATM-GOV-0280` | `CoverageUniverseCompiler` interface、reachability、canonical obligation IDs | 0279 |
| `ATM-GOV-0281` | constraint solver、infeasibility/abstraction proofs、semantic quotient | 0280 |
| `ATM-GOV-0282` | concurrency partial-order reduction and schedule obligations | 0280 |
| `ATM-GOV-0283` | Task/Lane/Broker/Close/Runner first model adapters | 0280 |

Exit：

- manifest deterministic；
- unproven unreachable 不可排除；
- Plan 3.x historical matrix 只作 corpus，不作 denominator；
- same model 可由不同 execution adapters 消費。

### Phase 4.0-2 — QualityGauntlet and resumable assurance

| Proposed card | Cohesive ownership | Hard dependency |
| --- | --- | --- |
| `ATM-GOV-0284` | `QualityGauntlet` facade and `ClosureAssuranceMachine` reducer/events | 0280, Plan 3.2 0269 |
| `ATM-GOV-0285` | validator/test-catalog selection bridge and resumable probe scheduler | 0284, 0269 |
| `ATM-GOV-0318` | evidence freshness、cache、resume and certificate binding | 0284, Plan 3.2 0270 |
| `ATM-GOV-0287` | legal recovery and checkpoint projection for check-in/close/phase/release | 0284, Plan 3.2 0271 |

Exit：

- caller 只需 `advance/inspect/replay`；
- timeout 產生 partial summary and resume token；
- no zero-test false green；
- close 只消費 stopping proof，不自行重算第二套 verdict。

### Phase 4.0-3 — Structural and architecture quality

| Proposed card | Cohesive ownership | Hard dependency |
| --- | --- | --- |
| `ATM-GOV-0288` | JS/TS structural coverage adapter and authoritative denominator reconciliation | 0279, 0285 |
| `ATM-GOV-0289` | changed/impacted/repository coverage ratchet and baseline migration | 0288 |
| `ATM-GOV-0290` | cyclomatic complexity、CRAP、module/interface size adapter | 0285 |
| `ATM-GOV-0291` | dependency graph、forbidden edge、cycle and public-interface bypass gate | 0285 |

Exit：

- changed obligations strict 100% target；
- whole-repo baseline 不退化並持續收斂；
- unknown instrumentation 不算 pass；
- architecture blocker 不被其他分數抵銷。

### Phase 4.0-4 — Test strength and generation loop

| Proposed card | Cohesive ownership | Hard dependency |
| --- | --- | --- |
| `ATM-GOV-0306` | mutation adapter、lineage、lower/upper score and equivalence governance | 0285 |
| `ATM-GOV-0293` | fault fingerprint、semantic family matching and evidence/confidence policy | 0279, 0306 |
| `ATM-GOV-0294` | causal-neighborhood compiler、factor constraints and combination generator | 0280, 0293 |
| `ATM-GOV-0322` | gap normalization、lexicographic planner and deterministic proposal ordering | 0318, 0288, 0306 |
| `ATM-GOV-0296` | sandboxed test patch proposal、monotonic acceptance and minimization | 0322 |
| `ATM-GOV-0297` | example/branch and mutation-survivor-directed generators | 0294, 0296 |
| `ATM-GOV-0298` | property/metamorphic/model-based generator pack | 0294, 0296 |
| `ATM-GOV-0299` | concurrency/fuzz/torture/fault generator pack | 0282, 0294, 0296 |
| `ATM-GOV-0300` | acceptance/Gherkin and acceptance-spec mutation | 0321, 0296 |

Exit：

- generator 只能提出 proposal；
- 每個 accepted proposal 單調縮小 gap frontier；
- all seeds/counterexamples 可重播與縮減；
- critical surviving non-equivalent mutants 清零；
- family identity 不依賴 task/actor/date/path；
- root-cause combination claims 明確區分 exhaustive 與 sampled。

### Phase 4.0-5 — Hostile quality and anti-gaming

| Proposed card | Cohesive ownership | Hard dependency |
| --- | --- | --- |
| `ATM-GOV-0319` | seed commitment、hidden negative controls and anti-gaming checks | 0278, 0295 |
| `ATM-GOV-0302` | security quality dimension and risk acceptance receipts | 0321, 0285 |
| `ATM-GOV-0303` | performance、memory、resilience ratchet and benchmark evidence | 0285 |
| `ATM-GOV-0320` | independent oracle arbitration、flaky/contradictory evidence adjudication and exam-authority separation enforcement | 0278, 0306, 0319 |

Exit：

- Writer 無法降低考卷；
- No-Team 模式任務卡先封 required/advisory/phase test case ids，且 Writer 不是寫卡者；
- Team Agents 模式 Test Generator 在 Writer 前完成 case-range review，且與 Writer 不同 actor/provider/model family；
- critical negative controls 必須 red；
- required flaky/oracle uncertainty 不得 close；
- security/performance evidence 有各自 hard/ratchet semantics。

### Phase 4.0-6 — Certification, replay and rollout

| Proposed card | Cohesive ownership | Hard dependency |
| --- | --- | --- |
| `ATM-GOV-0305` | cumulative regression family store、catalog projection、selective routing and recurrence revisions | 0293, 0294, 0285 |
| `TASK-SKL-0036` | canonical `atm-bug-backlog` template、incident-learning candidate schema、first-layer intent routing and reinstall survival | TASK-SKL-0031, TASK-SKL-0033 |
| `TASK-SKL-0037` | task-card/evidence/dispatch/handoff/upgrade-scan/mailbox skill projections and six-adapter machine-field parity | TASK-SKL-0036, ATM-GOV-0305 |
| `ATM-GOV-0312` | coverage certificate、quality vector、explicit non-claims | 0318, 0319, 0320, 0305, TASK-SKL-0037 |
| `ATM-GOV-0307` | state/execution replay、proof invalidation, and the seven-family commit/governance incident corpus | 0306, 0293, 0312 |
| `ATM-GOV-0313` | canonical test-catalog namespace migration and full-shard contract | 0306 | dedicated repair for ATM-BUG-2026-07-31-012; imported planned/no-claim; must be green before 0307/0312 completion |
| `ATM-GOV-0314` | Plan 3.x/3.2 selected-versus-full shadow comparison and escaped-defect adjudication | 0305, 0312, TASK-SKL-0037, Plan 3.2 0273 |
| `ATM-GOV-0315` | six editor/provider runtime adapter parity canary | 0307, 0314 |
| `ATM-GOV-0316` | real ATM dogfood、two-captain hostile workloads、incident recurrence learning、saturation evidence and all-branch phase-exit manifest | 0281, 0282, 0283, 0287, 0289, 0290, 0291, 0297, 0298, 0299, 0300, 0302, 0303, 0314, 0315, TASK-SKL-0037 |
| `ATM-GOV-0324` | recent governance operator regression closure and transaction-status receipts | 0307, 0287 |
| `ATM-GOV-0317` | Plan 4.0 final verdict、release gate and legacy-authority retirement | 0316, 0324 |

Phase-card registry note: `ATM-GOV-0313` is an imported planned repair card for
the catalog-contract blocker. `ATM-GOV-0314`–`ATM-GOV-0317` are now the
created/imported successor cards for the formerly reserved phase entries.
Their source cards and target ledgers are planned and not claimable until
dependencies are sealed; their existence is not implementation or phase-exit
evidence. Each must receive complete acceptance, test ids,
validator, causal graph, and rollback fields before dispatch.

Exit：

- strict certificate deterministic replay；
- legacy red/new green 必須有 independent model correction，否則 block；
- six adapter projections parity；
- selected routing 對 shadow full 無 escaped related defect；
- recurrence 單調擴張 family revision、causal neighborhood 與 retained corpus；
- backlog intake 能保存 breadth/depth hypotheses 而不冒充 confirmed family；
- canonical skill corpus refresh 後六種 adapters machine-field parity；
- real dogfood command-backed cells > 0 且所有 required obligations covered；
- rollback 可切回 legacy authority，不刪新 evidence。

## 18. Parallelism and sequencing

### 18.1 May start before Plan 3.2 completes

This section authorizes only bounded, dependency-safe **start** conditions. It
does not certify Plan 3.0, 3.1, or 3.2 completion, and it does not relax the
objective matrix or phase-exit gates in §18.4. A started card remains
non-authoritative until its own evidence tuple and the predecessor plan's
objective matrix rows are verified.

- 0277、0278、0279 的 plan/schema/interface work；
- 0280、0281 的 pure compiler/in-memory interface tests；
- historical incident corpus inventory；
- `atm.incidentLearningCandidate.v1` schema、canonical skill-template inventory and
  pre-module advisory wording；
- read-only tool adapter spikes。

### 18.2 Must wait for Plan 3.2 capabilities

- 0284/0285 production execution depends on ATM-GOV-0269；
- 0286 freshness reuse depends on ATM-GOV-0270；
- 0287 close/recovery projection depends on ATM-GOV-0271；
- 0314 cross-authority shadow rollout depends on ATM-GOV-0273。
- TASK-SKL-0037 lifecycle projection depends on ATM-GOV-0305 typed family/selection seams。

### 18.3 Parallel card rule

可並行的卡必須擁有不同 behavior/interface/evidence/rollback seam。相同 physical file
仍遵守 ATM compose-first proposal/steward contract；不要用 branch/worktree 當正常隔離。

### 18.4 Plan 3.2 + Plan 4.0 captain execution overlay

### 18.4.1 Dual-captain incident gate (mandatory cross-plan contract)

Plan 4.0 quality authority must consume the operational failures found while
Plan 3.2 runs in parallel. The incident corpus is not documentation-only: the
following families are mandatory gate inputs and may not be waived by a green
unit test alone:

1. shared-index commit attribution, out-of-scope tree content, sealed
   prepare/apply, provenance, HEAD-moved CAS, forbidden override success, and
   ordinary-unowned foreign-dirty classification;
2. sealed commit deletion/tombstone handling;
3. close deferral ordering that leaves derived manifests behind;
4. active-batch router helper failure;
5. planning import fidelity for causal/test authority fields;
6. runner-sync protected-state admission, publication ordering, and frozen
   runner parity;
7. stale or mixed batch ownership, split/handoff, and abandon.

Each family requires a sealed observation fixture, a focused regression case,
an owning task-card acceptance reference, and a receipt proving the successful
path used no override lease. The initial required corpus is tracked by
`ATM-GOV-0307`; it covers backlog incidents 009, 010, 011, 270, 0276 plus
runner-sync protected-state and stale/mixed-batch families. A Plan 4.0 phase
exit is blocked when any family is missing, only prose-covered, or has
evidence whose source commit is not task-matched.

### 18.4.2 Four-plan objective certification gate

The single authoritative matrix for this gate is:

`governance-optimization/plan-3x-4x-objective-evidence-matrix-2026-07-31.md`

Do not create a parallel checklist in a task card, handoff, dashboard, or
release note. Amend that matrix when evidence changes and retain its
`audit-in-progress`/final verdict history.

As of 2026-07-31, ATM-GOV-0306 is card-level `done/released` with closure,
seal-and-commit, and runner-sync receipts. This satisfies the mutation-lineage
delivery prerequisite for ATM-GOV-0293 but does not certify the corresponding
Plan 4.0 objective: the matrix must still record fresh downstream consumption,
real parallel dogfood, incident-family replay, and rollback evidence.

Plan 4.0 is the final evidence authority for the complete Plan 3.0--4.0
programme, but it must not certify completion from task-card status alone. The
phase-exit manifest must include an objective-level matrix for every declared
goal in Plans 3.0, 3.1, 3.2, and 4.0. Each row binds the objective to its
implementation, task card, acceptance predicate, required test case,
validator receipt, fresh sealed evidence, real dogfood observation, and known
bug/incident disposition.

The manifest is hard-blocked when any objective is historical-only, stale,
unknown, unsupported without an owner-approved exception, or lacks a real
observation where the plan promises real parallel behavior. All known ATM bugs
and dogfood incidents must be represented in the Plan 4.0 incident corpus,
assigned to a generic family, repaired, and covered by a regression test before
the final verdict. Open or merely documented bugs are not completion evidence.

The current audit includes `ATM-BUG-2026-07-31-012` as an explicit blocker:
the historical `test_group_commit_attribution` shard still uses legacy
`test_atm_gov_*` identifiers that violate the canonical test-catalog schema,
so the full catalog validator is red even though the newly added 0307/0312
shards use valid `test_task_*` identifiers. This bug requires a dedicated
catalog-contract repair card (migration or an explicitly governed alias), a
regression test, and a fresh validator receipt; it must not be silently
counted as repaired by an unrelated task card.

`ATM-GOV-0313` is now the dedicated repair card. Its live ledger is
`running` with an active `claude-007` claim while the planning mirror remains
`planned`; it has two required catalog-contract cases. Its implementation
must precede any claim that the Plan 4.0 catalog, 0307 replay corpus, or 0312
certificate is complete; card import itself is not repair evidence. The active
implementation has additionally admitted a linked schema/loader surface for
`legacyAliases`; this is a constrained compatibility seam, not a relaxation
of canonical test-case identity, and requires its own regression proof before
the catalog gate can turn green.
Current full-catalog red proof is reproducible with
`node --strip-types tests/cli/test-case-catalog-shards.test.ts`:
`shard test_group_commit_attribution must validate` (assertion failure).
The gate remains blocked until 0313 migrates the historical IDs through the
declared alias lineage and the same full command turns green.

The final verdict must separately report: plan objective completion, task-card
completion, incident repair completion, fresh evidence status, and release/push
readiness. No single green task-card validator may substitute for any of these
five dimensions.

The incident gate also consumes a complete backlog disposition census. The
2026-07-31 read-only census is sealed as
`governance-optimization/plan4-backlog-disposition-census-2026-07-31.json`
(`sortedOpenLikeIdDigest=sha256:48271f04905274a5c795c894395d578c1e29b196aeba1193279e50d26ca18ff6`).
It contains `378` backlog shards, of which `169` are
open-like (`81 Open`, `78 Needs task card`, `2 Needs triage`, `1 In progress`,
and seven partial/active/deferred/follow-up statuses; `73 High`, `1 Critical`
severity).
The seven confirmed parallel-development families and catalog blocker 012 do
not cover every backlog item. Before Plan 4.0 can reach final verdict, every
open-like item must be mapped to an owning repair/family, explicitly classified
as a non-confirmed candidate/duplicate/product gap with durable owner rationale,
or held under an owner-approved exception. Any unresolved census item blocks
the verdict; backlog count alone must never be silently equated with incident
completion or ignored as historical noise.

The census authority itself must also be converged: a live ledger marked
`done/released` while its planning source remains `planned` is `stale-import`,
not completion evidence. The current TASK-SKL-0036 divergence therefore
blocks consumption of its incident-learning contract until the governed
mirror-reconcile command succeeds and fresh projection evidence is sealed.

The 0314–0317 ledger-only imports emitted `ATM_RUNNER_SYNC_REQUIRED` because
the frozen runner predates current framework sources. This advisory is allowed
for planning-ledger writes only; before any phase card is claimed or any
validator result is accepted, run the governed runner-sync/build path and prove
the frozen runner digest matches the source snapshot. A green result from a
stale runner is non-evidence.

目前不是「所有 proposed card 都可立即 claim」的狀態。`ATM-GOV-0276` 必須先修復
external-planning bootstrap、import machine-field fidelity 與 failed-claim residue
ordering；在其 target-ledger import/claim/close 證據成立前，不得把 0277 之後的
proposed IDs 當成可寫入任務。

正常上限為兩條 writer lane，加一條 Captain read-only review lane：

| Wave | Claude captain（較難的 formal/core lane） | Cursor captain（adapter/execution lane） | ATM Captain |
| --- | --- | --- | --- |
| Gate 0 | `ATM-GOV-0276` bootstrap/import fidelity repair；完成後裁決 0269 residue | read-only fixture/reproduction review | steward、scope collision、import/claim/close gate |
| 3.2 closeout | `ATM-GOV-0269`；接續保有 0270→0271 shared close seam 的單一 ownership | 0269 完成後承接不碰 shared close seam 的 evidence/replay review | 每卡 checkpoint；0270→0271→0272→0273 依 hard dependency 序列放行 |
| 4.0 foundation | 0277 semantics、0278 authority、0280 universe compiler | 0279 inventory；之後 0281/0282/0283 中不重疊的 collector/oracle work | 最多同時放行兩個 writers；驗證 phase-exit receipt |
| 3.2 joins | 0269 後做 0284→0285；0270 後做 0286 | 0271 後做 0287 | 缺 Plan 3.2 delivery evidence 時保持 blocked |
| 4.0 structure | 0293→0294→0305 cohesive family/fingerprint/selector lane | 0288/0290/0291/0306/0302/0303 adapters，分波避免 shared-file overlap | family revision、selection digest 與 unknown mapping 裁決 |
| 4.0 generation | 0295、0297/0298/0299/0300 中的 formal generator/core work | 0289/0296/0301/0304 中的 runner、mutation、oracle integration | 每波只開兩個 writers，跨卡共檔改由 steward compose |
| SKL retained | no skill-source write authority | no skill-source write authority | 親自完成 TASK-SKL-0031→0033→0036；0305 後完成 0037 |
| Certification | 0312 certificate、0307 replay | 0314 shadow、0315 runtime adapter canary | 0273 與 TASK-SKL-0037 證據 join；裁決 legacy/new divergence |
| Release | 0316 hostile dogfood 與 all-branch phase-exit manifest | 0316 independent hostile-workload lane | 0317 final verdict；manifest 缺任一 mandatory branch 即 fail-closed |

派工啟動條件：

1. Gate 0 只允許 `ATM-GOV-0276` 寫入；其他 GOV captain 保持 read-only。
2. 每張 proposed card 必須先成為 canonical source card，commit planning source，再以
   target frozen runner dry-run import；machine fields 有任何 loss 就禁止 `--write`。
3. 每位外派 captain 使用自己的 actor claim；派工文字本身不授予 write authority。
4. shared sources、catalog、schema、reducer、release artifacts 維持
   broker/steward/compose-first；不得以 branch/worktree 假裝沒有重疊。
5. `ATM-GOV-0316` 的 phase-exit manifest 是所有支線的 fan-in authority；
   `ATM-GOV-0317` 不得只沿單一 DAG 主幹判定 Plan 4.0 完成。

## 19. Rollout policy

1. **Observe-only**：新 universe/gauntlet 只產生 divergence report，legacy gate 仍是 authority。
2. **Shadow**：同一 sealed candidate 同時跑 legacy 與 Plan 4.0，記錄 selected cases、
   skipped families、false blocks、escaped defects、latency、cache、unknowns；focused
   selection 同時與 broad profile 比對。
3. **Advisory**：structural、mutation、complexity dimensions 先顯示 gaps，不阻擋。
4. **Ratchet**：changed/impacted obligations 不得退化；新 critical gaps 阻擋。
5. **Canary hard gate**：限定 adapters/tasks 消費 certificate。
6. **Release authority**：只有 strict/bounded policy 合法 certificate 才可 close/release。
7. **Replace-don't-layer**：interface coverage 穩定後，刪除 caller-local duplicated verdicts
   與被取代的 private-internal tests。

Skill plane 另採：

1. `atm-bug-backlog` 先以 advisory candidate intake 上線，量測欄位完整度與填寫成本。
2. `atm-task-card-authoring` / `atm-evidence` 再要求 selected high-risk cards 具備
   breadth/depth、oracle、red/green bindings、exam-author mode 與 required/advisory/phase
   test case id 範圍。
3. `observe/route` typed APIs 穩定後，router/next/dispatch/handoff 才消費 family output。
4. 六 adapter projection parity 與 reinstall survival 通過後，才允許 skill-driven hard
   gate；舊 skills 不能靜默丟欄位。

若 legacy red/new green：

- 預設為 Plan 4.0 blocker；
- 只有 machine-checkable model correction、independent oracle 與 historical discrimination
  全部成立才可接受新結果。

## 20. Success metrics

### 20.1 Correctness

- required obligation coverage vector；
- unknown obligations；
- escaped defects；
- false closes / false blocks；
- negative-control false greens；
- stale receipt reuse attempts；
- replay divergences；
- same-family recurrence and escape rate；
- incident family false merge / false split；
- selected-family recall against shadow broad profile；
- incident-learning candidate field completeness；
- skill-route false positive / false negative。

### 20.2 Generator effectiveness

- gaps discovered/closed per round；
- marginal obligations covered per accepted case；
- mutation kill-set growth；
- minimized/retained case ratio；
- duplicate proposal rate；
- time to first counterexample；
- plateau rounds；
- causal-neighborhood edges/factors added per incident；
- combinations generated/retained/deduplicated；
- family revisions advanced by genuine new counterexamples。
- backlog-to-confirmed-family conversion rate and latency；
- breadth/depth hypotheses that become retained tests。

### 20.3 Reliability

- flaky required cases；
- equivalent adjudication latency；
- oracle conflicts；
- unsupported adapters；
- infrastructure failure rate。

### 20.4 Economics

- wall-clock by profile；
- probe/mutation queue time；
- cache hit and resume savings；
- information gain per second；
- time to stopping proof；
- full-suite work avoided without escaped-defect regression；
- unrelated family tests avoided；
- family selection precision/recall；
- selected/broad runtime ratio and saved wall-clock。
- skill intake/dispatch overhead；
- duplicate questions avoided through typed handoff。

### 20.5 Release success criteria

- all finite-model required vector dimensions are exactly `1.0`；
- `unknown = 0` for release-required domains；
- critical surviving non-equivalent mutants = 0；
- forbidden dependency/cycle/security blockers = 0；
- required flaky and oracle conflicts = 0；
- negative controls discriminate；
- command-backed execution evidence exists；
- source/frozen and adapter parity pass；
- replay produces the same certificate digest；
- evidence packet states assumptions and non-claims；
- every admitted incident has fingerprint、family、neighborhood and learning receipt；
- selected routing has zero known related-family escape during required shadow window；
- six installed skill projections preserve required machine fields and source digest。

## 21. Stop rules

- 不得把 test count、line coverage 或 matrix cell count單獨稱為 completeness。
- 不得讓 generator 直接修改 production code、policy、baseline 或 canonical tests。
- 不得讓 Writer 同時產生、執行、裁決與 close 自己的考卷。
- 不得將 timeout、unsupported、flaky、unknown、0 tests 或 missing receipt 降級為 pass。
- 不得把 pairwise/fuzz sampling 稱為 exhaustive，除非有 proof。
- 不得把 full mutation/fuzz 預設塞進每次 check-in。
- 不得因任何 incident 就在每次 task-close 全跑所有 historical families。
- 不得把 unknown/conflicting family mapping 當作「不相關」而跳過或放行。
- 不得覆寫舊 regression family revision；新 incident 必須 append lineage。
- 不得讓 LLM-only root-cause 猜測授權 family merge、test exclusion 或 close。
- 不得讓 skill prompt 成為 root-cause、family、coverage denominator 或 verdict authority。
- 不得只改 installed skill copy；canonical template、schema、compiler projection 與 parity
  evidence 必須同批交付。
- 不得要求 backlog reporter 為未知欄位編造答案；`unknown/unavailable` 是合法 intake。
- 不得把每個 backlog item 都升級為 confirmed incident 或強迫執行 broad suite。
- 不得建立第二 test catalog、第二 task lifecycle 或第二 evidence authority。
- 不得把 incident task ID、actor、日期或 local path 寫入 production control flow。
- 新增或改名公開 `ATM_*` ErrorCode 時，必須另走 ERR family 與
  `atm-error-code-resolver`；本計畫只定義 typed reason families。
- 未完成 ATM-GOV-0276 前，不得用會丟失 `causalGraph` 的 import path 大量開卡。

## 22. Rollback

- 每個 dimension、adapter、generator 與 certificate consumer 都有獨立 feature flag。
- rollback 切回 legacy selector/runner/close adapter，不破壞 append-only Plan 4.0 evidence。
- migration 期間禁止雙寫 canonical source；new/legacy 可雙算 verdict，但只有一個 authority。
- sandbox/temp candidates 可丟棄；已寫 canonical state 只能走 governed compensation/revert。
- model/schema 不相容時停在 `reconcile-required` 或 `inconclusive`，保留 read-only replay。
- rollback receipt 記錄 policy/model/adapter versions、watermark、reason 與再啟用條件。

## 23. Out of scope

- 以 AI 取代人類對高風險、不可逆、法規、安全或隱私決策的最終否決權。
- 宣稱一般軟體 open-world correctness 可被測試窮舉證明。
- 在 Plan 4.0 內自行發明所有語言的 coverage/mutation tools。
- 取代 host project 的 domain acceptance、CI、security 或 performance systems。
- 以大型 LLM judge 作 closure 唯一 oracle。
- 為追求 100% 而保留沒有價值的 production branch；無用 code 應刪除，不應只補空測試。

## 24. Source and implementation references

- User-provided analysis:
  `C:/Users/User/.codex/attachments/717143b8-d5ea-442c-ac4c-a088ce2bf000/pasted-text.txt`
- Robert C. Martin, [First-Class Tests](https://blog.cleancoder.com/uncle-bob/2017/05/05/TestDefinitions.html)
- Robert C. Martin, [Mutation Testing](https://blog.cleancoder.com/uncle-bob/2016/06/10/MutationTesting.html)
- Google Testing Blog, [This Code is CRAP](https://testing.googleblog.com/2011/02/this-code-is-crap.html)
- Node.js, [Test runner and code coverage](https://nodejs.org/download/release/v24.15.0/docs/api/test.html)
- fast-check, [Model-based testing](https://fast-check.dev/docs/advanced/model-based-testing/)
- StrykerJS, [Incremental mutation testing](https://stryker-mutator.io/docs/stryker-js/incremental/)
- ATM target docs:
  - `docs/governance/atm-test-governance-management-plan.md`
  - `docs/governance/validator-governance.md`
  - `docs/governance/atm-3-replay-evidence.md`

## 25. Plan acceptance verdict

Plan 4.0 is accepted as the successor architecture direction when:

1. GOV registry includes this plan document；
2. ATM-GOV-0276 restores safe planning import fidelity；
3. first cards preserve `QualityGauntlet`、`CoverageUniverseCompiler`、
   `ClosureAssuranceMachine` 與 `CausalRegressionFamily` seams，不把它們壓成 monolith；
4. every card uses interface tests、independent evidence、explicit rollback and causal validators；
5. incident learning 能累積擴張同家族 regression pack，並以 Plan 3.2 causal selector
   跳過有 disjointness proof 的不相關家族；
6. ATM entry skills preserve one typed learning lineage from backlog intake through task card、
   dispatch、evidence、family selection、handoff and upgrade scan；
7. canonical skill templates and six adapter projections pass machine-field parity and reinstall
   survival；
8. task cards are created through `atm plan card create` and dry-run imported before dispatch。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan doc create","createdAt":"2026-07-30T12:26:12.488Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/end-to-end-auto-batch-performance-plan-v4.md","contentDigest":"sha256:703113329a67851b469272e8091e30a8b2d10fdaa1f3772ef1355ef76508a7d0"} -->
