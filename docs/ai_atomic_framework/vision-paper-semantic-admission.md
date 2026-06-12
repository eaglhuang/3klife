# Vision Paper: Atomization-First CID Broker
## Adapter-Guided Concurrency Control for Multi-Agent Code Synthesis

**Status:** Draft (現況校準版 — Atomization-First, not AST-Centric)
**Last Updated:** 2026-06-10
**Target Venue:** arXiv (vision paper, June) → ICSE / FSE / POPL (December)

---

## 1. Abstract

Multi-agent LLM systems achieve code generation through progressively smaller, governance-scoped code units—**atoms**. Yet existing coordination primitives operate at coarse granularities:

- **Character-level** (CodeCRDT): 100% physical convergence, but admits 5–10% semantic conflicts unresolved
- **File-level** (STORM): Write-time OCC rejects writes when any dependency file has changed, even when modifications are disjoint
- **Workflow-level** (Semantic Consensus): 100% completion at 27.9% precision, O(n²) complexity, unsuitable for code-level parallelism

We propose **Atomization-First CID Broker**, a coordination framework that delegates code-unit discovery to language adapters while maintaining deterministic, governance-bound concurrency control via atom IDs, atom CIDs, scope locks, and dry-run patch contracts.

**Core insight:** Rather than building a heavyweight universal AST analyzer, ATM leverages the fact that AI Agents already generate patches at function/module granularity. The broker's role is not to understand code syntax, but to:
1. Let each language adapter propose atomic code units (function, class, module, route—whatever fits the language)
2. Track atom-level metadata: `atomId`, `atomCid` (contract fingerprint), `allowedFiles`, `sourcePaths`
3. Admit or block concurrent writes based on scope intersection, not AST node overlap
4. Enforce dry-run, review, evidence, and rollback boundaries

**Key claim:** By raising the atomization granularity from file-level (STORM) to function/module-level (via adapter guidance), and grounding concurrency decisions in atom IDs rather than static analysis, we achieve:
1. **Language-agnostic coordination** (each adapter chooses its own granularity detection: regex, compiler API, AST, LSP)
2. **Deterministic admission decisions** (based on `allowedFiles` / `atomId` intersection, not LLM inference)
3. **Governance-bound risk** (dry-run → review → test evidence → apply → scope lock)
4. **Sub-quadratic cost** (O(n log n) fingerprint intersection vs O(n²) intent graphs)

**Key results (target):** [TODO: evaluation numbers after benchmark construction]
- X% reduction of write-rejection rate vs STORM by enabling same-file function-level parallelism
- Y% reduction of semantic conflicts vs CodeCRDT by pre-admitting only sufficiently decoupled atoms
- Z% reduction of AI Agent LLM calls (from 5-15 per atomization to 1-2) by pre-computing adapter-guided candidates

---

## 2. Problem Statement

### 2.1 The Granularity Hierarchy of Concurrency Control

Existing coordination mechanisms occupy distinct granularity tiers:

| Tier | Granularity | Representative | Detection Method | Throughput Cost | Governance |
|---|---|---|---|---|---|
| 1 | Character | CodeCRDT | CRDT math (no language awareness) | None (lock-free) | None |
| 2 | **Function/Module** | **CID (this work)** ⭐ | Adapter-guided discovery | O(n log n) check | Dry-run, review, evidence, rollback |
| 3 | File | STORM | File version mtime | High (stale-file rejection) | Implicit |
| 4 | Workflow | SCF | Intent graph + LLM | O(n²) | LLM-mediated |

**Problem:** Current systems force a false choice:
- File-level (STORM) rejects safe parallel writes within same file
- Workflow-level (SCF) requires O(n²) inference and 72% false positives
- Character-level (CodeCRDT) permits semantic breakage

**Root cause:** Granularity selection is treated as a static choice. In reality, the right granularity depends on:
- What the language adapter can efficiently discover (regex for Python imports, compiler API for TS, LSP for Go)
- What the AI Agent naturally produces (patches at function/module boundary)
- What the governance layer needs to track (atom scope, allowed files, evidence, rollback)

### 2.2 Two Concrete Failure Modes

**Failure mode A: STORM rejects safe same-file parallelism**

