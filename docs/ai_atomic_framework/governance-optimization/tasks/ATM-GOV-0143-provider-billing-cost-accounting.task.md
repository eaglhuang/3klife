---
doc_id: doc_atm_gov_0143
task_id: ATM-GOV-0143
title: "Capture provider billing usage and compute versioned real monetary cost"
status: done
owner: atm-core
priority: P0
milestone: GOVOPT-Foundation
depends_on: []
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/team-runtime/provider-contract.ts"
  - "packages/core/src/team-runtime/providers/openai.ts"
  - "packages/core/src/team-runtime/providers/anthropic.ts"
  - "packages/core/src/team-runtime/providers/gemini-direct.ts"
  - "packages/core/src/team-runtime/providers/azure-openai.ts"
  - "packages/core/src/team-runtime/providers/claude-code.ts"
  - "packages/core/src/team-runtime/providers/gemini.ts"
  - "packages/core/src/team-runtime/providers/microsoft-foundry.ts"
  - "packages/core/src/team-runtime/pricing/cost-accounting.ts"
  - "specs/pricing/model-standard-token-prices.json"
  - "schemas/team-agents/model-price-catalog.schema.json"
  - "schemas/team-agents/team-cost-receipt.schema.json"
  - "tests/cli/team-cost-accounting.test.ts"
deliverables:
  - "packages/core/src/team-runtime/pricing/cost-accounting.ts"
  - "specs/pricing/model-standard-token-prices.json"
  - "schemas/team-agents/model-price-catalog.schema.json"
  - "schemas/team-agents/team-cost-receipt.schema.json"
  - "tests/cli/team-cost-accounting.test.ts"
validators:
  - "node --strip-types tests/cli/team-cost-accounting.test.ts"
  - "npm run validate:schemas"
  - "npm run typecheck"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Keep cost-based promotion disabled and retain token/time telemetry as diagnostic-only data."
atomizationImpact:
  ownerAtomOrMap: "atm.team-cost-accounting-map"
  mapUpdates: []
  extractionCandidates:
    - atom: "atm.provider-billable-usage-normalizer"
      pattern: "Adapter"
      source: "packages/core/src/team-runtime/provider-contract.ts"
      disposition: extract
outOfScope:
  - "Automatically changing canonical prices from scraped web content."
  - "Embedding private contract discounts or API credentials in the public standard-price catalog."
---

# ATM-GOV-0143 - Capture provider billing usage and compute versioned real monetary cost

## Acceptance

- A shared canonical `model-standard-token-prices.json` is schema-valid, versioned, immutable by version, and reusable by Captain, Team, Batch and benchmark code.
- A deterministic state-free calculator consumes a catalog version plus normalized usage and returns a cost receipt, so adapters and downstream Agent tools do not reimplement pricing formulas.
- Every standard-price row records provider, model, billing product, plan, region, service tier, currency, price unit, effective/retrieved timestamps, official source URL, source hash and all applicable rate dimensions.
- Provider adapters preserve true billable usage instead of dropping it: input, output, cache read, cache write/creation, reasoning, tool calls, request/session charges, service tier, retries and billed failed/cancelled calls where the provider reports them.
- Cost receipts distinguish `incrementalCashCost`, `fullyLoadedCashCost` and `listPriceEquivalentCost`; original currency is retained and any conversion binds a versioned FX snapshot.
- Subscription and vendor Agent Bot plans record consumed credits/overage and a versioned seat-allocation policy; zero marginal charge never silently becomes zero fully-loaded cost.
- Canonical calculation prefers provider-reported charged amount/credits, then exact provider usage multiplied by the matching catalog snapshot. Estimated or unmapped usage is `cost-measurement-incomplete` and promotion-ineligible.
- Custom contract rates and discounts are private overlays keyed to the standard catalog version; they never mutate or leak into the public standard-price JSON.
- Unit tests cover mixed cheap/frontier models, cached tokens, fixed tool fees, retries, subscription credits, stale catalog versions, missing rate dimensions and currency conversion.
- Every new atom, map, script and support module obeys the central `atomization.maxLines` limit.

## Initial official source registry

- OpenAI models and Codex: `https://developers.openai.com/api/docs/models`, `https://help.openai.com/en/articles/20001106`
- Anthropic Claude API: `https://platform.claude.com/docs/en/about-claude/pricing`
- Google Gemini API: `https://ai.google.dev/gemini-api/docs/pricing`
- Microsoft Azure OpenAI: `https://azure.microsoft.com/en-us/pricing/details/azure-openai/`
- GitHub Copilot plans and AI credits: `https://github.com/features/copilot/plans`
