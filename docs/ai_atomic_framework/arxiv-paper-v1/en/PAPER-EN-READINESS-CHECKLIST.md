# Paper EN Readiness Checklist

Date: 2026-06-26  
Scope: before starting `paper-en.tex`  
Source of truth: `paper.v3.1.md`

## 0. Captain Decision

Do not start `paper-en.tex` until the P0 checks below pass. The English paper should be a claim-preserving rewrite of the frozen Chinese manuscript, not a new round of argument expansion.

The English pass should optimize for:

- stable claims;
- stable terminology;
- stable references;
- stable table denominators;
- stable TeX layout.

## P0. Freeze Gate

Before opening `paper-en.tex`, confirm:

- `paper.v3.1.md` is the only prose source of truth.
- `paper-zh.tex` has been regenerated from `paper.v3.1.md`.
- `paper-zh.pdf` compiles with `Errors: 0` and `Unresolved: 0`.
- `references.bib` contains all references cited by the manuscript.
- No new Related Work or benchmark expansion is pending.

Suggested commands:

```bash
node tools_node/sync-paper-md-to-tex.js
node tools_node/compile-paper-zh-texlive.js
node tools_node/check-encoding-touched.js --files docs/ai_atomic_framework/arxiv-paper-v1/paper.v3.1.md docs/ai_atomic_framework/arxiv-paper-v1/paper-zh.tex docs/ai_atomic_framework/arxiv-paper-v1/references.bib
```

Pass condition:

```text
Errors: 0
Unresolved: 0
Pages: 38
```

## P0. Claim Calibration Guard

The English version must not strengthen these claims:

- ATM is not a semantic correctness guarantee.
- ATM is not a distributed consensus protocol.
- ATM is not a cross-clone / cross-branch / PR merge solution.
- ATM does not claim large-scale comparative victory.
- ATM does not claim population-level false-positive / false-negative rates.
- ATM does not claim token-cost, throughput, or latency superiority.
- AdmissionBench is a single-governance-domain paper profile, not a direct SyncBench-scale sample-count benchmark.
- POS2 is an existence proof, not a field-level classification-rate estimate.
- Cordon / Atomix / SafeMerge / Semistructured Merge are complementary adjacent systems, not interchangeable baselines.

High-risk English words to audit:

```text
prove
guarantee
always
complete
comprehensive
large-scale
state-of-the-art
outperform
optimal
sound
safe
correct
```

Allowed safer phrasing:

```text
supports
provides evidence for
within the stated boundary
under the adapter and declaration assumptions
paper-facing result
single-domain feasibility
bounded recoverability
complementary rather than interchangeable
```

## P0. Terminology Lock

Use these English terms consistently.

| Chinese / Local Phrase | English Term | Do Not Rename To |
|---|---|---|
| 原子 | atom | unit, node, component |
| 原子圖 | atom map | atomic map, atom graph |
| 虛擬原子 | virtual atom | synthetic atom, inferred atom |
| CID | CID / candidate CID | content hash, identifier only |
| 衝突鍵 | ConflictKey | conflict id, conflict label |
| 寫入前准入 | pre-write admission | pre-commit check, merge check |
| 單一治理域 | single governance domain | single repo only, centralized system |
| 中立寫入者 | neutral steward | manager, controller, arbiter |
| 受治理套用 | governed apply | managed write, controlled patch |
| 同檔 bounded region 准入 | same-file bounded-region admission | same-file merge |
| 證據閉環 | evidence-backed closure | evidence closure, proof closure |
| 任務契約 | task contract | task prompt, task spec only |
| 七層閘門 | seven-layer gate | seven-step pipeline |
| row universe | row universe | sample size |
| paper profile | paper profile | final benchmark, full benchmark |

Style rule:

- Keep code-facing identifiers in English exactly as implemented: `readAtoms`, `writeAtoms`, `parallel-safe`, `compose`, `serial`, `block`, `re-arbitrate`, `scope_violation_catch_rate`.
- Keep `neutral steward`, `ConflictKey`, `CID broker`, and `pre-write admission` stable across Abstract, Introduction, Related Work, Framework, Results, and Conclusion.

