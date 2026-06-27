# Paper EN Style Spec

Date: 2026-06-26
Scope: binding prose-style specification for `paper.v3.1.en.md` and any future English translation pass of this manuscript.
Status: authoritative. Any translator — human or AI — must read this file before drafting English prose and must conform to it section by section.

## 0. Purpose

This file fixes the **voice, cadence, and scan-design** of the English ATM paper so that every section translated by any agent reads as if written by one author. It does not replace the existing guard files; it sits next to them:

- `PAPER-EN-GLOSSARY.md` — terminology lock (what words to use).
- `PAPER-EN-CLAIM-RISK-SCAN.md` — claim calibration (what NOT to strengthen).
- `PAPER-EN-CITATION-MAP.md` — reference numbering (what Ref. N means).
- `PAPER-EN-TABLE-GUARDS.md` — denominator discipline.
- `PAPER-EN-LAYOUT-PLAN.md` — TeX layout.
- `PAPER-EN-READINESS-CHECKLIST.md` — freeze gate.
- **This file (`PAPER-EN-STYLE-SPEC.md`) — prose voice and rhythm.**

If a translator's draft passes the other guards but violates this file, the draft is still rejected. Style coherence is treated as load-bearing for reviewer trust.

This file governs **how** a claim is packaged in English: paragraph order, topic-sentence placement, connective rhythm, sentence splitting, local emphasis, and closing shape. It does not own source-parity review, citation-number verification, terminology audits, or encoding checks; those checks live in `PAPER-EN-READINESS-CHECKLIST.md`, `PAPER-EN-GLOSSARY.md`, `PAPER-EN-CLAIM-RISK-SCAN.md`, and `PAPER-EN-CITATION-MAP.md`.

## 1. House Voice (One-Line Definition)

> Formal CS / SE conference English with connective cadence: claims, scope, evidence, and boundary are stitched into a single argument line that a reviewer can follow without re-reading.

Targeted reviewer surface: arXiv full paper, OOPSLA / ICSE / FSE / ISSTA-style audience. Not blog, not whitepaper, not slide deck.

## 1.1 Revision Philosophy

The English pass is allowed to reorganize local prose when doing so makes the reviewer path clearer, but it must preserve the source claim surface. A good rewrite does not merely translate sentence order; it repackages the same material so that the reader first sees the gap, then the system role, then the mechanism or evidence, and finally the boundary.

Use this pattern whenever a paragraph feels dense but not actually over-informative:

```text
problem or comparison frame -> mechanism / evidence categories -> calibrated claim -> boundary or takeaway
```

For example, an Abstract evidence paragraph should not present a flat list of artifacts and observations. It should group the same material into evidence roles, name the unit of measurement before derived rows, and close with the exact boundary of the claim. Similarly, a Related Work paragraph should not merely enumerate papers; it should state what each citation cluster contributes to the comparison surface and then close by locating ATM's narrower intervention point.

## 2. Base Style Recipe

The English paper uses a **D-dominant blend**:

- **80% Version D** — connective academic flow. Sentences are joined with `because`, `since`, `where`, `which`, `while`, `rather than`, `so that`, `instead`, `in turn`. The reader is carried through a chain of reasoning, not handed a bullet list.
- **20% Version C** — tight cadence on demand. When a paragraph risks running into a long, multi-clause monster (especially in the Abstract), split it into shorter declarative sentences with strong topic signals.
- **0% Version E** — bold mini-labels (`**Problem.**`, `**Position.**`, `**Evidence.**`, `**Boundary.**`) and bold lead-in topic sentences are **not** used in the paper body. They are reserved for non-paper variants (landing page, blog handoff, demo deck).

Mnemonic: **flow first, snap when it matters, never label like a deck.**

## 3. Section-Level Voice

### 3.1 Abstract

- D base, with C-style sentence splitting permitted to keep average sentence length under control.
- One paragraph per role: (1) problem framing, (2) ATM positioning + mechanism, (3) evidence base + boundary.
- No bold sub-labels.
- Open with the problem, not with ATM. ATM appears only after the gap has been named.

### 3.2 Introduction

- Full D voice.
- Paragraph openings are normal declarative topic sentences — **not** bold lead-ins.
- Connectives carry the argument: `because`, `where`, `while`, `instead`, `in parallel`, `together`, `however`, `rather than`.

### 3.3 Related Work

- D voice.
- Each paragraph maps citations to a single claim role (per `PAPER-EN-CITATION-MAP.md`). Do not stack citations without a connective.
- When listing systems inside one paragraph, use `; ` rather than `. ` to keep the cluster visibly grouped.

### 3.4 Framework / Method

- D voice, slightly more formal.
- Definitions are written in declarative present tense (`The atom is …`, `The atom map aligns …`).
- Propositions and gate steps are introduced with full sentences; never use bold mini-labels to substitute for prose.

### 3.5 Validation / Evidence / Results

- D voice with stricter denominator discipline (`PAPER-EN-TABLE-GUARDS.md`).
- Each empirical claim is followed by — or immediately preceded by — its row universe in prose, not only in a table.
- Avoid victory language. Prefer `supports`, `provides evidence for`, `within the stated boundary`, `under the reported configuration`.

### 3.6 Discussion / Conclusion

- D voice, more reflective register.
- Limitations are written as full sentences, not as a bullet list of negatives.
- Conclusion stays narrow: `feasibility`, `auditability`, `bounded recoverability` — never `solves`, `proves`, `generalizes`.

### 3.7 Appendix

- D voice, but tolerant of more enumeration where the content is genuinely list-shaped (artifact paths, commit hashes, manifests).
- Bold labels are permitted only as the leading word of a list item, never as a paragraph-opener label inside running prose.

## 4. Cadence Rules

1. **Average sentence length: roughly 18–28 words in body sections, 14–22 words in the Abstract.** If a sentence exceeds about 40 words, split it.
2. **At least one connective per paragraph.** A paragraph composed entirely of short, period-terminated sentences reads like Version C and breaks the house voice. Reach for `because`, `where`, `while`, `rather than`, `so that`, `in turn`.
3. **No three consecutive short sentences in body prose.** If short snaps are needed (e.g. to end a paragraph emphatically), use at most two in a row, then return to a connected sentence.
4. **Semicolons are encouraged inside one paragraph when listing parallel systems or claims.** They preserve the cluster feel without forcing bullets.
5. **No em-dash overuse.** One em-dashed clause per paragraph is the soft cap.

