# Commit and Artifact Map (2026-06-28)

This note is a reviewer-safe cross-check table for the English ATM paper draft. It separates:

- current framework `main` head
- canonical evidence landing commits
- host-side artifact paths
- conservative claim boundaries

## Current framework main head

- Current `AI-Atomic-Framework` `main` HEAD: `7a88af7d3db0be6d7e1b4c59f46706eabc5808a2`
- Commit subject: `artifacts: add fast-path verification and containment evidence`

## Important anchor rule

- Do **not** rewrite every paper SHA to the newest `main` HEAD.
- For benchmark or prototype evidence, keep the **landing commit that first anchors the cited artifact bundle on `main`**.
- Use the newest `main` HEAD only when the text is explicitly about the current umbrella branch state or about evidence that first landed at that head.

## Verified mainline ancestry

All of the following commits are merged into current `main@7a88af7d3db0be6d7e1b4c59f46706eabc5808a2`:

| Evidence line | Canonical commit | Status |
| --- | --- | --- |
| Paper-evidence fast-path bundle | `191fd310166054d3fa526b6961351716bb2d489e` | merged into current `main` |
| Git-head backfill for framework repair evidence freeze | `f57dbfe0bdfdf9f939e35400ec346501f4ccb2f3` | merged into current `main` |
| AdmissionBench evidence landing | `ab8753b7daf0a3c4cd8b4483fe24d519ff2590bd` | merged into current `main` |
| OperationalBench git-head evidence landing | `c0250009a53b28e887344e71ea675637c97290b0` | merged into current `main` |
| Cross-agent review signature prototype landing | `c589f125049ad81adc146f1b78e6a5ee36b8f607` | merged into current `main` |
| Last-verified + adversarial containment landing | `7a88af7d3db0be6d7e1b4c59f46706eabc5808a2` | current `main` HEAD |

## Direct paste table for main text / appendix

| Evidence line | Commit SHA to cite | Artifact path(s) to cite | Local verification status | Boundary note |
| --- | --- | --- | --- | --- |
| Framework mainline broker-evidence support | `191fd310166054d3fa526b6961351716bb2d489e` and `f57dbfe0bdfdf9f939e35400ec346501f4ccb2f3` | framework capability line; no single artifact bundle required in paper body | verified commit ancestry on `AI-Atomic-Framework/main` | Supports repo-local broker evidence-path governance only |
| ATM-AdmissionBench v0.2 paper-facing anchor | `ab8753b7daf0a3c4cd8b4483fe24d519ff2590bd` | `artifacts/generated/atm-admission-bench/20260625-paper/`; secondary: `artifacts/generated/atm-admission-bench/20260625/`, `artifacts/blind-bench/20260625/`, `docs/reviews/ATM-AdmissionBench-audit.md` | verified in framework repo | Do not collapse baseline generator commit and public landing commit |
| ATM-OperationalBench official + supplementary anchor | `c0250009a53b28e887344e71ea675637c97290b0` | `artifacts/generated/atm-operational-bench/20260627/`, `artifacts/generated/atm-operational-bench/20260627-extended/`, `artifacts/generated/atm-operational-bench/multi-seed-stability-20260627-20260629.md`, `artifacts/generated/atm-operational-bench/multi-seed-stability-20260627-20260629.json` | verified in framework repo | Operational transparency and recovery-routing evidence only |
| Phase A FastAPI public-source snapshot governance | no framework main commit required in paper; cite snapshot and host heads instead | host-side: `artifacts/external-public-repo/fastapi/2026-06-27/summary.json`, `paper-safe-summary.md`, `commands.log` | verified in `C:/Users/User/3klife-npc-brain-phase-a/` | Conservative claim only; not upstream FastAPI workflow governance |
| Phase B Structured Artifact Admission Track | `70993ceaa00bf77dea1ab7fb168451b70228248a` may be named in captain handoff, but paper can safely cite artifact paths without foregrounding SHA | `artifacts/generated/structured-artifact-admission/20260627-phase-b/summary.json`, `paper-safe-summary.md`, `results.jsonl`, `docs/reports/structured-artifact-admission-track-2026-06-27.md` | verified in framework repo | Cross-format structured artifact routing only |
| Phase C dual-live FastAPI conflict | use run id rather than framework commit | host-side broker-run envelope: `.atm/history/evidence/broker-runs/6ea4e411-fa2b-426b-9c71-55bbdbeaa888.json` | **re-verified from the original host branch artifact in this workspace** | Keep as host-evidence line and avoid overclaim |
| Cross-agent review signature prototype | `c589f125049ad81adc146f1b78e6a5ee36b8f607` | `artifacts/generated/cross-agent-review-signature/20260628/` | verified in framework repo | Prototype evidence-closure extension only |
| Reviewer-facing last-verified manifest | `7a88af7d3db0be6d7e1b4c59f46706eabc5808a2` | `artifacts/verification/last-verified.json` | verified in framework repo | Reproducibility support only |
| Adversarial adapter containment package | `7a88af7d3db0be6d7e1b4c59f46706eabc5808a2` | `artifacts/adversarial-adapter-containment/20260628/summary.json`, `results.jsonl`, `paper-safe-summary.md`, `artifact-hash-manifest.sha256` | verified in framework repo | Containment evidence only; not adapter soundness/completeness |

