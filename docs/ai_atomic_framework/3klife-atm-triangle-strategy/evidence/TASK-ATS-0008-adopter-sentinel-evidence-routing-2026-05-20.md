# TASK-ATS-0008 Evidence: Adopter Sentinel Evidence Routing

Date: 2026-05-20
Status: completed

## 大白話結論

`TASK-ATS-0008` 要做的事不是再寫一套 3KLife 私有 CI，也不是把 npc-brain 的所有報告都丟回 AI-Atomic-Framework。

它比較像一個「證據分流站」：

- 看到框架本身有問題，就分到 `upstream-blocker`，之後轉成中立 fixture、validator、英文 docs patch 或 upstream 修復任務。
- 看到只是 npc-brain 自己的 Python 管線細節，就分到 `adopter-local`，留在 npc-brain / 3KLife，不污染 ATM public repo。
- 看到是 3KLife 作為母專案要保留的治理決策，就分到 `host-governance-overlap`，留在三角策略文件與 evidence 裡。

這樣 ATM upstream 才能吃到有用的真實回饋，又不會把 3KLife / npc-brain 的私有上下文塞進開源框架。

## Sentinel Dry Run

Framework baseline sentinel command:

```powershell
node --experimental-strip-types scripts/adopter-sentinel.ts --mode validate
```

Observed result:

- Sandbox run: failed because the local tool sandbox blocked child process execution.
- Non-sandbox rerun: pass.
- Profiles passed: `vscode`, `cursor`, `claude-code`.
- Each profile passed:
  - bootstrap
  - atm-chart render
  - welcome dry-run
  - telemetry status
- Broken fixture failed as expected.

Interpretation:

The upstream sentinel baseline is usable. `TASK-ATS-0008` should not create a second private CI. The npc-brain evidence should instead be converted into neutral external-profile evidence when it exposes a reusable upstream gap.

## Sentinel Case Definition

Case id:

```text
npc-brain-atm-map-rollout-2026-05-20
```

Scope:

- Host repo kind: Python adopter
- Primary map: `ATM-MAP-0001`
- Primary atom: `ATM-NPCBRAIN-0002`
- Feature area: `pipelines/sanguo-rag/run_full_roster_convergence_loop.py`
- Governance path:
  - candidate ranking
  - source inventory
  - police-family report
  - decomposition plan
  - create-map
  - map equivalence
  - replacement lane
  - human review
  - rollback-ready proof
  - registry diff lineage continuity

Neutrality rule:

Raw npc-brain paths are allowed in 3KLife evidence, but upstream AI-Atomic-Framework may only receive neutralized fixtures, schemas, validators, RFC text, or English public docs patches.

## Evidence Routing Buckets

### upstream-blocker

These are framework product gaps discovered through npc-brain usage. They may go upstream after neutralization.

| Evidence | Why it belongs here | Upstream action |
|---|---|---|
| `.atm/history/reports/registry-diff.ATM-NPCBRAIN-0002.evolve-blocked.json` | `registry-diff` could not prove evolve because adopter atom version lineage was missing. | Keep as GOV lineage contract/backfill fixture class, not as a raw npc-brain path. |
| `.atm/history/reports/registry-diff.ATM-NPCBRAIN-0002.0.1.0-to-0.1.1.json` | Shows the blocker is solved once lineage exists. | Convert into neutral registry-diff lineage continuity fixture. |
| `.atm/history/reports/guided-next-leaf.apply_convergence_loop_state_governance.json` | Custom approved proposal routing exposed that `atm next` must understand approved proposal state. | Router regression fixture. |
| `review rollout-ready` BOM-tolerant evidence parsing failure observed earlier | Valid evidence could be misread as missing when JSON begins with BOM. | Parser regression fixture. |
| onefile replacement-lane / AJV missing behavior observed during pinned runner testing | Pinned onefile must not lose validator dependencies. | Onefile release parity fixture. |
| Antigravity natural black-box success | New editor behavior should become productized adapter support. | Integration adapter task / fixture, no private paths. |

