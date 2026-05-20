# TASK-ATS-0009 Evidence: Upstream Blocker Repair Batch

Date: 2026-05-20
Status: completed

## 大白話結論

`TASK-ATS-0009` 是把 `TASK-ATS-0008` 分出來的 `upstream-blocker` 做「回流處理」。

白話說：npc-brain 測試踩到的問題，不能原封不動丟進 AI-Atomic-Framework，因為裡面有 adopter 路徑、真實 Python 管線名稱、3KLife 決策脈絡。0009 要做的是把這些問題變成 upstream 可以接受的東西：

- neutral fixture
- validator
- schema or CLI contract
- English public docs patch
- framework code patch

本輪結論：第一批 upstream blocker 已經完成回流或已有正式 upstream 修補面，三角策略可以往 `TASK-ATS-0010` release gate 推進。

## Upstream Repair Batch

| Upstream blocker from TASK-ATS-0008 | Neutralized upstream artifact | Upstream evidence | Validation |
|---|---|---|---|
| `registry-diff` could not prove evolve for adopter-owned atom lineage. | Member version lineage contract and registry-diff fallback through map member lineage. | AI-Atomic-Framework commit `dea1247` (`ATM-GOV-0122: resolve member lineage registry diff`); `tests/registry-fixtures/adopter-lineage.fixture.json`; `docs/MAP_REPLACEMENT_PROTOCOL.md`. | `npm run validate:registry-diff` PASS |
| Manual lineage repair is not acceptable long term. | `registry lineage backfill` CLI with dry-run/apply evidence gates and closeout report. | AI-Atomic-Framework commits `2d6f29c` and `2333a7c`; `packages/cli/src/commands/registry.ts`; `scripts/validate-registry-lineage-backfill.ts`; root-drop/onefile smoke coverage. | `npm run validate:registry-lineage-backfill` PASS; `npm run validate:onefile-release` PASS |
| Approved custom proposal was not always consumed by `atm next`. | Approved guided proposal routing and rollout-ready routing. | AI-Atomic-Framework commits `fad2965`, `533b50a`, `87d35be`; `packages/cli/src/commands/next.ts`; `packages/cli/src/commands/review.ts`; `scripts/validate-guidance.ts`. | `npm run validate:cli` PASS |
| `review rollout-ready` could falsely miss evidence when JSON had UTF-8 BOM. | BOM-tolerant rollout-ready evidence parser path. | AI-Atomic-Framework commit `87d35be`; review rollout-ready validator coverage. | `npm run validate:cli` PASS |
| Pinned onefile release could miss dependency/runtime parity such as AJV-backed validator behavior. | Onefile release validator checks registry-diff and registry lineage backfill against adopter lineage fixture. | `scripts/validate-onefile-release.ts`; `release/atm-onefile/atm.mjs`; `release/atm-root-drop/**`. | `npm run validate:onefile-release` PASS |
| Antigravity behaved like a distinct editor integration, not a generic Gemini-only route. | First-class Antigravity integration adapter surface and docs. | `docs/ANTIGRAVITY_INTEGRATION.md`; `packages/integration-gemini/src/index.ts`; `scripts/validate-integration-adapter.ts`. | `node --experimental-strip-types scripts/validate-integration-adapter.ts --mode validate` PASS |
| Downstream evidence must not leak adopter identity into protected framework docs. | Neutrality scanner and public-boundary docs policy. | `docs/governance/DOCS_NEUTRALITY_AUDIT.md`; protected docs boundary rules. | `npm run validate:neutrality` PASS |
| Existing adopter sentinel should be reused instead of inventing 3KLife private CI. | Built-in adopter sentinel baseline stays the common upstream canary. | `scripts/adopter-sentinel.ts`; `fixtures/adopter-sentinel/**`; `docs/adopter-sentinel-external-profile.md`. | `node --experimental-strip-types scripts/adopter-sentinel.ts --mode validate` PASS outside the local tool sandbox |

## Validation Transcript

Commands run in `C:\Users\User\AI-Atomic-Framework`:

```powershell
npm run validate:registry-lineage-backfill
npm run validate:registry-diff
npm run validate:neutrality
npm run validate:onefile-release
npm run validate:cli
node --experimental-strip-types scripts/validate-integration-adapter.ts --mode validate
node --experimental-strip-types scripts/adopter-sentinel.ts --mode validate
```

Observed result:

- `validate:registry-lineage-backfill`: PASS
- `validate:registry-diff`: PASS
- `validate:neutrality`: PASS after non-sandbox rerun
- `validate:onefile-release`: PASS after non-sandbox run
- `validate:cli`: PASS after non-sandbox run
- `validate-integration-adapter`: PASS after non-sandbox run
- `adopter-sentinel`: PASS after non-sandbox run

Sandbox caveat:

`validate:neutrality` and `adopter-sentinel` can fail inside the current Codex tool sandbox when they need to spawn nested Node/ATM commands. The same commands passed outside the sandbox, so this is recorded as a local execution caveat, not an upstream blocker.

## Neutrality Review

No raw npc-brain path was added to AI-Atomic-Framework public docs as a required upstream fixture.

Allowed local references remain inside 3KLife evidence only. Upstream references are expressed as:

- neutral fixture classes
- validator names
- CLI behavior contracts
- public docs surfaces
- upstream commit ids

## TASK-ATS-0009 Closeout

Acceptance status:

- Each repair has corresponding evidence.
- No repair hard-codes 3KLife or npc-brain into the framework surface.
- Public-facing framework docs remain English or neutral public documentation.
- The repairs are reproducible through upstream validators.

`TASK-ATS-0009` is complete.

Next task: `TASK-ATS-0010` should run the graduation / release gate checklist over the whole triangle strategy evidence packet.