```
File: utils.ts (500 LOC)
├─ function calculate_score(data):    ← Agent A modifies
│   └─ depends on: scoreConfig, dataUtils
├─ function format_report(results):   ← Agent B modifies
│   └─ depends on: reportTemplate, formatUtils
```

STORM's write-time OCC requires: `for all f in observed_files: v_f^obs ≥ v_f^cur`

If Agent B has already written to `utils.ts`, **Agent A's write is rejected entirely**, even though the functions are disjoint and have no shared dependencies.

Cost: Write-rejection cascade, AI Agent must re-plan and re-generate, ~1 wasted LLM cycle per rejection.

**Failure mode B: CodeCRDT admits semantic breakage undetected**

```
Agent A writes: schema.ts: function getUserName(id: string) -> string
Agent B writes: api.ts:    const name = await getUserName(123)  // stale type!
```

CRDT merges both successfully (different files, character-level convergence 100%). Type error surfaces only in post-hoc TypeScript diagnostics, after LLM has wasted generation tokens.

### 2.3 Why Adapter-Guided Atomization Is the Answer

Rather than debating whether AST nodes or files are the "right" granularity, delegate to adapters:

**Each language adapter can provide:**
- Function-level candidates (regex / compiler API for TS, Python, Go)
- Module-level candidates (LSP import graph for any language)
- Route-level candidates (frameworks with explicit routing: Express, FastAPI)
- Schema-level candidates (for data-driven languages)

**ATM's broker then:**
1. Tracks atoms by `atomId`, `atomCid`, `allowedFiles`, `sourcePaths`
2. Admits writes based on scope intersection: `allowedFiles_A ∩ allowedFiles_B ≠ ∅` → potential conflict
3. Enforces dry-run, review, test evidence, before applying mutations
4. Maintains rollback path via `atomCid` + evidence chain

**Why this beats both STORM and SCF:**
- Finer than STORM's file-level (allows same-file function-level parallelism)
- Cheaper than SCF's workflow-level (no O(n²) intent graph, no LLM inference for admission decision)
- More robust than CodeCRDT (pre-filters out candidates with conflicting `sourcePaths` before generation)
- Language-agnostic (each adapter chooses discovery strategy)

---

## 3. Core Technical Approach: Atomization-First CID Broker

### 3.1 High-Level Architecture

```
Multi-Agent Orchestration (AutoGen / CrewAI / LangGraph / ATM)
         ↓
   AI Agent Plans Code Modification
         ↓
   ┌────────────────────────────────────────────────┐
   │   Language Adapter (Candidate Discovery)      │
   │  ───────────────────────────────────────────  │
   │  1. Scan source (regex / compiler / AST / LSP)│
   │  2. Return: AtomCandidate[] with symbol,      │
   │     filePath, lineStart, lineEnd, confidence  │
   └────────────────────────────────────────────────┘
         ↓
   ┌────────────────────────────────────────────────┐
   │   AI Agent Generates Atomization Patch        │
   │  ───────────────────────────────────────────  │
   │  1. Select candidate (e.g., "function foo")   │
   │  2. Generate dry-run patch:                   │
   │     - move function to new file               │
   │     - add exports / imports                    │
   │     - preserve shim in original                │
   └────────────────────────────────────────────────┘
         ↓
   ┌────────────────────────────────────────────────┐
   │   ATM CID Broker (Concurrency Filter)         │
   │  ───────────────────────────────────────────  │
   │  1. atomId = hash(candidate.symbol)           │
   │  2. atomCid = H(atom spec / contract)         │
   │  3. proposedAllowedFiles = {source, dest}     │
   │  4. Check: ∩ with active atoms' allowedFiles  │
   │  5. If conflict: block until dependent clears │
   │  6. If safe: dry-run → review → evidence      │
   └────────────────────────────────────────────────┘
         ↓ (Admitted atoms only)
   Substrate Layer (CRDT / Git / Filesystem)
         ↓
   Actual Code Mutation (apply + scope lock)
         ↓
   Post-hoc validation (test / typecheck / lint)
```

### 3.2 AI-Native Design (Key Differentiator)

**This framework augments AI Agent's native capabilities**, not replaces them:

