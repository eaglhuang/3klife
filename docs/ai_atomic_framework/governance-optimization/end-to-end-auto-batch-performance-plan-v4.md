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
updated_at: 2026-07-30T20:26:12+08:00
createdByCommand: atm plan doc create
---

# ATM 4.0 Proof-Carrying Quality Gauntlet and Governance Coverage Closure Plan

## 0. Executive verdict

ATM 4.0 的主題不是再增加一批零散 validator，而是把 ATM 從「遇到 dogfood
缺陷後補測試」提升成「先建立可枚舉的治理義務，再以案例生成、變異、重播與獨立
證據持續消除缺口」的主動驗證系統。

本計畫採用三層 deep-module 架構：

1. `QualityGauntlet` 是 task close、check-in、phase suite 與 release 的唯一外部
   interface。
2. `CoverageUniverseCompiler` 將版本化治理模型編譯成有限、可重播、可證明分母的
   coverage obligations。
3. `ClosureAssuranceMachine` 執行「找缺口、產生案例、隔離執行、縮減、變異、裁決、
   續跑、簽證」迴圈。

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

Plan 4.0 可以在 Plan 3.2 完成前先完成規格、模型與 read-only shadow design，但正式
production cutover 必須消費 Plan 3.2 的 resumable validation、evidence freshness、
legal recovery 與 closeback seams。

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

ATM 現有 test catalog、causal selector、validator runner、micro receipts、
acceptance predicate、phase suite、realness taxonomy 與 neutral steward 是底座；Plan 4.0
不得建立第二套 test catalog 或第二套 runner。

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

### 6.4 Internal seams, not caller APIs

```text
QualityAuthorityPort
QualityProbePort
GapGeneratorPort
CandidateSandboxPort
OraclePort
EvidenceJournalPort
ConstraintSolverPort
```

每個 seam 必須至少有兩個真實 adapters，或明確留在 in-process implementation。
不要公開 `discoverGaps()`、`runMutants()`、`openCoverageFile()`、`selectPlugin()` 等
內部步驟。

### 6.5 Deletion test

若刪除上述 modules，coverage denominator、authority resolution、case generation、
mutation、oracle、sandbox、convergence、certificate 與 replay policy 會重新散回
`run-validators`、test catalog、taskflow close、phase suite、各 tool scripts 與
steward callers，因此這是真正有 depth、leverage 與 locality 的 module，而不是
pass-through wrapper。

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
| Test Generator | 從 public gaps 提出 test proposals | 降低既有 oracle、直接寫 canonical source、宣告 pass |
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

### 13.3 Seed commitment

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
- historical incident replay generator。

### 14.4 Sandbox adapters

至少兩個 real adapters：

- local ephemeral filesystem/process sandbox，不使用 normal-development Git branch/worktree；
- containerized CI sandbox。

另有 in-memory adapter 供 interface tests。Generator 永遠不直接取得 canonical writer。

## 15. Execution profiles and economics

Plan 4.0 不得成為另一個 monolithic、每卡 30 分鐘以上、無進度的
`validate:standard`。

| Profile | Purpose | Required slices |
| --- | --- | --- |
| `check-in` | 秒級至低分鐘 changed-obligation feedback | seal、inventory drift、cheap hard gates、changed structural coverage |
| `task-close` | task causal cone proof | check-in + required acceptance/property + focused mutation |
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

## 17. Implementation phases and proposed GOV cards

以下 IDs 依 2026-07-30 planning family 的下一個 free GOV ID `ATM-GOV-0277`
規劃。正式卡必須逐張以 `atm plan card create` 產生；本計畫不以手寫檔取代開卡。

### Phase 4.0-0 — Semantics and authority foundation

| Proposed card | Cohesive ownership | Hard dependency |
| --- | --- | --- |
| `ATM-GOV-0277` | model-relative coverage semantics、quality vector、strict 100% certificate vocabulary | `ATM-GOV-0276` |
| `ATM-GOV-0278` | sealed quality authority、policy epoch、protected exam surfaces、role capability matrix | 0277 |
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
| `ATM-GOV-0286` | evidence freshness、cache、resume and certificate binding | 0284, Plan 3.2 0270 |
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
| `ATM-GOV-0292` | mutation adapter、lineage、lower/upper score and equivalence governance | 0285 |
| `ATM-GOV-0293` | gap normalization、lexicographic planner and deterministic proposal ordering | 0286, 0288, 0292 |
| `ATM-GOV-0294` | sandboxed test patch proposal、monotonic acceptance and minimization | 0293 |
| `ATM-GOV-0295` | example/branch and mutation-survivor-directed generators | 0294 |
| `ATM-GOV-0296` | property/metamorphic/model-based generator pack | 0294 |
| `ATM-GOV-0297` | concurrency/fuzz/torture/fault generator pack | 0282, 0294 |
| `ATM-GOV-0298` | acceptance/Gherkin and acceptance-spec mutation | 0278, 0294 |

Exit：

- generator 只能提出 proposal；
- 每個 accepted proposal 單調縮小 gap frontier；
- all seeds/counterexamples 可重播與縮減；
- critical surviving non-equivalent mutants 清零。

