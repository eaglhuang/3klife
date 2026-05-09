<!-- doc_id: doc_other_0104 -->
# ATM Release Checklist

This checklist is the execution contract for ATM releases.
`ATM-5-0003` defines the template and policy. `ATM-5-0004` executes a concrete release run.

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