## 4.1 Citation-Cluster and Enumeration Snap Rule (Refinement, 2026-06-26)

This rule was added after the Related Work R1 vs. R2 selection. R2 was selected because, although D-dominant connective cadence is the house voice, reviewer load spikes whenever a paragraph turns into a **list of cited systems, a list of benchmarks, or a list of capabilities**. In those local stretches, D-style connectives (`whereas`, `while`, `since`, `instead`) stacked back to back start to feel like a continuous legal brief.

The refinement is therefore:

- **Default cadence** stays D-dominant (Section 2 recipe; 80% D / 20% C).
- **Local cadence inversion** triggers when a paragraph enumerates **three or more named systems, benchmarks, or capability rows in sequence**. In that stretch, switch each enumerated item into its own short declarative sentence (C-snap), keeping connectives only at the paragraph's framing sentence and at its closing synthesis sentence.
- **Where C-snap is appropriate (paper-confirmed):**
  - citation clusters such as `SWE-bench-style studies (Ref. 29) … AutoGen (Ref. 30) … Adya, OCC, COPS, and CRDT literature (Refs. 12, 13, 31, 32) … CoAgent / S-Bus / CodeTeam / ATCC / STORM / CodeCRDT / AgenticFlict`;
  - benchmark spectrums such as `RepoBench … CrossCodeEval … FEA-Bench … CodeS … NL2Repo-Bench`;
  - system-by-system capability contrasts where each system gets a one-sentence verdict.
- **Where C-snap is wrong:**
  - argument paragraphs that build a single inference (e.g. "why ATM is not a CRDT competitor"); these stay connective and D-shaped;
  - definition paragraphs in §3 (Framework);
  - limitation and discussion paragraphs in §5–§7.

Reviewer-load test, applied per paragraph: if a reader could not name the cited systems back to you after one pass, the paragraph has too many connectives stacked over an enumeration — split into C-snap. If a reader could not reconstruct the reasoning step after one pass, the paragraph has been over-snapped — re-connect with D vocabulary from Section 6.

**Cluster-snap with re-convergence pattern (added 2026-06-26 after Tier 2 review).**
When two or three systems are snapped under the binary mechanism-contrast exception (or §4.1 enumeration trigger) and they nominally share a parent cluster (e.g. both are "post-generation conflict repair"), the snapped sentences must be followed immediately by an explicit re-convergence sentence that names the shared cluster property. Phrases such as `Their common characteristic is …` or `What these works share is …` close the cluster cleanly and prevent the reviewer from reading the snapped systems as independent claim scopes. Example trigger: AgentSpawn (dynamic sub-agent spawning) and Rover (LLM merge-hunk reasoning) snapped as distinct mechanisms, then closed with `Their common characteristic is that the principal conflict-resolution effort occurs after candidate changes have already been produced, rather than at a pre-write admission boundary.`

**Pipeline-with-binary-closer pattern (added 2026-06-26 after Tier 4 review).**
When a paragraph or short section contains both (a) an enumerable multi-stage pipeline of three or more named roles or steps, and (b) a comparative conclusion that positions the described system against ATM (or another single peer), use **two snap zones**: enumerate the pipeline role-by-role as short declarative sentences, and snap the closing comparison as a separate two-sentence binary contrast. Do not blend the pipeline narration and the closing comparison into one connected paragraph; reviewers tend to lose either the pipeline or the contrast when both are wrapped in D-style connectives. Example trigger: CodeTeam (Architect → CTO → Developer → QA) followed by a CodeTeam-vs-ATM positioning statement.

**Binary mechanism-contrast exception (added 2026-06-26 after Tier 3 review).**
A two-system comparison may use local snap when the two systems represent distinct coordination mechanisms or distinct intervention points, even though the 3+ threshold is not crossed. Example trigger: STORM (write-time state mediation / OCC) vs. CAID (workspace isolation / post-hoc integration) — two systems, two clearly different mechanism categories, so each system gets its own short verdict sentence and the paragraph closes with a one-sentence synthesis of the mechanism difference. If the two systems instead share the same mechanism category (e.g. two text-CRDT variants), keep them connected with D-style `while` / `whereas` and do not snap.

## 4.2 Calibration Patterns (Refinement, 2026-06-26)

These four calibration patterns were locked in after the Tier 1 (T1-B) review. They are not new claims; they are precise phrasings that prevent translation drift on load-bearing boundary terms. Apply them whenever the matching trigger phrase appears in a Chinese source paragraph; they sit alongside `PAPER-EN-GLOSSARY.md` and override any near-synonym a translator might prefer.

**Pattern 1 — Do not let "semantic" qualify "pre-write admission" in a list.**
- Wrong: `atom-level, bounded-region, or semantic pre-write admission`.
- Right: `atom-level or bounded-region pre-write admission`.
- Why: ATM does not provide a full semantic-admission guarantee; chaining `semantic` into the same enumeration as `atom-level` and `bounded-region` accidentally promotes ATM into a soundness claim it does not make.

**Pattern 2 — Externally reported residual rates must be marked as preliminary estimates, not as full-population statistics.**
- Wrong: `reports 5–10% semantic conflicts`.
- Right: `reports a preliminary estimate of roughly 5–10% semantic conflicts` (or equivalent: `a preliminarily estimated 5–10%`).
- Why: such figures come from limited sampling in the cited work and must not read as a universal population rate. This also applies to any externally cited percentage (AgenticFlict's 27.67%, SyncBench's instance counts, etc.) — keep the source framing visible in English.

**Pattern 3 — Use `cannot be shown safe under the declared admission model`, not `cannot be statically proven safe`.**
- Wrong: `intents that cannot be statically proven safe`.
- Right: `intents that cannot be shown safe under the declared admission model`.
- Why: ATM is not a full formal prover; "statically proven" overclaims. The declared-admission-model phrasing keeps the bound at adapter declarations, atom map state, and the static dependency graph that the broker actually consults.

**Pattern 4 — Use `before any governed mutation is applied`, not `before any write occurs`.**
- Wrong: `inside the same governance domain and before any write occurs`.
- Right: `inside the same governance domain and before any governed mutation is applied`.
- Why: agents can still edit private or local WIP without going through ATM; the gate is on **governed mutation**, not on every keystroke. The narrower phrasing keeps the boundary correct and avoids implying ATM intercepts all editing activity.

