# Proposal-Gated Write Admission v1 Plan

## Objective

Upgrade ATM from coarse file-intent arbitration to proposal-gated write admission for shared hot files and same-file multi-agent development.

The product goal is practical, not paper-only:

- agents should submit a patch proposal before receiving actual write authority on collision-prone files;
- broker should compare proposals before a second writer mutates the working tree;
- the system should choose one of three outcomes early:
  - direct write admitted,
  - deterministic composer / steward path,
  - blocked conflict.

This plan exists to make real project development collisions naturally survivable, while also leaving stronger evidence for the paper.

## Task Sequence

1. `TASK-CID-0115` - proposal-gated write admission contract and runtime states
2. `TASK-CID-0116` - team start / broker register proposal-first gate
3. `TASK-CID-0117` - proposal overlap arbitration and deterministic-composer routing
4. `TASK-CID-0118` - governed writer handoff, steward apply, and run-record evidence
5. `TASK-CID-0119` - dogfood adoption gate and natural-collision evidence pack

## Priority Order

### P0 - must land first

- `TASK-CID-0115`
- `TASK-CID-0116`

These cards establish the practical contract:

- proposal gating is not the default path for every write;
- hot files always use proposal-first admission;
- non-hot files only escalate when overlap risk appears;
- first-writer work can be parked and rearbitrated before uncontrolled dual-write mutation.

### P1 - core arbitration value

- `TASK-CID-0117`
- `TASK-CID-0118`

These cards turn the contract into a usable engineering lane:

- early proposal comparison,
- deterministic-composer routing before second-write mutation,
- governed writer handoff,
- live apply success.

### P2 - adoption proof

- `TASK-CID-0119`

This card proves the feature helps real development instead of only synthetic benches.

## Required Product Outcome

After this wave:

- the first writer on a hot file no longer gets silent early write authority by default;
- the second writer can be compared against the first writer's proposal before both sides have mutated the same file;
- `team start` / broker runtime can escalate to composer before write, not only after write;
- successful same-file different-region work can complete through a governed path without artificial bench setup;
- hot files can enter proposal-first mode before a second writer exists;
- first-writer local work can be parked and rearbitrated before uncontrolled overlap becomes a write-time mess;
- the evidence pipeline can distinguish:
  - proposal-submitted,
  - write-admitted,
  - composer-routed,
  - blocked-before-write,
  - applied.

## Activation Policy

Proposal-gated write admission is a conditional escalation, not a global mandatory write path.

### Always-on triggers

- file is marked as a broker hot file;
- file is marked as a shared governance surface;
- file has known historical collision evidence and is explicitly promoted into the hot-file list.

### Conditional triggers

- an active same-file intent already exists;
- a second writer enters a bounded shared-surface or atom-overlap risk zone;
- a checkpoint or rearbitration request identifies collision-prone overlap before commit.

### Recovery triggers

When the first writer already has uncommitted local work, broker should prefer:

1. park the first writer,
2. extract or submit its current patch or proposal,
3. rearbitrate before another writer receives actual write authority.

## Recommended v1 Mechanisms

- hot-file policy list
- short provisional pre-write lease
- shadow patch or proposal buffer before real write admission on hot files
- park-first-writer plus rearbitrate
- deterministic-composer path for same-file different-region proposals
- blocked-before-write evidence for true overlap

## Non-Goals

- no full autonomous shared-writer swarm;
- no broad replacement of existing task lifecycle;
- no requirement that all low-risk files always use proposal gating from day one.
- no forced rollback of arbitrary in-progress editor state as the primary recovery path.

## Primary Evidence Targets

- natural same-file collision on a real source file during normal development;
- early broker arbitration before the second writer modifies working tree content;
- early hot-file proposal gating before a second writer exists;
- parked-first-writer rearbitration trace on an uncommitted same-file case;
- deterministic-composer live apply success on clean baseline;
- blocked-before-write trace for true overlap.
