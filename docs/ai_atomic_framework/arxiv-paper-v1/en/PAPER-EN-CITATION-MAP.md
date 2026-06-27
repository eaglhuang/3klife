# Paper EN Citation Map

Date: 2026-06-26
Use: keep the manuscript's manual Ref. numbering aligned with BibTeX keys before starting `paper-en.tex`

## Verified Scope

- The manual reference surface in [paper.v3.1.md](C:/Users/User/3KLife/docs/ai_atomic_framework/arxiv-paper-v1/paper.v3.1.md) currently contains exactly `62` numbered references.
- The supporting [references.bib](C:/Users/User/3KLife/docs/ai_atomic_framework/arxiv-paper-v1/references.bib) currently contains `63` BibTeX entries.
- Therefore, English conversion must follow the manuscript's manual `Ref. 1-62` surface, not the raw BibTeX file order alone.

## Rule

Do not reorder references during English conversion unless the entire manuscript is intentionally migrated to a different citation system. Until that happens, preserve the current manual numbering surface exactly as it appears in `paper.v3.1.md`.

## Verified Ref. 1-62 Map

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
| 60 | `Guo2025SyncMind` | SyncMind / SyncBench |
| 61 | `Mao2025SEMAP` | SEMAP |
| 62 | `Hou2025ColaUntangle` | ColaUntangle |

## Reference Annotation Table

This table carries the annotated-bibliography roles removed from the formal References section of `paper.v3.1.en.md`. The manuscript References should keep only bibliographic metadata; claim roles belong here or in Related Work prose.

| Ref. | Role In Paper | Boundary Note |
|---|---|---|
| 38 | Classical Operational Transformation work used as a contrast between ATM's admission-time path and OT's post-hoc reconciliation. | OT solves collaborative-editing convergence after edits exist; ATM governs repository mutation admission before governed shared apply. |
| 39 | Foundational OT survey used to explain why ATM adopts pre-write admission rather than post-hoc transformation. | Do not treat OT as a direct repository-governance baseline. |
| 40 | Canonical Git branching, merging, and rebase reference used to align ATM with the boundary of Git's native merge substrate. | Git remains the merge substrate; ATM adds task-scoped admission and steward governance above it. |
| 41 | Textbook concurrency-control and OCC foundation for the CAS base-hash guarded apply analogy. | Use as systems analogy, not as a claim that ATM implements a database transaction engine. |
| 42 | LLM-for-SE systematic review used to position this paper within the broader software-engineering literature. | Supports landscape framing and motivation for multi-agent coordination. |
| 43 | Library-generation-from-scratch benchmark used to broaden the repository-level task-difficulty spectrum. | Repository-level evaluation substrate, not an ATM comparator. |
| 44 | Research-replication benchmark used to align repository-level evaluation substrates. | Supports task-difficulty framing; does not supply ATM evidence rows. |
| 45 | End-to-end agentic feature-development benchmark complementary to FEA-Bench. | Use as related benchmark context, not a direct denominator comparator. |
| 46 | Intermediate-reasoning benchmark that exposes reasoning failures beyond final test pass. | Supports the need to inspect process evidence, not just terminal success. |
| 47 | Cross-language repository-level benchmark. | Supports external-validity framing for adapter-mediated governance. |
| 48 | Realistic repository-leveraging benchmark. | Candidate future comparative replay corpus, not current ATM evaluation evidence. |
| 49 | RAG grounding foundation. | Supports the general claim that external evidence can improve factuality and specificity. |
| 50 | Evidence attribution and revision reference. | Supports evidence-guided correction and attribution context. |
| 51 | Verification-planning reference for reducing hallucination. | Supports validator and evidence-contract literature context. |
| 52 | Agent-computer-interface and tool-feedback reference. | Anchor for adjacent tool-feedback design in Cluster B. |
| 53 | Runtime enforcement DSL for safe and reliable LLM agents. | Closest adjacent work to ATM's pre-tool scope gate and forbidden rules; do not imply identical repository-mutation semantics. |
| 54 | Tool-call-boundary security framework against indirect prompt injection. | ATM borrows boundary-enforcement framing but does not inherit ClawGuard's prompt-injection security guarantee. |
| 55 | Solver-aided policy-compliance verification for tool-augmented LLM agents. | Future solver-checkable formalization direction for ATM forbidden rules and task contracts. |
| 56 | SafeMerge semantic conflict-freedom reference. | Contrast for ATM's pre-write admission versus post-hoc semantic merge; ATM does not claim SafeMerge guarantees. |
| 57 | Semistructured merge reference. | Supports ATM's adapter-guided, non-universal-AST-first positioning. |
| 58 | Transactional tool-use runtime reference. | Neighboring system for execution effects and settlement; ATM specializes repository mutation governance. |
| 59 | Contemporaneous semantic-transaction runtime. | Contrast for task-scoped transaction boundaries versus ATM's repository-specific admission and steward path. |
| 60 | Out-of-sync recovery benchmark. | Future external replay source; not directly comparable to AdmissionBench's pre-write admission row universe. |
| 61 | Protocol-driven multi-agent LLM engineering reference. | Structured-message and lifecycle-governance precedent, not a repository-mutation admission system. |
| 62 | Tangled-commit dependency partitioning reference. | Future semantic-dependency-provider motivation; not a current ATM comparator. |

