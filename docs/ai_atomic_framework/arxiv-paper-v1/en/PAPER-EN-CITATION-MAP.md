# Paper EN Citation Map

Date: 2026-06-26
Use: keep the manuscript's manual Ref. numbering aligned with BibTeX keys before starting `paper-en.tex`

## Verified Scope

- The manual reference surface in [paper.v3.1.md](C:/Users/User/3KLife/docs/ai_atomic_framework/arxiv-paper-v1/paper.v3.1.md) currently contains exactly `60` numbered references.
- The supporting [references.bib](C:/Users/User/3KLife/docs/ai_atomic_framework/arxiv-paper-v1/references.bib) currently contains `61` BibTeX entries.
- Therefore, English conversion must follow the manuscript's manual `Ref. 1-60` surface, not the raw BibTeX file order alone.

## Rule

Do not reorder references during English conversion unless the entire manuscript is intentionally migrated to a different citation system. Until that happens, preserve the current manual numbering surface exactly as it appears in `paper.v3.1.md`.

## Verified Ref. 1-60 Map

| Ref. | Bib Key | Short Title |
|---|---|---|
| 1 | `Pugachev2025CodeCRDT` | CodeCRDT |
| 2 | `Acharya2026SemanticConsensus` | Semantic Consensus |
| 3 | `Liu2026StateManagement` | Multi-agent Collaboration with State Management |
| 4 | `Qian2026MPAC` | MPAC |
| 5 | `Costa2026AgentSpawn` | AgentSpawn |
| 6 | `Zhou2026ATCC` | ATCC |
| 7 | `Pan2025WhyFail` | Why Do Multiagent Systems Fail? |
| 8 | `Nie2026AWCP` | AWCP |
| 9 | `Nechepurenko2026CoordinationLayer` | Coordination as an Architectural Layer |
| 10 | `Sartori2026SpecificationGap` | The Specification Gap |
| 11 | `Ellis1989GroupwareCC` | Concurrency Control in Groupware Systems |
| 12 | `Shapiro2011CRDT` | Conflict-Free Replicated Data Types |
| 13 | `Kung1981OCC` | On Optimistic Methods for Concurrency Control |
| 14 | `Lyu2026CoAgent` | CoAgent |
| 15 | `Geng2026AsyncStrategies` | Effective Strategies for Asynchronous Software Engineering Agents |
| 16 | `Zhang2026Rover` | Rover |
| 17 | `Xia2026TraceFix` | TraceFix |
| 18 | `Ogenrwot2026AgenticFlict` | AgenticFlict |
| 19 | `Liu2026LatentSpaceSynthesis` | Towards Direct Latent-Space Synthesis |
| 20 | `Khan2025MACOG` | Multi-Agent Code-Orchestrated Generation |
| 21 | `Zhao2025ProjectLevelGeneration` | Towards Realistic Project-Level Code Generation |
| 22 | `Zhang2026ConfidenceGating` | Adaptive Confidence Gating |
| 23 | `Rajan2025VerificationInfoTheory` | Multi-Agent Code Verification via Information Theory |
| 24 | `Singh2026SemanticCaching` | Semantic Caching and Intent-Driven Context Optimization |
| 25 | `Wang2026CodeTeam` | CodeTeam |
| 26 | `Khan2026SBus` | S-Bus |
| 27 | `Huang2025EvoGit` | EvoGit |
| 28 | `Li2025AgentGit` | AgentGit |
| 29 | `Jimenez2023SWEBench` | SWE-bench |
| 30 | `Wu2023AutoGen` | AutoGen |
| 31 | `Adya1999WeakConsistency` | Weak Consistency |
| 32 | `Lloyd2011COPS` | Don't Settle for Eventual |
| 33 | `Liu2024RepoBench` | RepoBench |
| 34 | `Ding2023CrossCodeEval` | CrossCodeEval |
| 35 | `Li2025FEABench` | FEA-Bench |
| 36 | `Zan2025CodeS` | CodeS |
| 37 | `Ding2025NL2Repo` | NL2Repo-Bench |
| 38 | `Sun1998OT` | Achieving Convergence, Causality Preservation, and Intention Preservation |
| 39 | `SunEllis1998OT` | Operational Transformation in Real-Time Group Editors |
| 40 | `Chacon2014ProGit` | Pro Git |
| 41 | `Bernstein1987ConcurrencyControl` | Concurrency Control and Recovery in Database Systems |
| 42 | `Hou2024SLR` | Large Language Models for Software Engineering |
| 43 | `Zhao2024Commit0` | Commit0 |
| 44 | `Starace2025PaperBench` | PaperBench |
| 45 | `Zhou2026FeatureBench` | FeatureBench |
| 46 | `Liu2026RACEbench` | A Benchmark for Evaluating Repository-Level Code Agents with Intermediate Reasoning |
| 47 | `Rashid2025SWEPolyBench` | SWE-PolyBench |
| 48 | `Ni2025GitTaskBench` | GitTaskBench |
| 49 | `Lewis2020RAG` | Retrieval-Augmented Generation |
| 50 | `Gao2022RARR` | RARR |
| 51 | `Dhuliawala2023CoVe` | Chain-of-Verification |
| 52 | `Yang2024SWEAgent` | SWE-agent |
| 53 | `Wang2025AgentSpec` | AgentSpec |
| 54 | `Zhao2026ClawGuard` | ClawGuard |
| 55 | `Winston2026SolverAided` | Solver-Aided Verification of Policy Compliance |
| 56 | `Sousa2018SafeMerge` | Verifying Semantic Conflict-Freedom in Three-Way Program Merges |
| 57 | `Cavalcanti2024SemistructuredMerge` | Semistructured Merge with Language-Specific Syntactic Separators |
| 58 | `Mohammadi2026Atomix` | Atomix |
| 59 | `Chen2026Cordon` | Cordon |
| 60 | `Guo2025SyncMind` | SyncMind |

