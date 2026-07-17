---
doc_id: doc_other_0824
task_id: ATM-GOV-0123
title: Registry Lineage Backfill Command
milestone: M5
status: done
started_at: 2026-05-20T12:51:46.8283736+08:00
started_by_agent: codex-gpt-5
blocked_by: [ATM-GOV-0122]
owner: atm-core
related_plan: docs/ai_atomic_framework/gov-series-governance/ATM-GOV-Governance-Program-Plan.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:standard
public_tracking: false
executionMode: planned-upstream-change
created_at: 2026-05-20T00:00:00+08:00
created_by_agent: codex-gpt-5.5
lastTransitionId: 2026-05-21T10-29-44-318Z-migrate-legacy-ledger-cf9c7676869c
lastTransitionAt: 2026-05-21T10:29:44.318Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.318Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:67b3744b83014289c9cd992b5ae532b890c659c40b23afecd3c2af7cc32e4028
---

# ATM-GOV-0123 Registry Lineage Backfill Command

## Background

`ATM-NPCBRAIN-0002` proved that adopter atom lineage can be repaired by hand, but that repair is not an acceptable long-term workflow. Registry lineage must be written by a deterministic ATM command or atomized tool, using real evidence from map rollout artifacts instead of an AI agent directly editing `atomic-registry.json`.

This card follows `ATM-GOV-0122`. That task defines the adopter atom version lineage contract. This task turns the contract into a repeatable command flow.

## Outputs

1. A CLI command such as `registry lineage backfill` or an equivalent official route that can populate adopter atom `versionLineage` from reviewed evidence.
2. A strict input contract for `lineage-log.json`, propagation report, equivalence report, review-advisory, and human-review evidence.
3. A dry-run output that emits a deterministic registry patch without mutating the registry.
4. An apply path that writes lineage only after evidence validation, then emits registry-diff and closeout evidence reports.
5. Validation coverage for source-tree, root-drop, and onefile flows on a non-JS adopter fixture.

## Acceptance Criteria

- [x] Dry-run mode produces a deterministic patch for `atomic-registry.json` and does not mutate host files.
- [x] Apply mode refuses to write lineage unless required map rollout evidence is present and schema-valid.
- [x] Successful apply writes `versionLineage`, runs or triggers `registry-diff`, and emits closeout evidence.
- [x] Missing evidence returns explicit advisory/error codes rather than falling back to manual registry editing.
- [x] The command can complete the `ATM-NPCBRAIN-0002` style path from `0.1.0 -> 0.1.1` in a fixture without synthetic evidence.
- [x] Any new CLI helper, script, or registry writer introduced by this work is itself governed by ATM atomization: it must be generator-born or have generator-provenance/backfilled witness before it is treated as part of the framework implementation.
- [x] No workflow documentation instructs an AI agent to hand-edit adopter lineage as the normal path.

## Proposed Command Shape

```bash
node atm.mjs registry lineage backfill --atom <atom-id> --from <version> --to <version> --map <map-id> --lineage-log <path> --equivalence <path> --propagation <path> --review <path> --dry-run --json
node atm.mjs registry lineage backfill --atom <atom-id> --from <version> --to <version> --map <map-id> --lineage-log <path> --equivalence <path> --propagation <path> --review <path> --apply --json
```

Equivalent naming is acceptable if the final CLI keeps the same evidence and output contract.

## Target Files

- `packages/core/src/registry/**`
- `packages/core/src/upgrade/**`
- `packages/cli/src/commands/registry-diff.ts`
- `packages/cli/src/commands/**`
- `schemas/registry/**`
- `scripts/validate-registry-diff.ts`
- `scripts/validate-*.ts`
- `docs/MAP_REPLACEMENT_PROTOCOL.md`
- `docs/ADAPTER_GUIDE.md`
- `docs/ATOM_GENERATOR.md`

## Validation Commands

```bash
npm run typecheck
npm run build
node --experimental-strip-types scripts/validate-registry-diff.ts --mode validate
node --experimental-strip-types scripts/validate-generator-provenance.ts --mode validate
```

## Notes

2026-05-20 | status: open | validation: pending | change: Opened after `ATM-NPCBRAIN-0002` required a manual bootstrap lineage repair. The long-term path must be a repeatable ATM command that consumes reviewed map rollout evidence and writes registry lineage through an atomized implementation surface. | blocker: waiting for ATM-GOV-0122 lineage contract to land
2026-05-20 | status: done | validation: `npm run typecheck`; `npm run validate:registry-lineage-backfill`; `npm run validate:registry-diff`; `npm run validate:schemas`; `npm run validate:cli`; `npm run validate:root-drop-release`; `npm run validate:onefile-release`; encoding guard | change: implemented `registry lineage backfill` with dry-run/apply evidence gates, closeout report emission, registry-diff integration, source-tree validator, and root-drop/onefile release smoke in AI-Atomic-Framework commits `2d6f29c` and `2333a7c` | blocker: none
