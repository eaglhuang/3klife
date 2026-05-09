<!-- doc_id: doc_other_0108 -->
# AI-Atomic-Framework v0.1.0-alpha (Draft)

Status: Draft  
Date: May 9, 2026  
Release Channel: `alpha`

## Summary

This release draft is prepared under `ATM-5-0004` and aligned with:

1. `ATM-5-0002` adapter/plugin SDK documentation contract.
2. `ATM-5-0003` lifecycle/governance/policy contract.
3. Task-store truth pipeline (`tasks-atm shard -> tasks-atm.json summary -> milestone`).

## Scope

1. Governance release policy and checklist contract finalized.
2. Adapter guide and Plugin SDK public documentation delivered.
3. Host adapter example package added for downstream onboarding.

## Breaking Changes

None in this tracking repository release draft.

## Deprecated

No new deprecations introduced by `ATM-5-0004`.

## Migration Notes

1. Use `docs/ADAPTER_GUIDE.md` and `docs/PLUGIN_SDK.md` as canonical onboarding entry.
2. Follow `docs/RELEASE_CHECKLIST.md` section 7 for alpha0/alpha1 split gates.
3. Execute npm dry-run on upstream publishable workspace (not this tracking repository).

## Added

1. Release draft and dry-run plan documents.
2. Release execution record section in `docs/RELEASE_CHECKLIST.md`.

## Security

1. Release checklist enforces secrets scan as mandatory gate.
2. Provenance and evidence links are required in release notes.

## Rollback Notes

window: During `alpha` preview window before stable tag  
trigger: deterministic gate regression / contract drift / publish dry-run failure  
route: `version-pin` first, then `hotfix-patch`, then `full-revert` if needed

## Known Alpha Constraints

1. This repository is a tracking/downstream workspace and not a publish-ready npm package for ATM upstream artifacts.
2. Final npm publish dry-run must run on the upstream package workspace with valid publish metadata.

## Release Owner Sign-off

- Owner: `codex-gpt-5` (tracking execution)  
- Decision: `request-changes` on publish step until upstream dry-run evidence is attached  
- Condition to approve: attach upstream `npm pack` and `npm publish --dry-run` outputs for target packages
