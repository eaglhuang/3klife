# ATM Core Runner Broker Design

A specialization of MAO for ATM core derived-artifact production under multi-agent parallel development.

## 0. Status

- **Status**: north-star design reviewed against current ATM runner implementation; recommended first rollout is `Runner Sync Steward v1` through `TASK-MAO-0011` to `TASK-MAO-0013`
- **Series**: MAO (Multi-Agent Orchestration) — extension chapter
- **Parent document**: [MAO 多 AI 並行治理計畫書.md](./MAO多AI並行治理計畫書.md)
- **Reference skill**: `.agents/skills/atm-atom-map-refactor`
- **Planning repo**: 3KLife
- **Target repo**: AI-Atomic-Framework

## 0.1 Current implementation reality check (2026-06-14)

The design direction is sound for ATM core development, but the current runner implementation is not yet able to satisfy this design without prerequisite work.

Current target repo facts:

- `node atm.mjs` is a stable launcher. It prefers `release/atm-onefile/atm.mjs`, then falls back to `packages/cli/dist/atm.js`.
- `node atm.dev.mjs` is the source-first development runner and must not be used to hide stale frozen artifacts.
- `npm run build` currently runs `tsc`, package dist build, root-drop release build, and onefile release build.
- The current stale-runner warning in root `atm.mjs` is mtime-based and only watches `packages/cli/src` and `scripts`, so changes under `packages/core/src`, `packages/plugin-governance-local/src`, schemas, and other runner-affecting surfaces can escape that heuristic.
- Current release manifests and onefile payload generation include wall-clock `generatedAt` values, and file traversal must be proven stable. Therefore current `npm run build` is not yet a reproducible byte-identical build in the sense required by `INV-RUNNER-002`.
- Current closure packets can include runner release deliverables and runner version evidence in existing validators, but they do not yet include a formal `atmCoreRunnerBinding` with source commit, artifact digest, publisher, and reproducibility proof.

Corrections applied to this plan:

1. `TASK-MAO-0011` must land before any ref-publish or closure-binding work. It audits and removes build nondeterminism instead of assuming double-build already works.
2. ATM core classification must include the real current runner-affecting surfaces, not only the future `scripts/AtmCore/` convention.
3. Patch capture must handle uncommitted worktree changes; `git diff baseline..HEAD` is insufficient for normal agent WIP.
4. Version refs may be immutable for published versions, but moving pointers such as `in-dev/HEAD` are mutable control refs and must be treated separately.
5. Runner artifact binding should be a canonical sha256 over a generated artifact manifest and critical artifact bytes, not an ambiguous tree hash.
6. M5 cannot be claimed as governed work until cards `TASK-MAO-0011` through `TASK-MAO-0022` exist in the MAO shard and task index.
7. The first implementation slice should be a lighter `Runner Sync Steward v1`, not a full Broker mental model for every AI agent.

## 0.2 Recommended rollout stance

This design remains the long-term target, but the recommended operational rollout is staged:

1. **Immediate guardrails**: widen `ATM_RUNNER_SYNC_REQUIRED`, treat `release/**` as generated-artifact single-writer output, and stop ordinary source tasks from writing frozen runner artifacts directly.
2. **Runner Sync Steward v1**: source-writing AI agents deliver source + tests only; a single steward lane rebuilds, validates, and commits runner outputs in a clean target repo. This is the recommended first implementation slice for `TASK-MAO-0011` through `TASK-MAO-0013`.
3. **Full Runner Broker**: only after v1 proves insufficient should ATM introduce leased in-dev refs, patch-envelope submission, closure runner binding, and external-core PR ingestion.

This means the full Broker is a justified escalation path, not the default operator burden for every ATM core contributor.

## 0.3 Reality reconciliation note (2026-06-14)

Captain has already begun parallel implementation while this design was being finalized. The 22 MAO cards' frontmatter `status` remains `planned` because none have yet gone through `taskflow close --write`, but a substantial portion of declared deliverables already exists on disk in `AI-Atomic-Framework`. See [tasks/README.md](./tasks/README.md) `## Reconciliation pass — 2026-06-14` for the per-card `Audit` column (values: `shipped` / `partial` / `stub`).

Implications for any AI executing these cards:

- **Do not re-create existing files**. Read the card's Audit value first; for `shipped` and `partial` cards, the residual scope is "fill the listed gaps", not "build from scratch".
- **`shipped` cards need retroactive governed-close** via `tasks reconcile --historical-delivery <sha>` before `status: done` is legitimate.
- **Test path convention**: where tests already exist under `packages/core/src/broker/__tests__/`, prefer that location even if a card's deliverables list mentions `tests/cli/<name>.test.ts`.
- **Phase B/C (MAO-0014~0022) dependency chain pinned on optional MAO-0017**: an explicit decision is needed before Phase B starts about whether to (a) execute MAO-0017 unconditionally as the gating ref-stream primitive, or (b) re-scope MAO-0018+ to be runnable on the v1 steward lane without ref streams. This design currently assumes (a); the README notes the alternative.

The implementation found on 2026-06-14 is generally consistent with this design's direction; the gaps identified are mostly tests, fixtures, and the Phase B/C ref-stream primitives that were always slated for later.

## 1. Why this exists

The MAO plan establishes a logical parallel routing layer for multi-agent ATM development. It defines Root Router, Broker Intent Registry, Conflict Matrix, Patch Envelope, and Steward arbitration for general parallel source writes.

When multiple AI agents simultaneously edit ATM core source (`packages/cli/**`, `packages/core/**`, etc.), the same MAO primitives must extend to govern the **derived artifact** that those source edits produce: the runner bundle under `release/**`. That bundle is what every consumer of ATM actually executes. Without a dedicated treatment, parallel core editors race on `release/**` writes, contaminate each other's `git blame`, and break closure packet reproducibility.

This document specializes the existing MAO Broker / Steward roles for ATM core, defines the runner version lifecycle, and binds runner version proof into task closure packets. It does not invent a new Broker — it gives the existing MAO control plane a clear contract for one specific derived artifact class, with a steward-first rollout recommended before full Broker mechanics are activated.

## 2. Relation to MAO

This design **reuses** every MAO primitive. It does not introduce parallel mechanisms.

| MAO primitive | Reused for ATM core Runner Broker |
|---|---|
| Root Router | Still authoritative for global task graph, route registry, conflict decisions |
| Route Context | Each ATM-core-editing AI opens a route with `--scope atm-core` flag |
| Broker Intent Registry | Records which routes are editing ATM core scope; answers "is anyone currently editing core?" |
| Conflict Matrix | Same rules (CID-disjoint allow, atom-write overlap freeze, etc.) — the ATM core lane is one more CID arbitration scope |
| Freeze / Resume Protocol | Used when a Broker patch submit cannot rebase cleanly on Broker HEAD |
| Patch Envelope | **Specialized** with an ATM core target — see §5 |
| Steward | The single-writer control lane for runner outputs. In v1 this can be a light steward lane; in the full model it is embodied by the Broker actor. |

**What this adds beyond MAO**:

1. ATM core scope is explicitly declared (§4) so the Intent Registry can classify routes deterministically.
2. The Steward for ATM core scope is the **single writer** of `release/**`; runner version ref publication becomes part of that same lane once the full Broker model is activated (§6).
3. Two runner version streams exist (`in-dev`, `built`) with explicit promotion rules (§6).
4. Task closure packets include a cryptographic binding to the runner version that was used to validate them (§9).
5. Reproducible-build verification is a Broker-enforced gate (§10).

### 2.1 Compatibility boundary with existing MAO cards

M5 depends on M0-M4 but must not force a rewrite of them. The M0-M4 cards stay generic MAO work; M5 adds specialization through extensions:

- MAO-0005 must allow extensible scope labels such as `atm-core`.
- MAO-0006 must treat generated-artifact drift as a first-class conflict signal.
- MAO-0008 must allow additive specialization fields without creating a second patch envelope schema.
- MAO-0009 must allow a steward identity that is also the single writer for a derived artifact class.
- MAO-0010 must include runner-derived-artifact scenarios in the simulator once M5 fixtures exist.

## 3. Core principle

> The runner is a CID-managed derived artifact. It has exactly one stewarded writer lane: the steward lane in v1, and the Broker actor in the full model. Once versioned refs exist, consumers pull those refs and record the consumed version in closure.

### 3.1 v1 operational principle

Before full Broker rollout, use the simpler rule:

> Source-writing AI agents do not edit `release/**`. They finish source + tests, then hand off runner publication to a single steward lane.

