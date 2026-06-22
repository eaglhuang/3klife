---
doc_id: doc_paper_hotfile_pos_a
task_id: TASK-PAPER-HOTFILE-POS-A
title: "paper hotfile positive lane A"
status: planned
owner: paper-evidence
priority: P0
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/broker.ts"
deliverables:
  - "packages/cli/src/commands/broker.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the paper hotfile POS-A patch only."
atomizationImpact:
  ownerAtomOrMap: "atm.broker.classify-explicit-mutation-request"
proposalAdmission:
  trigger: same-file-overlap-risk
  summarySubmitted: true
  boundedRegions:
    - filePath: "packages/cli/src/commands/broker.ts"
      lineStart: 841
      lineEnd: 878
  notes: "POS-A claims the classifyExplicitMutationRequest bounded region so the broker can rearbitrate at proposal scope instead of failing closed on a shared owner atom."
outOfScope:
  - "packages/cli/src/commands/broker.ts outside the assigned bounded region"
  - "release/atm-root-drop/**"
nonGoals:
  - "Do not touch the POS-B bounded region."
---
# TASK-PAPER-HOTFILE-POS-A

## Goal

Create the positive same-file hot-file lane A patch for
`packages/cli/src/commands/broker.ts`.

## Allowed edit surface

- bounded region A only
- same file as lane B
- disjoint from POS-B bounded region

## Why this exists

This task is one half of the paper hot-file positive case:
`provisional-write-lease -> composer-routed -> applied`.

## Acceptance Criteria

- patch remains inside the lane A bounded region
- patch is compatible with POS-B on the same file
- broker should reach proposal-first same-file rearbitration and route the pair to composer/steward rather than blocked-cid-conflict

---
doc_id: doc_paper_hotfile_pos_b
task_id: TASK-PAPER-HOTFILE-POS-B
title: "paper hotfile positive lane B"
status: planned
owner: paper-evidence
priority: P0
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/broker.ts"
deliverables:
  - "packages/cli/src/commands/broker.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the paper hotfile POS-B patch only."
atomizationImpact:
  ownerAtomOrMap: "atm.broker.parse-broker-args"
proposalAdmission:
  trigger: same-file-overlap-risk
  summarySubmitted: true
  boundedRegions:
    - filePath: "packages/cli/src/commands/broker.ts"
      lineStart: 989
      lineEnd: 1142
  notes: "POS-B claims the parseBrokerArgs bounded region so the broker can compare disjoint proposals on the same hot file."
outOfScope:
  - "packages/cli/src/commands/broker.ts outside the assigned bounded region"
  - "release/atm-root-drop/**"
nonGoals:
  - "Do not touch the POS-A bounded region."
---
# TASK-PAPER-HOTFILE-POS-B

## Goal

Create the positive same-file hot-file lane B patch for
`packages/cli/src/commands/broker.ts`.

## Allowed edit surface

- bounded region B only
- same file as lane A
- disjoint from POS-A bounded region

## Why this exists

This task is the other half of the paper hot-file positive case:
`provisional-write-lease -> composer-routed -> applied`.

## Acceptance Criteria

- patch remains inside the lane B bounded region
- patch is compatible with POS-A on the same file
- broker should reach proposal-first same-file rearbitration and route the pair to composer/steward rather than blocked-cid-conflict

---
doc_id: doc_paper_hotfile_block_a
task_id: TASK-PAPER-HOTFILE-BLOCK-A
title: "paper hotfile overlap block lane A"
status: planned
owner: paper-evidence
priority: P0
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/broker.ts"
deliverables:
  - "packages/cli/src/commands/broker.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the paper hotfile BLOCK-A patch only."
atomizationImpact:
  ownerAtomOrMap: "atm.proposal-overlap-arbitration"
outOfScope:
  - "packages/cli/src/commands/broker.ts outside the shared blocked region"
  - "release/atm-root-drop/**"
nonGoals:
  - "Do not move to a disjoint region."
---
# TASK-PAPER-HOTFILE-BLOCK-A