### Phase 4.0-5 — Hostile quality and anti-gaming

| Proposed card | Cohesive ownership | Hard dependency |
| --- | --- | --- |
| `ATM-GOV-0299` | seed commitment、hidden negative controls and anti-gaming checks | 0278, 0293 |
| `ATM-GOV-0300` | security quality dimension and risk acceptance receipts | 0278, 0285 |
| `ATM-GOV-0301` | performance、memory、resilience ratchet and benchmark evidence | 0285 |
| `ATM-GOV-0302` | independent oracle arbitration、flaky and contradictory evidence adjudication | 0278, 0292 |

Exit：

- Writer 無法降低考卷；
- critical negative controls 必須 red；
- required flaky/oracle uncertainty 不得 close；
- security/performance evidence 有各自 hard/ratchet semantics。

### Phase 4.0-6 — Certification, replay and rollout

| Proposed card | Cohesive ownership | Hard dependency |
| --- | --- | --- |
| `ATM-GOV-0303` | coverage certificate、quality vector、explicit non-claims | 0286, 0299, 0302 |
| `ATM-GOV-0304` | state/execution replay、proof invalidation and incident corpus | 0303 |
| `ATM-GOV-0305` | Plan 3.x/3.2 shadow comparison and escaped-defect adjudication | 0303, Plan 3.2 0273 |
| `ATM-GOV-0306` | six editor/provider adapter parity canary | 0304, 0305 |
| `ATM-GOV-0307` | real ATM dogfood、two-captain hostile workloads and saturation evidence | 0305, 0306 |
| `ATM-GOV-0308` | Plan 4.0 final verdict、release gate and legacy-authority retirement | 0307 |

Exit：

- strict certificate deterministic replay；
- legacy red/new green 必須有 independent model correction，否則 block；
- six adapter projections parity；
- real dogfood command-backed cells > 0 且所有 required obligations covered；
- rollback 可切回 legacy authority，不刪新 evidence。

## 18. Parallelism and sequencing

### 18.1 May start before Plan 3.2 completes

- 0277、0278、0279 的 plan/schema/interface work；
- 0280、0281 的 pure compiler/in-memory interface tests；
- historical incident corpus inventory；
- read-only tool adapter spikes。

### 18.2 Must wait for Plan 3.2 capabilities

- 0284/0285 production execution depends on ATM-GOV-0269；
- 0286 freshness reuse depends on ATM-GOV-0270；
- 0287 close/recovery projection depends on ATM-GOV-0271；
- 0305 cross-authority shadow rollout depends on ATM-GOV-0273。

### 18.3 Parallel card rule

可並行的卡必須擁有不同 behavior/interface/evidence/rollback seam。相同 physical file
仍遵守 ATM compose-first proposal/steward contract；不要用 branch/worktree 當正常隔離。

## 19. Rollout policy

1. **Observe-only**：新 universe/gauntlet 只產生 divergence report，legacy gate 仍是 authority。
2. **Shadow**：同一 sealed candidate 同時跑 legacy 與 Plan 4.0，記錄 selected cases、
   false blocks、escaped defects、latency、cache、unknowns。
3. **Advisory**：structural、mutation、complexity dimensions 先顯示 gaps，不阻擋。
4. **Ratchet**：changed/impacted obligations 不得退化；新 critical gaps 阻擋。
5. **Canary hard gate**：限定 adapters/tasks 消費 certificate。
6. **Release authority**：只有 strict/bounded policy 合法 certificate 才可 close/release。
7. **Replace-don't-layer**：interface coverage 穩定後，刪除 caller-local duplicated verdicts
   與被取代的 private-internal tests。

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
- replay divergences。

### 20.2 Generator effectiveness

- gaps discovered/closed per round；
- marginal obligations covered per accepted case；
- mutation kill-set growth；
- minimized/retained case ratio；
- duplicate proposal rate；
- time to first counterexample；
- plateau rounds。

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
- full-suite work avoided without escaped-defect regression。

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
- evidence packet states assumptions and non-claims。

## 21. Stop rules

- 不得把 test count、line coverage 或 matrix cell count單獨稱為 completeness。
- 不得讓 generator 直接修改 production code、policy、baseline 或 canonical tests。
- 不得讓 Writer 同時產生、執行、裁決與 close 自己的考卷。
- 不得將 timeout、unsupported、flaky、unknown、0 tests 或 missing receipt 降級為 pass。
- 不得把 pairwise/fuzz sampling 稱為 exhaustive，除非有 proof。
- 不得把 full mutation/fuzz 預設塞進每次 check-in。
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
3. first cards preserve the three deep-module seams and do not collapse them into a monolith；
4. every card uses interface tests、independent evidence、explicit rollback and causal validators；
5. task cards are created through `atm plan card create` and dry-run imported before dispatch。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan doc create","createdAt":"2026-07-30T12:26:12.488Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/end-to-end-auto-batch-performance-plan-v4.md","contentDigest":"sha256:703113329a67851b469272e8091e30a8b2d10fdaa1f3772ef1355ef76508a7d0"} -->