**Pattern 5 — Do not over-attribute "workspace freedom" or "local isolation" to systems that do not actually isolate the workspace.**
- Wrong: `STORM and CAID let agents work freely inside their local space`.
- Right: name the mechanism per system, then close with a synthesis sentence that respects the per-system difference (e.g. `STORM mediates state at write time, whereas CAID isolates execution and reconciles changes afterward`).
- Why: workspace freedom is a CAID property (Git worktree isolation), not a STORM property (STORM is a write-time mediator on top of the shared workspace). A shared closing sentence that flattens the two distorts both.

**Pattern 6 — Do not anthropomorphize Git merge, and do not imply that every same-file edit becomes a Git conflict.**
- Wrong: `Git merge only learns about the conflict after the fact`.
- Right: `A Git-based isolation workflow … determines whether the independently produced changes can be integrated only after both changes already exist.` (or equivalent: describe the workflow as the agent, not Git itself.)
- Why: writing "Git learns" reads as anthropomorphism; writing "the conflict" presupposes a conflict that may never materialize on disjoint regions. Phrase the limitation as a timing property of the workflow, not as a discovery event by Git.

**Pattern 7 — Do not flatten MPAC to "an overhead-reduction workflow system".**
- Wrong: `MPAC uses a multi-layer protocol to reduce multi-agent collaboration overhead`.
- Right: `MPAC defines a multi-principal coordination protocol with explicit session, intent, operation, conflict, and governance semantics` (Ref. 4).
- Why: the literal Chinese gloss undersells MPAC's protocol-level contribution and creates a false equivalence with generic workflow orchestrators. When a related-work system has a structural protocol contribution, name the protocol layers rather than the cost benefit.

**Pattern 8 — Do not call CodeTeam (or any related-work system not actually re-executed in this paper) an "empirical baseline".**
- Wrong: `CodeTeam is a planning-time repository-construction baseline`.
- Right: `CodeTeam is a planning-side repository-construction comparator` (or `design point`).
- Why: this paper has not run CodeTeam as an empirical baseline; calling it a baseline implies a same-axis quantitative comparison the evidence does not support. Use `comparator`, `design point`, `reference design`, or `neighbor` for systems that are positioned in prose only.

**Pattern 9 — Do not let "safely admitted" stand as a soundness claim.**
- Wrong: `whether bounded regions within it can be safely admitted`.
- Right: `whether bounded regions within it can be admitted concurrently under the declared model`.
- Why: `safely admitted` reads as a semantic-safety guarantee that ATM does not provide. The right phrasing keeps the qualifier on the declared admission model (adapter declarations, atom map state, declared dependency graph), aligning with Pattern 3.

**Pattern 10 — Do not imply an ordinal size ranking among undefined problem classes.**
- Wrong: `ATM addresses only the narrowest segment of the first class`.
- Right: `ATM targets a narrow subset of the first class`.
- Why: `narrowest` presupposes a measurable ordering among classes that the paper never defines. `narrow subset` keeps the boundary claim without inviting unanswerable size comparisons.

**Pattern 11 — Do not use unquantified superlatives such as "most" without a denominator.**
- Wrong: `catching most predictable conflicts before the write`.
- Right: `arbitrating statically observable conflicts before the write`.
- Why: `most` implies a population fraction the paper has not measured. Reach for property-based phrasing (`statically observable`, `declared`, `adapter-visible`) instead.

**Pattern 12 — Do not artificially tie an adjacent system's role to ATM's specific verdict labels.**
- Wrong: `after ATM's SERIAL route, a CoAgent-style layer can absorb reactive repair`.
- Right: `a CoAgent-style layer can manage residual effects that emerge along serialized or post-admission execution paths`.
- Why: chaining an external system to one of ATM's verdict tokens (`SERIAL`, `BLOCK`, `COMPOSE`) overspecifies the integration point and falsely suggests the external system only attaches at that verdict. Describe the integration in terms of execution-path properties instead.

**Pattern 13 — Be precise about how external side effects are handled, and do not collapse them into "the agent absorbs them".**
- Wrong: `tool side effects must be absorbed by the agent itself`.
- Right: `residual tool effects require reactive repair or compensation`.
- Why: the literal Chinese reads as if the agent manually swallows all side effects, but the adjacent systems actually use structured mechanisms (saga compensation, inverse actions, audit metadata). Name the mechanism category.

**Pattern 14 — Do not conflate "agent has formed a write intent" with "agent has committed".**
- Wrong: `before multiple agents have actually committed`.
- Right: `before a governed shared mutation is applied`.
- Why: `commit` collides with Git semantics and suggests a downstream PR / merge event rather than the upstream admission moment the paper actually targets. Reuse Pattern 4 phrasing for any "before the write" trigger.

**Pattern 15 — No-unverified-lineage rule.**
- Wrong: `Cordon refines this design space with a task-scoped boundary that …`.
- Right: `Atomix separates execution from settlement through epochs, resource scopes, frontiers, and compensation (Ref. 58). Cordon introduces task-scoped transactions that stage effects, validate them, and associate them with audit metadata before commit (Ref. 59).`
- Why: verbs such as `refines`, `extends`, `follows`, `builds on`, `is a successor to`, or `improves` assert a technical-lineage relationship between two systems. Do not assert lineage between contemporaneous related-work systems unless the cited work explicitly establishes it. Present independent systems as independent declarative sentences, then synthesize at the cluster level (see §4.1 Cluster-snap with re-convergence pattern).

**Pattern 16 — Do not let validators or CAS revalidation be described as producers of admission verdicts.**
- Wrong: `ATM relies on adapter declarations, static read/write sets, shared surfaces, ConflictKeys, CAS revalidation, and validators to produce deterministic fail-closed arbitration.`
- Right: `Its current broker path derives deterministic decisions from adapter-declared atoms, static read/write sets, shared surfaces, and ConflictKeys, while CAS revalidation and validators provide downstream runtime closure.`
- Why: the broker produces the admission verdict. CAS revalidation and validators are downstream runtime-closure mechanisms applied to already-admitted writes. Collapsing them into one "produces arbitration" list misattributes the verdict source.

**Pattern 17 — Do not describe ATM as "specializing" an adjacent design space when no inheritance is claimed.**
- Wrong: `ATM specializes this design space to repository mutation`.
- Right: `ATM occupies a repository-specific point in this design space`.
- Why: `specializes` reads as a derivation claim from the adjacent system family. ATM is positioned in the same design space, not derived from it; use `occupies a point in`, `addresses a repository-specific case of`, or `is positioned in this space` instead.

