<!-- doc_id: doc_other_0111 -->
# ATM Plan-Execute-Verify-Converge (PEV) Loop

This document defines the canonical PEV loop for ATM governance work.
It standardizes how upgrade proposals are created, validated, reviewed, and converged.

## 1. Scope

The PEV loop applies to:

1. Semver-impacting framework changes.
2. Atom schema or compatibility-impacting changes.
3. Plugin SDK and adapter contract changes.

It does not replace release execution. Release packaging and sign-off remain in `docs/ai_atomic_framework/release_version_flow/RELEASE_CHECKLIST.md`.

## 2. Inputs and Outputs

Input contracts:

1. Current lifecycle and compatibility contracts.
2. Living Spec snapshot and related drift findings.
3. Task-store truth snapshot for milestone alignment.

Output contracts:

1. A reviewable upgrade proposal document (from template).
2. A machine-readable proposal JSON matching `schemas/pev/upgrade-proposal-public.schema.json`.
3. Validation evidence links and rollback contract fields.

## 3. Loop Steps

### Plan

1. Identify impacted scope (`framework`, `atom schema`, `plugin sdk`, `adapter`, `tooling`, `docs`).
2. Classify semver recommendation (`patch`, `minor`, `major`) with rationale.
3. Prepare rollback window and trigger assumptions.

### Execute

1. Run deterministic validators for impacted surfaces.
2. Collect evidence artifacts (reports, logs, compatibility diff).
3. Draft proposal using `docs/templates/pev-upgrade-proposal-template.md`.

### Verify

1. Validate proposal payload with `schemas/pev/upgrade-proposal-public.schema.json`.
2. Validate drift prompt payload with `schemas/pev/spec-drift-prompt.schema.json` when drift exists.
3. Complete governance review gates from `docs/ai_atomic_framework/release_version_flow/UPGRADE_PROPOSAL_PUBLIC_RULES.md`.

### Converge

1. Decision state must be one of `approve`, `request-changes`, `reject`.
2. Approved proposals are merged with evidence links and changelog intent.
3. Rejected or changed proposals feed back into the next Plan step.

## 4. Deterministic Evidence Chain

Every converged proposal must include:

1. Validator command list and final status.
2. Compatibility impact summary and affected matrix rows.
3. Rollback trigger + route + owner sign-off.

## 5. Guardrails

1. No auto-promotion from draft to release state.
2. No proposal merge without machine-readable evidence references.
3. No semver decision without explicit compatibility reasoning.

## 6. References

1. `docs/LIFECYCLE.md`
2. `docs/ATOM_COMPATIBILITY.md`
3. `docs/GOVERNANCE.md`
4. `docs/ai_atomic_framework/release_version_flow/UPGRADE_PROPOSAL_PUBLIC_RULES.md`
