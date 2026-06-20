# close-orchestration.ts Layered Merge Evidence

Date: 2026-06-21  
Target file:
`packages/cli/src/commands/taskflow/close-orchestration.ts`

## Why this file matters

This file is a better positive same-file merge case than `integration.ts` for
the paper's layered-evidence claim because it already has **formal atomization
coverage** in the repository atom map, and the broker-aware pre-patch scanner
still finds a second-layer virtual segmentation inside the same file.

That means this file demonstrates both layers at once:

1. **Layer 1: formal atomization exists**
2. **Layer 2: broker can still split same-file writes into finer virtual atoms**

## Layer 1: real atom-map coverage already exists

`atomic_workbench/atomization-coverage/path-to-atom-map.json` currently maps
`close-orchestration.ts` to at least the following active atoms/maps:

| Atom / Map ID | Capability |
| --- | --- |
| `atm.task-closure-map` | Taskflow close backend argv / command builder for protected close surfaces |
| `atm.closeback-route-correctness-map` | Closeback route correctness, including out-of-scope waiver propagation |
| `atm.close-write-atomicity-map` | Fail-closed close `--write` transaction with rollback snapshot and commit phase |
| `atm.close-window-lock-map` | Release of close-window staged-index lock during rollback |
| `atm.evidence-bundle-manifest-map` | Evidence-bundle manifest and directory deliverable expansion hooks |
| `atm.task-view-dashboard-map` | Close completion checklist builder for ledger / planning / delivery / waiver state |

This is not a raw un-atomized file. It is already living inside the formal
ATM atomization surface.

## Layer 2: broker-level virtual segmentation inside the same file

The broker-aware pre-patch scanner selected the following positive pair inside
the same file:

| Virtual atom candidate | Lines | Role in experiment |
| --- | --- | --- |
| `buildClosebackPlan` | 186-327 | Patch A |
| `resolveClosebackPlanningPath` | 472-618 | Patch B |

These are two different functions in the same file, sufficiently separated in
line range and responsibility:

- `buildClosebackPlan` assembles closeback strategy, backend command, follow-up
  steps, and governance gate metadata.
- `resolveClosebackPlanningPath` resolves or recovers the planning-card path
  from task metadata and profile fallback policy.

## Positive path: same file, different virtual atoms

Broker simulation:

- Active intent A claims virtual atom
  `segment:packages::cli::src::commands::taskflow::close-orchestration.ts#buildClosebackPlan`
- Intent B proposes a write against virtual atom
  `segment:packages::cli::src::commands::taskflow::close-orchestration.ts#resolveClosebackPlanningPath`

Observed result:

- `verdict = parallel-safe`
- `lane = direct-brokered`

Interpretation:

The file is already formally atomized at the repository level, but the broker
does not stop at file ownership. It can still admit two same-file writes when
they land on disjoint function-scoped virtual atoms.

## Negative path: same file, same virtual atom

Broker simulation:

- Intent C claims
  `shared:packages::cli::src::commands::taskflow::close-orchestration.ts#buildClosebackPlan`
- Intent D also targets the same virtual atom
  `shared:packages::cli::src::commands::taskflow::close-orchestration.ts#buildClosebackPlan`

Observed result:

- `verdict = blocked-cid-conflict`
- `lane = blocked`
- conflict matrix arbitration = `freeze`

Interpretation:

Once both writes collapse onto the same virtual atom, the broker blocks the
second writer even though both writes live in the same already-atomized file.

## What this proves for the paper

`close-orchestration.ts` is the cleanest current evidence for the paper's
"dual-use value" claim:

- **formal atomization remains useful**, because the file is already broken out
  into multiple governance-level atom/map capabilities; and
- **virtual atom analysis still adds value on top**, because the broker can
  distinguish safe same-file parallelism from unsafe same-function contention.

In short:

> ATM does not stop at coarse file-level or file-family atomization. Even after
> a file enters the formal atom map, the broker can still perform a finer
> second-layer segmentation to admit disjoint same-file work and reject
> same-atom contention.

## Recommended citation framing

Use `close-orchestration.ts` as the primary positive layered case in the paper,
and treat `integration.ts` as the follow-up case after its formal atom-map
coverage is added. That ordering is more honest and gives the reviewer a
stronger bridge from formal atomization to broker-level arbitration.
