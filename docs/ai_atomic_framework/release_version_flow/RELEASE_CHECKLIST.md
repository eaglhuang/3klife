<!-- doc_id: doc_other_0730 -->
# ATM Release Checklist

This checklist is the execution contract for ATM releases.
`ATM-5-0003` defines the template and policy. `ATM-5-0004` executes a concrete release run.

Canonical policy entry: [ATM版本升級規則書.md](./ATM版本升級規則書.md)

## 1. Channel Separation

### alpha0 (foundation gate)

1. Core validators pass.
2. Task-store truth sync check passes.
3. Required governance docs exist and are internally consistent.

### alpha1 (governance gate)

1. Upgrade proposal review complete.
2. Compatibility matrix updated.
3. Release owner sign-off recorded.

## 2. Security and Supply Chain

1. Secrets scan completed.
2. Artifact provenance record prepared.
3. Dependency/license policy check completed.

## 3. Package and Naming Policy

1. Package naming follows canonical prefixes:
   - `core`
   - `cli`
   - `plugin-*`
   - `adapter-*`
2. Version tags and release notes are aligned.

## 4. Release Execution

1. `npm pack` / `npm publish --dry-run` completed for publishable packages.
2. Release draft created with:
   - breaking changes
   - deprecations
   - migration notes
   - rollback window and route
3. Final checklist review completed by release owner.

## 5. Required Artifacts

1. Changelog section prepared.
2. Proposal decision record linked.
3. Validation evidence linked.
4. Compatibility matrix snapshot linked.

## 6. Exit Criteria

Release can move to publish only if:

1. All mandatory checklist items are complete.
2. No unresolved blocker findings remain.
3. Owner sign-off is present.

## 7. ATM-5-0004 Execution Record (May 9, 2026)

Release target: `v0.1.0-alpha`

### 7.1 alpha0 Checklist (Foundation Gate)

- [x] Core validators and policy contracts reviewed.
- [x] Task-store truth sync check passed (`sync-atm-stabilization-milestone --check --strict`).
- [x] Required governance docs exist and cross-link correctly.

### 7.2 alpha1 Checklist (Governance Gate)

- [x] Upgrade proposal / review contract linked (`UPGRADE_PROPOSAL_PUBLIC_RULES.md`).
- [x] Compatibility contract linked (`ATOM_COMPATIBILITY.md`).
- [x] Release owner sign-off section prepared in release draft.

### 7.3 Security and Supply Chain

- [x] Secrets scan step documented and executed as release gate item.
- [x] Provenance note included in release draft and dry-run plan.
- [x] Package naming policy checked against canonical prefixes (`core`, `cli`, `plugin-*`, `adapter-*`).

### 7.4 Publishing Readiness

- [x] GitHub release draft prepared: `release_runs/atm-v0.1.0-alpha-release-draft.md`.
- [x] npm dry-run plan prepared: `release_runs/atm-v0.1.0-alpha-npm-dry-run-plan.md`.
- [x] Local probe executed in tracking repo (`npm pack --dry-run`) and documented as non-publishable host baseline; upstream workspace execution required for final publish gate.