| Step | AI Agent Does | ATM Does |
|---|---|---|
| Understand structure | Reads file, generates patch (native strength) | — |
| Find atom candidates | — | Adapter scans for function/module/route candidates |
| Assess atomization risk | Proposes dry-run patch (native strength) | Review + evidence gating |
| Detect parallelism safety | — | Check allowedFiles intersection |
| Enforce boundaries | — | Scope lock + rollback path |

**Cost reduction formula:**
```
Old: AI Agent does: discover candidates (LLM) → assess risk (LLM) → generate patch (LLM) → retry on conflicts (LLM) = 5-15 LLM calls
New: Adapter does: discover candidates (deterministic) → AI Agent does: generate patch (LLM) → ATM does: validate scope (deterministic) = 1-2 LLM calls
```

**Why this is lower cost than pure AST analysis:**
- AI Agents already generate patches; we're just adding a scope check
- No need to parse code into complete AST for every atomization candidate
- Adapter can use lightweight detection (regex, compiler API, LSP)
- Governance (review + test) substitutes for perfect static analysis

### 3.3 Core Components

#### 3.3.1 Language Adapter (Candidate Discovery)
- **Responsibility:** Identify atomic code units that can be extracted
- **Input:** Source files (any language)
- **Output:** `AtomCandidate[]` with:
  - `kind`: 'function' | 'class' | 'module' | 'route' | 'command' | ...
  - `symbol`: name of the unit
  - `filePath`: location
  - `lineStart`, `lineEnd`: bounds (optional if scanning only names)
  - `confidence`: 'high' | 'medium' | 'low'
  - `detectionMethod`: 'regex' | 'scanner' | 'compiler-api' | 'ast' | 'lsp'
- **Examples:**
  - Python: regex `^\s*def\s+(\w+)` for function candidates
  - TypeScript: compiler API's `forEachChild()` for function/class/export
  - Go: `go/parser` AST for func/type definitions
  - No requirement for perfect parsing; lightweight scanning is fine.

#### 3.3.2 AI Agent (Patch Generation)
- **Responsibility:** Generate atomization patch given a candidate
- **Input:** `AtomCandidate`, source files, project context
- **Output:** Dry-run patch contract with:
  - `patchFiles`: which files will be touched
  - `steps`: [extract unit, add exports, add shims, validate imports, ...]
  - `evidenceRequired`: [test, typecheck, lint, ...]
  - `rollbackNotes`: how to revert if needed
- **Cost:** 1 LLM call per atomization (native agent capability)

#### 3.3.3 ATM Broker (Scope & Admission)
- **Responsibility:** Decide if multiple agents can execute atomizations in parallel
- **Inputs:**
  - `atomId_A`, `atomId_B` (deterministic hashes from candidate)
  - `allowedFiles_A`, `allowedFiles_B` (files touched by each atomization)
  - `atomCid_A`, `atomCid_B` (contract fingerprints)
  - `activeLocks`: set of currently held scope locks
- **Logic:**
  ```
  if allowedFiles_A ∩ allowedFiles_B ≠ ∅:
    if both mutate same file:
      if static analysis (adapter) proves disjoint functions: ADMIT
      else: SERIALIZE (queue second agent)
    else: ADMIT (different files)
  else: ADMIT (no file overlap)
  ```
- **Decision:** ADMIT → proceeds to dry-run+review → APPLY+LOCK
             SERIALIZE → add to queue, wait for active atomId to unlock
             BLOCK → reject with conflict reason

#### 3.3.4 Dry-Run & Governance
- **Dry-run:** Apply patch to ephemeral copy, validate without mutations to host project
- **Review:** Human or automated gate (policy check, evidence gating)
- **Evidence:** Test suite, type checker, linter, import graph validation
- **Rollback path:** `atomCid` + evidence chain allows recreating pre-atom state

#### 3.3.5 Registry & Scope Lock
- **Registry:** Maintain mapping `atomId → atomCid → atomSpec` for all extracted atoms
- **Scope lock:** `LOCK(atomId, lockHolder)` while agent holds `allowedFiles` exclusive write
- **Unlock:** After mutation + evidence validation, release lock; queue next waiter

