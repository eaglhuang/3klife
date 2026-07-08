# HANDOFF-2026-06-28 Next Captain

## 1. Current State

This handoff is for the English ATM paper lane in `C:\Users\User\3KLife\docs\ai_atomic_framework\arxiv-paper-v1\`.

Latest paper commit already landed and was pushed to `origin/master`:

- commit: `a9e37571e4bec7ea00675b7ea207e2e08f9516fc`
- subject: `polish ATM paper final review fixes`

Current branch sync state:

- `master` is in sync with `origin/master`
- `git rev-list --left-right --count origin/master...master` = `0 0`

Current English PDF status:

- latest compiled English PDF: `paper-en.pdf`
- page count: `40`
- compile status: `0 errors`, `0 unresolved`, `1 small overfull`

The current paper is no longer in the “major rewrite” phase. The main line is stable. The remaining work should be treated as final review, compression, and submission-readiness cleanup rather than contribution expansion.

## 2. ATM / Repo Boundary Warning

ATM currently returns a framework-routing warning in `3KLife`:

- `ATM_NEXT_FRAMEWORK_TARGET_REPO_REQUIRED`
- target repo: `C:\Users\User\AI-Atomic-Framework`

Meaning:

- planning-side handoff, paper notes, and manuscript wording updates may still be maintained in `3KLife`
- framework task closeout, framework hard gates, `framework-mode status`, active claim handling, and framework evidence closure must be run in `C:\Users\User\AI-Atomic-Framework`

Recommended command if the next captain needs framework-side closure truth:

```bash
cd C:\Users\User\AI-Atomic-Framework
node atm.mjs framework-mode status --json
```

Do not attempt to close framework-target tasks from `3KLife`.

## 3. What Was Finished In This Round

The paper and PDF were updated to address the latest reviewer-safe correctness issues.

Major completed fixes:

- removed the title-block date from the English PDF
- kept author name and email under the title
- fixed Figure 2 logic so `same file? no` no longer jumps directly to `parallel-safe`
- revised Algorithm 1 to use ASCII-style `intersects(...)` notation instead of fragile Unicode set operators inside the algorithm box
- clarified that `blocked-cid-conflict` / `blocked-shared-surface` are admission verdicts while `fail-closed/refine` is a recovery-route label
- corrected Figure 4 stale section references and removed the ambiguous `supports K / supports G` wording
- corrected Figure 5 Layer 3 to `declared read/write` wording
- simplified Figure 5 validator labels to avoid PDF token-clumping inside the figure
- added the `12-scenario` versus `20-scenario AdmissionBench` denominator clarification
- changed Table 10 from ambiguous `Enforcement rows = 4` to:
  - `Enforcement projection categories = 4`
  - `Enforcement projection rows = 51`
- rewrote Appendix A.4 and reproducibility wording so it now honestly describes a compact verification map rather than a full row-by-row source-path map
- reduced Appendix A.4 command clutter so long CLI strings no longer dominate the table visually

## 4. Important Commits

Most relevant recent paper commits:

- `a9e37571` `polish ATM paper final review fixes`
- `a80d72c4` `docs(paper): polish English PDF layout`
- `bd8c4202` `docs(paper): polish final PDF layout`

The last commit is the one that should be treated as the current paper handoff anchor unless a newer paper-only commit supersedes it.

## 5. Files The Next Captain Should Care About

Primary manuscript files:

- [paper.v3.1.en.md](/C:/Users/User/3KLife/docs/ai_atomic_framework/arxiv-paper-v1/paper.v3.1.en.md)
- [paper-en.tex](/C:/Users/User/3KLife/docs/ai_atomic_framework/arxiv-paper-v1/paper-en.tex)
- [paper-en.pdf](/C:/Users/User/3KLife/docs/ai_atomic_framework/arxiv-paper-v1/paper-en.pdf)
- [sync-paper-en-md-to-tex.js](/C:/Users/User/3KLife/tools_node/sync-paper-en-md-to-tex.js)

Prior handoffs worth reading for historical context:

- [HANDOFF-2026-06-27-new-captain.md](/C:/Users/User/3KLife/docs/ai_atomic_framework/arxiv-paper-v1/HANDOFF-2026-06-27-new-captain.md)
- [HANDOFF-2026-06-28-paper-evidence-fast-path.md](/C:/Users/User/3KLife/docs/ai_atomic_framework/arxiv-paper-v1/HANDOFF-2026-06-28-paper-evidence-fast-path.md)

## 6. Known Remaining Issues

The paper is materially stronger, but not yet “submission-forget-about-it” clean.

Likely next tasks:

1. Decide whether the current `40` pages are acceptable, or whether one more small compression pass is needed.
2. If page reduction is required, prefer deleting duplication rather than deleting evidence boundaries.
3. Re-scan English/TeX/PDF cross-reference consistency one more time after any further compression.
4. Re-check figure/table pagination after any nontrivial wording change.
5. Keep all future claims conservative; do not reopen the contribution set unless absolutely necessary.

## 7. What Not To Reopen Unless Necessary

Do not casually reopen these areas:

- Abstract / Introduction / Contributions
- the formal core in §3.3 and §3.7 unless a real correctness bug is found
- the A/B/C evidence boundary table logic
- the OperationalBench denominator clarification
- the Topology D non-claim boundary

These sections were repeatedly tightened already. Further churn here is more likely to introduce drift than to add value.

## 8. Current Dirty Worktree State

After the paper commit and push, `3KLife` still has unrelated modified files:

- `docs/ai_atomic_framework/CID-Conflict-Run-Log.md`
- `docs/ai_atomic_framework/broker-collision-evidence/broker-run-index.json`
- `docs/ai_atomic_framework/broker-collision-evidence/broker-run-report.md`

These were intentionally not mixed into the paper commit.

Implication for the next captain:

- if you make another paper-only commit, stage only the paper files explicitly
- do not accidentally sweep these broker-evidence files into a manuscript commit

## 9. Suggested First Moves For The Next Captain

If continuing the paper lane in `3KLife`:

```bash
git status --short
node tools_node/compile-paper-en-texlive.js
npm run check:encoding:touched -- --files docs/ai_atomic_framework/arxiv-paper-v1/paper.v3.1.en.md docs/ai_atomic_framework/arxiv-paper-v1/paper-en.tex tools_node/sync-paper-en-md-to-tex.js
```

If framework truth or closure authority becomes relevant:

```bash
cd C:\Users\User\AI-Atomic-Framework
node atm.mjs framework-mode status --json
```

## 10. Bottom Line

The paper is now in late-stage finalization, not exploratory drafting.

The safest mindset for the next captain is:

- preserve the current conservative claim boundary
- improve submission cleanliness, not novelty
- treat `a9e37571` as the current paper anchor
- keep framework closure and framework gates in `AI-Atomic-Framework`, not in `3KLife`