This keeps the derived artifact governed without forcing every AI agent to understand ref streams, patch-envelope submission, or closure-binding internals on day one.

Three invariants follow:

- **INV-RUNNER-001**: `release/**` is writable only by the steward-controlled single-writer identity. In v1 this is the Runner Sync Steward lane; in the full model this is the `atm-core-runner-broker` actor identity.
- **INV-RUNNER-002**: Every published runner version corresponds to a single source commit SHA and is byte-identical for that SHA across rebuilds.
- **INV-RUNNER-003**: Published runner refs are immutable. Subsequent edits produce new refs; existing refs never mutate.

## 4. ATM core scope definition

The Broker Intent Registry classifies a route as `atm-core` if any declared write target matches one of these paths. AIs **must** declare intent before edit; an undeclared edit that lands in this scope is a governance violation.

```yaml
atmCoreScope:
  - packages/core/**
  - packages/cli/**
  - packages/plugin-governance-local/**
  - packages/adapter-local-git/**  # included when CLI behavior depends on adapter runtime behavior
  - schemas/**
  - release/**                 # single-writer generated output; ordinary source-writing AI edits here are rejected
  - .atm/charter/**            # Charter is treated as ATM core; humans approve waivers
  - atm.mjs
  - atm.dev.mjs
  - package.json
  - tsconfig.build.json
  - scripts/AtmCore/**         # Canonical directory for any script that affects runner build
```

### 4.1 The `scripts/AtmCore/` convention

Today's framework repository has build- and runner-affecting scripts scattered under `scripts/` (e.g. `build-onefile-release.ts`, `build-root-drop-release.ts`, `build-package-dist.ts`, `validate-cli.ts`). Their effect on the runner is implicit, which forces the Broker to maintain a conservative override list.

**Rule going forward**: any new script whose edit can affect the produced runner bundle must live under `scripts/AtmCore/` or be listed in the runner-build scope manifest introduced by `TASK-MAO-0012`. Existing build/validation scripts are not moved in one broad sweep until reproducibility is proven, because `package.json`, root-drop payload generation, and onefile embedding currently depend on their paths.

`TASK-MAO-0012` therefore creates the compatibility bridge:

- introduce a machine-readable runner-build scope manifest;
- classify current build-affecting scripts through that manifest;
- add a thin `scripts/AtmCore/` entrypoint or wrapper only where it reduces ambiguity;
- migrate existing scripts incrementally after tests prove release parity.

After migration, the Broker classifier rule can become "is this path under `scripts/AtmCore/` or the manifest?" instead of maintaining a hidden override list.

Non-core scripts (one-off utilities, planning helpers, schema generators that do not feed the runner build) remain at `scripts/` top level and never trigger core route classification.

## 5. Patch envelope: MAO-0008 specialization

This design **reuses MAO-0008 patch envelope** with two added fields. No second envelope format is introduced (Decision ① a).

```jsonc
{
  "schemaId": "atm.maoPatchEnvelope.v1",       // base format from MAO-0008
  "envelopeId": "envelope-<random>",
  "routeId": "route-<random>",
  "submittedBy": "<actor-id>",
  "submittedAt": "<ISO timestamp>",
  "patch": {
    "format": "git-diff",                       // standard git diff format (Decision ④ a)
    "baselineCommitSha": "<sha>",               // what the AI's edits are relative to
    "diffSha256": "sha256:...",                 // integrity hash
    "diffPath": ".atm/routes/<route-id>/patch.diff"
  },

  // ATM core specialization fields
  "targetArtifact": "atm-core-runner",          // present only for core patches
  "atmCoreClassification": {
    "classifier": "intent-registry-v1",
    "matchedScopePaths": ["packages/cli/src/commands/taskflow.ts"],
    "declaredAtoms": ["atom-cli-router"],
    "declaredCids": ["cid-<...>"]
  }
}
```

The base envelope handles arbitrary source patches (existing MAO behavior). The two added fields are inert for non-core patches and inspected by the Broker for core patches.

### 5.1 Patch format: standard `git diff`

Decision ④ a. AIs submit standard git diff format. For normal uncommitted agent WIP, `git diff baselineCommitSha..HEAD` is not sufficient because it ignores uncommitted worktree changes. The route command must provide or document a capture command equivalent to:

```bash
git diff --binary <baselineCommitSha> --
```

