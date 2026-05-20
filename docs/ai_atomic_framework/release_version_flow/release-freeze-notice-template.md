<!-- doc_id: doc_other_0736 -->
# ATM Release Freeze Notice Template

Release: `<version>`  
Freeze Window: `<start> -> <end>`  
Release Owner: `<name>`  
Status: `planned | active | lifted | cancelled`

## Scope

Frozen surfaces:

1. package versions
2. release manifest
3. compatibility matrix
4. skew matrix
5. release workflow
6. release notes

Not frozen:

1. unrelated feature branches
2. docs not affecting release surface
3. tests not changing release contract

## Allowed Changes During Freeze

1. release blocker fixes
2. validation evidence updates
3. release note corrections
4. rollback route updates

## Required Review

1. Release Owner review for release surface changes.
2. CODEOWNERS review for owned package surfaces.
3. CI gate must remain green.

## Exit Criteria

1. All blockers closed.
2. QA evidence attached.
3. Release note finalized.
4. Release Owner sign-off recorded.