## High-Risk Citation Anchors

These are the newest references and the ones most likely to drift during translation:

| Ref. | Short Name | Bib Key | Primary Use |
|---|---|---|---|
| 56 | SafeMerge | `Sousa2018SafeMerge` | structured / semantic merge contrast |
| 57 | Semistructured Merge | `Cavalcanti2024SemistructuredMerge` | non-line-based, non-universal-AST contrast |
| 58 | Atomix | `Mohammadi2026Atomix` | transactional-agent runtime |
| 59 | Cordon | `Chen2026Cordon` | task-scoped semantic transactions |
| 60 | SyncMind / SyncBench | `Guo2025SyncMind` | future external replay source; not direct denominator comparator |

## Verified Manual Reference Surface

The English manuscript should preserve these exact numbered roles:

```text
Ref. 56 -> SafeMerge / semantic conflict-freedom after divergent versions
Ref. 57 -> semistructured merge / partial configurable structure
Ref. 58 -> Atomix / execution vs settlement
Ref. 59 -> Cordon / task-scoped transaction boundary
Ref. 60 -> SyncMind / SyncBench / out-of-sync recovery
```

## Important Note About `references.bib`

- `references.bib` currently has one extra entry beyond the 60-item manual reference surface.
- That does not block English conversion, but it means any future `paper-en.tex` migration to BibTeX must map from the manual reference list first, then resolve the extra unused or appendix-only BibTeX entry deliberately.
- Do not assume `Ref. n == nth entry in references.bib`.

## Cross-Check Targets

Before starting `paper-en.tex`, confirm:

- [paper.v3.1.md](C:/Users/User/3KLife/docs/ai_atomic_framework/arxiv-paper-v1/paper.v3.1.md) still contains `60` manual references in the same order.
- [references.bib](C:/Users/User/3KLife/docs/ai_atomic_framework/arxiv-paper-v1/references.bib) still contains the mapped keys above.
- no placeholder wording such as `and collaborators` remains in any new citation.
- `SyncBench` is only cited as future replay / external replay framing, not as direct benchmark denominator comparison.

## No-Rewrite Zones

Do not let English polishing alter the citation role of these passages:

- structured / semantic merge paragraph in Related Work;
- transactional-agent runtime paragraph in Related Work;
- row-universe warning in Section 5.1;
- SyncBench future replay sentence in Section 6.3.

## Go / No-Go

If the English draft changes a citation's role, numbering, or denominator meaning, repair the citation map before continuing.