**Pattern 19 — Avoid absolute "none of them" / "no system" framing when "do not directly target" suffices.**
- Wrong: `none of them targets the moment at which a specific governed shared mutation must be admitted`.
- Right: `they do not directly target the moment at which a specific governed shared mutation must be admitted`.
- Why: an absolute negation invites a reviewer counter-example ("system X arguably does"), even when the looser claim is what the paper actually needs. `do not directly target` preserves the boundary while leaving room for partial overlaps.

**Pattern 20 — When listing ATM verdict outcomes, use the canonical ATM vocabulary.**
- Wrong: `admitted, composed, serialized, or refused` (or `rejected`, `failed`).
- Right: `admitted, routed to composition, serialized, or blocked`.
- Why: `composed` and `refused` drift from the framework's own terminology. The canonical verdict surface is **admission, composition (via composer / neutral steward), serialization, or block / fail-closed**. Stay inside that vocabulary so the prose stays alignable with §3.4 admission flow, §3.5 seven-layer gate, and the broker verdict tables.

**Pattern 21 — Prefer natural enumerative topic markers over mechanical "contributes the first/second/third" constructions.**
- Wrong: `The OT lineage contributes the first. ... The classical OCC framework contributes the second. ... ATCC contributes the third.`
- Right: `First, the Operational Transformation lineage … . Second, the classical OCC framework … . Third, ATCC … .` (or use varied openers such as `One`, `Another`, `A third` when "first/second/third" repeats too rigidly across nearby paragraphs.)
- Why: `contributes the Nth` reads as mechanical translation-ese and stacks identical phrasing across three sentences. Natural enumerative markers preserve the snap structure and the topic-sentence discipline (§5) while sounding like prose rather than a checklist.

**Pattern 22 — Cross-reference numbering must match the canonical numbering in the English manuscript, not the Chinese source's local numbering.**
- Wrong: keeping `§3.5 Definition 3.5` and `Definition 3.3` verbatim from the Chinese draft when the canonical English numbering is `Definition 7` and `Definition 6`.
- Right: verify the actual Definition / Theorem / Proposition / Algorithm / Figure / Table / Section number in the English manuscript's §3 sequence before quoting it.
- Why: the Chinese source occasionally uses dotted local numbering (e.g. `Definition 3.5`) that becomes a flat counter in the canonical English numbering. A translator who carries the source number verbatim creates dangling cross-references. Before submitting any section that quotes a Definition / Theorem / Proposition / Algorithm number, open the English manuscript and confirm the actual integer; do not infer it from the Chinese source.

**Pattern 23 — Do not collapse "existing adjacent literature" and "future extensions" into one out-of-scope category.**
- Wrong: `Several adjacent directions remain explicitly out of scope. Pan et al. and Nechepurenko and Shuvalov surveyed failure modes …`.
- Right: `Several adjacent bodies of work and possible extensions remain outside the current system's evaluated scope. Pan et al. (Ref. 7) and Nechepurenko and Shuvalov (Ref. 9) provide broader analyses of multi-agent failure and coordination. … Another possible extension would formalize …`.
- Why: prior failure-analysis literature is not a future direction — it already exists. Lumping survey-style references and prospective extensions under one "future directions" label misrepresents the survey work and gives reviewers a tidy but inaccurate boundary. Use a closing phrase such as `bodies of work and possible extensions` that admits both kinds.

**Pattern 24 — Use American English spelling throughout the manuscript.**
- Wrong: `centres`, `behaviour`, `analyse`, `realise`, `colour`, `optimisation`.
- Right: `centers`, `behavior`, `analyze`, `realize`, `color`, `optimization`.
- Why: the manuscript follows American English. Translators (human or AI) trained on British English variants must convert spellings on commit. This applies to all sections, not only newly translated chunks; if a translator notices British spellings in already-landed text while working in nearby prose, fix them in place.

**Pattern 25 — Do not tie orthogonal-layering claims to a specific ATM verdict route.**
- Wrong: `workspace protocols and TraceFix can be layered above the deterministic-composer route`.
- Right: `workspace protocols and TraceFix operate at boundaries orthogonal to ATM's pre-write admission layer and could be combined with it in future systems`.
- Why: extends Pattern 12. Even when prose discusses how an external mechanism might compose with ATM, do not bind that composition to a specific verdict label (deterministic-composer, SERIAL, BLOCK). Use `combined with`, `composed with`, or `layered alongside` to keep the integration point neutral until §5 / §6 future-work text actually commits to a placement.

**Pattern 26 — Qualify "every write" with "every governed shared write" when describing what must traverse the admission path.**
- Wrong: `it requires every write to first be expressed as a structured write intent`.
- Right: `it requires every governed shared write to first be expressed as a structured write intent`.
- Why: agents may still edit local / private WIP without entering the brokered path. The bare phrase `every write` catches those private edits and misrepresents the admission boundary. Use the longer phrase whenever the sentence describes mandatory admission traversal. Pairs with Pattern 4 (`before any governed mutation is applied`).

**Pattern 27 — Em-dashes are unspaced (American convention).**
- Wrong: `decides — within the boundary delineated by the governance substrate — whether the intent may enter the write path`.
- Right: `decides—within the boundary delineated by the governance substrate—whether the intent may enter the write path`.
- Why: the manuscript follows American convention with unspaced em-dashes for parenthetical inserts. British / AP style uses spaced en-dashes, which read differently in PDF and break cadence. This pairs with Pattern 24 (American English spelling) as the punctuation-side companion rule. Soft cap from §4 Cadence Rule 5 still applies: one em-dashed insertion per paragraph.

**Pattern 28 — Prefer the concise verb when a noun-stacked phrase carries the same meaning.**
- Wrong: `the CID broker (described in §3.4–§3.5 of Part B) acts as the subsystem implementation of the mutation-admission plane defined in §3.1`.
- Right: `the CID broker, described in §3.4–§3.5 of Part B, implements the mutation-admission plane defined in §3.1`.
- Why: `acts as the subsystem implementation of` is noun-stacked translation-ese; `implements` carries the same meaning in one verb. Likewise, replace `parentheses around descriptive asides` with comma-bounded relative clauses when the aside flows inside the sentence rather than interrupting it. This refines Pattern 18 from "natural verbal framing" to "concise verbal framing" for §3 Framework-style formal prose.