### 3.4 Design Rationale

**Why not enforce perfect static analysis?**
- AI Agents are already good at generating patches; ATM shouldn't require them to become static-analysis experts
- Adapters can start with regex/scanner; add AST/LSP later if ROI is clear
- Governance (review + test) is cheaper than perfect prediction

**Why adapter-guided (not universal AST)?**
- Each language has different "natural" atomization units (Python: top-level def, Go: exported func, Rust: pub fn, web frameworks: route)
- One size does not fit all; let adapters choose their granularity
- Regex works for 80% of cases; only high-risk changes need deeper analysis

**Why `allowedFiles` intersection (not semantic read/write sets)?**
- Simpler: just check file paths
- Works across languages without language-specific semantics
- If two atomizations touch same file → potential conflict → serialize
- False positives acceptable (forces serialization, not incorrectness)

**Why dry-run + review, not prevention?**
- ATM cannot know all language semantics (closures, side effects, frameworks)
- Dry-run catches real issues; review gates questionable ones
- Evidence (test + typecheck) proves correctness post-hoc
- More practical than perfect prediction

---

## 4. Related Work Positioning

### 4.1 Character-Level Convergence (Tier 1)
- **CodeCRDT (Pugachev 2025):** 100% character convergence, 0% merge failures; admits **5–10% semantic conflicts** (80% complex)
- **EvoGit, AgentGit:** Git-substrate variants with similar guarantees
- **Problem they solve:** Lock-free parallel generation with guaranteed character-level consistency
- **Problem they don't solve:** Semantic breakage undetected until post-hoc validation
- **How CID complements:** Pre-filters candidates by `allowedFiles` scope before they reach CRDT layer. CID sits *above* CRDT.

### 4.2 File-Level Write-Time Filtering (Tier 3)
- **STORM (Geng & Neubig 2026):** Write-time OCC rejecting writes when any observed file has been modified
- **Problem it solves:** Prevents agents from writing stale code
- **Problem it creates:** Rejects safe writes to disjoint functions within same file (false positives)
- **How CID improves:** Same-file function-level parallelism by checking `allowedFiles` at finer granularity. CID is Tier 2 (function/module) between STORM (Tier 3, file) and CodeCRDT (Tier 1, character).

### 4.3 Workflow-Level Intent Graphs (Tier 4)
- **Semantic Consensus Framework (Acharya 2026):** Intent graph + conflict detection, 100% completion at **27.9% precision** (O(n²), 72% false positives)
- **MPAC (Qian 2026):** Five-tier coordination semantics, 95% overhead reduction
- **Problem they solve:** Detect high-level business logic conflicts before execution
- **Problem they create:** O(n²) complexity, requires predefined intent models, workflow-scoped (not code-scoped)
- **How CID differs:** Code-granularity (function/module, not business workflow), language-agnostic adapters (not intent graphs), O(n log n) (not O(n²)), deterministic scope checks (not LLM-inferred intent)

### 4.4 Concurrency Control Primitives
- **AgentSpawn (Costa 2026):** Hierarchical agent spawning + memory slicing
- **ATCC (Zhou 2026):** RL-based dynamic opt/pess locking
- **OptiMA (2026):** 2PL transactional locking
- **Problem they solve:** Concurrent execution with conflict resolution
- **How CID complements:** CID is a pre-execution *filter* layer, not a conflict-resolution primitive. CID decides whether to emit a candidate for parallel generation; substrate layer (CRDT/lock) handles actual concurrency.

### 4.5 Workspace Protocols
- **AWCP (2026):** Standardized workspace delegation; does NOT handle semantic conflict
- **SEMAP (2026):** Behavioral contracts atop A2A
- **Problem they solve:** File synchronization, protocol standardization
- **Problem they don't solve:** Admitting which candidates can run concurrently
- **How CID complements:** AWCP/SEMAP are transport/protocol layers; CID is semantic admission layer on top.

### 4.6 Specification-First Approaches
- **The Specification Gap (Sartori 2026):** Richer specifications prevent coordination failure
- **How CID integrates:** Adapter-guided atomization *generates* atomic specs (dry-run contracts) rather than requiring humans to write them