### adopter-local

These are real npc-brain implementation details. They should stay local unless reduced to a neutral fixture.

| Evidence | Why it stays local | Local action |
|---|---|---|
| candidate ranking reports under `.atm/history/reports/candidates/` | They contain real `pipelines/sanguo-rag/**` file names and risk rankings. | Use for npc-brain refactor order. |
| `.atm/history/reports/decomposition-plan.full-roster-convergence-v1.json` | It describes real npc-brain feature decomposition. | Keep as map pilot evidence. |
| `atomic_workbench/maps/ATM-MAP-0001/lineage-log.json` | It records local map rollout lineage. | Keep in adopter workbench; summarize only. |
| `atomic_workbench/maps/ATM-MAP-0001/map.equivalence.report.json` | It validates local behavior equivalence. | Keep as rollout evidence. |
| `.atm/history/reports/actual-patch-evidence.apply_convergence_loop_state_governance.20260520-011330.json` | It references actual Python patch outputs. | Use for local review and rollback. |
| `pipelines/sanguo-rag/full_roster_convergence_state_governance.py` | It is a local governed helper created for the pilot. | Keep in npc-brain code review. |

### host-governance-overlap

These are not framework bugs and not pure npc-brain code facts. They are 3KLife governance decisions.

| Evidence | Why it belongs here | Host action |
|---|---|---|
| `TASK-ATS-0004` cross-editor black-box evidence | Decides whether natural agent entry is acceptable for the experiment. | Keep in triangle strategy. |
| `TASK-ATS-0005` leaf atomize/infect evidence | Decides when Python pipeline edits can move from dry-run to governed patch. | Keep as phase gate. |
| `TASK-ATS-0006` canonical map closeout evidence | Decides that large feature decomposition should use Atomic Map, not ad hoc helper extraction. | Keep as architecture gate. |
| `TASK-ATS-0007` closeout evidence | Decides that map rollout and evolve proof are acceptable. | Keep as M6 closeout gate. |
| Human-review decisions | These are human governance approvals, not reusable framework fixtures by themselves. | Keep in 3KLife evidence; upstream only the neutral rule. |
| Sandbox EPERM observation | It affects how this local Codex session runs commands, not necessarily ATM product behavior. | Record as local execution caveat, not upstream blocker unless reproduced outside sandbox. |

## Evidence Routing SOP

1. Start from the raw adopter report path.
2. Ask: does this reveal a reusable ATM framework defect or missing product capability?
3. If yes, classify as `upstream-blocker`, then convert it to a neutral artifact before upstreaming.
4. If it only names npc-brain implementation details, classify as `adopter-local`.
5. If it records a 3KLife governance decision, classify as `host-governance-overlap`.
6. Never copy raw private/adopter-specific paths into protected public framework docs.
7. Upstream handoff must be one of:
   - neutral fixture
   - validator
   - schema patch
   - English RFC/design note
   - framework code patch
   - public docs patch without adopter identity

## Sample Maintainer-readable Summary

```text
Case: npc-brain-atm-map-rollout-2026-05-20
Result: useful downstream evidence
Do not upstream raw report paths.

Upstream candidates:
- registry lineage continuity fixture
- approved custom proposal router fixture
- BOM-tolerant rollout-ready evidence parser fixture
- onefile validator dependency parity fixture
- Antigravity integration adapter fixture

Adopter-local only:
- Python pipeline rankings
- full-roster convergence decomposition details
- actual patch and rollback artifacts

Host-governance-overlap:
- human review decisions
- triangle strategy phase gates
- decision to move from map closeout to evidence routing
```

## Acceptance Review

- No second 3KLife private adopter CI was created.
- Evidence is now split into `upstream-blocker`, `adopter-local`, and `host-governance-overlap`.
- The upstream bucket is maintainer-readable and explicitly requires neutralization before public use.
- Failure cases do not depend on a 3KLife local fork assumption.

`TASK-ATS-0008` can close.
