---
doc_id: ""
task_id: TASK-AAO-0138
title: "formal task opener and residue finalization UX"
milestone: M17
status: done
artifact_status: done
runtime_status: validated
upstream_mutation_status: applied
created: "2026-06-10"
created_by_agent: codex-gpt-5
started_at: ""
started_by_agent: ""
blocked_by:
  - TASK-AAO-0135
  - TASK-AAO-0137
owner: atm-core
priority: P1
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:task-ledger-governance
public_tracking: false
executionMode: phase0-formal-task-opener-and-residue-finalization-ux
planning_repo: 3KLife
closure_authority: target_repo
related_plan: docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0138-formal-task-opener-and-residue-finalization-ux.task.md
related:
  - TASK-AAO-0135
  - TASK-AAO-0137
  - TASK-AAO-0055
  - TASK-AAO-0056
  - TASK-AAO-0069
  - TASK-AAO-0086
  - TASK-AAO-0138A
  - TASK-AAO-0138B
  - TASK-AAO-0138C
depends_on:
  - TASK-AAO-0135
  - TASK-AAO-0137
  - TASK-AAO-0069
depends:
  - TASK-AAO-0135
  - TASK-AAO-0137
  - TASK-AAO-0069
scopePaths:
  - packages/cli/src/commands/tasks.ts
  - packages/cli/src/commands/framework-development.ts
  - packages/cli/src/commands/taskflow.ts
  - packages/atm-markdown-task-source/src/index.ts
  - scripts/validate-task-ledger-governance.ts
  - scripts/validate-governance-commands.ts
  - tests/**
deliverables:
  - packages/cli/src/commands/tasks.ts
  - packages/cli/src/commands/framework-development.ts
  - packages/cli/src/commands/taskflow.ts
  - packages/atm-markdown-task-source/src/index.ts
  - scripts/validate-task-ledger-governance.ts
  - scripts/validate-governance-commands.ts
  - tests/**
validators:
  - npm run typecheck
  - npm run validate:cli
  - node --strip-types scripts/validate-task-ledger-governance.ts --mode validate
  - node --strip-types scripts/validate-governance-commands.ts
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.task-closure-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
  newScriptsAllowed: false
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0138-formal-task-opener-and-residue-finalization-ux.task.md
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/README.md
  - C:/Users/User/3KLife/docs/tasks/tasks-aao.json
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/framework-development.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/taskflow.ts
  - C:/Users/User/AI-Atomic-Framework/packages/atm-markdown-task-source/src/index.ts
  - C:/Users/User/AI-Atomic-Framework/scripts/validate-task-ledger-governance.ts
  - C:/Users/User/AI-Atomic-Framework/scripts/validate-governance-commands.ts
  - C:/Users/User/AI-Atomic-Framework/tests/**
  - C:/Users/User/AI-Atomic-Framework/atomic_workbench/atomization-coverage/path-to-atom-map.json
forbidden_files:
  - C:/Users/User/AI-Atomic-Framework/.atm/history/**
  - C:/Users/User/AI-Atomic-Framework/.atm/runtime/**
  - C:/Users/User/AI-Atomic-Framework/release/**
  - unrelated source surfaces
  - scratch / unrelated dirty
non_goals:
  - "Do not hand-edit .atm/history task, evidence, or task-event residues as the primary operator workflow."
  - "Do not widen this card into generic history migration or archive cleanup across every shard."
  - "Do not require operators to scan README tails or pick ids manually once the formal opener exists."
  - "Do not silently delete ambiguous historical residues without classification or repair guidance."
  - "Do not mutate AI-Atomic-Framework source in Phase 0."
notes: "2026-06-10 | status: done | validation: passed | change: parent convergence for formal opener + residue/finalization UX via child cards 0138A/B/C | blocker: none"
---

# TASK-AAO-0138 formal task opener and residue finalization UX

## Goal

Bundle the two operator pain points that surfaced in recent ATM work:

1. Opening a formal planning card still requires manual `taskId` and `output` selection, which means the operator must inspect roster tails instead of using a true governed opener.
2. Closure / reconcile / repair flows can still leave historical residue that is understandable to ATM internals but inconvenient to a human operator, especially when the task is already materially complete.

This card defines the Phase 0 planning packet for making the official opener and the closure-finalization path feel like one coherent product flow instead of separate expert-only recovery steps.

The important architecture constraint is that ATM core must remain host-neutral. The intended solution is not a 3KLife-specific numbering hack inside framework core. The intended solution is a formal opener contract that lets host profile or plugin logic provide numbering, canonical output path, and roster synchronization policy.

This card is also intentionally a consolidation card: it does not restart task generation from zero. It is meant to connect the already-shipped template/plugin work from `TASK-AAO-0086` with the still-planned roster sync path from `TASK-AAO-0069`, then carry both across the final delegated write-path gap.

## Why this exists

Recent work exposed a real gap:

- `node atm.mjs tasks new` is currently a template generator, not a full task opener. It requires externally supplied `--task-id` and `--output`.
- Operators can end up with half-materialized or historical residue states such as source task complete but local history mirrors or closure artifacts not fully converged.
- The system already has strong governance rules, but the operator experience still leaks too much implementation detail.
- `TASK-AAO-0086` already delivered plugin hooks plus `tasks new`, but its documented scope stopped at template generation and explicitly left downstream host opener consumption out of scope.
- `TASK-AAO-0069` already identifies roster-sync work, but it is not yet connected to an official end-to-end opener path.

The likely reason is understandable: framework core avoided hard-binding itself to one host repo's task numbering or shard layout. That neutrality is good, but the missing layer is a host-aware opener delegation contract.

This is not a request to weaken governance. It is a request to make the governed path the easiest path.

## Phase 0 Scope

- Open this planning card in 3KLife only.
- Record the intended product direction and acceptance criteria.
- Do not modify AI-Atomic-Framework source in this phase.

## Phase 1 Scope Amendment

- Extend the official task opener with a profile/plugin-delegated contract so a host repo can allocate the next valid task id and canonical output path from its own planning source of truth, instead of forcing a human to inspect tails manually.
- Ensure the opener can update the adjacent roster/shard view as part of the same governed operation, or emit an explicit single-step follow-up command when host-profile delegation requires it.
- Define clear fallback behavior when no host opener is installed: template-only generation remains allowed, but ATM must explicitly say it is running in fallback mode.
- Reuse the `tasks new` generator and plugin hooks from `TASK-AAO-0086`; do not replace them with a parallel generator stack.
- Reuse or finish the roster sync helper direction from `TASK-AAO-0069`; do not invent a second roster-writing pathway.
- Add a residue classification / finalization path that can distinguish:
  - completed historical task with leftover mirror artifacts
  - imported planning-only mirror that never became a delivery
  - interrupted close/reconcile packet that needs repair
  - genuinely ambiguous residue that must stop for operator review
- Make the close/finalization guidance converge toward one explicit operator-facing action instead of leaving multiple semi-valid manual cleanups behind.

## Acceptance Criteria

### 1. Formal opener is really formal

- ATM provides a governed task-opening path that does not require the operator to manually choose the next task id or output markdown path in the common case.
- The official opener contract is host-neutral: framework core defines the interface, while host profile or plugin code supplies numbering and canonical output policy.
- The implementation must explicitly reuse `TASK-AAO-0086` generator surfaces and extend them into delegated write-path orchestration, rather than re-implementing template generation a second time.
- The opener derives numbering from the host planning source of truth and fails closed with a diagnostic if numbering is ambiguous.
- The opener writes or delegates roster/shard synchronization as part of the same official flow, reusing the `TASK-AAO-0069` direction instead of creating a parallel sync mechanism.
- If no host opener is registered, ATM explicitly reports `template-only fallback mode` instead of pretending that numbering is governed.

### 2. Residue is classified, not hand-waved

- ATM can classify common historical residues into clear buckets such as:
  - complete-but-unfinalized
  - planning-mirror-only
  - interrupted-close
  - stale-import
  - ambiguous/manual-review
- Each bucket maps to one recommended governed next step instead of asking the operator to infer internals.

### 3. Finalization is a product flow

- When a task is materially complete but closure artifacts are not fully converged, ATM can guide or perform the finalization path without encouraging manual `.atm/history/**` surgery.
- The operator-facing output explains what is truth, what is residue, and what exact command should run next.

### 4. No governance backslide

- The improved UX must still preserve fail-closed behavior for ambiguous or unsafe states.
- The fix must not weaken task-ledger governance, commit-window rules, or closure evidence requirements.

## Candidate Phase 1 Surfaces

- `packages/cli/src/commands/tasks.ts`
  - official task opener ergonomics
  - host-opener delegation and fallback reporting
  - residue classification and finalization guidance
- `packages/cli/src/commands/framework-development.ts`
  - closure/finalization helpers and historical sync guidance
- `packages/cli/src/commands/taskflow.ts`
  - delegation boundary if planning profiles own physical task mutations
- `packages/atm-markdown-task-source/src/index.ts`
  - canonical markdown task materialization hooks
- profile/plugin wiring
  - host-specific task numbering
  - canonical output path selection
  - roster/shard synchronization policy
- `scripts/validate-task-ledger-governance.ts`
  - preserve fail-closed governance guarantees
- `scripts/validate-governance-commands.ts`
  - command-surface coverage for official opener/finalizer flow

## Intended Entry Relationship

- `tasks new`
  - remains the low-level template and content generator
  - should continue to work in explicit/template-only scenarios
  - must not pretend to be the full governed opener when numbering/path policy is missing
- `taskflow open`
  - should become the primary operator-facing formal opener entry
  - should load host profile/plugin delegation, request numbering/path/roster decisions from that host opener, and report whether it is running in governed delegated mode or template-only fallback mode
  - should be the place where ATM explains the difference between:
    - template generation
    - governed task materialization
    - roster/shard synchronization
- Relationship rule
  - `taskflow open` orchestrates
  - `tasks new` generates
  - host opener/profile/plugin decides numbering, canonical output path, and write-path policy
  - residue/finalization guidance should reuse the same operator story, so the human sees one coherent entry/repair/finalize flow instead of three disconnected commands

The intended result is that a human saying "open a formal card" should be routed toward `taskflow open` or an equivalent governed opener path, while `tasks new` remains an explicit lower-level building block.

## Implementation Guardrails

- Do not hard-code 3KLife AAO numbering rules into ATM framework core.
- Do not replace `tasks new` with a second generator path; extend the existing generator into a delegated opener flow.
- Do not create a second roster sync writer if `TASK-AAO-0069` surfaces can be finished and reused.
- Prefer one official operator-facing open command that can report either:
  - delegated governed opener mode
  - template-only fallback mode
- Keep residue/finalization guidance in the same operator story as the opener whenever the root problem is "ATM left the human between two half-valid states."

## Plain-language Anchor

ATM should help the operator finish cleanly. If a card is ready to be opened, ATM should either know how the current host numbers and places it, or say clearly that the host opener is missing and it is falling back to template mode. If a task is already done in substance, ATM should help classify the leftover residue and converge it cleanly. The human should not need to reverse-engineer ATM internals just to complete normal governance work.

## Worker Report

**worker:** 008  
**dispatch:** R53-AAO-0138-OPENER-UX  
**mode:** planning + decomposition  
**completed:** 2026-06-10

### A. Decomposition proposal

Phase 1 should ship as **three implementation rounds** (one slice per round). Opener work (slices 1–2) is sequential; residue work (slice 3) can start after slice 1 lands and does not require slice 2 write-mode to be complete.

#### Slice 1 — Delegated opener orchestration contract (Round 1)

**Goal:** Turn `taskflow open` from a read-only skeleton into a governed orchestration entry that owns the operator story but does not own host numbering.

**Deliverables:**

- Extend `taskflow.profile.v1` and `atm.taskflowOpenResult.v1` with explicit orchestration fields:
  - `openerMode`: `delegated-governed` | `template-only-fallback`
  - `orchestrationSteps`: ordered plan (`resolve-numbering` → `generate-template` → `optional-roster-sync`)
  - `delegationContract`: host opener invocation descriptor (path, argv template, dry-run vs write semantics)
- `taskflow open --dry-run --json` returns a complete orchestration plan without mutating disk.
- `taskflow open --write --json` becomes the governed write entry **only when** profile + host opener contract permits it; otherwise fail closed with `ATM_TASKFLOW_TEMPLATE_ONLY_FALLBACK` and point to `tasks new`.
- Internal orchestration calls **`tasks new` for generation only** — never re-implement template rendering.
- Command-spec + validator coverage for the new result shape and mode reporting.

**Exit criteria:** Operator can run `taskflow open` and get a deterministic JSON plan that states whether ATM is in delegated or fallback mode, what host opener would run, and what `tasks new` flags would be used — without manually inspecting roster tails.

#### Slice 2 — Host opener / fallback mode / numbering-path policy surface (Round 2)

**Goal:** Wire host-neutral policy resolution so framework core never encodes 3KLife AAO numbering rules.

**Deliverables:**

- Define a **host opener interface** (profile JSON + optional plugin hook) with three host-supplied decisions:
  1. `allocateTaskId(planningSource)` — fail closed on ambiguity
  2. `resolveCanonicalOutputPath(taskId, planningSource)` — fail closed if path collides or is undefined
  3. `rosterSyncPolicy` — `inline` (same transaction) | `follow-up-command` (emit exact `tasks roster update` invocation) | `none`
- Implement fallback path: no profile / no opener / opener returns `unsupported` → explicit `template-only-fallback` banner in CLI + JSON; operator must pass `--task-id` and `--output` to `tasks new`.
- **Finish and call** `TASK-AAO-0069` `tasks roster update` from the opener follow-up step when policy says `follow-up-command` or `inline` — do not add a second roster writer.
- Host-specific numbering logic stays in planning-repo opener scripts (e.g. 3KLife `task-card-opener.js`); ATM core only validates the contract and surfaces diagnostics.

**Exit criteria:** In a host with a registered opener, `taskflow open --write` allocates id + path + generates card + triggers roster sync (or prints the single follow-up command) in one operator flow. In a bare adopter repo, ATM clearly says fallback mode.

#### Slice 3 — Residue classification + finalization operator flow (Round 3)

**Goal:** Give operators one diagnosable path for “task is done but ATM left me in a half-valid state” without `.atm/history/**` hand surgery.

**Deliverables:**

- Add a governed diagnose surface (preferred: extend `tasks status --residue --json` or add `tasks finalize diagnose --task <id> --json`) that classifies residue into buckets:
  - `complete-but-unfinalized` — planning card done, ledger/history not converged
  - `planning-mirror-only` — imported mirror never became delivery
  - `interrupted-close` — close/reconcile started, packet incomplete
  - `stale-import` — import artifact superseded by later state
  - `ambiguous-manual-review` — fail closed, no auto-mutation
- Each bucket maps to **one recommended command** reusing existing surfaces:
  - `tasks reconcile` (historical delivery sync)
  - `tasks repair-closure` / `rescue closure-packet` (packet repair)
  - `tasks close` (when deliverables are ready)
  - `guide` / `next` channel hint (when operator should not mutate)
- Operator output triangulates: what is truth, what is residue, what command runs next.
- **No silent deletion** of ambiguous history; classification only, mutation only through existing governed commands.

**Exit criteria:** Given a fixture task in each bucket, diagnose returns the correct bucket + exactly one next command; validators prove no auto-delete path exists.

**Why this cut:** Slices 1–2 separate *contract* from *host policy*, preventing a mega-PR that mixes schema work with 3KLife opener integration. Slice 3 is orthogonal (closure/residue) and can reuse `TASK-AAO-0135` / `TASK-AAO-0137` hardening without blocking opener contract work.

### B. Surface mapping

| Slice | Primary surfaces | Secondary / wiring | Validators & tests |
|-------|------------------|--------------------|--------------------|
| **1 — Orchestration contract** | `packages/cli/src/commands/taskflow.ts` | `packages/cli/src/commands/taskflow/profile-loader.ts`, `packages/cli/src/commands/command-specs/taskflow.spec.ts` | `packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts`, `packages/cli/src/commands/taskflow/__tests__/profile-loader.spec.ts`, `scripts/validate-governance-commands.ts` |
| **1 — Generation delegate** | `packages/cli/src/commands/tasks.ts` (`runTasksNew`, extract shared `generateTaskCard(intent)` if needed) | `packages/atm-markdown-task-source/src/index.ts` (`generate` hook only — no numbering logic) | `tests/cli/tasks-new.test.ts`, `tests/plugin-sdk/atm-markdown-task-source-hooks.test.ts` |
| **2 — Host policy / fallback** | `packages/cli/src/commands/taskflow/profile-loader.ts` (schema extension), `taskflow.ts` (opener invocation runner) | Plugin registry / `readPluginRegistry` if host opener is plugin-backed; planning-repo opener script invoked via `delegation.openerPath` | Extend `profile-loader.spec.ts`; add integration fixture with mock host opener |
| **2 — Roster sync** | `packages/cli/src/commands/tasks.ts` (new `tasks roster update` from `TASK-AAO-0069`) | `packages/cli/src/commands/command-specs/tasks.spec.ts` | `scripts/validate-task-ledger-governance.ts` (0069 acceptance fixtures) |
| **3 — Residue / finalization** | `packages/cli/src/commands/tasks.ts` (diagnose subcommand or `status --residue`) | `packages/cli/src/commands/framework-development.ts` (`repairClosurePacketForTask`, closure packet helpers), `packages/cli/src/commands/rescue.ts` (`closure-packet` delegation), `packages/cli/src/commands/next.ts` (reconcile channel hints — read-only reuse, do not fork) | `scripts/validate-task-ledger-governance.ts`, `scripts/validate-governance-commands.ts`, new fixture tests per residue bucket |

**Explicit operator entry mapping (post-implementation):**

| Operator intent | Entry command | Role |
|-----------------|---------------|------|
| “Open a formal governed card” | `node atm.mjs taskflow open [--write] --json` | Orchestrates host opener → `tasks new` → optional roster sync |
| “Generate a template I already know the id/path for” | `node atm.mjs tasks new --task-id … --output … --json` | Low-level generator; never pretends numbering is governed |
| “My task is done but closure is messy” | `node atm.mjs tasks finalize diagnose --task … --json` (or `tasks status --residue`) | Classify residue → recommend one governed next step |

### C. Reuse / non-reuse verdict

#### Reused from `TASK-AAO-0086` (done — do not rebuild)

- `atm-markdown-task-source` plugin: `validate`, `generate`, template loader (`templates.ts`, `aao-l2-split-template.md`)
- `tasks new` subcommand and `readPluginRegistry` → `plugin.generate(intent)` call chain
- CLI spec registration in `command-specs/tasks.spec.ts`
- Existing tests: `tests/cli/tasks-new.test.ts`, `tests/plugin-sdk/atm-markdown-task-source-hooks.test.ts`

**Extension only:** `taskflow open` calls into the same `generate` path after host opener supplies `task_id` + `output`; optionally expose `generateTaskCard()` as a shared internal helper if orchestration needs it.

#### Reused / completed from `TASK-AAO-0069` (planned — finish, do not parallel)

- `tasks roster update --index <readme> --from <task-file> [--dry-run] --json` as the **sole** roster row sync mechanism
- Per-card row rewrite semantics (no full README regen, no silent row insert)
- Governance regression in `validate-task-ledger-governance.ts`

**Wiring:** Slice 2 opener orchestration invokes `tasks roster update` as an inline step or emits it as the documented follow-up command — not a new sync API.

#### Explicitly NOT to rebuild

- A second template/generator stack (no `taskflow generate`, no duplicate markdown templating in core)
- A second roster/README sync writer (no `taskflow sync-roster`, no hook-time README rewrites outside 0069)
- 3KLife-specific `TASK-AAO-####` allocation logic inside `packages/cli` or `packages/core`
- A new close/reconcile implementation — residue UX must delegate to `tasks reconcile`, `tasks repair-closure`, `rescue closure-packet`
- Manual `.atm/history/**` edit workflows as primary operator path
- Broad history migration or archive cleanup (card non-goals remain in force)

### D. Risk list

1. **Accidental 3KLife hard-coding in framework core** — Mitigation: all numbering/path rules live in host profile + opener script; core only defines `taskflow.profile.v1` contract fields and validates responses. Add a neutrality regression test that asserts no `AAO-` or `3KLife` path literals in `taskflow.ts` / `profile-loader.ts`.

2. **Second generator path** — Mitigation: slice 1 acceptance test asserts `taskflow open` orchestration evidence includes `generatorSurface: "tasks-new"` and that template bytes come from `atm-markdown-task-source.generate`. Ban any new `writeFileSync` of task markdown inside `taskflow.ts`.

3. **Second roster sync path / opener–residue coupling** — Mitigation: roster mutations only through `tasks roster update` (0069). Keep slice 3 read-only until classification is proven; never auto-run `reconcile` or `repair-closure` from `taskflow open`. Residue auto-cleanup is forbidden for `ambiguous-manual-review` bucket.

### E. Recommended next task shape

**Recommendation: split into three follow-up implementation cards** after this Phase 0 packet, keeping `TASK-AAO-0138` as the parent intent card (status stays `open` until all slices close, or close 0138 when slice 3 completes).

Rationale: opener (slices 1–2) and residue (slice 3) have different dependencies, validators, and risk profiles. A single mega-card will encourage mixed PRs and violate the 3–4 round closure goal.

**Suggested child-card titles (do not open yet):**

1. `TASK-AAO-0138a — taskflow open delegated opener orchestration contract`
2. `TASK-AAO-0138b — host opener fallback mode and numbering-path policy surface`
3. `TASK-AAO-0138c — residue classification and finalization operator flow`

**Dependency guidance for child cards:**

- `0138a` depends on `TASK-AAO-0135`, `TASK-AAO-0137` (current card deps) — can start once those are unblocked or in parallel if only touching taskflow dry-run contract
- `0138b` depends on `0138a` + `TASK-AAO-0069` (roster sync must exist before inline opener write path)
- `0138c` depends on `TASK-AAO-0135` (closure integrity) more than on `0138b`; can proceed after `0138a` if diagnose is read-only

**Alternative (acceptable if captain prefers fewer cards):** Keep one card, execute slices as sequential implementation rounds with checkpoint commits per slice — only if each round stays within strict file boundaries above.

### F. Existing capability baseline (2026-06-10 verification)

This card should be implemented as **delegation + orchestration hardening**, not as a fresh task-opener rewrite.

#### Already implemented in 3KLife host tooling

- `tools_node/task-card-opener.js` is already a real governed opener, not just a template emitter.
- It supports `--next-id-prefix` and, in write mode, performs actual reservation via task-id guard instead of asking the operator to manually inspect tail numbers.
- It writes Markdown task cards and can also write task JSON outputs in the same transaction.
- When `--json-out` targets `docs/tasks/tasks-atm.json`, it routes through `upsertTaskInTasksAtmStore(...)` and updates the real `tasks-atm` shard store rather than maintaining a second ad-hoc index path.
- After successful write, reservation is promoted into a formal lock through the host task adapter / lock adapter chain.
- It can optionally assign doc ids after markdown creation.

Verified source surfaces:

- `tools_node/task-card-opener.js`
- `tools_node/lib/task-id-guard.js`
- `tools_node/lib/tasks-atm-shard-store.js`
- `tools_node/adapters/atm-3klife/task-adapter.js`

#### Already implemented in ATM core/framework

- `tasks new` exists as a low-level generator surface and already reuses `atm-markdown-task-source.generate`.
- `taskflow open` / profile loading already exist as orchestration-oriented surfaces.
- Generic shard infrastructure exists in framework/plugin layers, so 0138 does not need to invent a new storage primitive.

#### Not yet fully wired in ATM core

- `taskflow open --write` is not yet the formal delegated-governed write entry.
- Host opener invocation is not yet normalized as a first-class contract with explicit mode reporting.
- Host-provided numbering/path allocation is not yet surfaced through a stable profile/plugin contract.
- `tasks new` still assumes caller-supplied id/output and does not become a full formal opener by itself.
- Roster sync / finalize residue operator flow still needs the unified governed path described in this card.

#### Design consequence

- `TASK-AAO-0138a` should make `taskflow open` the formal ATM entry that **delegates** to a host opener and **reuses** `tasks new` for generation.
- `TASK-AAO-0138b` should expose host-neutral contract points for:
  - task id allocation
  - canonical output path resolution
  - roster sync policy
- `TASK-AAO-0138c` should solve residue/finalization UX without turning history cleanup into manual filesystem surgery.

#### Explicit non-goal clarified by this baseline

- Do **not** rebuild another `task-card-opener` inside ATM core.
- Do **not** hardcode 3KLife numbering/path rules into framework packages.
- Do **not** create a second task JSON writer separate from the existing host opener / shard store path.

### G. Formal child split status

The child split described in this parent card has now been **formally materialized** as three implementation cards:

1. `TASK-AAO-0138A` — delegated opener orchestration contract
2. `TASK-AAO-0138B` — host-neutral numbering / path / fallback / roster policy surface
3. `TASK-AAO-0138C` — residue classification and finalization operator UX

Authority rule for this family:

- `TASK-AAO-0138` remains the parent intent / convergence card.
- `TASK-AAO-0138A` owns the operator-facing `taskflow open` orchestration surface.
- `TASK-AAO-0138B` owns host-opener contract details and fallback policy, and must not introduce a second generator or roster writer.
- `TASK-AAO-0138C` owns residue/finalization diagnosis and must not duplicate opener orchestration.

Execution guidance:

- `0138A` should land first because it establishes the official orchestration entry and mode reporting.
- `0138B` follows `0138A` and `TASK-AAO-0069` because host policy wiring must reuse the single roster-sync path.
- `0138C` remains logically separate from numbering/path policy work and should stay focused on operator-visible truth/residue classification.

### H. Parent closure (2026-06-10)

All three child cards (`0138A`, `0138B`, `0138C`) are complete in `AI-Atomic-Framework`. Parent acceptance is satisfied:

- `taskflow open` is the official orchestrated opener entry with explicit delegated vs fallback mode reporting.
- Host-neutral policy surfaces allocate ids, resolve paths, and route roster sync through `tasks roster update` only.
- Residue diagnosis (`tasks finalize diagnose`, `tasks status --residue`) classifies buckets and recommends one governed next command without silent history deletion.

**Closure commit target:** `AI-Atomic-Framework` (implementation) + this planning card family marked `done` in `3KLife`.