### 4.7 Failure Taxonomy & Coordination Specification
- **MAST (2025):** Catalogs 18 failure modes across 3 categories (design, alignment, verification)
- **Coordination-Spec Study (2026):** Formalizes coordination layer as 7 architectural elements
- **Problem they solve:** Diagnostic understanding and formal specification
- **Problem they don't solve:** Concrete admission mechanisms
- **How CID positions:** Concrete instantiation of "admission control" within the coordination layer specification

### 4.8 Why CID Is Different (and why now)

CID is **not** another concurrency control algorithm. It's a governance layer that:
1. **Lowers the atomization barrier** by delegating discovery to adapters (no universal AST requirement)
2. **Makes admission deterministic** (based on file scopes, not LLM inference)
3. **Accepts imperfection** (dry-run + review + test evidence manage false positives)
4. **Operates between CodeCRDT and STORM** in the granularity hierarchy

The paper's novelty: demonstrating that governance and scope-based admission can solve the same coordination problems as heavyweight semantic analysis, at lower cost.

---

## 5. Evaluation Plan

### 5.1 Benchmark Construction
Three tiers to expose granularity advantages:

**Tier A — Adapter Candidate Discovery**
- **Samples:** 20 files from 3KLife, 20 files from various open-source projects (Python, TS, Go)
- **Goal:** Validate that language adapters can discover function/module candidates with >85% precision
- **Metric:** Candidate confidence scores, precision vs manual ground truth