## Exact heads and IDs already aligned in the paper

These values match the locally inspected artifacts or framework history and are safe to keep:

| Item | Value | Source |
| --- | --- | --- |
| Framework current `main` head | `7a88af7d3db0be6d7e1b4c59f46706eabc5808a2` | `AI-Atomic-Framework` local git |
| Fast-path bundle landing commit | `191fd310166054d3fa526b6961351716bb2d489e` | `git log` |
| Git-head backfill commit | `f57dbfe0bdfdf9f939e35400ec346501f4ccb2f3` | `git log` |
| AdmissionBench landing commit | `ab8753b7daf0a3c4cd8b4483fe24d519ff2590bd` | `git log` |
| OperationalBench landing commit | `c0250009a53b28e887344e71ea675637c97290b0` | `git log` |
| Cross-agent review signature landing commit | `c589f125049ad81adc146f1b78e6a5ee36b8f607` | `git log` |
| Adversarial containment + last-verified landing commit | `7a88af7d3db0be6d7e1b4c59f46706eabc5808a2` | `git log` |
| FastAPI upstream snapshot head | `82064857539e6286522c347b4b11331b48dd2378` | Phase A `summary.json` |
| FastAPI host repo head | `738b9883880742cd36b64f1f81ce6a638f073135` | Phase A `summary.json` |
| Phase C run id | `6ea4e411-fa2b-426b-9c71-55bbdbeaa888` | re-verified from `codex/fastapi-public-source-cid-evidence` broker-run envelope |
| Phase C plan id | `batch-5c1fd53c988116ce` | current paper text |

## Consistency notes worth keeping

- Phase A should continue to state the caveat that `postChangeFastapiModulePath` resolves to the host virtual environment and that `postChangeHelper = null` and `postChangeSnapshotHead = null`.
- Because of that caveat, Phase A should remain framed as provenance-pinned baseline capture, host-visible replay, and governance-boundary framing, not clean snapshot-helper-isolated post-change execution.
- Phase C has now been re-verified against the host-side broker-run envelope at `.atm/history/evidence/broker-runs/6ea4e411-fa2b-426b-9c71-55bbdbeaa888.json`.
- The re-verified envelope contains two records under the same `runId` / `planId`: Actor A `cursor-composer-2.5` reached `applied / mergeable`, while Actor B `antigravity-gemini-3.5-flash` was routed to `queued / conflict`, both on `local/public-source-snapshots/fastapi-0.136.3/fastapi/__init__.py`.
- The current paper already uses the right pattern for benchmark anchors: generator commit for provenance, later public `main` commit for artifact landing.

## Suggested shortest paste block for the paper captain

Use landing commits, not just latest `main` HEAD. Keep:

- AdmissionBench anchor: `main@ab8753b7daf0a3c4cd8b4483fe24d519ff2590bd` -> `artifacts/generated/atm-admission-bench/20260625-paper/`
- OperationalBench anchor: `main@c0250009a53b28e887344e71ea675637c97290b0` -> `artifacts/generated/atm-operational-bench/20260627/`, `20260627-extended/`, and `multi-seed-stability-20260627-20260629.{md,json}`
- Framework fast-path support line: `191fd310166054d3fa526b6961351716bb2d489e` plus git-head backfill `f57dbfe0bdfdf9f939e35400ec346501f4ccb2f3`
- Cross-agent review signature prototype: `main@c589f125049ad81adc146f1b78e6a5ee36b8f607` -> `artifacts/generated/cross-agent-review-signature/20260628/`
- Last-verified and adversarial containment: `main@7a88af7d3db0be6d7e1b4c59f46706eabc5808a2` -> `artifacts/verification/last-verified.json` and `artifacts/adversarial-adapter-containment/20260628/`