If untracked files are part of the route, the route command must either stage them with intent-to-add before diff capture or include an explicit untracked-file payload in the envelope. The Broker still applies via `git apply --3way`. The same mechanism applies to general MAO patches and to ATM core patches — operators learn one workflow.

Rationale: standard git-diff format is universal, tooling is complete, no custom parser needed, and the patch artifact is human-reviewable.

## 6. Runner version stream state machine

Two version streams exist concurrently. Both live under detached git refs in the target repository.

```
refs/atm-runner/built/v<N>             # canonical stable versions, monotonic N, immutable
refs/atm-runner/in-dev/v<N+1>-dev.<k>  # work-in-progress versions atop the last built, immutable
refs/atm-runner/in-dev/HEAD            # moving control ref pointing at the latest in-dev
```

### 6.1 States

```
[idle]
  ├─ no active route classified as atm-core
  ├─ in-dev stream does not exist
  └─ all consumers read built/v<N>

      │
      │ first atm-core route acquires runner lease
      ▼

[core-editing-active]
  ├─ at least one active atm-core route
  ├─ in-dev stream exists; refs/atm-runner/in-dev/HEAD points at v<N+1>-dev.<k>
  ├─ every successful Broker patch merge re-builds and advances in-dev/HEAD
  ├─ atm-core routes pull in-dev/HEAD (their hard gate)
  └─ non-core routes continue pulling built/v<N> (unchanged)

      │
      │ last atm-core route releases, queue empties
      ▼

[core-editing-quiescing]
  ├─ Broker runs a final reproducible build at the current source HEAD
  ├─ double-build verification (§10)
  ├─ if pass → publish refs/atm-runner/built/v<N+1>
  ├─ if fail → emit ATM_RUNNER_BUILD_NOT_REPRODUCIBLE; route to steward
  └─ in-dev stream is retained for audit (immutable version refs); moving HEAD pointer cleared

      │
      │ publish successful
      ▼

[idle]
  └─ consumers see built/v<N+1>
```

### 6.2 Distribution rules

- **AI editing ATM core** (route declared `--scope atm-core`): pulls `refs/atm-runner/in-dev/HEAD` when it exists; the first core route starts from the latest `built/v<N>` and receives an in-dev lease after its first Broker publish. **Hard gate at close**: leased version SHA must equal current `in-dev/HEAD` SHA for core-editing routes. If a newer in-dev published while the AI was working, the close is rejected and the AI must refresh their lease and re-validate.
- **AI not editing ATM core**: pulls `refs/atm-runner/built/v<latest>`. Lease holds this ref for the session duration; no upgrade pressure mid-session.
- **External consumer / CI**: pulls `refs/atm-runner/built/v<latest>` exclusively.

### 6.3 Tracking active core routes

Broker Intent Registry already records active routes (MAO-0005). This design adds a derived query: `coreEditingRouteCount = count of routes where intent.scope == atm-core AND status == active`. When this count drops to 0 **and** the patch submission queue is empty, the state transitions from `core-editing-active` to `core-editing-quiescing`.

Stale routes are reaped via standard MAO lease TTL and heartbeat (MAO-0007). Network failures, AI crashes, and timeouts route through the existing freeze/resume protocol. This document inherits that mechanism; it does not add a new failure-detection layer.

## 7. Submit pipeline

AI workflow for an ATM core edit:

```
1. Acquire route:
     node atm.mjs route open --task <id> --actor <id> --intent write --scope atm-core --json
   → returns { routeId, leasedRunnerVersion: "in-dev/v<N+1>-dev.<k>" or "built/v<N>" if first }

2. Edit in local worktree (no commit yet).

3. Pre-submit local source-level validation:
     npm run typecheck
     node --strip-types <focused-test-spec>
   These run on the AI's local source. CLI integration tests are NOT run pre-submit —
   they will run post-merge against the new in-dev version.

4. Generate patch:
     git diff --binary <baselineCommitSha> -- > .atm/routes/<routeId>/patch.diff
   If new files are included, capture must include them via route tooling or `git add -N` before diff generation.

5. Submit:
     node atm.mjs route submit-patch --route <routeId> --patch .atm/routes/<routeId>/patch.diff --json
   → Broker queues the patch

6. Broker processes (serialized per atm-core lane, CID-disjoint parallel allowed):
     a. apply patch on current Broker HEAD
     b. if rebase needed, attempt 3-way; if conflict → freeze + steward path (MAO-0009)
     c. commit source as Broker identity
     d. build runner from source HEAD (single build, not double; double-build verification is deferred to quiescing per §6.1 / §10 to avoid 2× build cost per patch)
     e. compute runnerArtifactSha256 over the canonical artifact manifest
     f. publish refs/atm-runner/in-dev/v<N+1>-dev.<k+1>
     g. advance in-dev/HEAD
     h. return { sourceCommitSha, runnerVersion, runnerArtifactSha256, reproducibilityVerified: false (in-dev refs are single-build; reproducibility is enforced at promotion) }

7. AI integration verification (post-merge):
     refresh lease (now pinned to latest in-dev/HEAD)
     run CLI integration tests against the new runner
     these tests verify that the merged state behaves correctly,
     not that the AI's pre-merge edits did

8. Close:
     node atm.mjs taskflow close --task <id> --actor <id> --write --json
   Closure packet includes atmCoreRunnerBinding (§9).
```

### 7.1 Pre-submit testing scope (Decision ⑤)

The AI does **not** run CLI integration tests against its own pre-submit source. Reasoning the user articulated:

- All testing is intrinsically against a past version; newer versions always exist
- Correctness is verified by future re-runs against newer versions
- What matters is the breadth and depth of tests left behind by each task
- An AI's job is to write good tests (per the RFT series discipline) and submit clean source; the integration verification happens post-merge against the merged in-dev

So the AI's pre-submit local testing is **source-level only**: type checking, lint, unit tests of the edited atom. The CLI test surface activates only after Broker publishes a new in-dev version — at which point the same AI (or another) can validate against that real merged state.

## 8. CID arbitration for runner publishes

This is just the MAO Conflict Matrix applied to the ATM core lane. No new rules.

| Case | Default verdict |
|---|---|
| Two routes edit different atoms in `packages/cli/` | Parallel allowed; Broker queues both, publishes in submission order |
| Two routes edit the same atom (e.g. both touch `atom-cli-router`) | Second route is frozen until first closes; standard MAO freeze/resume |
| Route edits `packages/cli/src/commands/foo.ts:42-100` while another edits `:200-250` | Parallel allowed with range guard (MAO conflict matrix row "Same physical file, different atom CID, non-overlapping ranges") |
| Route declares ATM core scope but actual patch hits a file outside `atmCoreScope` | Patch rejected with `ATM_RUNNER_PATCH_SCOPE_DRIFT` |
| Route does not declare ATM core scope but patch contains a file in `atmCoreScope` | Patch rejected with `ATM_RUNNER_PATCH_UNDECLARED_CORE_WRITE` |

The last two are the **only** new error codes this design introduces. Everything else is MAO-0006 vocabulary.

## 9. Cross-repo task handling (Decision ③ b)

Tasks may span both ATM core (target repo, AI-Atomic-Framework) and adopter code (planning repo, 3KLife). TASK-CID-0073 was exactly this shape.

### 9.1 Mixed task policy

A single task card may declare scope in both repositories. The closure packet records both delivery proofs separately:

```jsonc
{
  "schemaId": "atm.closurePacket.v1",
  // ... existing fields ...

  "atmCoreRunnerBinding": {                         // NEW: present iff task touched ATM core
    "version": "built/v1.4.5",                      // or "in-dev/v1.4.6-dev.7"
    "stream": "built",                              // or "in-dev"
    "sourceCommitSha": "abc123def456...",
    "runnerArtifactSha256": "sha256:9e6c8...d4f12", // canonical hash over runner artifact manifest + critical artifact bytes
    "publishedAt": "2026-06-14T...",
    "publishedBy": "atm-core-runner-broker",
    "reproducibilityVerified": true,
    "reproducibilityMethod": "double-build-byte-compare"
  },

  "adopterRepoBinding": {                           // existing concept, now formalized
    "repoLabel": "3KLife",
    "commitSha": "fedcba987654...",
    "branch": "master"
  }
}
```

The `runnerArtifactSha256` is the cryptographic anchor the user requested. Anyone auditing this closure packet later can verify "this task was validated against exactly this runner artifact" by fetching `refs/atm-runner/built/v1.4.5`, reading the runner artifact manifest, and recomputing the canonical sha256 over the listed critical artifacts. Do not call this a Git tree hash unless the repository has explicitly standardized on Git SHA-256 object format.