## High-Risk Citation Anchors

These are the newest references and the ones most likely to drift during translation:

| Ref. | Short Name | Bib Key | Primary Use |
|---|---|---|---|
| 56 | SafeMerge | `Sousa2018SafeMerge` | structured / semantic merge contrast |
| 57 | Semistructured Merge | `Cavalcanti2024SemistructuredMerge` | non-line-based, non-universal-AST contrast |
| 58 | Atomix | `Mohammadi2026Atomix` | transactional-agent runtime |
| 59 | Cordon | `Chen2026Cordon` | task-scoped semantic transactions |
| 60 | SyncMind / SyncBench | `Guo2025SyncMind` | future external replay source; not direct denominator comparator |
| 61 | SEMAP | `Mao2025SEMAP` | multi-agent protocol and structured-message governance precedent |
| 62 | ColaUntangle | `Hou2025ColaUntangle` | LLM-assisted tangled-commit dependency partitioning; future semantic-dependency-provider motivation |

## Adjacent-System Layer Guard

Use this guard whenever a Related Work table, comparison sentence, benchmark-scope note, or future-work provider mentions the closest neighboring systems.

| Layer | References | Citation Role |
|---|---|---|
| Agentic concurrency-control substrates | CoAgent (Ref. 14), S-Bus (Ref. 26), ATCC (Ref. 6) | Closest concurrency-control neighbors; adjacent design points rather than direct baselines for ATM's repository-scoped pre-write admission claim. |
| Transactional tool-effect runtimes | Atomix (Ref. 58), Cordon (Ref. 59) | Closest transactional-runtime neighbors; ATM specializes the admission boundary to repository mutation and neutral-steward apply rather than general tool-effect settlement. |
| Repository-level workflows, protocols, and convergence substrates | CodeTeam (Ref. 25), SEMAP (Ref. 61), MPAC (Ref. 4), CodeCRDT (Ref. 1), AgentGit (Ref. 28), EvoGit (Ref. 27) | Important workflow or protocol neighbors; they organize generation, coordination, convergence, or contracts while ATM adjudicates governed shared mutation before write application. |

Boundary rule:

- Do not describe any of these systems as an ATM direct baseline unless a shared workload and metric suite has been defined.
- AdmissionBench supports ATM's admission-boundary claim; it is not a replacement for serializability recovery, HTTP-observable read isolation, transactional tool-effect staging, database transaction scheduling, or end-to-end repository generation benchmarks.
- The hidden semantic read gap belongs in method boundaries, validity, and future read-set-provider discussion; do not imply that ATM v1 dynamically reconstructs every latent read.

## Verified Manual Reference Surface

The English manuscript should preserve these exact numbered roles:

```text
Ref. 56 -> SafeMerge / semantic conflict-freedom after divergent versions
Ref. 57 -> semistructured merge / partial configurable structure
Ref. 58 -> Atomix / execution vs settlement
Ref. 59 -> Cordon / task-scoped transaction boundary
Ref. 60 -> SyncMind / SyncBench / out-of-sync recovery
Ref. 61 -> SEMAP / structured-message and protocol-governance precedent
Ref. 62 -> ColaUntangle / post-hoc tangled-commit dependency partitioning
```

## Important Note About `references.bib`

- `references.bib` may contain extra entries beyond the 62-item manual reference surface.
- That does not block English conversion, but it means any future `paper-en.tex` migration to BibTeX must map from the manual reference list first, then resolve the extra unused or appendix-only BibTeX entry deliberately.
- Do not assume `Ref. n == nth entry in references.bib`.

## Cross-Check Targets

Before starting `paper-en.tex`, confirm:

- [paper.v3.1.md](C:/Users/User/3KLife/docs/ai_atomic_framework/arxiv-paper-v1/paper.v3.1.md) still contains `62` manual references in the same order.
- [references.bib](C:/Users/User/3KLife/docs/ai_atomic_framework/arxiv-paper-v1/references.bib) still contains the mapped keys above.
- no placeholder wording such as `and collaborators` remains in any new citation.
- `SEMAP` is only cited as a protocol / structured-message governance precedent, not as a repository-mutation admission system.
- `SyncBench` is only cited as future replay / external replay framing, not as direct benchmark denominator comparison.
- `ColaUntangle` is only cited as post-hoc tangled-commit dependency partitioning and future semantic-dependency-provider motivation, not as a current ATM comparator.

## No-Rewrite Zones

Do not let English polishing alter the citation role of these passages:

- structured / semantic merge paragraph in Related Work;
- transactional-agent runtime paragraph in Related Work;
- row-universe warning in Section 5.1;
- SyncBench future replay sentence in Section 6.3.

## Go / No-Go

If the English draft changes a citation's role, numbering, or denominator meaning, repair the citation map before continuing.

If a citation-bearing table, caption, or claim-map row is updated in `paper.v3.1.en.md`, sync this file in the same turn rather than treating it as a later cleanup step.
