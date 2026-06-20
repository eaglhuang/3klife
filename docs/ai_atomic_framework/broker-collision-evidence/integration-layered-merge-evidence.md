# integration.ts Layered Merge Evidence

Date: 2026-06-21  
Target file:
`packages/cli/src/commands/integration.ts`

## Status change from the earlier scan

Earlier, `integration.ts` was only a virtual-atom example: the broker-aware
pre-patch scanner could segment the file, but the file itself had no formal
first-layer atom-map coverage beyond the generic CLI fallback.

That is no longer true.

`atomic_workbench/atomization-coverage/path-to-atom-map.json` now contains
explicit active mappings for `integration.ts`:

| Atom / Map ID | Capability |
| --- | --- |
| `atm.integration-bootstrap-map` | Bootstrap and onboarding discovery for governed editor entry files |
| `atm.integration-dispatch-map` | CLI integration action dispatch and result shaping |
| `atm.integration-install-map` | Adapter install / uninstall / verify orchestration and factory lane |
| `atm.integration-manifest-map` | Manifest resolution, drift verification, and health reporting |

This means `integration.ts` now supports the same two-layer argument required
by the paper:

1. **formal atomization exists**, and
2. **broker virtual segmentation still adds same-file arbitration value**.

## Broker second-layer positive case

The broker-aware pre-patch scanner still selects the same best positive pair:

| Virtual atom candidate | Lines | Role in experiment |
| --- | --- | --- |
| `runIntegration` | 188-313 | Patch A |
| `verifyManifestFile` | 455-504 | Patch B |

Observed simulated broker result:

- `verdict = parallel-safe`
- `lane = direct-brokered`

Interpretation:

Even after the file gains formal atom-map coverage, the broker can still admit
same-file parallel work when the writes land on disjoint function-scoped
virtual atoms.

## Broker second-layer negative case

When both sides target the same virtual atom:

- `shared:packages::cli::src::commands::integration.ts#runIntegration`

Observed simulated broker result:

- `verdict = blocked-cid-conflict`
- `lane = blocked`
- arbitration = `freeze`

Interpretation:

The broker blocks same-function same-file contention even though the file is
already covered by multiple first-layer atom maps.

## Why this file is now useful

`integration.ts` is no longer the primary evidence file, but it is now a good
secondary demonstration of the same layered claim:

- `close-orchestration.ts` is the stronger lead case because it already had a
  richer pre-existing atom-map footprint and sits closer to earlier real
  taskflow dogfood evidence.
- `integration.ts` now acts as the follow-up reinforcement case showing that
  the same broker logic remains valuable after explicit atom-map reinforcement
  is added to a previously under-atomized CLI command file.