### 9.2 Submit ordering for mixed tasks

For a mixed task:

1. AI submits ATM core portion through Broker (§7). On success, gets `runnerVersion + runnerArtifactSha256`.
2. AI commits adopter portion to its own repo via `taskflow close --write` (normal MAO path).
3. Closure packet is generated containing both bindings.

The ATM core submission happens first because the adopter test depends on the runner. If the Broker rejects the ATM core patch, the adopter portion is held; no half-merged state exists.

## 10. Reproducibility validation: double-build

INV-RUNNER-002 requires that the same source SHA produces a byte-identical runner. The Broker enforces this at publish time:

```
1. Broker applies patch, commits source.
2. Broker runs `npm run build` in workspace A → produces artifact_A
3. Broker runs `npm run build` in workspace B (clean clone at the same source SHA, same lockfile, same Node major) → produces artifact_B
4. Byte-compare critical artifacts:
   - release/atm-onefile/atm.mjs
   - release/atm-onefile/release-manifest.json
   - release/atm-root-drop/release-manifest.json
5. If equal → publish ref; record reproducibilityVerified: true
6. If differ → ATM_RUNNER_BUILD_NOT_REPRODUCIBLE; refuse to publish; route to steward
```

This is the gate that makes version pinning meaningful. Without it, two readers of the same ref could observe different bytes, breaking the cryptographic binding in §9.

Current blocker: the present build scripts write wall-clock `generatedAt` fields into release manifests and the onefile payload. `TASK-MAO-0011` must normalize those fields or move volatile provenance outside the byte-compared artifact set before this gate can pass.

### 10.1 Reproducible-build prerequisites (pre-work card)

A separate task card precedes the Broker rollout: audit `npm run build` for non-determinism (timestamps embedded in manifests, sort orders, lockfile resolution variance). Fix any found. Reproducible build is the structural prerequisite — Broker cannot enforce what the toolchain cannot guarantee.

## 11. Broker bootstrap and self-update

The Broker software is itself ATM core. This creates a chicken-and-egg problem:

- The Broker that builds version N+1 of the runner must itself be at version N
- When the Broker's own code is changed, who builds the new Broker?

### 11.1 Bootstrap

- Initial Broker is human-built and committed by the framework maintainer. This is `built/v1.0.0` baseline.
- Broker process starts from this initial published ref.

### 11.2 Self-update path

When a patch modifies code that the Broker itself executes (e.g. its CID arbitration logic, build orchestration, ref publication code):

1. The patch is classified as ATM core normally
2. Broker applies, builds, publishes new in-dev
3. **The Broker process itself does not hot-swap to the new version mid-flight** — that would risk in-progress submissions on inconsistent code
4. After publishing built/v<N+1>, Broker schedules a graceful self-restart: drain in-flight submissions, swap to the new built runner, resume queue
5. A "Broker version" field in published runners records which Broker version produced them; audit logs trace this lineage

### 11.3 Disaster recovery

If the Broker is mid-build and crashes:
- The lease and intent registry are persisted on disk (standard MAO behavior)
- A fresh Broker process reads state, identifies in-progress submissions, retries or marks them as needing operator review
- The leasedRunnerVersion contracts remain valid because immutable refs cannot be lost — they live in git

