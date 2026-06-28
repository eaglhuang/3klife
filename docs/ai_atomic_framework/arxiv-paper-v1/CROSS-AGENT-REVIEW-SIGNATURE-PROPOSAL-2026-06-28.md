# Cross-Agent Review Signature Proposal

## Purpose

This proposal defines a low-risk evidence-closure extension for the ATM paper: a **cross-agent review signature**. The mechanism records a read-only review by an independent AI reviewer before a task or evidence package is treated as closure-ready.

The proposal is intentionally scoped as a future/prototype extension. It is not a new core contribution, not a replacement for deterministic validators, and not evidence that two AI systems agreeing establishes semantic correctness.

## Motivation

ATM already separates the Task-contract plane, Mutation-admission plane, and Evidence-closure plane. The current paper has strong mutation-admission evidence and descriptive evidence for closure recovery, but reviewer-facing semantic and procedural concerns can still arise after validators pass:

- missing consumer-contract coverage
- hidden scope drift
- insufficient rollback or replay evidence
- mismatch between the stated task purpose and the actual diff
- claim-boundary drift in paper-facing evidence summaries

A cross-agent review signature turns this read-only review into a structured artifact. The reviewer inspects the atom or evidence package, the diff or artifact hash, validation output, scope boundary, and claim wording, then records advisory or policy-gated observations.

## Non-Claims

The proposal must not be described as proving semantic correctness.

Safe claims:

- Cross-agent review signatures provide advisory or policy-gated semantic oversight.
- They complement deterministic validators, tests, and human review.
- They record independent review evidence before closure.
- They extend the Evidence-closure plane, not the core admission algorithm.

Unsafe claims:

- Do not claim that cross-agent review establishes semantic correctness.
- Do not treat AI reviewer signatures as substitutes for tests.
- Do not infer correctness merely from two AI systems agreeing.
- Do not treat a reviewer signature as a substitute for human responsibility or final acceptance.

## Prototype Shape

The prototype uses a single independent reviewer signature. The reviewer is read-only and may inspect the atom specification, diff, validator output, closure packet, paper-safe summary, and artifact hash manifest. The reviewer must not modify the repository directly.

Minimal record fields:

```json
{
  "reviewId": "...",
  "taskId": "...",
  "atomId": "...",
  "authorAgent": "...",
  "reviewerAgent": "...",
  "reviewerModelSource": "...",
  "reviewedDiffHash": "...",
  "reviewedEvidenceRefs": [],
  "rubricVersion": "...",
  "verdict": "approve | advisory-warning | block | needs-human-review",
  "reasons": [],
  "missingTests": [],
  "scopeConcerns": [],
  "consumerContractConcerns": [],
  "signedAt": "..."
}
```

Prototype independence rule:

- If `authorAgent` and `reviewerAgent` come from different model sources or certification identities, the record may be treated as an independent signature.
- If they share the same model source or certification identity, the record is only an advisory note.
- In this paper pass, only `approve` and `advisory-warning` should be used to avoid implying that the prototype is already a formal policy gate.

## Prototype Artifacts

The prototype artifacts are placed in the framework evidence clone, not in the 3KLife paper repository:

```text
C:/Users/User/AI-Atomic-Framework-readme-quick-verify-clean/artifacts/generated/cross-agent-review-signature/20260628/
```

The directory contains:

- `review-signature.schema.json`
- `review-signature-001.json`
- `review-signature-002.json`
- `paper-safe-summary.md`
- `artifact-hash-manifest.sha256`

Artifact 001 reviews the Phase B Structured Artifact Admission Track for evidence completeness, scope boundary, missing-test observations, and consumer-contract concerns.

Artifact 002 reviews the Phase C FastAPI dual-live external public-source conflict artifact for claim boundary, artifact-path traceability, non-claim wording, and upstream-governance overclaim risk.

## Paper Wording

Recommended Future Work wording:

> Cross-agent review signatures could extend the Evidence-closure plane by recording read-only peer review from an independent reviewer agent before high-risk atoms or evidence packages are treated as closure-ready. Such signatures would contain reviewer identity, model-source metadata, reviewed diff or artifact hash, evidence references, rubric version, verdict, reasons, missing-test observations, scope concerns, and consumer-contract concerns. They would not replace deterministic validators, tests, or human review; instead, they would expose semantic and procedural risks that static admission and validator envelopes may not capture.

Recommended transparency wording:

> Prototype cross-agent review signatures, where present, are treated as advisory evidence-closure artifacts. They do not replace deterministic validators, human responsibility, or the archived benchmark evidence used for the paper's main claims.

## Future Extension

A later ATM release may add:

- `atm review --readonly` or `atm evidence review`
- closure packet references such as `reviewSignatureRefs`
- formal independence policy for reviewer identity
- dual-signature or `2-of-3` quorum policies for high-risk atoms
- disagreement routing to a Captain or human reviewer

Those extensions should remain outside the present paper's main result unless implemented, validated, and landed with public evidence.
