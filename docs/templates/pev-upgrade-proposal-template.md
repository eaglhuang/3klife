<!-- doc_id: doc_other_0112 -->
# PEV Upgrade Proposal Template

Use this template for public, reviewable upgrade proposals.

## Proposal Metadata

- `proposal_id`:
- `owner`:
- `target_version`:
- `release_channel`: (`alpha0` | `alpha1` | `beta` | `stable` | `lts`)
- `scope`: (`framework` | `atom schema` | `plugin sdk` | `adapter` | `tooling` | `docs`)
- `classification`: (`patch` | `minor` | `major`)

## Plan

1. Problem statement:
2. Expected outcomes:
3. Compatibility assumptions:

## Execute

1. Implementation summary:
2. Validation commands:
3. Evidence artifact paths:

## Verify

1. Compatibility impact summary:
2. Semver recommendation and rationale:
3. Migration requirements (or `no-migration-needed`):

## Converge

- Decision state: (`approve` | `request-changes` | `reject`)
- Decision note:
- Sign-off:
  - Maintainer:
  - Validator owner:
  - Release owner:

## Rollback Contract

- `window_start`:
- `window_end`:
- `trigger`:
- `route`: (`version-pin` | `hotfix-patch` | `full-revert`)

## Machine-Readable Attachments

1. `schemas/pev/upgrade-proposal-public.schema.json` payload
2. `schemas/pev/spec-drift-prompt.schema.json` payload (when drift exists)
