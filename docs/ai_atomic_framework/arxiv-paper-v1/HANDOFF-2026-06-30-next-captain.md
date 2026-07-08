# HANDOFF-2026-06-30 Next Captain

## 1. Scope

This handoff is for the English ATM paper lane in:

- `C:\Users\User\3KLife\docs\ai_atomic_framework\arxiv-paper-v1\`

The intended reader is the next paper-writing captain who needs to continue from the current arXiv submission state without reconstructing context from chat history.

The paper is no longer in a drafting or contribution-expansion phase. The main line is stable. The next captain should think in terms of:

- submission follow-through;
- post-submission cleanup;
- artifact / landing-page / outreach preparation;
- future research-roadmap framing.

## 2. Submission Status

Current arXiv submission status:

- temporary submission id: `submit/7756807`
- title: `ATM: CID-Brokered Pre-Write Admission for Multi-Agent Code Co-Synthesis`
- author metadata now uses `Eagl Huang`
- categories: `cs.AI`, `cs.SE`
- license selected in arXiv metadata: `CC BY 4.0`
- last known dashboard state after author-name correction: `submitted`
- last known mail state: `received and under consideration`

Important moderation event already resolved:

- arXiv flagged the author field because the submission originally used `Eaglhuang`
- this was corrected to `Eagl Huang` in both metadata and title block
- the submission was reprocessed successfully afterward

Practical implication:

- do not panic if older notes, PDFs, or screenshots still show `Eaglhuang`
- the corrected author form for all future paper-facing outputs is `Eagl Huang`

## 3. What Is Stable Right Now

The paper core is stable enough that the next captain should avoid reopening the argument unless a real correctness issue appears.

Stable points:

- the main claim boundary is already conservative
- the abstract, introduction, and contribution framing should not be expanded again
- the CID term is already expanded in the abstract and formal definition area
- the figure/table logic was repeatedly cleaned for reviewer-facing readability
- the paper now reads as a governance-substrate paper, not as a generic agent-orchestrator claim
- the evidence stack is framed as feasibility / auditability / bounded recoverability, not broad superiority

Submission-stage placeholders are intentional and not a bug:

- Zenodo DOI placeholder remains:
  - `10.5281/zenodo.XXXXXXX`
- manuscript identifier placeholder remains:
  - `pending arXiv id`

These placeholders should stay until issued identifiers actually exist. Once arXiv is announced and Zenodo is minted, a later paper revision can replace them.

## 4. Important Local Files

Primary working files:

- [paper-en.tex](C:/Users/User/3KLife/docs/ai_atomic_framework/arxiv-paper-v1/paper-en.tex)
- [paper-en.pdf](C:/Users/User/3KLife/docs/ai_atomic_framework/arxiv-paper-v1/paper-en.pdf)
- [paper.v3.1.en.md](C:/Users/User/3KLife/docs/ai_atomic_framework/arxiv-paper-v1/paper.v3.1.en.md)
- [references.bib](C:/Users/User/3KLife/docs/ai_atomic_framework/arxiv-paper-v1/references.bib)

Important guard / context files:

- [HANDOFF-2026-06-28-next-captain.md](C:/Users/User/3KLife/docs/ai_atomic_framework/arxiv-paper-v1/HANDOFF-2026-06-28-next-captain.md)
- [PAPER-EN-READINESS-CHECKLIST.md](C:/Users/User/3KLife/docs/ai_atomic_framework/arxiv-paper-v1/en/PAPER-EN-READINESS-CHECKLIST.md)
- [PAPER-EN-CLAIM-RISK-SCAN.md](C:/Users/User/3KLife/docs/ai_atomic_framework/arxiv-paper-v1/en/PAPER-EN-CLAIM-RISK-SCAN.md)
- [PAPER-EN-TABLE-GUARDS.md](C:/Users/User/3KLife/docs/ai_atomic_framework/arxiv-paper-v1/en/PAPER-EN-TABLE-GUARDS.md)

arXiv source packages currently present:

- `atm-paper-source-xelatex-fixed-author.tar.gz`
- `atm-paper-source-xelatex-fixed-author.zip`
- `atm-paper-source-xelatex.tar.gz`
- `atm-paper-source-xelatex.zip`
- `atm-paper-source-arxiv-fallback.tar.gz`
- `atm-paper-source-arxiv-fallback.zip`

Operational note:

- the `fixed-author` package names are the ones created after the arXiv author-name correction
- if a new captain needs the safest known upload package first, start from the `fixed-author` tarball/zip pair

## 5. Current Dirty / Uncommitted State

As of this handoff, the `arxiv-paper-v1` worktree is not perfectly clean.

Known local state:

- modified:
  - `docs/ai_atomic_framework/arxiv-paper-v1/paper-en.tex`
- untracked:
  - `docs/ai_atomic_framework/arxiv-paper-v1/HANDOFF-2026-06-28-next-captain.md`
  - `docs/ai_atomic_framework/arxiv-paper-v1/arxiv-source-package-alt/`
  - `docs/ai_atomic_framework/arxiv-paper-v1/arxiv-source-test/`
  - `docs/ai_atomic_framework/arxiv-paper-v1/atm-paper-source-arxiv-fallback.tar.gz`
  - `docs/ai_atomic_framework/arxiv-paper-v1/atm-paper-source-arxiv-fallback.zip`
  - `docs/ai_atomic_framework/arxiv-paper-v1/atm-paper-source-xelatex.tar.gz`
  - `docs/ai_atomic_framework/arxiv-paper-v1/atm-paper-source-xelatex.zip`

The current uncommitted `paper-en.tex` diff includes:

- author line changed from `Eaglhuang` to `Eagl Huang`
- table-title alignment / table-font polish for several tables
- `Sections 4-6` style normalized to `Sections 4--6`
- `Sections 4.2-4.6` style normalized to `Sections 4.2--4.6`
- some main-table readability adjustments that were part of the late final-polish pass

Important caution:

- do not assume the current dirty `paper-en.tex` exactly equals the currently announced arXiv source state
- if the next captain wants a clean archival branch, first decide whether to:
  - preserve the current local `paper-en.tex` as the post-submission working head, or
  - reset future paper work to the exact submitted source package

## 6. What Was Already Delivered Outside This Repo

Important correction for the next captain: several outward-facing assets were not merely discussed. They were already implemented in the separate site repo:

- `C:\Users\User\3KLife\temp_workspace\AI-learning-notes\`

So these items should be treated as delivered surfaces that may still need maintenance or link updates, not as blank work.

### 6.1 Landing Page

A fixed landing page already exists.

Delivered file:

- `C:\Users\User\3KLife\temp_workspace\AI-learning-notes\atm_pre_write_admission_paper_en.html`

Supporting navigation links also exist in:

- `C:\Users\User\3KLife\temp_workspace\AI-learning-notes\index.html`
- `C:\Users\User\3KLife\temp_workspace\AI-learning-notes\articles\index.html`

Relevant site commits:

- `e114ef1` `Add ATM paper landing page`
- `7d678b3` `Refocus ATM landing page on framework`

Current role of the page:

- stable ATM framework + paper landing page
- framework-first positioning
- pending insertion of public arXiv link after announcement
- pending insertion of final public artifact anchors after announcement

### 6.2 Share Kit

A reusable share kit already exists inside the landing page.

Delivered elements:

- `Share Kit` section in:
  - `C:\Users\User\3KLife\temp_workspace\AI-learning-notes\atm_pre_write_admission_paper_en.html`
- social share visual:
  - `C:\Users\User\3KLife\temp_workspace\AI-learning-notes\assets\img\atm-paper-share-kit.png`

It already includes copy variants for:

- framework-first HN / Reddit
- framework-first X / Discord
- paper-first HN / Reddit
- paper-first X / Discord

Relevant site commit:

- `9589b38` `Add ATM paper share kit`

### 6.3 Main Visual / Hero Figure

The main outward-facing visuals already exist.

Delivered assets:

- hero figure:
  - `C:\Users\User\3KLife\temp_workspace\AI-learning-notes\assets\img\atm-paper-hero.png`
- share figure:
  - `C:\Users\User\3KLife\temp_workspace\AI-learning-notes\assets\img\atm-paper-share-kit.png`

These should be treated as version-1 delivered visuals, not missing work.

### 6.4 ATM-First Outreach Positioning

This is important: the user does not want outreach to be paper-only.

Desired external framing:

- primary story: ATM as a framework and engineering pattern that helps the world more directly
- secondary story: the paper formalizes and evidences the framework

That means HN / Reddit launch copy should generally lead with:

- why ATM matters for real multi-agent coding governance
- what problem it solves in practice
- how the paper supports the formal model and evaluation boundary

Do not invert this into:

- "here is my paper, and also a framework exists"

The intended order is the opposite.

## 7. What Is Still Not Finished

The missing work is now narrower than the earlier draft of this handoff implied.

What remains unfinished is mostly integration, maintenance, and release follow-through:

- update the landing page with the real arXiv identifier after announcement
- update the landing page with final public artifact / DOI anchors after release
- decide whether the share-kit copy needs one more tightening pass before public posting
- decide whether the hero/share images need a version-2 polish pass
- choose the exact outreach sequence and launch timing
- optionally extract the share kit into a standalone maintainable source document if the team wants a non-HTML canonical kit

## 8. Immediate Next Steps After arXiv Moderation

Once arXiv clears and the paper receives its real identifier, the next captain should do the following in order.

1. Record the announced arXiv id in a new handoff or release note.
2. Decide whether to issue a paper revision immediately or wait until the first substantive metadata/artifact cleanup bundle is ready.
3. Update Appendix placeholder text only when real identifiers exist:
   - replace `pending arXiv id`
   - replace Zenodo placeholder when DOI is issued
4. Update the existing landing page and connect:
   - arXiv
   - GitHub repo
   - supplementary artifact links
   - short explanation of ATM
5. Refresh the existing share kit if needed, then publish it.
6. Launch outreach with ATM-first positioning.

## 9. Recommended Outreach Sequence

Safest outward sequence:

1. arXiv announcement becomes live
2. the existing landing page is updated and confirmed live
3. the existing main visual / hero figure is kept or lightly refreshed
4. HN post
5. Reddit / X / Discord follow-up posts
6. optional longer blog or notes entry after early reactions

Reason:

- it prevents fragmented links
- it keeps the first wave from pointing to an unfinished explanation surface
- it lets feedback converge on one canonical page

## 10. Future Paper / Research Directions

These are the most promising next-step directions. They should be treated as future work lanes, not stealth edits to the already-submitted paper.

### 9.1 Skill-first / Tool-first Governance Formalization

The framework has moved toward a friendlier three-layer pattern:

- skill / integration
- function / wrapper
- CLI / evidence lane

This is one of the strongest future paper-extension topics because it turns ATM from a broker idea into a practical operator-facing architecture.

Possible future paper angle:

- formalize skill-mediated intent routing as a governed interface layer above raw CLI
- show how user intent, tool schemas, and durable evidence can stay aligned

### 9.2 Team Role and Multi-Agent Capability Boundaries

A future paper can deepen:

- team roles
- routing by responsibility
- skill-pack boundaries
- capability escalation / delegation

This direction fits the existing framework evolution and could turn ATM from a single-admission substrate into a clearer governed team-operating model.

### 9.3 Adapter Trust and Adversarial Containment

The current paper already opens this lane conservatively.

Strong future direction:

- stronger adversarial-adapter containment experiments
- validator trust boundaries
- which adapter assumptions are required for specific claims
- failure envelopes when adapter guarantees are partial

This is a good follow-on because it sharpens reviewer-facing rigor without requiring the core paper to overclaim today.

### 9.4 Non-text and Nondeterministic Artifacts

Current boundary already admits this as future work.

Natural next step:

- binary assets
- generated artifacts
- dependency lockfiles with nondeterministic ordering
- mixed text / asset governance

This direction matters if ATM is to become a general practical engineering governance substrate rather than a code-only paper.

### 9.5 Larger-Scale and More External Evaluation

Future evidence lanes that are likely valuable:

- larger repositories
- heavier concurrent-agent load
- public cross-team replay suites
- stronger comparative framing with external benchmarks, but only when denominator discipline is preserved

This should be done carefully. The current paper intentionally avoids overclaiming comparative victory.

### 9.6 Federated or Sharded Broker Designs

The paper already marks single-broker scaling as a boundary.

Future work can explore:

- sharded broker admission
- federated governance domains
- cross-subtree or cross-workspace routing
- throughput and contention behavior under large-agent waves

### 9.7 Public Artifact and Citation Infrastructure

The paper lane would benefit from a cleaner long-lived citation surface:

- stable Zenodo releases
- artifact index pages
- public verification map pages
- revision-aware source package archive policy

This is less glamorous than new theory, but it materially improves credibility and reuse.

## 11. What The Next Captain Should Not Reopen Casually

Do not casually reopen:

- the abstract claim surface
- the contribution count and framing
- the main evidence-boundary table logic
- the conservative related-work positioning
- the paper's non-claims around broad superiority
- the current placeholder policy before identifiers exist

If a future captain wants a second-round paper revision, it should be done intentionally as:

- a metadata / artifact update revision, or
- a new research extension pass

It should not drift into accidental contribution inflation.

## 12. Suggested First Moves For The Next Captain

If the next captain picks up this lane before arXiv moderation finishes:

1. Read this handoff.
2. Inspect [paper-en.tex](C:/Users/User/3KLife/docs/ai_atomic_framework/arxiv-paper-v1/paper-en.tex) and decide whether the current dirty diff should be preserved as the post-submission working head.
3. Record the exact source package that matches the submitted arXiv state.
4. Do not reopen claim-heavy prose.
5. Start the landing-page and share-kit preparation in parallel.

If the next captain picks up this lane after arXiv moderation finishes:

1. Record the issued arXiv id.
2. Decide whether to cut a paper revision for identifier reconciliation.
3. Update the existing landing page in `AI-learning-notes`.
4. Refresh the existing share kit only if needed.
5. Publish outreach with ATM-first framing.

## 13. Bottom Line

The paper itself is in the waiting / packaging / amplification phase, not in the discovery phase.

The next captain should think like a release and positioning owner:

- protect the current conservative paper
- separate submitted state from local polish state
- maintain and connect the outward-facing surfaces that already exist
- use the paper as the formal backbone for ATM, not as the only story
