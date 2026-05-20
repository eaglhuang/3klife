# TASK-ATS-0010 Evidence: Graduation and Release Gate

Date: 2026-05-20
Status: completed

## 大白話結論

三角策略這一輪可以畢業。

意思不是「今天立刻 npm publish」，而是：

- 3KLife / npc-brain 這個真實 adopter 實驗已經證明 ATM 的導入、黑箱入口、legacy Python atomize/infect、Atomic Map、大功能 rollout、evolve proof、evidence routing 都能走完。
- 可以泛化的成果已經被轉成 upstream-friendly artifact、validator、fixture、adapter 或英文 public docs surface。
- 不能泛化的內容已經留在 3KLife local governance，不再往 AI-Atomic-Framework public surface 塞私有脈絡。

正式對外 release 仍需由 AI-Atomic-Framework 自己的 release branch / release checklist 做最後確認。

## Graduation SOP

任何 3KLife local experiment 要畢業成 ATM upstream capability，必須通過四條件：

1. **Neutrality**：不能把 3KLife、npc-brain、真實 Python pipeline path、私有決策直接寫進 framework protected public docs。
2. **Deterministic evidence**：必須有可重跑的 CLI output、validator、fixture、schema-valid report 或 machine-readable evidence。
3. **Validator coverage**：至少有一個 upstream validator 或 smoke route 能重現關鍵行為。
4. **Rollback / review boundary**：任何會動到 adopter code 的變更都必須有 human review、rollback-ready proof 或 closeout evidence。

不符合這四條者，只能留在 3KLife local governance，不得 upstream。

## Release Gate Checklist

| Gate | Evidence | Result |
|---|---|---|
| M0 docs boundary | `TASK-ATS-0001-public-docs-language-gate.md` | pass |
| M1 baseline / fixture inventory | `TASK-ATS-0002-npc-brain-baseline-report.md` + risk matrix | pass |
| M2 onboarding / entry route | `TASK-ATS-0003-natural-language-onboarding-smoke-2026-05-19.md` + `TASK-ATS-0003B-first-use-notice-refresh-2026-05-19.md` | pass |
| M3 natural black-box / behavior routing | `TASK-ATS-0004-cross-editor-blackbox-closeout-2026-05-19.md` | pass |
| M4 legacy Python atomize/infect dry-run | `TASK-ATS-0005-governed-leaf-pilot-smoke-2026-05-19.md` | pass |
| M5 Atomic Map decomposition | `TASK-ATS-0006-canonical-map-closeout-2026-05-19.md` | pass |
| M6 rollout / evolution proof | `TASK-ATS-0007-evolution-polymorphize-followup-2026-05-20.md` | pass |
| M7 evidence routing | `TASK-ATS-0008-adopter-sentinel-evidence-routing-2026-05-20.md` | pass |
| M8 upstream repair batch | `TASK-ATS-0009-upstream-blocker-repair-batch-2026-05-20.md` | pass |

## Evidence Packet Review

Required evidence files checked:

- `TASK-ATS-0001-public-docs-language-gate.md`
- `TASK-ATS-0002-npc-brain-baseline-report.md`
- `TASK-ATS-0003-natural-language-onboarding-smoke-2026-05-19.md`
- `TASK-ATS-0004-cross-editor-blackbox-closeout-2026-05-19.md`
- `TASK-ATS-0005-governed-leaf-pilot-smoke-2026-05-19.md`
- `TASK-ATS-0006-canonical-map-closeout-2026-05-19.md`
- `TASK-ATS-0007-evolution-polymorphize-followup-2026-05-20.md`
- `TASK-ATS-0008-adopter-sentinel-evidence-routing-2026-05-20.md`
- `TASK-ATS-0009-upstream-blocker-repair-batch-2026-05-20.md`

Observed result:

- all required files present
- no missing phase evidence
- M0-M8 all have closeout evidence or equivalent status update

## Release Gate Dry Run

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

- `validate:registry-lineage-backfill`: pass
- `validate:registry-diff`: pass
- `validate:neutrality`: pass
- `validate:onefile-release`: pass
- `validate:cli`: pass
- `validate-integration-adapter`: pass
- `adopter-sentinel`: pass

Local execution note:

Some commands need nested child processes. They were run outside the local Codex tool sandbox to avoid sandbox `spawnSync EPERM` false failures.

## Upstream-ready Outcomes

These outcomes are safe to feed into AI-Atomic-Framework as neutral upstream value:

1. registry member version lineage contract
2. registry lineage backfill CLI
3. registry-diff lineage continuity fixture
4. approved proposal routing / rollout-ready router behavior
5. BOM-tolerant evidence parsing
6. onefile release parity coverage
7. Antigravity integration adapter
8. adopter sentinel external-profile evidence pattern
9. public docs neutrality boundary

## Local-governance-only Outcomes

These must remain in 3KLife / npc-brain context:

1. raw npc-brain pipeline ranking paths
2. specific `pipelines/sanguo-rag/**` decomposition details
3. human review decisions for local Python patches
4. 3KLife task-card sequencing and strategy discussion
5. Chinese long-form reasoning documents used for local governance

## Readiness Summary

Graduation decision:

```text
PASS — triangle strategy experiment graduates as a completed evidence program.
```

Release readiness decision:

```text
READY FOR AI-Atomic-Framework release-candidate review, not an automatic publish.
```

Why not automatic publish:

- AI-Atomic-Framework release still needs its normal release branch discipline.
- Current framework worktree may include unrelated dirty work outside the triangle strategy.
- Public release must run the framework release checklist, changelog/version checks, and final package/release artifact validation in the release repo.

What can happen next:

1. Continue npc-brain development under ATM governance instead of freezing indefinitely.
2. Use `ATM-MAP-0001` and successor maps as bounded pilot lanes for major Python pipeline work.
3. Convert future adopter failures through the same three-bucket routing: `upstream-blocker`, `adopter-local`, `host-governance-overlap`.
4. Start a clean AI-Atomic-Framework release-candidate review if the goal is publishing a new ATM version.

`TASK-ATS-0010` is complete.