**Pattern 29 — The three-plane mechanism table must list each governance mechanism in exactly one plane.**
- Wrong: listing `validator envelope` under both the Task-contract plane and the Evidence-closure plane.
- Right: Task-contract plane uses upstream phrasing such as `validation requirements`; `validator envelope` belongs to the Evidence-closure plane only. The Task-contract plane states *what is required to be validated*; the Evidence-closure plane carries the actual *validator envelope* that runs and records validators.
- Why: the three planes are presented as having distinct responsibilities (§3.1 introduction). A mechanism duplicated across two planes silently blurs that responsibility boundary and undermines later prose that cites the plane separation. Audit the table whenever §3.1 is touched: each row's "ATM mechanisms" cell should be disjoint from the others. When the Chinese source happens to list the same component name in two planes, prefer the upstream form in the earlier plane and the implementing form in the later plane.

**Pattern 30 — Prefer the `un-` prefix over `non-` when the resulting word is idiomatic English.**
- Wrong: `non-auditable closure`, `non-governed mutation`, `non-deterministic verdict`.
- Right: `unauditable closure`, `ungoverned mutation`, `nondeterministic verdict`.
- Why: in formal CS / SE prose, `unauditable` reads more naturally than `non-auditable`. Apply this consistently across §3 Framework, §5 Limitations, and Conclusion. If `non-X` happens to be the idiomatic standard (`non-trivial`, `non-empty`), leave it; the rule is "prefer un- when the un- form already exists in standard usage."

**Pattern 31 — Avoid slash-coordination in formal prose; prefer compound hyphenation or full phrasing.**
- Wrong: `broker / steward governance path`, `read / write set`, `agent / tool boundary`.
- Right: `broker-and-steward governance path` (compound when the pair acts as one logical unit), `read and write sets` (full phrasing when the elements are separately quantified), or `read/write set` (no spaces around slash, when treating as a fixed technical term such as in `read/write dependency`, which is already established vocabulary).
- Why: the spaced-slash form ` / ` reads as informal coordination in formal academic prose and conflicts visually with the unspaced em-dash convention of Pattern 27. Resolve case by case: fixed technical compounds keep unspaced slash (`read/write`, `pre-tool`), but loose pair-coordination becomes either `X-and-Y` or `X and Y`. The pair "broker and steward" acts as a single governance path and therefore takes the compound form.

**Pattern 32 — Use the full qualified phrasing for the neutral steward's authority scope.**
- Wrong: `the sole write authority within the governance domain`.
- Right: `the sole formal apply authority for governed shared writes within the governance domain`.
- Why: the bare phrase `sole write authority` can be read as "no one else writes any file inside the domain", which conflicts with the local / private WIP exception (Pattern 26). The full qualified form keeps the steward's exclusivity scoped to (a) formally applied writes, and (b) governed shared writes. Reuse this exact phrasing whenever the steward's role is named in §3.2, §3.4, §3.5, §6, and the Appendix.

**Pattern 33 — Unwind heavy hyphenated compound nouns by moving modifiers into postpositional `for` / `of` phrases.**
- Wrong: `governed-shared-mutation admission subsystem` (three-stack premodifier; reader has to parse the stack before reaching `subsystem`).
- Right: `shared-mutation admission subsystem for governed writes` (one compound premodifier + postpositional qualifier).
- Why: stacking three hyphenated modifiers in front of a noun is a typical translation artifact from Chinese left-branching modifiers. English tolerates two-stack premodifiers (e.g. `pre-write admission gate`), but at three the noun phrase becomes opaque. Move the third modifier into a `for` / `of` / `over` postpositional phrase to recover sentence rhythm. Pairs with Pattern 18 (natural verbal framing) and Pattern 28 (concise verb) as the noun-side cleanup rule.

**Pattern 34 — Avoid `flavours` (British) and `flavors` (food-coded ambiguity) for technical variants.**
- Wrong: `the two CID flavours serve pre-write admission and evidence closure`.
- Right: `the two CID forms serve pre-write admission and evidence closure` (or `the two CID types`, `the two CID variants`).
- Why: `flavour` is the British spelling (violates Pattern 24) and even its American form `flavor` reads as casual / culinary in formal CS / SE prose. Use `forms`, `types`, or `variants` depending on local rhythm: `forms` is the most neutral; `types` is acceptable when the items are class-level kinds; `variants` is acceptable when one is a refinement of the other.

**Pattern 35 — Do not let a secondary structure claim to be "the governance substrate"; that role belongs to ATM as a whole.**
- Wrong: `the atom map is also the actual governance substrate of ATM`.
- Right: `the atom map is the semantic index formed from these atoms, and a central governance index in ATM`.
- Why: `governance substrate` is reserved for ATM at the chapter level (§3.1 introduces ATM as the specification-grounded governance substrate). When a subsidiary structure such as the atom map is given the same label, the reader sees two competing referents for the same noun phrase and the §3.1 claim shape is weakened. Use `central governance index`, `governance-facing index`, `core index of the governance layer`, or another precise role term for subsidiary structures. Reserve `governance substrate` for ATM as a system.

**Pattern 36 — Replace casual permission phrasing with explicit authority language when describing what an agent may or may not do.**
- Wrong: `an AI agent is not "freely modifying files"`; `agents can write whatever they want`.
- Right: `an AI agent does not directly acquire authority to mutate shared files`; `agents do not hold the authority to write directly to the shared filesystem without traversing the broker path`.
- Why: scare-quoted casual phrasing such as `"freely modifying files"` shifts register downward and invites reviewers to ask what "freely" means. Explicit authority language ties the limitation to the framework's actual constraint (the broker / steward apply path) and aligns with Pattern 32's full steward-authority phrasing.

**Pattern 37 — Prefer "atoms the intent maps to" over "atoms the intent lands on".**
- Wrong: `which atoms the intents land on`.
- Right: `which atoms the intents map to`.
- Why: `land on` is figurative and visually evokes the intent crashing into atoms. `map to` is the precise technical verb that mirrors §3.3's atomization framing (an intent is structurally mapped onto governance objects through the adapter). Use `map to`, `correspond to`, or `resolve against` instead.

