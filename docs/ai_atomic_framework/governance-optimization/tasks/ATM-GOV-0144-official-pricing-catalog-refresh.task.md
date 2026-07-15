---
doc_id: doc_atm_gov_0144
task_id: ATM-GOV-0144
title: "Refresh the standard model-price catalog from official provider sources"
status: done
owner: atm-core
priority: P1
milestone: GOVOPT-Foundation
depends_on: [ATM-GOV-0143]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "specs/pricing/model-pricing-sources.json"
  - "specs/pricing/model-standard-token-prices.json"
  - "scripts/pricing/refresh-model-prices.ts"
  - "scripts/pricing/parse-provider-price-page.ts"
  - "schemas/team-agents/model-price-refresh-report.schema.json"
  - "tests/cli/model-price-refresh.test.ts"
deliverables:
  - "specs/pricing/model-pricing-sources.json"
  - "scripts/pricing/refresh-model-prices.ts"
  - "scripts/pricing/parse-provider-price-page.ts"
  - "schemas/team-agents/model-price-refresh-report.schema.json"
  - "tests/cli/model-price-refresh.test.ts"
validators:
  - "node --strip-types tests/cli/model-price-refresh.test.ts"
  - "npm run validate:schemas"
  - "npm run typecheck"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Disable scheduled refresh and keep the last verified canonical catalog version."
atomizationImpact:
  ownerAtomOrMap: "atm.model-price-refresh-map"
  mapUpdates: []
  extractionCandidates:
    - atom: "atm.provider-price-page-parser"
      pattern: "Adapter"
      source: "scripts/pricing/refresh-model-prices.ts"
      disposition: extract
outOfScope:
  - "Bypassing provider terms, authentication controls, robots policy or rate limits."
  - "Publishing private negotiated prices or automatically promoting a candidate catalog."
---

# ATM-GOV-0144 - Refresh the standard model-price catalog from official provider sources

## Acceptance

- A versioned source registry allowlists official provider URLs, expected currency/unit semantics, parser adapter, refresh cadence and source owner.
- The refresh command fetches official pages with bounded concurrency, timeout, retry/backoff, cache validators and a descriptive user agent; it respects provider terms and does not bypass access controls.
- Every run writes a candidate snapshot and machine-readable diff containing retrieval time, HTTP metadata, source hash, added/removed/changed rates, parser warnings and unmapped products.
- The crawler never overwrites canonical `model-standard-token-prices.json`. Promotion requires schema validation, source allowlist match, unit/currency normalization, anomaly review and an explicit governed approval.
- Page-layout drift, ambiguous units, missing cache/tool dimensions or a configured price jump fails closed, retains the last canonical version and creates a pricing-refresh incident.
- Tests use committed fixtures rather than live network access; an optional live canary checks freshness without blocking ordinary close.
- Refresh scheduling is configurable and idempotent. Failed refreshes do not make the last verified catalog unavailable.
- Every generated catalog entry remains traceable to an official URL, source hash, effective time and refresh receipt.
- Every new atom, map, script and support module obeys the central `atomization.maxLines` limit.