## P0. Reference And Numbering Guard

Current manuscript references run through Ref. 60.

Before English conversion:

- Keep manual Ref. numbering stable unless the whole manuscript is migrated to BibTeX-style citations.
- Do not reorder References during translation.
- Verify Ref. 56-60 remain:

```text
56 SafeMerge
57 Semistructured Merge
58 Atomix
59 Cordon
60 SyncMind / SyncBench
```

If `paper-en.tex` uses BibTeX keys instead of manual numbering, create a citation map first.

Minimum citation map:

```text
Ref. 56 -> Sousa2018SafeMerge
Ref. 57 -> Cavalcanti2024SemistructuredMerge
Ref. 58 -> Mohammadi2026Atomix
Ref. 59 -> Chen2026Cordon
Ref. 60 -> Guo2025SyncMind
```

## P0. Table And Denominator Guard

Audit these tables before and after translation:

- Table 18: v0.1 baseline vs. v0.2 paper profile.
- Table 19: v0.2 paper-facing summary.
- Table 20: AdmissionBench research questions and current evidence.
- Governance-containment mapping table in Section 4.7.
- Appendix A.1 / A.4 artifact maps.

Required English meaning:

- `20 scenarios` and `42 mode comparisons` are not the same denominator as `252 policy rows`, `294 ablation rows`, `210 adversarial rows`, or SyncBench `24,332 out-of-sync instances`.
- Table 19 is a paper-facing summary table, not a replacement for all detail tables.
- SyncBench is a future external replay source, not a direct comparator or denominator source.
- AdmissionBench v0.2 is a paper profile under a fixed scenario family and single governance domain.

## P1. Section-Level Translation Strategy

Translate by section, not by whole-file bulk generation.

Recommended order:

1. Abstract and Introduction.
2. Related Work.
3. Framework definitions and propositions.
4. Validation / Evidence / Benchmark Alignment.
5. AdmissionBench Results and Limitations.
6. Discussion and Conclusion.
7. Appendix and References.

For each section:

- translate;
- run claim calibration scan;
- check local references;
- check table/caption fit if the section has tables;
- compile before moving to the next major section.

## P1. Layout Guard For `paper-en.tex`

English layout risks:

- long table headers;
- long artifact paths;
- long URLs;
- long method names such as `Semistructured Merge with Language-Specific Syntactic Separators`;
- dense captions;
- manual references with long annotations.

Preferred TeX strategy:

- make English tables narrower in prose, not just smaller in font;
- move long artifact paths to appendix tables where possible;
- keep `\url{}` / `\texttt{}` wrapping rules explicit;
- avoid shrinking every table globally;
- inspect the first PDF after every major section.

## P1. Non-Claim Sentences To Preserve

These ideas must remain explicit in English:

- ATM should be read as a governance substrate, not a generic hallucination solution.
- ATM does not inherit SafeMerge semantic-conflict-freedom guarantees.
- ATM specializes transactional-agent ideas to repository mutation.
- AdmissionBench and SyncBench are complementary, not directly comparable by raw instance count.
- The evidence stack supports feasibility, auditability, and bounded recoverability within the declared boundary.
- Larger comparative evaluation remains future work.

## P2. Optional Pre-English Cleanup

Helpful but not required before `paper-en.tex`:

- shorten Abstract terminology density;
- make figure labels English-neutral before final LaTeX;
- decide whether Appendix reference annotations should be shortened in the English PDF;
- prepare an English caption style guide;
- prepare a list of terms that should stay as code identifiers.

## Go / No-Go

Start `paper-en.tex` only when:

- P0 Freeze Gate passes;
- P0 Claim Calibration Guard is accepted;
- P0 Terminology Lock is accepted;
- P0 Reference And Numbering Guard is accepted;
- P0 Table And Denominator Guard is accepted.

If any P0 item fails, repair the Chinese source or the translation contract first. Do not patch the English TeX as a workaround for an unstable source claim.