## Goal

Create the overlap block lane A patch for
`packages/cli/src/commands/broker.ts`.

## Allowed edit surface

- shared blocked bounded region only
- same bounded region as BLOCK-B

## Why this exists

This task exists to produce the paper hot-file negative trace:
`proposal-submitted -> blocked-before-write`.

## Acceptance Criteria

- patch remains inside the blocked bounded region
- broker should classify the pair as blocked-before-write

---
doc_id: doc_paper_hotfile_block_b
task_id: TASK-PAPER-HOTFILE-BLOCK-B
title: "paper hotfile overlap block lane B"
status: planned
owner: paper-evidence
priority: P0
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/broker.ts"
deliverables:
  - "packages/cli/src/commands/broker.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the paper hotfile BLOCK-B patch only."
atomizationImpact:
  ownerAtomOrMap: "atm.proposal-overlap-arbitration"
outOfScope:
  - "packages/cli/src/commands/broker.ts outside the shared blocked region"
  - "release/atm-root-drop/**"
nonGoals:
  - "Do not move to a disjoint region."
---
# TASK-PAPER-HOTFILE-BLOCK-B

## Goal

Create the overlap block lane B patch for
`packages/cli/src/commands/broker.ts`.

## Allowed edit surface

- shared blocked bounded region only
- same bounded region as BLOCK-A

## Why this exists

This task exists to produce the paper hot-file negative trace:
`proposal-submitted -> blocked-before-write`.

## Acceptance Criteria

- patch remains inside the blocked bounded region
- broker should classify the pair as blocked-before-write

---
doc_id: doc_paper_hotfile_park_a
task_id: TASK-PAPER-HOTFILE-PARK-A
title: "paper hotfile parked-first-writer lane A"
status: planned
owner: paper-evidence
priority: P0
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/broker.ts"
deliverables:
  - "packages/cli/src/commands/broker.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the paper hotfile PARK-A patch only."
atomizationImpact:
  ownerAtomOrMap: "atm.governed-writer-handoff"
outOfScope:
  - "packages/cli/src/commands/broker.ts outside the provisional writer region"
  - "release/atm-root-drop/**"
nonGoals:
  - "Do not provide fully precise bounded-region detail on first registration."
---
# TASK-PAPER-HOTFILE-PARK-A

## Goal

Create the parked-first-writer lane A setup for
`packages/cli/src/commands/broker.ts`.

## Allowed edit surface

- provisional writer region only
- first writer enters with incomplete bounded-region detail

## Why this exists

This task exists to produce the paper hot-file rearbitration trace:
`proposal-submitted -> parked-for-rearbitration`.

## Acceptance Criteria

- first writer enters proposal-first mode
- bounded-region detail is intentionally incomplete
- late joiner should be able to force parked-for-rearbitration

---
doc_id: doc_paper_hotfile_park_b
task_id: TASK-PAPER-HOTFILE-PARK-B
title: "paper hotfile parked-first-writer lane B"
status: planned
owner: paper-evidence
priority: P0
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/broker.ts"
deliverables:
  - "packages/cli/src/commands/broker.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the paper hotfile PARK-B patch only."
atomizationImpact:
  ownerAtomOrMap: "atm.governed-writer-handoff"
outOfScope:
  - "packages/cli/src/commands/broker.ts outside the explicit rearbitration request region"
  - "release/atm-root-drop/**"
nonGoals:
  - "Do not downgrade this case into a simple overlap block."
---
# TASK-PAPER-HOTFILE-PARK-B

## Goal

Create the parked-first-writer lane B joiner for
`packages/cli/src/commands/broker.ts`.

## Allowed edit surface

- explicit rearbitration request region only
- same file as PARK-A
- provide more explicit bounded-region detail than PARK-A

## Why this exists

This task exists to force the rearbitration trace:
`proposal-submitted -> parked-for-rearbitration`.

## Acceptance Criteria

- patch remains inside the PARK-B bounded region
- late joiner should trigger parked-for-rearbitration instead of direct apply