**Pattern 38 — In any broker-verdict comparison table, the `parallel-safe` row must enumerate the full gate category list (CID, shared-surface, read/write, range) and be bounded by `under the declared model`.**
- Wrong: `No CID, shared-surface, or range conflict`.
- Right: `No blocking CID, shared-surface, read/write, or range conflict under the declared model`.
- Why: omitting `read/write` desynchronizes the `parallel-safe` row from the seven-layer gate enumeration (CID → shared surface → read/write → physical overlap → atom coverage → virtual-atom coverage → bounded region). Reviewers will compare Table 6 against the gate order and notice the gap. The trailing `under the declared model` keeps the verdict bound to the adapter / atom-map / declared-dependency model (Pattern 3), so `parallel-safe` does not read as a semantic-soundness guarantee.

**Pattern 39 — Avoid `true conflict` / `real conflict` framing; use `relevant conflict boundary` instead.**
- Wrong: `the figure shows how ATM exposes the true conflict point`.
- Right: `the figure shows how ATM exposes the relevant conflict boundary`.
- Why: `true conflict` implies that ATM detects full semantic conflicts, which exceeds the framework's actual claim (see Pattern 3 and Pattern 9). ATM detects governance-relevant conflict boundaries — boundaries the broker can adjudicate under the declared admission model. Reach for `relevant`, `governance-relevant`, `conflict-relevant`, or `admission-relevant` instead of `true` or `real`.

**Pattern 40 — Avoid `in a single step` / `one shot` when describing the governance chain; use `through a governed write path`.**
- Wrong: `an AI write intent is atomized, compared, adjudicated, and applied in a single step`.
- Right: `an AI write intent is atomized, compared, adjudicated, and applied through a governed write path`.
- Why: the governance chain (agent proposal → adapter-guided atomization → atom map lookup → virtual-atom refinement → broker verdict → neutral steward apply) is a controlled multi-stage path, not a one-shot operation. `Single step` invites the misreading that ATM compresses the chain into one atomic call, which conflicts with §3.4's progressive-atomization framing. Use `governed write path`, `governed apply path`, or `controlled admission path` instead.

**Pattern 41 — Avoid evaluative adverbs (`honestly`, `correctly`, `properly`, `safely`) when describing system behavior; use precise mechanism verbs.**
- Wrong: `the latter shows that the system honestly blocks`.
- Right: `the latter shows that the broker fails closed when refinement is insufficient`.
- Why: `honestly` and similar adverbs anthropomorphize the system and imply a value judgment the framework does not make. The broker does not "honestly" anything; it executes a deterministic verdict (`fails closed`, `routes to SERIAL`, `emits split suggestion`). Replace evaluative adverbs with the canonical mechanism verb that names the actual outcome.

**Pattern 42 — Refinement outcomes are not `becomes safe`; they `enable admission under the declared model`.**
- Wrong: `the former shows that admission becomes safe after refinement`.
- Right: `the former shows a case in which refinement enables admission under the declared model`.
- Why: `becomes safe` overclaims the post-refinement state — refinement does not establish semantic safety, it only enables an admission verdict under the adapter / atom-map / declared-dependency model (extends Patterns 3, 9, 38). Use `enables admission`, `permits admission`, or `clears the admission gate` and pair with the trailing scope qualifier `under the declared model`.

**Pattern 43 — Use `formal atom` (not `physical atom`) when contrasting with `virtual atom`.**
- Wrong: `a patch span that is not yet covered by a physical atom`.
- Right: `a patch span that is not yet covered by a formal atom`.
- Why: §3.3 establishes the vocabulary as `formal atom / virtual atom`, where the atom grade $\gamma$ takes values such as `candidate`, `virtual`, or `formal`. `Physical atom` is not part of the framework's vocabulary and reads as a different ontology (physical-vs-virtual hardware). Keep the dichotomy on the governance-lifecycle axis: formal atoms are the long-lived governance units; virtual atoms are the transitional substitutes used when formal coverage is insufficient.

**Pattern 44 — Refinement does not "resolve the overlap"; it `establishes an admissible disjoint or composable route`.**
- Wrong: `when both refinement steps fail to resolve the overlap`.
- Right: `when both refinement steps fail to establish an admissible disjoint or composable route`.
- Why: `resolve the overlap` implies the refinement settles the semantic conflict, which exceeds ATM's claim (extends Patterns 3, 9, 38, 42). The refinement only establishes whether the broker can route the intents to a disjoint admission or to deterministic composition. If neither route can be established, the broker falls back to `blocked-cid-conflict`. The phrase `establishes an admissible disjoint or composable route` keeps the mechanism's role bounded to the admission gate.

**Pattern 45 — Avoid notation clashes with Definition-introduced symbols; use scoped subscripts for local identifiers.**
- Wrong: `Without elevating $A$ — the first writer — into a governed transaction …` (where $A$ is also Def 1's allowed-resource set).
- Right: `Without elevating the first writer, $I_A$, into a governed transaction …` (introducing fresh scoped subscripts $I_A$, $I_B$ for the two transactions).
- Why: Definition 1 reserves $A$ for the allowed-resource set of the Task Contract, and Definition 6 already required renaming the source's $A$ to $\mathcal{A}_R$ for the same reason (the Active Registry's transaction-declared atom set). Reusing $A$ in §3.4 prose to refer to "the first writer" creates a third semantic for the same symbol within one section. Use $I_A$, $I_B$, or another scoped form for narrative-only writer identifiers; never overload a symbol that has been formally introduced by a Definition.

**Pattern 46 — Table legends naming a discrete-label column use `labels`, not `levels`.**
- Wrong: `The maturity column uses three levels: Proven / Partial / Speculative.`
- Right: `The maturity column uses three labels: Proven / Partial / Speculative.`
- Why: `levels` implies a monotone ordering (e.g. a numeric maturity scale). The three maturity markers are categorical labels, not points on a scale. Reach for `labels`, `categories`, or `markers` when the column contains discrete tags. Reserve `levels` for legitimately ordered scales (e.g. `verbosity levels 0–3`).

**Pattern 47 — Drop redundant `fully` in `fully autonomous`; the bare `autonomous` carries the same meaning.**
- Wrong: `fully autonomous virtual-atom refinement or autonomous bounded re-planning`.
- Right: `autonomous virtual-atom refinement or bounded re-planning`.
- Why: `fully autonomous` is a translation artifact from Chinese intensifiers (`全自動`, `完全自動`). In English systems prose, `autonomous` already excludes human-in-the-loop steps; the modifier `fully` adds emphasis without precision and stacks awkwardly when several autonomous mechanisms are listed together. Apply this whenever the source intensifies `autonomous` / `automated` / `automatic`.