If the Broker host is destroyed:
- During development: spawn a new Broker AI agent; it reads `.atm/runtime/broker/` state and resumes. Restart cost is low (the user's point C answer).
- In production: hot-standby Broker AI agent always synced; failover is a service-discovery flip.

## 12. Failure modes (extends user's answer to risk C)

| Failure | Detection | Recovery |
|---|---|---|
| AI crashes during edit | Lease TTL expiry (MAO standard) | Route auto-released; in-dev stream unaffected |
| AI submits a patch that fails to apply | Broker `git apply` returns conflict | Patch rejected with rebase instructions; AI rebases and resubmits |
| Build fails on Broker | Build script non-zero exit | Patch rejected; source reverted; steward review |
| Build succeeds but not reproducible | Double-build mismatch | Patch rejected; investigation card opened |
| Broker process crashes | Health check / standby ping | Standby takes over; in-flight submissions retry from persistent state |
| Broker host destroyed | Manual escalation | Spawn new Broker agent; restore from heritage docs (audit log of all published refs is sufficient state) |
| Network partition between AI and Broker | Submit RPC timeout | AI retries; idempotency key prevents double-submit |
| Two simultaneous patches with CID overlap | Conflict matrix detects | Second patch frozen; standard MAO arbitration |
| `release/**` written outside the steward single-writer lane | Pre-commit hook + branch protection | Commit rejected; actor education |

The user's framing for risk C is the system-level reliability principle:

> heritage docs are the real recovery mechanism

Every Broker action emits a published ref and an audit log entry. A new Broker can reconstruct full state by reading these. No mutable Broker-internal state is load-bearing.

## 13. Open-source contributor pipeline (per user's補充 3)

External contributors must use the same Broker once external core contribution is opened. This is explicitly a post-v1 concern, not a prerequisite for the first internal steward rollout.

### 13.1 Initial state

ATM open-sourcing begins with **external core modifications closed**:

- GitHub branch protection blocks any PR that touches `packages/cli/**`, `packages/core/**`, `packages/plugin-governance-local/**`, `release/**`, `.atm/charter/**`, `scripts/AtmCore/**`
- External contributors may submit PRs touching only `docs/**`, `examples/**`, non-core scripts, tests, fixtures
- This is honest about not having the external-facing Broker hardened yet

### 13.2 Opening external core contributions

When the Broker has matured (reproducible build proven over months, CID arbitration tested at scale, escalation path documented), external core PRs become accepted via:

1. External contributor opens PR against `submissions/atm-core/<contributor>/<branch>`
2. CI bot extracts patch, formats as MAO patch envelope, submits to Broker as if it were an internal route
3. Broker runs the same CID arbitration + reproducibility checks
4. On accept: Broker merges, publishes new in-dev or built; updates PR with result
5. On reject: Broker comments on PR with conflict reason and required action

The external workflow is **identical** to the internal workflow from the Broker's perspective. The only difference is the submit-trigger surface (GitHub Action vs CLI command).

### 13.3 Why this matters for the paper

ATM is the first system I'm aware of where the same governance primitive (CID + Broker arbitration) handles:

- Internal AI agent parallel writes
- Internal human + AI mixed parallel writes
- External open-source contributor PRs to the framework itself

This unification is the academic strength. The framework governs its own development with the same primitive it offers to its users.

## 14. What does NOT change

To keep this design small, the following remain exactly as MAO and ATM already specify:

- Task card frontmatter shape, validators block, atomizationImpact
- `taskflow open` / `taskflow close` dual-repo orchestration
- Closure packet existing fields (this design only adds `atmCoreRunnerBinding`)
- CID assignment to source files
- Steward arbitration UI/UX
- Evidence run / verify / missing verbs
- Emergency lease mechanism
- AAO charter and invariants

## 15. Implementation roadmap

Task cards are opened as MAO series extensions, not new RFT cards. Numbering picks up after the existing MAO-0010.

| Task ID | Purpose | Depends on |
|---|---|---|
| TASK-MAO-0011 | Reproducible-build audit and remediation for current `npm run build` (`Runner Sync Steward v1` gate) | — |
| TASK-MAO-0012 | Runner sync scope manifest and steward-only generated-artifact contract | MAO-0011 |
| TASK-MAO-0013 | ATM core scope declaration, stale-runner widening, and steward classifier extension | MAO-0012 (intentionally NOT depending on MAO-0005; classifier exposes pure functions a future Broker intent layer can adapt to) |
| TASK-MAO-0014 | Deferred full-Broker runner ref storage (refs/atm-runner/built, refs/atm-runner/in-dev) | MAO-0011, MAO-0012 |
| TASK-MAO-0015 | Deferred full-Broker patch-envelope specialization fields (targetArtifact, atmCoreClassification) | MAO-0008 (existing) |
| TASK-MAO-0016 | Deferred full-Broker submit pipeline: route submit-patch → CID arbitrate → single build per patch → publish in-dev (double-build verification deferred to quiescing per §10) | MAO-0008, MAO-0011, MAO-0014, MAO-0015 |
| TASK-MAO-0017 | Deferred full-Broker version stream state machine: in-dev / built / quiescing transitions | MAO-0014, MAO-0016 |
| TASK-MAO-0018 | Deferred full-Broker closure packet `atmCoreRunnerBinding` field and cryptographic verification | MAO-0017 |
| TASK-MAO-0019 | Deferred full-Broker cross-repo task closure: dual binding (ATM core + adopter) | MAO-0018 |
| TASK-MAO-0020 | Long-term Broker bootstrap, self-update path, restart-from-heritage-docs flow | MAO-0017 |
| TASK-MAO-0021 | Long-term full-Broker failure-mode coverage tests | MAO-0017, MAO-0020 |
| TASK-MAO-0022 | Long-term open-source contributor pipeline: GitHub Action → patch envelope → Broker submit | MAO-0017, MAO-0018 |

12 cards. Suggested execution order is intentionally phased:

- **Phase A / v1 now**: `TASK-MAO-0011` through `TASK-MAO-0013`
  These establish reproducibility, scope classification, stale-runner widening, and the single-writer steward lane.
- **Phase B / escalate only if needed**: `TASK-MAO-0014` through `TASK-MAO-0019`
  These add ref streams, patch-envelope specialization, submit-patch, and closure binding only if v1 stewardship proves too coarse.
- **Phase C / long-term self-hosting and OSS**: `TASK-MAO-0020` through `TASK-MAO-0022`
  These cover Broker restart lineage, broader failure coverage, and future external core contribution ingestion.

`TASK-MAO-0011` remains the gate: until reproducible build is proven, neither the light steward lane nor the full Broker path is trustworthy.

## 16. Open questions

Items still ambiguous; should be resolved before or during implementation:

1. **Patch envelope storage location**: under `.atm/routes/<routeId>/patch.diff` (per MAO command shape) or under a Broker-managed `.atm/runtime/broker/submissions/` namespace? Affects access control. Covered by `TASK-MAO-0015` and `TASK-MAO-0016`.
2. **In-dev ref retention**: keep all `in-dev/v<N>-dev.<k>` forever, or GC after promotion to `built/v<N+1>`? Recommend keep at least one full cycle for audit; full GC policy needs cost analysis. Covered by `TASK-MAO-0017` and `TASK-MAO-0021`.
3. **Steward role for ATM core vs general MAO**: same human/agent or different? Suggest same actor with a sub-permission flag, to avoid bootstrap complexity. Covered by `TASK-MAO-0009` compatibility notes and `TASK-MAO-0020`.
4. **Broker identity provisioning**: who issues the `atm-core-runner-broker` actor credential initially? Manual seed by framework maintainer is fine for v1. Covered by `TASK-MAO-0020`.
5. **Adopter SDK consumption pattern**: external projects depending on ATM as a library — do they pin `built/v<N>` directly in their lockfile, or follow latest via a release channel? Suggest both, with explicit channel names. Covered by `TASK-MAO-0018`, `TASK-MAO-0019`, and `TASK-MAO-0022`.
6. **Build artifact storage size projection**: at expected commit cadence, project storage growth and validate git ref space stays manageable for the project lifetime. May require migrating refs to a separate object store eventually. Covered by `TASK-MAO-0014` and `TASK-MAO-0021`.

## 17. Cross-references

- Parent: [MAO 多 AI 並行治理計畫書.md](./MAO多AI並行治理計畫書.md)
- MAO command shape definitions: parent §"Command Shape"
- MAO conflict semantics: parent §"Conflict Semantics"
- MAO out-of-scope (v1): parent §"Out of Scope for MAO v1" — this design exits MAO v1 scope at MAO-0011+
- ATM atom map refactor skill: `.agents/skills/atm-atom-map-refactor` (in target repo)
- RFT series (size-driven refactors): `docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md`
- TASK-CID-0073 retrospective on dual-repo close + scope amendment: closure packet of TASK-CID-0073

## 18. Paper integration note

This design is intentionally **outside the current paper's scope** to keep the paper's three core primitives (CID, AGR, MAO logical layer) focused. The natural next paper or paper extension could be titled:

> Extending Conflict ID Governance to Derived Artifact Production:
> A Self-Hosting Case Study in the ATM Framework

That paper would use the implementation of MAO-0011 through MAO-0022 as its case study, with reproducibility-verified runner refs as the central experimental artifact.

For the current paper, only a forward-reference is needed: a footnote in the MAO chapter stating that the same primitive extends to derived artifacts, with a citation to this design document.
