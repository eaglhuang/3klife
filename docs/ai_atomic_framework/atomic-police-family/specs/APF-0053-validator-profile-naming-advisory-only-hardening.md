<!-- doc_id: doc_other_0718 -->
# APF-0053 Validator profile naming and advisory-only hardening

## Purpose

Clarify validator profile naming and harden advisory-only behavior.

## Naming contract

- `validate:police-family`: named police family gate.
- `validate:police`: legacy/public validator group; must document whether it calls police-family or remains a broader suite.
- `validate:standard`: must include family gate without allowing advisory mutation.
- `validate:full`: may promote stricter blocker assertions.

## Fixture expectation

- Advisory finding with report-only action passes without registry mutation.
- Advisory scanner attempting registry mutation fails.
- Advisory finding attempting direct approval fails.
- Machine finding must preserve `metadata.policeFinding`.