**Pattern 48 — In verdict tables, prefer action verbs (`route to SERIAL`, `emit refinement candidate`) over bare verdict tokens.**
- Wrong: Table cell reads `Block or SERIAL`.
- Right: Table cell reads `Block or route to SERIAL`.
- Why: bare verdict tokens such as `SERIAL` read as terminal states in a cell, while the column actually describes the *next action* taken on fail. Active verb phrasing (`route to SERIAL`, `emit refinement candidate`, `escalate to fail-closed fallback`) tells the reader what the broker does, not just which label is assigned. Reuse this pattern across §3.4, §3.5, and §5 verdict tables. Pairs with Pattern 38 (verdict-row alignment) and Pattern 41 (precise mechanism verbs).

**Pattern 49 — Figure, Table, and Algorithm captions use Title Case and an em dash (`—`) after the number.**
- Wrong: `**Table 1 -- Related-Work Citation-to-Claim Map.**`, `**Figure 1 -- ATM as a specification-grounded, three-plane governance substrate.**`
- Right: `**Table 1 — Related-Work Citation-to-Claim Map.**`, `**Figure 1 — ATM as a Specification-Grounded, Three-Plane Governance Substrate.**`
- Why: mixed caption styles make the paper look as if different sections were translated under different house rules. Treat caption heads as formal labels, not running prose: use Title Case for the caption title, and use a single em dash form after the item number across Figure / Table / Algorithm captions. Apply the same rule to caption-like bold callouts such as `Figure 1 Three-Plane Reading` and `Figure 3 Escalation Examples` when they function as local caption extensions rather than body-text sentences.

**Pattern 49 — Frame limitations as missing guarantees, not as missing mechanisms; pair with `conservatively` over `safely`.**
- Wrong (limitation header): `**No cross-machine distributed coordination.**` — implies ATM does not address coordination at all.
- Right: `**No cross-machine distributed-coordination guarantee.**` — names the precise missing guarantee.
- Wrong (broker action): `the broker's ability to refuse safely does not guarantee …`
- Right: `the broker's ability to refuse conservatively does not guarantee …`
- Why: ATM has partial mechanisms (admission-time refusal, fail-closed paths, validator handoff) even at the limitations boundary. A bare `does not X` reads as "ATM is silent on X", which overstates the absence. Frame each limitation as a *missing guarantee* (`No X guarantee`, `X is unresolved`, `X requires formal proof`). Within the limitation body, `conservatively` describes how the broker refuses (taking the safer side of the decision boundary), while `safely` invites the reading that the refusal carries a semantic-safety guarantee it does not have. Pairs with Pattern 41 (precise mechanism verbs) and Pattern 42 (admission-under-the-declared-model phrasing).

**Pattern 50 — Prefer compact academic register over literal expansion of Chinese conjoined nouns.**
- Wrong: `proceeds in the order: …`; `materials of different nature and different strength`.
- Right: `proceeds in the following order: …`; `materials with different evidentiary strengths`.
- Why: literal translation of Chinese conjoined-noun structures (`不同性質、不同強度`) yields English that reads as enumeration translation-ese. Collapse the conjunction into a single qualified noun (`evidentiary strengths`) and prefer fully-formed prepositional phrases (`in the following order`) over their truncated translations. Pairs with Pattern 18 (natural verbal framing) and Pattern 33 (compound-noun unwinding).

**Pattern 51 — Avoid business jargon (`ROI`, `KPI`, `bottom line`) in formal CS / SE paper prose; prefer plain academic register.**
- Wrong: `a clearly counted, high-ROI gap remains`.
- Right: `a clearly counted, high-priority gap remains`.
- Why: `ROI` reads as product / business-strategy register and pulls the prose into a deck-friendly mode. Academic prose names the priority or impact directly (`high-priority`, `high-impact`, `most consequential`). Apply this to `KPI`, `bottom line`, `low-hanging fruit`, `value-add`, and other business-deck idioms when they appear in the source; the Chinese source occasionally uses these terms casually but the English paper should not. Pairs with Pattern 18 (natural verbal framing) and Pattern 50 (compact academic register).

**Pattern 52 — Code identifiers in prose must match the exact form used in the source table or definition.**
- Wrong (prose): ``**`unsafe same-deliverable`.**`` / ``**`mixed dependency`.**``
- Right (matches Table 9 row 9): ``**`unsafe-wave-same-deliverable`.**`` / ``**`mixed-wave-dependency`.**``
- Why: when a bullet or sentence references an identifier that has been registered in a table (verdict code, scenario name, lane label, atom CID, etc.), the prose must use the *exact* code-identifier form. Paraphrased shortenings break grep, cross-reference search, and reviewer table-to-prose alignment. Apply this whenever a scenario, verdict, lane, route, or task-id is repeated across Tables 6, 9, 10, 12, 15 and the corresponding §3 / §4 prose. Before submitting a bulleted scenario list, grep the canonical table for the identifier and copy it verbatim.

**Pattern 53 — Avoid promotional / marketing register (`well-positioned`, `state-of-the-art`, `market-leading`, `cutting-edge`) in formal academic prose.**
- Wrong: `This paper is therefore well-positioned to support the conclusion that …`.
- Right: `This paper therefore supports the narrower conclusion that …`.
- Why: `well-positioned` reads as marketing register and asserts the paper's standing rather than the claim's content. Academic prose names the conclusion the paper actually supports (`supports the narrower conclusion that …`, `is consistent with the claim that …`, `provides evidence for …`) and lets the boundary speak through scope qualifiers. Apply this also to `state-of-the-art`, `cutting-edge`, `market-leading`, `industry-leading`, and similar promotional adjectives whenever they appear. Pairs with Pattern 51 (no business jargon), Pattern 49 (missing-guarantee framing), and the Validation / Evidence / Results style note (§3.5) on avoiding victory language.

**Pattern 18 — Prefer natural verbal framing over institutional jargon when both are accurate.**
- Wrong: `ColaUntangle is a candidate reference direction for a future semantic-dependency provider`.
- Right: `ColaUntangle motivates a possible future semantic-dependency provider`.
- Why: `candidate reference direction` is institutional translation-ese. Prefer verbs (`motivates`, `points toward`, `suggests`) when they preserve the same boundary claim with less noun stacking.

