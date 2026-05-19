<!-- doc_id: doc_other_0717 -->
# APF-0052 Adopter-neutrality scanner and negative fixtures

## Purpose

Prevent adopter/private terms from leaking into upstream protected public surfaces.

## Detector shape

- Input: protected file list, banned term classes, allowlist.
- Output: police finding with scope, matchedTermClass, filePath, evidenceRef, suggestedAction.
- Standard profile: advisory.
- Full profile: blocker.

## Fixture expectation

- Positive clean fixture.
- Negative fixture with adopter-specific project name.
- Negative fixture with engine-specific private assumption.
- Negative fixture with absolute private path.
- Negative fixture with host-only asset path.
