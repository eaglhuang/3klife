# PAPER-EN Layout Plan

Last updated: 2026-06-26
Scope: preflight plan before starting `paper-en.tex`

## Current Baseline

- Source synchronization completed from `paper.v3.1.md` to `paper-zh.tex`.
- Latest Chinese compile gate passed.
- Latest known compile summary:
  - `Errors: 0`
  - `Unresolved: 0`
  - `Pages: 38`
  - `Overfull: 14`

This means the Chinese manuscript is a stable layout baseline, but the English version will almost certainly expand some lines and table headers.

## Primary Layout Risks

1. Dense longtables
- `paper-zh.tex` contains several appendix/result longtables whose header density is already high.
- English labels will usually be longer than Chinese labels, especially for policy names and explanation columns.

2. Table 18 / 19 / 20 header expansion
- These tables carry denominator-sensitive wording and should not be shortened carelessly.
- Risk: header text becomes too wide or wraps into unreadable multi-line cells.

3. Related-work paragraph growth
- The newly added structured merge and transactional runtime paragraphs are conceptually tight, but English can become verbose if translated literally.
- Risk: nearby section page breaks shift and create bad spacing around citations.

4. Artifact-path appendix content
- Filenames such as `generator-manifest.json` and `artifact-hash-manifest.sha256` are layout-hostile in narrow columns.
- English connective prose around these paths can trigger extra overfull boxes.

5. Caption and footnote inflation
- English captions tend to become longer than their Chinese source.
- Risk: floats move unexpectedly or crowd page tops/bottoms.

## Control Strategy

1. Translate section-by-section, not whole-file all at once
- Recommended order:
  - Abstract / Introduction
  - Related Work
  - Method
  - Evaluation prose
  - Tables / captions
  - Appendix

2. Stabilize terminology early
- Reuse `PAPER-EN-GLOSSARY.md` terms exactly.
- Avoid introducing near-synonyms that lengthen sentences and make later global cleanup harder.

3. Keep table prose outside table cells when possible
- Put nuanced denominator explanation in surrounding prose, not in already crowded headers.
- Table cells should stay compact and mechanically consistent.

4. Prefer short English captions
- Keep captions declarative and compact.
- Move interpretation into body text if a caption starts carrying argumentation.

5. Defer cosmetic TeX tuning until one English draft exists
- Do not prematurely add local spacing hacks everywhere.
- First identify repeat offenders, then fix them systematically.

## First-Pass Compile Workflow for English

1. Create `paper-en.tex` from the stable Chinese structure, not from a partial experimental fork.
2. Translate one major section block at a time.
3. Compile after each major block.
4. Track:
   - new overfull boxes
   - float drift
   - broken longtable headers
   - citation overflow
5. Only after content stabilizes, do line-break and width cleanup.

## Red Lines

- Do not compress meaning just to save one line in a table if it causes denominator ambiguity.
- Do not rewrite claims more strongly in the name of smoother English.
- Do not treat layout fixes as permission to alter the paper's evidentiary boundaries.
