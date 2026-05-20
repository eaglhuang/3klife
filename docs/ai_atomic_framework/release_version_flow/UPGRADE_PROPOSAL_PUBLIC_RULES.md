<!-- doc_id: doc_other_0731 -->
# ATM Upgrade Proposal Public Rules

This document defines the public review contract for ATM upgrade proposals.
It is normative for all semver-impacting proposals and release candidates.

Canonical policy entry: [ATM版本升級規則書.md](./ATM版本升級規則書.md)

## 1. Required Fields

Every proposal MUST include:

1. `proposal_id` and owner.
2. Target version and release channel (`alpha0`, `alpha1`, `beta`, `stable`, `lts`).
3. Scope (`framework`, `atom schema`, `plugin sdk`, `adapter`, `tooling`, `docs`).
4. Classification (`patch`, `minor`, `major`) with rationale.
5. Compatibility impact summary and affected surfaces.
6. Migration path (or explicit `no-migration-needed` justification).
7. Validation plan and expected evidence artifacts.
8. Rollback trigger and rollback route.
9. Risk summary and escalation contact.

## 2. Breaking Change Classification

A proposal MUST be classified as `major` if any of the following apply:

1. Public API or SDK signature changes in a non-backward-compatible way.
2. Atom schema major bump.
3. Removal of a previously published deprecated API.
4. Contract changes that invalidate existing adapter behavior without migration.

`minor` is allowed for backward-compatible additive changes.
`patch` is only for non-contract bugfixes and documentation/tooling fixes.

## 3. Review Gates

A proposal is approvable only when all gates pass:

1. Maintainer review completed.
2. Validator owner review completed with deterministic evidence.
3. Compatibility matrix update completed (or explicitly marked not impacted).
4. Changelog and migration note prepared.
5. Rollback plan verified against current release window policy.

## 4. Decision States

Allowed decision states:

1. `approve`
2. `request-changes`
3. `reject`

Each state MUST include a decision note with links to evidence.

## 5. Evidence Requirements

At minimum, proposal evidence MUST contain:

1. Validation command list and final status.
2. Machine-readable report references.
3. Compatibility matrix diff (if impacted).
4. Changelog draft section (breaking/deprecation/migration).
5. Rollback trigger + route details.

## 6. Rollback Evidence Contract

If the proposal is merged into a release candidate, it MUST include:

1. `window_start` and `window_end`.
2. Concrete rollback trigger conditions.
3. Route classification: `version-pin`, `hotfix-patch`, or `full-revert`.
4. Owner sign-off record.

## 7. References

1. [LIFECYCLE.md](../../LIFECYCLE.md)
2. [ATOM_COMPATIBILITY.md](../../ATOM_COMPATIBILITY.md)
3. [GOVERNANCE.md](../../GOVERNANCE.md)
4. [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md)