**Application discipline.** When a translator sees the Chinese trigger phrases for any of these patterns — `semantic pre-write admission`, externally reported residual rates, `static proof of safety`, `write happens / before write`, claims of `workspace freedom` for write-time mediators, anthropomorphic Git phrasing, MPAC-as-overhead-reduction, related-work systems described as `baseline`, `safely admitted`, ordinal class ranking, unquantified `most`, external systems tied to ATM verdict labels, side-effect absorption framing, `agents have committed`, verbs that assert technical lineage between contemporaneous related-work systems, validators/CAS as verdict producers, `ATM specializes` an adjacent design space, or noun-stacked institutional translation-ese — apply the calibrated phrasing in this section rather than the literal translation. If a future paragraph needs the unsafe phrasing for a precise reason, document that exception in `PAPER-EN-CLAIM-RISK-SCAN.md` before submitting.

## 5. Topic-Sentence Discipline

- Every paragraph opens with a sentence that names the paragraph's job — the gap, the mechanism, the boundary, the result. The reviewer should be able to read only paragraph openers and recover the argument outline.
- Topic sentences are **plain declarative sentences**. They are not bolded. They are not labeled. They are not phrased as questions.
- If a topic sentence sounds promotional ("ATM achieves …"), rewrite it downward into a calibrated form ("ATM is positioned as …", "Inside a single governed domain, ATM …").

## 6. Connectives Whitelist (Use These)

Preferred connective vocabulary for transitions inside and between sentences:

```
because, since, while, where, which, whereas,
rather than, instead, in turn, so that, such that,
together, in parallel, similarly, by contrast,
however, nevertheless, in this paper, in this work,
within the stated boundary, under the reported configuration
```

These are the dials that make the prose feel like D, not C and not E.

## 7. Forbidden Stylistic Moves

The following are not allowed in the paper body:

- **Bold mini-labels in Abstract or Introduction.** No `**Problem.**`, `**Position.**`, `**Evidence.**`, `**Boundary.**`, `**Motivation.**`, `**Contribution.**` etc. as paragraph openers.
- **Bold lead-in topic sentences.** Topic sentences remain unbolded prose.
- **Bullet-only paragraphs in body prose.** Contributions list and explicit enumerations are fine; converting a normal argument paragraph into bullets is not.
- **Headline-style fragments.** No `Pre-write admission, not post-hoc merge.` as a standalone "sentence."
- **Marketing verbs.** `prove`, `guarantee`, `solve`, `outperform`, `state-of-the-art`, `dominates`, `crushes`, `superior` — none of these appear unless the Chinese source already makes the exact same claim and the evidence section supports it (see `PAPER-EN-CLAIM-RISK-SCAN.md`).
- **Decorative emoji or icons.** Never.
- **Rhetorical questions in body prose.** The Introduction's single research question is allowed; additional rhetorical questions are not.
- **Defensive contribution enumeration in Acknowledgements.** Acknowledgements and transparency bridges use Flow, not Snap: disclose LLM assistance, human decision authority, author responsibility, and the Appendix B pointer without re-listing ATM's architecture or contributions.

## 8. Variant Routing

Different downstream surfaces get different variants. The paper itself only uses D-dominant; the others exist for re-use of the same content elsewhere:

| Surface | Variant | Use |
|---|---|---|
| `paper.v3.1.en.md` (arXiv body) | **D + 20% C** | authoritative paper voice |
| Internal `paper.v3.1.md` cross-check | A-style faithful | sentence-for-sentence diff against Chinese |
| Project landing page / README | E-style bold labels | scan-first reader |
| Demo deck / talk script | E-style + further compression | spoken delivery |

Translators must not silently promote a non-paper variant into `paper.v3.1.en.md`.

## 9. Translation Workflow Hook

Per section, in order:

1. Read the matching Chinese paragraph in `paper.v3.1.md`.
2. Draft the English paragraph in **D voice** by default.
3. Check sentence-length distribution; split into C-style short sentences only where a single sentence would exceed about 40 words or stack more than three clauses.
4. Verify no Section 7 forbidden move was introduced.
5. Verify glossary terms (`PAPER-EN-GLOSSARY.md`), claim calibration (`PAPER-EN-CLAIM-RISK-SCAN.md`), and citation numbering (`PAPER-EN-CITATION-MAP.md`).
6. Stop at the section boundary the human reviewer asked for. Do not silently roll into the next section.

## 10. Self-Check Before Submitting a Section

Before handing a translated section back to the human reviewer, the translator confirms each of the following:

- [ ] Paragraphs open with plain declarative topic sentences, not bold labels.
- [ ] At least one connective from Section 6 appears in each paragraph of more than three sentences.
- [ ] No paragraph in the Abstract or Introduction has a `**Bold.**` mini-label.
- [ ] No marketing verb from Section 7 appears.
- [ ] Each empirical claim is paired with its row universe or stated boundary in prose, not only in a table.
- [ ] Bridge sections between evidence and results explicitly state whether they are an alignment view or a benchmark, so the reader does not over-read a coverage map as a new experiment.
- [ ] Validity paragraphs use the same support-boundary rhythm: what the evidence supports, what it does not support, and why the boundary remains in place.
- [ ] Benchmark paragraphs explicitly name their denominator and row universe, and do not slide between scenarios, mode comparisons, policy rows, ablation rows, adversarial rows, or enforcement rows as if they were interchangeable sample counts.
- [ ] Blind-audit paragraphs explicitly state the anti-leakage rule and any visible audit boundary; use `label-retained blind audit` when labels remain visible instead of overstating the procedure as strict double-blind.
- [ ] Acknowledgements and transparency bridges remain short, reflective, and responsibility-focused; detailed vendor channels, role separation, human decision points, audit boundaries, and non-claims belong in Appendix B.
- [ ] Terminology matches `PAPER-EN-GLOSSARY.md` exactly for load-bearing terms (`atom`, `atom map`, `virtual atom`, `CID`, `ConflictKey`, `CID broker`, `neutral steward`, `pre-write admission`, `governance substrate`, `bounded recoverability`, `row universe`, `paper profile`).
- [ ] Reference numbers match `PAPER-EN-CITATION-MAP.md`.
- [ ] Cadence: no three consecutive short sentences, no monster sentence above 40 words.

If any item fails, the translator revises the draft before returning it.

## 11. One-Sentence Summary

The English ATM paper sounds like a careful, connected, calibrated CS / SE paper — a Version D draft, snapped shorter only when a sentence would otherwise sprawl, and never dressed up with bold mini-labels.