**Tier B — Multi-Function-File Atomization** (CID's primary advantage over STORM)
- **Setup:** Create synthetic tasks where each file has 3–5 independent functions
- **Scenario:** Two agents propose atomizing disjoint functions in same file
- **Goal:** Demonstrate that CID admits same-file parallelism; STORM forces sequential
- **Metrics:**
  - CID write-rejection rate vs STORM (target: <5% vs >50%)
  - Wall-clock time CID vs STORM (target: 2–3x speedup on high-function-count files)
  - AI Agent LLM call count (target: fewer retries due to fewer rejections)

**Tier C — Semantic Conflict Rate** (CID pre-filtering vs CodeCRDT post-hoc)
- **Setup:** Extend CodeCRDT's 6 tasks; add 5–8 tasks with >70% inter-function coupling
- **Scenario:** Compare (a) CodeCRDT alone + post-hoc TypeScript validation vs (b) CID pre-filtering + CodeCRDT
- **Goal:** Show that pre-filtering reduces undetected semantic conflicts
- **Metrics:**
  - Semantic conflict rate CodeCRDT alone vs CID+CodeCRDT (target: reduce 5–10% → <2%)
  - Total LLM token cost per task (target: CID saves 20–30% by preventing doomed generations)
  - False-positive rate: CID-blocked writes that would have succeeded (target: <10%)

### 5.2 Key Metrics
1. **Candidate discovery precision:** % of reported candidates that are valid atoms
2. **Write-rejection rate:** Intended writes that get blocked (lower is better for same-file access)
3. **Semantic conflict rate:** Post-merge errors caught only in post-hoc validation
4. **LLM token efficiency:** Total tokens consumed per task (CID should reduce retry loops)
5. **Admission latency:** `allowedFiles` intersection + scope lock check time (target: <1ms)
6. **False-positive rate:** Blocked operations that would have been safe
7. **Wall-clock speedup:** Total time vs sequential baseline

### 5.3 Baselines
1. **Pure parallel (no coordination):** Lower bound of conflicts
2. **CodeCRDT alone:** Character-level convergence, semantic conflicts post-hoc
3. **STORM:** File-level OCC, rejects same-file writes
4. **Sequential (all serialized):** Upper bound of safety, lower bound of throughput
5. **CID + CodeCRDT (this work):** Tier 2 (function/module granularity)

### 5.4 Hypotheses
- **H1:** Adapters discover function/module candidates with ≥85% precision using lightweight detection
- **H2:** On Tier B, CID admits X% more same-file writes than STORM (achieving 2–3x speedup)
- **H3:** On Tier C, CID+CodeCRDT reduces semantic conflict rate from 5–10% to <2%
- **H4:** CID saves ≥20% LLM tokens by preventing doomed generation retries
- **H5:** Admission latency <1ms (practical for 100+ concurrent agents)
- **H6:** False-positive rate <10% (occasional over-conservative serialization is acceptable)

---

## 6. Implementation Status & Roadmap

### 6.1 Current Status (2026-06-10)
- [x] Problem framing + related work survey
- [x] Three-layer gap identification
- [x] Core CID mechanism sketched
- [ ] Contract extraction prototype (LSP-based)
- [ ] Fingerprint computation logic
- [ ] Interference matrix rules (code examples)
- [ ] Benchmark suite (extend CodeCRDT 6 tasks)
- [ ] Evaluation + results
- [ ] Full paper writing

### 6.2 Timeline (Estimate)
- **Phase 1 (2–3 weeks):** Vision paper → arXiv (this document → camera-ready)
- **Phase 2 (4–6 weeks):** Prototype CID + benchmark construction
- **Phase 3 (6–8 weeks):** Full evaluation + comparative results
- **Phase 4 (2–3 weeks):** Full paper writing + submission prep

### 6.3 Fallback Strategies
- **If evaluation results weak:** Pivot to "design notes" paper (weaker claims, position only)
- **If benchmark too expensive:** Use CodeCRDT 6 tasks only + qualitative analysis
- **If fingerprints insufficient:** Integrate light symbolic execution for finer precision

---

## 7. Key Assumptions & Risks

### 7.1 Assumptions
1. **Static analysis sufficient:** Contract extraction via LSP/AST parsing is robust enough
2. **Fingerprints stable:** Code structure doesn't drift mid-execution (true for LLM generation in practice)
3. **Interference rules generalizable:** Code-level conflicts map cleanly to R/W/type constraints

### 7.2 Risks
- **Risk 1:** Fingerprints too coarse → false negatives (missed conflicts)
  - *Mitigation:* Symbolic execution fallback, incremental refinement
- **Risk 2:** Admission logic too complex → maintenance burden
  - *Mitigation:* Keep rules minimal, data-driven learning of conflict patterns
- **Risk 3:** Benchmark results show marginal gains
  - *Mitigation:* Frame as "design exploration" + "systems integration" contribution

---

## 8. Positioning & Messaging

### 8.1 For arXiv Vision Paper (June 2026)
- **Core angle:** "Atomization-first governance layer: delegating code-unit discovery to language adapters, unifying concurrency control via deterministic scope-based admission"
- **Tone:** Exploratory, practical; position between STORM (file-level), CodeCRDT (character-level), and SCF (workflow-level)
- **Length:** 4–6 pages (vision/position format)
- **Title options (current preference):**
  1. **"Atomization-First CID Broker: Adapter-Guided Concurrency Control for Multi-Agent Code Synthesis"**
  2. "Function-Level Atomization as Coordination Control in Multi-Agent Code Generation"
  3. "Governance-Based Admission Control for Parallel LLM-Driven Code Atomization"

### 8.2 Key Claims (What to Emphasize)
- **Not:** "We built an AST slicing engine" (wrong narrative)
- **Instead:** "We show that scope-based governance (not semantic analysis) can coordinate multi-agent atomization at sub-file granularity"
- **Avoid:** "CID is a semantic conflict detector" (that's CodeCRDT's job post-hoc)
- **Instead:** "CID is an admission filter: atomizations with non-overlapping scopes can proceed in parallel safely"

### 8.3 What NOT to Claim (Honest Framing)
- ❌ "ATM includes a universal AST parser" — adapters choose their detection strategy
- ❌ "CID fingerprints derive from static analysis" — they derive from atomization contracts
- ❌ "CID prevents all semantic conflicts" — it prevents conflicts caused by scope overlap; post-hoc validation catches language-specific issues
- ✅ "CID enables function-level parallelism within files" — true, and matches the granularity AI Agents naturally work at
- ✅ "Adapter-guided atomization lowers the barrier vs. requiring universal code understanding" — true

### 8.4 For Follow-Up Full Paper (December 2026, ICSE/FSE)
- If evaluation strong: "Atomization-First CID: Evaluation of Scope-Based Admission Control on X Real-World Multi-Agent Tasks"
- Bundle with open-source release of AtomizationPlanningAdapter SDK (`packages/plugin-sdk`) and JS/Python adapter implementations

### 8.5 Priority Window Strategy
- **June 2026:** arXiv 4-page vision paper → lock priority before STORM authors think of same-file parallelism
- **September 2026:** Full draft with Tier A/B/C evaluation results + adapter implementations
- **December 2026:** ICSE/FSE submission
- **Critical insight:** We're not racing on static analysis (CRDT/AST authors already own that). We're pioneering on governance + atomization (that's our unique angle).

---

## 9. Key Decision Points

### Q1: Should we try to replicate Semantic Consensus on code?
**Status:** TBD after evaluation planning  
**Impact:** Would strengthen related work comparison; high effort

### Q2: Is O(n log n) complexity sufficient?
**Status:** TBD after prototype  
**Impact:** If not, may need approximation algorithms

### Q3: How aggressive should false-positive tolerance be?
**Status:** TBD after benchmark design  
**Impact:** Precision-recall tradeoff (27.9% ← SCF / >80% ← target)

---

## 10. Open Questions for User

1. **Code domain specificity:** Should CID be language-agnostic (Python/Go/TS) or TS-focused initially?
2. **Integration with CodeCRDT:** Does CID sit *above* CodeCRDT in the stack, or replace its conflict detection?
3. **Evaluation scope:** Include human review of conflicts, or LLM-only scoring like CodeCRDT?
4. **Publication timing:** arXiv first (stakes low) or wait until evaluation complete (stronger paper)?

---

## Appendix A: Example Contract Fingerprints

### Example 1: Simple Variable Write
```typescript
// Agent A: ui/Button.tsx
export const Button = (props: ButtonProps) => {
  const [color, setColor] = useState("blue");  // ← Write
  return <div style={{ backgroundColor: color }} />;
};

// Contract: 
RdSet: {ButtonProps}
WrSet: {Button.color, useState}
TypeConstraints: {Button: React.FC, color: string}
Digest: H("ButtonProps||Button.color,useState||Button:React.FC,color:string")
```

### Example 2: Conflicting Writes
```typescript
// Agent A writes Dashboard.tsx:title
// Agent B writes Dashboard.tsx:title
// Interference: Write-Write conflict → Block
```

### Example 3: Order-Safe Reads
```typescript
// Agent A: reads layout.width (doesn't modify)
// Agent B: modifies layout.width
// Interference: Read-Write, but if layout.width type preserved → Admit
```

---

## Appendix B: Interference Rule Pseudocode

```python
def can_run_parallel(digest_a, digest_b):
    """Returns (admitted: bool, reason: str)"""
    
    # Extract from digests
    rd_a, wr_a = contracts[digest_a]
    rd_b, wr_b = contracts[digest_b]
    
    # Write-Write conflict
    if wr_a ∩ wr_b:
        return False, "Write-Write conflict"
    
    # Write-Read conflict (order matters)
    if (wr_a ∩ rd_b) and not order_invariant(a, b):
        return False, "Causal Write-Read dependency"
    
    # Type constraint violation
    if not types_compatible(digest_a, digest_b):
        return False, "Type constraint mismatch"
    
    # Otherwise safe
    return True, "Admitted (no conflict detected)"
```

---

## Appendix C: Prior Art Landscape Figure

```
Layer          Solution              Metric         Trade-off
─────────────────────────────────────────────────────────────
Physical       CodeCRDT (CRDT)       100% merge     5-10% semantic
               Convergence           ✓ No failures  conflicts remain
               
Semantic       SCF Intent Graph      100% complete  27.9% precision
Detection      (workflow)            ✓ Safe blocks  O(n²), workflow-only
               
Semantic       CID Fingerprint       >80% precision Sub-quadratic
Admission      (code-aware)          (target)       Fine-grained
               
               [ATM 13-mechanism     System         Multi-layer
               integration]          integration    governance
```

---

**Document History:**
- 2026-06-10: Initial draft (vision scope, evaluation planning)
- [TBD: Prototype feedback]
- [TBD: Benchmark results]
- [TBD: Camera-ready for arXiv]
