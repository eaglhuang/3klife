<!-- doc_id: doc_team_cross_vendor_markdown_handoff -->
# Cross-Vendor Team Markdown Handoff Plan

## Purpose

This plan defines a governed cross-vendor Team Agent handoff ledger for an
ATM-enabled target repository. It does not store target runtime history in the
ATM framework repository or in this planning repository. 3KLife owns the
planning cards; AI-Atomic-Framework owns the implementation and generated
target-repository runtime/history artifacts.

## Authority and Storage

JSON is the single authority for handoff content, permissions, scope, hashes,
state, and evidence. Markdown is a deterministic human-readable projection;
it is never an authority for claim, close, permission, task state, or provider
prompt injection.

During a Team run, the target repository writes:

```text
.atm/runtime/handoff/<task-id>/<team-run-id>/
  manifest.json
  index.md
  <sequence>-<role>-<provider>.json
```

Every successful transition has an `atm.teamRoleHandoffArtifact.v1` JSON
envelope that references an `atm.teamProviderRunArtifact.v1` rather than
copying full provider output. The envelope records the task/run ids, sequence,
source and target roles/providers, lease epoch, source reference/hash,
redaction metadata, `previousHandoffSha256`, `humanSummary`, and `routeNote`.

The manifest forms a hash chain and records the final root hash and
`runOutcome`. The Markdown index is not part of the hash chain because it is
fully reproducible from the JSON chain.

## Narrative Markdown Projection

Only ATM materializes or re-renders `index.md`; agents never write Markdown or
handoff JSON directly. The projection may contain only schema-whitelisted
fields: identity metadata, canonical decision vocabulary, validator verdicts,
artifact references/hashes, `humanSummary`, and `routeNote`.

`humanSummary` is deterministically extracted from an already-redacted provider
preview, using the first complete sentence capped at 64 tokens. `routeNote` is
derived from lifecycle/rework state. No additional model call, full response,
chain-of-thought, secret, or unredacted payload is allowed.

```md
## Transition 3: implementer -> reviewer

- Who: implementer (anthropic:model) -> reviewer (openai:model)
- Time: 2026-07-11T14:22:08Z | decisionClass: auto-execution
- Summary: "Implemented the governed handoff validation."
- Artifact: atm.teamProviderRunArtifact -> 0003-implementer.json (sha256:...)
```

Frontmatter contains `task_id`, `team_run_id`, `manifest_ref`,
`manifest_sha256`, `created_at`, `updated_at`, and transition count. Narrative
body ordering is stable and contains no render-time timestamp.

## Boundaries and Recovery

- Soft budget: 48 transitions or 384 KiB; Patrol reports a warning.
- Hard budget: 64 transitions or 512 KiB; the Team run becomes
  `human-signoff-required` and Captain chooses a split or a no-further-handoff
  continuation.
- Only the Coordinator/system lane may materialize handoffs. It uses an atomic
  sequence increment and lease-epoch fencing to reject stale writers.
- Context consumption is Coordinator-mediated. It validates task/run/scope,
  manifest/hash chain, and a final secret scan before emitting a role-specific
  JSON context envelope. The envelope allows at most four artifacts, 256 tokens
  each, and 1,024 tokens in total.
- Continuation reads require the same task, a terminal prior run, explicit
  Coordinator selection, and a `handoff.continuation-consumed` event.
- Missing artifacts, hash/chain/sequence/frontmatter failures, or secret scan
  failures use canonical `handoff-integrity-blocked` with `decisionClass` set
  to `blocked`.

## Archive and Close

Successful task close promotes the run from `.atm/runtime/handoff/**` into the
target repository `.atm/history/handoff/<task-id>/<team-run-id>/` as part of the
same closure bundle as the task ledger, evidence, and closure packet.

Abandoned runs, terminal provider failures, and close failures use an
archive-only governed lane. It creates a task-attached archive commit through a
temporary index without marking the task done. If archive fails, runtime data
remains in place and the lane returns a fail-closed recovery command.

Bundle resolution must recognize handoff history as a same-task generated
artifact. Runtime handoff files must not be treated as Git residue or committed
independently.

## Delivery Sequence

1. `TASK-TEAM-0072`: schema, runtime materialization, deterministic renderer,
   hash chain, retention, and terminal archive promotion.
2. `TASK-TEAM-0073`: hard gates, Coordinator-mediated context, continuation,
   token telemetry, secret defense, and canonical vocabulary.
3. `TASK-TEAM-0074`: contract/docs/patrol integration, deterministic tests,
   three-vendor dogfood, and aborted-run archive evidence.

## Follow-up: Hard-Gate Parity And Integrity Regression

`TASK-TEAM-0075` closes the implementation gaps found during the post-close
audit of 0072-0074. It is a required completion slice, not optional polish:

1. `handoff.read` and `handoff.materialize` must be real entries in the Team
   permission catalog and be enforced by `ATM_TEAM_PERMISSION_HARD_GATE`, task
   scope, run identity, and a coordinator-owned lease. An actor string alone
   must never grant materialization authority.
2. Continuation read must be Coordinator-mediated and limited to the same task,
   a specified terminal prior run, verified manifest/hash chain, secret scan,
   and an observability event. Cross-task, non-terminal, and direct-provider
   reads must fail closed.
3. The validator suite must add `team-handoff-integrity` and cover missing
   artifact, hash mismatch, chain/sequence gap, frontmatter drift, cross-run
   rejection, and unauthorised read/materialize attempts.
4. At the soft threshold, Patrol must report a retention warning. At the hard
   threshold, materialization must emit a governed
   `human-signoff-required` escalation rather than only throw an error.
5. The card closes `ATM-BUG-2026-07-11-111` with the resulting evidence and
   performs an L5 three-vendor dogfood run that proves hard-gate denial before
   the authorised coordinator path succeeds.

The required validator cases are `team-handoff-materialize`,
`team-handoff-integrity`, `team-handoff-context-budget`,
`team-handoff-aborted-promotion`, and `team-handoff-narrative-whitelist`.
