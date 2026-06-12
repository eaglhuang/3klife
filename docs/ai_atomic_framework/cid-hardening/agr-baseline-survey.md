# AGR Baseline Survey and CID/Broker Gap Map

**Task:** `TASK-CID-0026`  
**Mode:** planning-only survey  
**Source of truth:** current CID hardening plan, verified facts, and live framework surfaces

## 1. Survey Summary

AGR is still a proposal-level design, but the broker/CID lane already has a meaningful runtime baseline:

- the brokered-write runtime exists and is already exercised by `TASK-CID-0015` through `TASK-CID-0023`;
- the Team/Next integration path and neutral steward apply flow are already present;
- the validator harness already proves same-file CID-disjoint acceptance and blocked CID conflict behavior;
- what is still missing is the AGR-specific refinement path: syntactic enclosure, decomposition trigger, read-set-aware admission, mid-execution registration, and a dedicated catch-rate benchmark.

This survey maps each AGR claim to the closest current surface, then records the missing contract and the most appropriate execution card.

## 2. Gap Map

| AGR claim | Current surface | Missing contract | Suggested execution card |
|---|---|---|---|
| **Layer 1: syntactic enclosure atomization** | Current framework only has language adapter discovery/registry behavior. `packages/core/src/guidance/language-adapter-registry.ts` can register and select adapters, but there is no `enclose()` capability, no `VirtualAtom` model, and no broker-side virtual atom CID derivation. | Formal `EnclosingUnit` / `VirtualAtom` SDK contract, plus broker-side refinement from hunk/region to virtual atom CID. | `TASK-CID-0028` first, then `TASK-CID-0029` |
| **Layer 2: signature-preserving decomposition with threshold policy** | The current guidance and broker surfaces do not expose a decomposition trigger policy or a `conflict density` threshold. There is also no broker request object for controlled decomposition. | A bounded `shouldTriggerLayer2(...)` rule and a decomposition request contract that can be handed to an agent without silently changing scope. | `TASK-CID-0031` |
| **Augmented Decision Rule** | The current runtime already has broker decision plumbing and compose verdicts, but it is still write-set centered. Verified facts explicitly call out `readAtoms` / read-set awareness as missing. | Optional `readAtoms` on write intent and a broker decision rule that blocks parallel admission when a concurrent write touches declared read dependencies. | `TASK-CID-0032` |
| **Mid-execution registration** | `packages/core/src/guidance/language-adapter-registry.ts` and `packages/core/src/police/guidance-police-integration.ts` show registry and evidence plumbing, but there is no live “in-use” virtual-atom registry, no lease epoch, and no mid-flight collision check for a newly registered intent. | A runtime registry that can detect a virtual atom already in use, route the claim through steward/composer, and fail closed when ownership cannot be serialized safely. | `TASK-CID-0034` and `TASK-CID-0035` |
| **Validator benchmark** | `TASK-CID-0023` already proves the end-to-end brokered-write acceptance harness exists, and the current CI/validator commands can confirm pass/fail. What is missing is a formal catch-rate benchmark that compares AGR-off, Layer 1, and Layer 2+ADR behavior over representative scenarios. | A benchmark harness with scenario packs, catch-rate accounting, and a clear report shape that can become an evidence gate. | `TASK-CID-0037` |

## 3. What Is Already Partially Covered

The following earlier cards already provide partial coverage and should be treated as reused baseline rather than reimplementation targets:

- `TASK-CID-0015` through `TASK-CID-0018` establish the broker contracts, local registry, proposal runtime, and closeout control plane.
- `TASK-CID-0019` and `TASK-CID-0020` establish deterministic composition and neutral steward apply flow.
- `TASK-CID-0021` and `TASK-CID-0022` integrate broker registration into Team and next/closeout lifecycle surfaces.
- `TASK-CID-0023` gives the current acceptance harness and the final same-file CID-disjoint proof gate.
- `packages/core/src/guidance/language-adapter-registry.ts` provides adapter discovery/selection plumbing that AGR can build on, but it is not yet AGR Layer 1.
- `packages/core/src/police/guidance-police-integration.ts` proves evidence/report routing exists, but it is not yet a mid-execution registry or read-set-aware admission layer.

## 4. What Must Stay Deferred

These items should remain fail-closed or deferred until the relevant AGR cards land:

- do not treat language-adapter discovery as Layer 1 syntactic enclosure;
- do not treat deterministic compose verdicts as read-set-aware admission;
- do not treat the current steward apply flow as mid-execution registration;
- do not treat the current validator harness as a catch-rate benchmark;
- do not widen the 100% brokered-write completion pack to absorb AGR runtime work.

## 5. Suggested Execution Order

1. Lock the AGR contract surface in `TASK-CID-0027` so the implementation pack and acceptance matrix are explicit.
2. Build Layer 1 SDK and broker refinement in `TASK-CID-0028` and `TASK-CID-0029`.
3. Add the adapter fallback guard in `TASK-CID-0030`.
4. Add Layer 2 decomposition policy in `TASK-CID-0031`.
5. Add the read-set-aware decision rule in `TASK-CID-0032`.
6. Add symbol canonicalization in `TASK-CID-0033`.
7. Add mid-execution registration and steward orchestration in `TASK-CID-0034` and `TASK-CID-0035`.
8. Integrate AGR into task/next/closeout flows in `TASK-CID-0036`.
9. Finish with the validator benchmark in `TASK-CID-0037`, then do the ship review in `TASK-CID-0038`.

## 6. Suggested Closing Statement for the Next Card

> AGR is not yet an execution feature; it is a mapped follow-up pack. The brokered-write runtime already proves same-file CID-disjoint acceptance and blocked CID conflict behavior, but AGR still needs Layer 1 enclosure, Layer 2 decomposition, read-set admission, mid-execution registry, and a benchmark harness before it can be considered real runtime governance.

