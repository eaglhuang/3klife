# ATM Bug and Optimization Backlog

Created: 2026-06-14
Owner: ATM Captain
Status: active, long-term maintained

## Purpose

This document is the single long-term checklist for ATM bugs, friction, and governance optimizations found during active framework development. It is not a task ledger and does not replace ATM task cards. Each item records the observed problem, how to reproduce or recognize it, impact, and a possible optimization path.

Use this file when:

- A workflow feels confusing, too heavy, or easy for agents to misuse.
- A validator, CLI command, task card, or derived runner behavior reveals a product gap.
- Captain sequencing or delegation drifts from the stated plan.
- A repeated workaround should become a governed improvement card.

## Item Template

```md
- [ ] BUG-ATM-XXXX: Short title
  - Status:
  - Severity:
  - Encountered:
  - Reproduce / detect:
  - Impact:
  - Possible optimization:
  - Related tasks / commits:
```

## Open Items

- [ ] BUG-ATM-0001: Captain priority drift between Team Agents and MAO
  - Status: open
  - Severity: P0 governance friction
  - Encountered: The Captain stated that Team Agents should start first, but then implemented `TASK-MAO-0001` through `TASK-MAO-0003` as route/lifecycle prerequisites without publishing a fresh sequencing ruling first.
  - Reproduce / detect: Ask the Captain to arrange task-card order and start implementation after a Team-first recommendation; observe whether implementation silently switches to MAO prerequisite work.
  - Impact: The human loses trust in the declared plan, and later agents may infer that "Team-first" was abandoned rather than temporarily gated by MAO prerequisites.
  - Possible optimization: Add a Captain SOP: before deviating from a stated lane priority, emit an explicit re-ruling that separates "promised first product lane" from "technical prerequisite lane"; record the reason and the next return point.
  - Related tasks / commits: `TASK-MAO-0001`, `TASK-MAO-0002`, `TASK-MAO-0003`; next recommended Team return point is `TASK-TEAM-0002`.

- [ ] BUG-ATM-0002: Batch claim/import can lose the intended queue head
  - Status: open
  - Severity: P0 lifecycle correctness
  - Encountered: A batch route identified a queue head, but `next --claim` required Markdown import. After importing the intended card, the route selected a different task.
  - Reproduce / detect: Route a batch prompt to a Markdown task that is not yet imported, run the suggested claim, import that specific Markdown card, then rerun claim and compare the chosen task id.
  - Impact: Agents can accidentally start the wrong task after following ATM's own remediation path.
  - Possible optimization: Preserve the exact task id across `ATM_NEXT_CLAIM_TASK_IMPORT_REQUIRED`; add an import-and-claim command or a claim retry token bound to the original queue head.
  - Related tasks / commits: observed during MAO queue setup before `TASK-MAO-0001`.

- [ ] BUG-ATM-0003: Markdown task cards require manual import before normal claim
  - Status: open
  - Severity: P1 workflow friction
  - Encountered: `TASK-MAO-0002` and `TASK-MAO-0003` produced `ATM_NEXT_CLAIM_TASK_IMPORT_REQUIRED`, requiring manual `tasks import --from ... --write` before claim.
  - Reproduce / detect: Keep task cards in planning Markdown only, ask `next --prompt` / `next --claim` to start one, and observe the manual import step.
  - Impact: The lifecycle is correct but too easy to fumble, especially for agents handling many cards.
  - Possible optimization: For an exact task id route, return a safe one-command import+claim path, or add `next --claim --import-from <card>` with strict exact-id validation.
  - Related tasks / commits: `TASK-MAO-0002`, `TASK-MAO-0003`.

- [ ] BUG-ATM-0004: Task cards can list nonexistent framework scope paths
  - Status: open
  - Severity: P1 task-card quality
  - Encountered: `TASK-MAO-0003` listed `packages/cli/src/commands/index.ts`, but the actual command registry paths are `packages/cli/src/atm.ts` and `packages/cli/src/commands/command-specs.ts`.
  - Reproduce / detect: Import or preflight a Markdown task card whose `scopePaths` include nonexistent files.
  - Impact: Agents waste time resolving stale paths, and the allowed-files contract becomes less trustworthy.
  - Possible optimization: Add a task-card scope preflight that warns on nonexistent paths before claim, with an explicit allowance for future files.
  - Related tasks / commits: `TASK-MAO-0003`.

- [ ] BUG-ATM-0005: Runner sync is necessary but appears late in source-task flow
  - Status: open
  - Severity: P0 release artifact governance
  - Encountered: After core source changes, frozen runner checks emitted `ATM_RUNNER_SYNC_REQUIRED`; the agent had to run `npm run build` and commit generated `release/**` artifacts after the source task.
  - Reproduce / detect: Change ATM CLI source, run frozen `node atm.mjs ...`, and observe stale release detection.
  - Impact: Correctly protects frozen runner integrity, but can surprise agents and blur source-delivery vs generated-runner commits.
  - Possible optimization: Implement the lightweight Runner Sync Steward lane: normal agents deliver source/tests, mark runner-sync-needed, and a single steward builds, validates, and commits `release/**`.
  - Related tasks / commits: `TASK-MAO-0003`; runner sync commit `eb7732ae`.

- [ ] BUG-ATM-0006: Onefile release can accidentally import unbundled runtime dependencies
  - Status: open
  - Severity: P0 frozen runner breakage
  - Encountered: A CLI route command imported a core AJV value helper; after build, frozen `node atm.mjs next --json` failed with `ERR_MODULE_NOT_FOUND` for `ajv` from the bundled cache.
  - Reproduce / detect: Add a value import from core validation into a onefile CLI path, build, then run frozen `node atm.mjs next --json`.
  - Impact: Source tests may pass while the frozen runner breaks for agents.
  - Possible optimization: Add an import-boundary validator for onefile CLI paths that blocks external runtime dependency edges unless explicitly bundled.
  - Related tasks / commits: fixed during `TASK-MAO-0003` by changing the route command to type-only core imports plus local structural validation.

- [ ] BUG-ATM-0007: Governance command validator has unrelated historical close regressions
  - Status: open
  - Severity: P1 validator trust
  - Encountered: `node --strip-types scripts/validate-governance-commands.ts` failed on `tasks reconcile` and historical delivery close fixtures while route lifecycle validation itself passed.
  - Reproduce / detect: Run the governance command validator and inspect failures around close-commit-window and historical delivery close.
  - Impact: Agents cannot use this broad validator as a clean regression gate for unrelated changes.
  - Possible optimization: Open a targeted bugfix or refactor card, likely near `TASK-RFT-0004`, to isolate failing fixtures and repair historical delivery close behavior.
  - Related tasks / commits: observed during `TASK-MAO-0003` validation.

- [ ] BUG-ATM-0008: New schemas may not be globally validated unless manually registered
  - Status: open
  - Severity: P1 validation coverage
  - Encountered: A new `schemas/route-context.schema.json` was covered by a dedicated route-context test, but `scripts/validate-schemas.ts` did not clearly auto-discover it.
  - Reproduce / detect: Add a new top-level schema, run `npm run validate:schemas`, and verify whether the schema count and failure behavior include the new file.
  - Impact: Schema files can appear validated by convention while only dedicated tests actually cover them.
  - Possible optimization: Either auto-discover schema files or require task cards that add schemas to include the schema registry script in `scopePaths` and deliverables.
  - Related tasks / commits: `TASK-MAO-0002`.

- [ ] BUG-ATM-0009: Parallel evidence writes can show confusing evidence counts
  - Status: open
  - Severity: P2 operator clarity
  - Encountered: Parallel `evidence run` commands returned non-monotonic `evidenceCount` values because writes completed out of order.
  - Reproduce / detect: Run multiple `node atm.mjs evidence run ... --write --json` commands concurrently for the same task.
  - Impact: Likely not data corruption, but confusing during closure review.
  - Possible optimization: Serialize evidence writes in Captain SOP, or add evidence CLI locking / clearer count semantics.
  - Related tasks / commits: observed during MAO evidence collection.

- [ ] BUG-ATM-0010: Team Agents task index and plan contain mojibake in Chinese titles
  - Status: open
  - Severity: P1 documentation reliability
  - Encountered: Team Agents planning files display corrupted Chinese strings in task titles and related plan links, while task ids and English titles remain usable.
  - Reproduce / detect: Read `docs/ai_atomic_framework/team-agents/tasks/README.md` or early `TASK-TEAM-*` cards and inspect `related_plan` / heading text.
  - Impact: Agents can still operate by task id, but human review is harder and links are less trustworthy.
  - Possible optimization: Run a dedicated encoding repair card for Team Agents planning docs before expanding public-facing docs; keep task ids and English titles as the stable machine surface.
  - Related tasks / commits: Team Agents planning lane.

- [ ] BUG-ATM-0011: RFT refactor lane should be interleaved, not allowed to eclipse Team Agents
  - Status: open
  - Severity: P0 planning governance
  - Encountered: The oversized-module refactor plan is valid and important, but if started wholesale it can delay the Team Agents product lane and repeat the same priority drift as MAO.
  - Reproduce / detect: Begin `TASK-RFT-0001` or other large refactors before shipping the smallest Team Agents dry-run contract.
  - Impact: Refactor work reduces future risk but may not improve immediate ATM usability for multi-agent governance.
  - Possible optimization: Use RFT as risk-reduction gates around specific Team/MAO work. First return to `TASK-TEAM-0002`; then do `TASK-RFT-0008` and `TASK-RFT-0003` before heavy runtime/lifecycle changes; defer `TASK-RFT-0001` until `next` integration is actually needed by `TASK-TEAM-0015`.
  - Related tasks / commits: `TASK-TEAM-0002`, `TASK-RFT-0008`, `TASK-RFT-0003`, `TASK-RFT-0001`.

- [ ] BUG-ATM-0012: Planning Markdown task status can be stale versus ATM ledger
  - Status: open
  - Severity: P0 sequencing correctness
  - Encountered: `C:/Users/User/3KLife/docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0002-minimal-task-crew-briefing-contract.task.md` still says `status: planned`, but `node atm.mjs next --prompt "TASK-TEAM-0002 minimal task crew briefing contract" --json` reports the official ATM ledger status as `done` with closure packet `.atm/history/evidence/TASK-TEAM-0002.closure-packet.json`.
  - Reproduce / detect: Compare planning Markdown frontmatter status against `node atm.mjs next --prompt "<task-id>" --json` for imported tasks.
  - Impact: Captain sequencing can incorrectly restart already closed work or tell external builders to wait on a completed prerequisite.
  - Possible optimization: Add a planning-status sync checker that flags stale Markdown mirrors and tells Captain to trust the ATM ledger for closure authority.
  - Related tasks / commits: `TASK-TEAM-0002`, `TASK-TEAM-0004`.

- [ ] BUG-ATM-0013: Target-repo done card can miss target ledger closure evidence
  - Status: open
  - Severity: P0 closure evidence integrity
  - Encountered: `TASK-TEAM-0028` is marked `done` in the 3KLife Markdown task card, but no matching `AI-Atomic-Framework/.atm/history/tasks/TASK-TEAM-0028.json` or closure packet was found during the status sync audit.
  - Reproduce / detect: Compare Markdown cards with `status: done` and `target_repo: AI-Atomic-Framework` against `.atm/history/tasks/<task-id>.json` and `.atm/history/evidence/<task-id>.closure-packet.json`.
  - Impact: A Captain can treat a task as closed prerequisite evidence when the target repo has no official closure record.
  - Possible optimization: Add a sync checker that distinguishes planning-repo closure from target-repo closure and blocks using a target-repo `done` card without ledger closure evidence.
  - Related tasks / commits: `TASK-TEAM-0028`, `TASK-TEAM-0027`.

- [ ] BUG-ATM-0014: RFT planned cards are not imported into target ledger before route planning
  - Status: open
  - Severity: P1 execution readiness
  - Encountered: All eight RFT Markdown cards are `planned`, but no `TASK-RFT-*.json` exists in the AI-Atomic-Framework task ledger.
  - Reproduce / detect: Compare `C:/Users/User/3KLife/docs/ai_atomic_framework/rft-hardening/tasks/TASK-RFT-*.task.md` against `AI-Atomic-Framework/.atm/history/tasks/TASK-RFT-*.json`.
  - Impact: `next` can route by Markdown discovery, but claim may require import and can create friction if the selected card is not imported intentionally.
  - Possible optimization: Import only the selected RFT card immediately before execution; avoid bulk-importing all RFT cards unless the batch route explicitly requires it.
  - Related tasks / commits: `TASK-RFT-0008`.

- [ ] BUG-ATM-0015: Markdown claim remediation can point to the wrong or over-quoted import path
  - Status: open
  - Severity: P0 external-agent usability
  - Encountered: `external-004` hit `ATM_NEXT_CLAIM_TASK_IMPORT_REQUIRED` for `TASK-TEAM-0004`; the remediation pointed at a quoted planning document path instead of the exact task-card Markdown file.
  - Reproduce / detect: Ask an external worker to claim a Markdown-discovered task that has not been imported, then inspect `error.requiredCommand` and compare it with `evidence.nextAction.taskPath`.
  - Impact: A worker can follow ATM's own remediation and import the wrong source document, especially when the task family has both a plan document and per-task cards.
  - Possible optimization: Return the exact discovered task card path in the required command, avoid nested shell quotes, and add an import-and-claim retry token bound to the selected task id.
  - Related tasks / commits: `TASK-TEAM-0004`; framework import/claim commit `f9cb2fa6`.

- [ ] BUG-ATM-0016: Import/setup commits require a work session even before real implementation starts
  - Status: open
  - Severity: P1 lifecycle friction
  - Encountered: After `tasks import --write` for `TASK-TEAM-0004`, a normal `git commit` was blocked by `ATM_GIT_COMMIT_WRAPPER_REQUIRED`, but `atm git commit` then required an active or recent task session.
  - Reproduce / detect: Import a Markdown task card into `.atm/history/tasks`, stage only import artifacts, then try to commit through the required wrapper before claiming the task.
  - Impact: Captain had to claim the task as `external-004` just to make a setup/import commit, which blurs the boundary between Captain setup and worker implementation.
  - Possible optimization: Add a governed import/setup commit mode, or provide a single `tasks import-and-claim` command that writes task history, creates the actor session, and emits the correct commit instructions.
  - Related tasks / commits: `TASK-TEAM-0004`; framework import/claim commit `f9cb2fa6`.

- [ ] BUG-ATM-0017: External actor identity setup is not part of dispatch preflight
  - Status: open
  - Severity: P1 delegation friction
  - Encountered: `atm git commit --actor external-004` refused to commit until `node atm.mjs identity set --actor "external-004" --git-name "004" --git-email "004@3klife.local" --json` was run manually.
  - Reproduce / detect: Create a new external actor, claim a task, then attempt an ATM-wrapped commit without pre-registering identity.
  - Impact: External agents can finish work but fail at the commit step unless the Captain remembered an identity command not present in the dispatch brief.
  - Possible optimization: Add identity provisioning to Captain dispatch setup, or allow `atm git commit` to accept one-shot `--git-name` / `--git-email` values and persist them explicitly.
  - Related tasks / commits: `external-004`, `TASK-TEAM-0004`.

- [ ] BUG-ATM-0018: Commit wrapper baseline warnings are noisy during narrow import/setup commits
  - Status: open
  - Severity: P2 operator clarity
  - Encountered: The pre-commit task audit emitted many tree-wide warnings during the narrow `TASK-TEAM-0004` import/claim commit even though they were non-blocking.
  - Reproduce / detect: Run an ATM-wrapped commit for a small task-history import and inspect warnings unrelated to the current task id.
  - Impact: Agents may spend time triaging historical baseline warnings or mistake them for blockers.
  - Possible optimization: Split current-task blockers from baseline warnings, collapse unchanged baseline warnings by default, and print a short command to expand the full list only when needed.
  - Related tasks / commits: `TASK-TEAM-0004`; framework import/claim commit `f9cb2fa6`.

- [ ] BUG-ATM-0019: Task import can lose multiline YAML block scalar content
  - Status: open
  - Severity: P1 task-card fidelity
  - Encountered: The imported `TASK-TEAM-0004` task JSON showed a dispatch pattern output field as `"output": "|"`, suggesting the YAML block scalar marker was preserved but the multiline content was not normalized as intended.
  - Reproduce / detect: Import a Markdown task card whose frontmatter or structured body contains block scalar fields, then inspect `.atm/history/tasks/<task-id>.json` for literal `"|"` values without the expected text.
  - Impact: Imported task metadata can become less useful for downstream automation, evidence review, and worker briefing generation.
  - Possible optimization: Update the task importer to parse YAML block scalars with a structured YAML parser or explicitly reject unsupported block fields with a clear validation error.
  - Related tasks / commits: `TASK-TEAM-0004`.

- [ ] BUG-ATM-0020: Worker resume SOP must sync after Captain-side import/claim commits
  - Status: open
  - Severity: P1 multi-agent coordination
  - Encountered: `external-004` was resumed only after Captain imported, claimed, committed, and pushed `TASK-TEAM-0004` setup artifacts in the same target repo.
  - Reproduce / detect: Let a worker HOLD on missing import, have Captain perform the import/claim commit, then resume the worker without requiring a fresh `git status` and pull/sync check.
  - Impact: The worker can continue from stale workspace assumptions and collide with Captain-authored task-history commits.
  - Possible optimization: Add a dispatch SOP line: after Captain resolves a HOLD by committing setup artifacts, the worker must sync latest main and rerun `node atm.mjs next --prompt "<task>" --json` before editing.
  - Related tasks / commits: `external-004`, `TASK-TEAM-0004`, framework import/claim commit `f9cb2fa6`.

- [ ] BUG-ATM-0021: Closure review does not clearly separate pre-existing deliverables from changed deliverables
  - Status: open
  - Severity: P1 closeout clarity
  - Encountered: `TASK-TEAM-0004` listed templates, `package.json`, atom map, and validator as deliverables, but the implementation commit only changed `scripts/validate-team-agents-templates.ts` and git-head evidence because the templates and wiring already existed from earlier work.
  - Reproduce / detect: Close a task whose acceptance criteria are satisfied partly by pre-existing files, then compare `deliverables`, `requiredGatesSnapshot.changedFiles`, and the actual implementation commit diff.
  - Impact: Captain review can misread a successful validator-only completion as either incomplete work or hidden scope drift.
  - Possible optimization: Add closure packet fields such as `preExistingDeliverables`, `changedDeliverables`, and `validatedDeliverables`, and teach close review to state which acceptance items were already satisfied before the task commit.
  - Related tasks / commits: `TASK-TEAM-0004`; framework implementation commit `4aef5440`, close commit `5fe00bdc`.

- [ ] BUG-ATM-0022: `identity set` response can show a previous actor's active session
  - Status: open
  - Severity: P2 operator clarity
  - Encountered: While preparing `external-005`, `node atm.mjs identity set --actor "external-005" ... --json` returned `actorId: external-005` but also showed `activeSessionId` from the prior `external-004` session.
  - Reproduce / detect: Run `identity set` for a new actor immediately after another actor closed or claimed a task, then inspect `evidence.identity.activeSessionId`.
  - Impact: Captain or worker may incorrectly infer that the new identity is attached to the prior actor's session.
  - Possible optimization: Omit stale `activeSessionId` from identity-set output, or only include it when the active session belongs to the same actor.
  - Related tasks / commits: observed during `TASK-TEAM-0005` setup after `TASK-TEAM-0004`.

- [ ] BUG-ATM-0023: Read-only preflight routes sound like they must claim and mutate
  - Status: open
  - Severity: P2 delegation clarity
  - Encountered: A read-only sidecar asked for `TASK-TEAM-0006` preflight received the normal playbook emphasizing `next --claim`, even though the Captain explicitly wanted no claim, no write, and no close.
  - Reproduce / detect: Ask `node atm.mjs next --prompt "<task> preflight"` or a sidecar to inspect a task without write authority; inspect whether the playbook distinguishes read-only preflight from implementation.
  - Impact: Helper agents may overstep into claim/mutation when the intended role is just route verification or implementation briefing.
  - Possible optimization: Add a `preflight` / `review-only` channel or detect explicit read-only intent and return a non-claim playbook with allowed read commands.
  - Related tasks / commits: observed during `TASK-TEAM-0006` read-only sidecar.

- [ ] BUG-ATM-0024: Discovered planning paths can point at stale or alternate 3KLife worktree aliases
  - Status: open
  - Severity: P1 path reliability
  - Encountered: `node atm.mjs next --prompt "TASK-TEAM-0006 Patrol report template" --json` returned task paths under `../3KLife-captain-dispatch-push/...`, while the active planning repo path is `C:/Users/User/3KLife/...`.
  - Reproduce / detect: Route a Markdown-discovered task after using multiple local 3KLife worktrees or aliases, then compare `taskPath`, `sourcePlanPath`, and the currently maintained planning repo.
  - Impact: Workers can read or import from an unintended stale planning worktree, causing status drift or wrong task-card content.
  - Possible optimization: Canonicalize planning repo roots, prefer the configured active planning repo, and include a warning when a discovered task path is outside the expected planning root.
  - Related tasks / commits: observed during `TASK-TEAM-0006` read-only sidecar.

- [ ] BUG-ATM-0025: Atom map descriptions can drift from validator support
  - Status: open
  - Severity: P2 metadata accuracy
  - Encountered: `path-to-atom-map.json` already maps `scripts/validate-team-agents-templates.ts`, but its description still says `TASK-TEAM-0004 or TASK-TEAM-0005` while the script also supports `TASK-TEAM-0006`.
  - Reproduce / detect: Extend a shared validator for a new task and inspect the atom map row for stale task coverage text.
  - Impact: Agent preflight can incorrectly infer which task ids are supported by a shared validator.
  - Possible optimization: Add a metadata validator that checks task-id mentions in atom map descriptions against actual script task dispatch branches, or require shared-validator tasks to update atom map descriptions as acceptance criteria.
  - Related tasks / commits: observed during `TASK-TEAM-0006` read-only sidecar.

- [ ] BUG-ATM-0026: Routine source workers can accidentally become runner sync stewards
  - Status: open
  - Severity: P0 generated-artifact governance
  - Encountered: During `TASK-TEAM-0005`, `external-005` ran `node atm.mjs evidence add --help` and hit `ATM_RUNNER_SYNC_REQUIRED`, then ran `npm run build` inside a normal template task.
  - Reproduce / detect: After changing ATM source files, run frozen runner evidence/help commands from a normal source task and observe whether runner sync is required before evidence can continue.
  - Impact: This violates the intended lightweight policy where general workers should avoid owning `release/**` and a Runner Sync Steward should handle generated artifacts.
  - Possible optimization: Add a runner-sync-needed handoff mode for normal tasks, or make help/evidence commands avoid forcing worker-owned release sync when the task is not the steward lane.
  - Related tasks / commits: `TASK-TEAM-0005`; worker reported build was needed before evidence.

- [ ] BUG-ATM-0027: Template deliverables are ignored by default and require `git add -f`
  - Status: open
  - Severity: P1 delivery friction
  - Encountered: `external-005` reported `git add` was initially blocked by ignore rules for `docs/governance/team-agents/templates`, so the worker had to use `git add -f`.
  - Reproduce / detect: Add a new template under `docs/governance/team-agents/templates/` and try normal `git add`.
  - Impact: Agents may think new deliverables are not tracked, or may forget to force-add required files.
  - Possible optimization: Adjust `.gitignore`/include rules for governed template directories, or have task cards explicitly mention `git add -f` when deliverables live under ignored paths.
  - Related tasks / commits: `TASK-TEAM-0005`; implementation commit `b5519938`.

- [ ] BUG-ATM-0028: Evidence/close/commit sequencing is hard for external workers to infer
  - Status: open
  - Severity: P1 lifecycle usability
  - Encountered: `external-005` reported the first ATM-wrapped commit was blocked because `.atm/history/evidence/TASK-TEAM-0005.json` needed to travel with task ledger / transition files; the worker had to discover a two-commit flow by trial.
  - Reproduce / detect: Complete a normal task, add evidence before close, then attempt `atm git commit` before the close transition has generated all expected history/evidence artifacts.
  - Impact: External workers can lose time or produce confusing partial staged states even while following broad playbook instructions.
  - Possible optimization: Provide an explicit `task deliverable commit` vs `task close commit` recipe in the playbook, or add a command that stages the required current-task evidence/task/event files together.
  - Related tasks / commits: `TASK-TEAM-0005`; commits `b5519938`, `98d5cbee`.

- [ ] BUG-ATM-0029: Close-required evidence gate is correct but needs a concise missing-evidence checklist
  - Status: open
  - Severity: P2 closeout clarity
  - Encountered: `external-005` reported `tasks close` was blocked until four evidence runs were added for `validate:cli`, `validate:git-head-evidence`, `validate:team-agents-templates`, and `git diff --check`.
  - Reproduce / detect: Run `tasks close` for a framework task after focused validators but before all required closure gates have command-backed evidence.
  - Impact: The gate is useful, but external workers need a clear next-command checklist instead of learning the missing set by failure.
  - Possible optimization: When close is blocked, print grouped missing evidence with exact suggested `evidence run` commands for the current task and actor.
  - Related tasks / commits: `TASK-TEAM-0005`; close commit `98d5cbee`.

- [ ] BUG-ATM-0030: Worker-created Markdown templates can include UTF-8 BOM and fail pre-commit
  - Status: open
  - Severity: P1 delivery friction
  - Encountered: `TASK-TEAM-0006` pre-commit blocked because `docs/governance/team-agents/templates/patrol-report-template.md` contained a UTF-8 BOM.
  - Reproduce / detect: Let an external worker create a new Markdown template file, force-add it from an ignored template directory, then run the ATM commit wrapper.
  - Impact: The task content may be correct and validators may pass, but commit fails late on encoding.
  - Possible optimization: Add an encoding preflight command to dispatch briefs for new text files, or have the template validator check BOM for its managed template paths before commit.
  - Related tasks / commits: `TASK-TEAM-0006`; implementation commit `08eca824`.

- [ ] BUG-ATM-0031: Closure packet can include advisory runner sync diffs in targetCommitDelta
  - Status: open
  - Severity: P1 closure clarity
  - Encountered: `TASK-TEAM-0006` closure isolated `release/**` as advisory generated artifacts, but the closure packet `targetCommitDelta.changedFiles` still listed `release/atm-onefile/atm.mjs` and `release/atm-onefile/release-manifest.json`.
  - Reproduce / detect: Build frozen runner during a task, leave `release/**` dirty as advisory, then close the source task before committing runner sync.
  - Impact: Reviewers can misread generated runner sync as part of the task's delivery commit, even when it was intentionally separated into a steward commit.
  - Possible optimization: Split closure packet changed files into `deliveryChangedFiles`, `advisoryDirtyFiles`, and `postCloseRunnerSyncFiles`, or omit advisory dirty files from `targetCommitDelta`.
  - Related tasks / commits: `TASK-TEAM-0006`; closure commit `7ee56378`, runner sync commit `06bfc744`.

- [ ] BUG-ATM-0032: Guide/start misroutes existing task-card goals to create-atom
  - Status: open
  - Severity: P1 routing usability
  - Encountered: For the concrete goal `TASK-RFT-0008 taskflow size tripwire and commit message Strategy Map`, `node atm.mjs guide` returned `unknown`, then `node atm.mjs start` recommended `create-atom` even though a valid RFT task card already existed.
  - Reproduce / detect: Run `node atm.mjs next --prompt "<existing task family goal>" --json`, follow the suggested `guide`, then `start`; compare the route against existing Markdown task cards.
  - Impact: Captains can be pulled away from the task-card lifecycle into a new atom discovery flow, increasing confusion before implementation starts.
  - Possible optimization: Teach `guide/start` to detect explicit task ids and known planning task-card roots, and prefer task-card import/claim guidance over create-atom when a matching card exists.
  - Related tasks / commits: `TASK-RFT-0008`; Team Agents dogfood run `team-71c0d5c2fd25`.

- [ ] BUG-ATM-0033: Team start is useful but may overstate "agents" before spawning exists
  - Status: open
  - Severity: P2 product clarity
  - Encountered: `node atm.mjs team start --task "TASK-RFT-0008" ...` created a runtime team run and permission leases, but explicitly reported `agentsSpawned: false`.
  - Reproduce / detect: Run `team plan`, `team validate`, then `team start` for a normal TypeScript task and inspect `executionMode` / `agentsSpawned`.
  - Impact: Humans may think Team Agents are doing autonomous subagent work when the current product surface is still a manual-team coordination record.
  - Possible optimization: Rename or label the current stage as "manual team run record" in user-facing prompts, and add a clear next command or future card for real subagent spawn integration.
  - Related tasks / commits: `TASK-RFT-0008`, `TASK-TEAM-0011+`.

- [ ] BUG-ATM-0034: Frozen evidence/help commands force runner sync during normal source task evidence
  - Status: open
  - Severity: P0 runner governance friction
  - Encountered: During `TASK-RFT-0008`, after source edits but before closure, `node atm.mjs evidence --help` emitted `ATM_RUNNER_SYNC_REQUIRED`, forcing Captain to run `npm run build` before evidence capture could continue.
  - Reproduce / detect: Modify ATM CLI source, then run a frozen `node atm.mjs evidence ...` helper command before runner artifacts have been rebuilt.
  - Impact: Correctly protects the frozen runner, but it interrupts normal source-task evidence and can push ordinary workers into steward-owned `release/**` changes.
  - Possible optimization: Add a source-task handoff mode that records `runner-sync-needed` while allowing narrowly safe help/evidence capture, or make Runner Sync Steward a first-class follow-up lane in the playbook.
  - Related tasks / commits: `TASK-RFT-0008`, `TASK-TEAM-0005`, `BUG-ATM-0026`.

- [ ] BUG-ATM-0035: Planning card status lags after target claim/team run starts
  - Status: open
  - Severity: P1 dual-repo status clarity
  - Encountered: `TASK-RFT-0008` target ledger was imported and claimed as running, and Team run `team-71c0d5c2fd25` started, while the 3KLife Markdown card still showed `status: planned`.
  - Reproduce / detect: Import and claim a 3KLife planning card in the target repo, then compare `.atm/history/tasks/<task-id>.json` with the Markdown frontmatter status.
  - Impact: Sidecars and humans reading only 3KLife can believe a task has not started, while target ATM state is already active.
  - Possible optimization: Add a lightweight planning mirror update after successful claim/team start, or have `taskflow open/claim` return a planning sync reminder when `closure_authority=target_repo`.
  - Related tasks / commits: `TASK-RFT-0008`, `BUG-ATM-0012`.

- [ ] BUG-ATM-0036: Task scope amendment can update runtime direction lock without syncing embedded task ledger lock
  - Status: open
  - Severity: P0 closeback correctness
  - Encountered: During `TASK-TEAM-0017`, `node atm.mjs tasks scope add ... --add atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-platform.json --json` reported success and the active direction lock included the new shard path, but `.atm/history/tasks/TASK-TEAM-0017.json` still had the older embedded `taskDirectionLock.allowedFiles` and `claim.files`.
  - Reproduce / detect: Import and claim a task, run `tasks scope add` for an extra allowed file, then inspect `.atm/history/tasks/<task-id>.json`, the runtime lock, and pre-commit `ATM_DIRECTION_LOCK_ALLOWED_FILES_MISMATCH` diagnostics.
  - Impact: The task can correctly mutate the newly added file, but close/commit later sees direction-lock drift and may classify the delivery commit as out-of-scope or ambiguous.
  - Possible optimization: Make `tasks scope add` atomically sync the task ledger embedded direction lock and claim files, or intentionally separate runtime-only amendments with an explicit closeback-compatible event model.
  - Related tasks / commits: `TASK-TEAM-0017`; delivery commit `4497fb169b9d5d5de66bdf48e50afa7ec1d11c44`.

- [ ] BUG-ATM-0037: Closure-required git-head evidence creates an evidence/transition event commit cycle
  - Status: open
  - Severity: P0 closeback usability
  - Encountered: `TASK-TEAM-0017` close required `validate:git-head-evidence`; after adding that evidence, pre-commit blocked committing `.atm/history/evidence/TASK-TEAM-0017.json` alone because evidence must travel with a task ledger change or transition event, but the needed close transition event is only created by the close step that is currently blocked.
  - Reproduce / detect: Commit a task delivery, run `tasks close`, satisfy a newly reported close-required evidence validator, then attempt to commit the evidence before close creates the transition event.
  - Impact: Agents can get trapped between required evidence and protected-state commit rules, needing emergency backend close even though the implementation and validators passed.
  - Possible optimization: Teach `taskflow close` to own this sequence atomically: run missing close-required evidence, close, stage evidence/task/events/closure packet together, and commit the governed bundle.
  - Related tasks / commits: `TASK-TEAM-0017`; validator `validate:git-head-evidence`.

- [ ] BUG-ATM-0038: `evidence run --command` is fragile for complex quoted PowerShell or Node one-liners
  - Status: open
  - Severity: P1 evidence capture friction
  - Encountered: While trying to record `TASK-TEAM-0017` fixture acceptance, complex commands containing `$tmp` PowerShell variables or `node -e "..."` were mangled into partial commands such as `node -e const`, causing `ATM_EVIDENCE_VALIDATION_PASS_FAILED_COMMAND` even though the acceptance check passed when run directly.
  - Reproduce / detect: Run `node atm.mjs evidence run --command "<complex quoted command>" --validators <name> --json` on Windows PowerShell and compare the captured command string with the command actually intended.
  - Impact: Agents may lose command-backed evidence for legitimate checks or spend time fighting shell quoting instead of validating the task.
  - Possible optimization: Add `--command-file`, `--argv-json`, or `--stdin-command` support for evidence run; alternatively document a Windows-safe quoting recipe and include it in close blocker remediation.
  - Related tasks / commits: `TASK-TEAM-0017`; fixture acceptance for empty fixture dir exit 0 and invalid fixture exit 1.

- [ ] BUG-ATM-0039: Taskflow close reports the backend waiver command but cannot execute it without emergency approval
  - Status: open
  - Severity: P1 operator lane clarity
  - Encountered: `taskflow close --dry-run` for `TASK-TEAM-0017` recommended a `tasks close --historical-delivery --waiver-out-of-scope-delivery` command, but running that command failed with `ATM_EMERGENCY_LANE_APPROVAL_REQUIRED`.
  - Reproduce / detect: Produce a delivery commit that includes a scope-amended source-of-truth file, run `taskflow close --dry-run`, then run the returned backend command without an emergency approval lease.
  - Impact: The dry-run recommendation looks like the next operator command, but it is incomplete because it omits the required emergency approval flow.
  - Possible optimization: Have `taskflow close` either execute the waiver path internally when safe, or include the exact `emergency approve` prerequisite and approval text in the readiness hint.
  - Related tasks / commits: `TASK-TEAM-0017`; delivery commit `4497fb169b9d5d5de66bdf48e50afa7ec1d11c44`.

- [ ] BUG-ATM-0040: Team Agents schema files are not obviously swept by the global schema validator
  - Status: open
  - Severity: P1 validation coverage
  - Encountered: `TASK-TEAM-0017` added six `schemas/team-agents/*.schema.json` files and validated them through `scripts/validate-team-agents-templates.ts`, but sidecar review noted that `scripts/validate-schemas.ts` and `scripts/validators.config.json` may not automatically include the new schema family.
  - Reproduce / detect: Add a bad schema under `schemas/team-agents/`, run `npm run validate:schemas` / configured schema validators, and verify whether the failure is detected without the dedicated Team Agents validator.
  - Impact: A schema family can be locally covered by one task validator but remain invisible to broad release validation.
  - Possible optimization: Add auto-discovery for all `schemas/**/*.schema.json`, or require every new schema family to register in the global schema validator and validators config in the same task card.
  - Related tasks / commits: `TASK-TEAM-0017`; `BUG-ATM-0008`.

- [ ] BUG-ATM-0041: Task import path heuristic flags valid hyphenated filenames as strict path violations
  - Status: open
  - Severity: P2 import noise
  - Encountered: Importing `TASK-RFT-0003` reported `STRICT_PATH_VIOLATION` for valid files such as `closure-packet-schema.ts` because the heuristic appeared to classify hyphenated filename segments as `english-sentence-word`.
  - Reproduce / detect: Run `node atm.mjs tasks import --from <TASK-RFT-0003 markdown> --write --json` and inspect warnings for `closure-packet-schema.ts` or matching spec paths.
  - Impact: Agents may distrust import warnings or waste time checking valid scoped files.
  - Possible optimization: Restrict strict sentence-word detection to prose fields, or whitelist common code filename patterns such as `kebab-case.ts` and `kebab-case.spec.ts`.
  - Related tasks / commits: `TASK-RFT-0003`; delivery commit `b76c494346bbe72dc4e005fa552e61a28d240248`.

- [ ] BUG-ATM-0042: Normal playbook says close before commit, but close requires in-scope dirty files to be committed first
  - Status: open
  - Severity: P0 lifecycle instruction mismatch
  - Encountered: `TASK-RFT-0003` normal playbook said to close before committing deliverables, but `tasks close --status done` failed with `ATM_TASK_CLOSE_DIRTY_WORKTREE` and remediation said to commit scoped delivery changes first.
  - Reproduce / detect: Implement a normal framework task with dirty in-scope source files, add evidence, then run `node atm.mjs tasks close --task <id> --status done --json` before a delivery commit.
  - Impact: Agents following the playbook literally hit a blocker and must infer a two-commit flow from remediation.
  - Possible optimization: Update the normal playbook to distinguish delivery commit, close/ledger commit, and runner sync commit when close requires a committed delivery parent.
  - Related tasks / commits: `TASK-RFT-0003`; delivery commit `b76c494346bbe72dc4e005fa552e61a28d240248`, closure commit `55c435baf45dd12240329fb516dd24173980ea12`.

- [ ] BUG-ATM-0043: Direction-lock mismatch warning repeats for evidence/task-events omitted from claim.files
  - Status: open
  - Severity: P2 warning clarity
  - Encountered: During `TASK-RFT-0003` commit, pre-commit warned `ATM_DIRECTION_LOCK_ALLOWED_FILES_MISMATCH` because canonical allowed files included `.atm/history/evidence/TASK-RFT-0003.*` and `.atm/history/task-events/TASK-RFT-0003/**`, while claim.files omitted those generated governance paths.
  - Reproduce / detect: Claim a task, add evidence/events through ATM commands, stage them with deliverables, and run the ATM pre-commit hook or commit wrapper.
  - Impact: The warning is non-blocking but looks like scope drift, making closeout noisier for agents.
  - Possible optimization: Treat ATM-generated current-task evidence and task-events as implicit claim coverage, or sync claim.files after evidence/close writes.
  - Related tasks / commits: `TASK-RFT-0003`; delivery commit `b76c494346bbe72dc4e005fa552e61a28d240248`.

- [ ] BUG-ATM-0044: Runner sync commit records git-head evidence in a generated-artifact commit
  - Status: open
  - Severity: P1 runner sync clarity
  - Encountered: The `TASK-RFT-0003` runner sync stage had six tracked `release/**` files, but pre-commit staged `.atm/history/evidence/git-head.jsonl`, so the commit reported seven changed files.
  - Reproduce / detect: Run `npm run build`, stage tracked `release/**` changes with `git add -u release`, and commit while the pre-commit hook writes git-head evidence.
  - Impact: A clean derived-artifact commit gains governance evidence state, making runner sync less isolated than intended.
  - Possible optimization: Either exclude git-head evidence writes from pure runner sync commits, or route runner sync through a first-class steward command that owns release artifacts plus generated evidence explicitly.
  - Related tasks / commits: `TASK-RFT-0003`; runner sync commit `4a07560619b9cfe78e8051ca785829694bc50159`; `BUG-ATM-0005`, `BUG-ATM-0031`.

- [ ] BUG-ATM-0045: Task discovery can prefer a stale sibling planning worktree over the active planning repo
  - Status: open
  - Severity: P0 dispatch correctness
  - Encountered: During `TASK-TEAM-0009`, the normal route found a matching task card under `../3KLife-captain-dispatch-push` even though the active planning repo is `C:\Users\User\3KLife`.
  - Reproduce / detect: Keep an older sibling planning worktree with matching `docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0009-*.task.md`, then run `node atm.mjs next --prompt "TASK-TEAM-0009 Team plan dry-run resolver" --json`.
  - Impact: Agents can import or close back against stale task text, which weakens the trust boundary between active planning authority and historical worktrees.
  - Possible optimization: Add a canonical planning-root preference, reject sibling worktrees unless explicitly selected, or emit a high-severity warning when the chosen task card is outside the configured active planning repo.
  - Related tasks / commits: `TASK-TEAM-0009`; target delivery commit `b3f4c80064a148152f850f4939732c3c4b7e5190`.

- [ ] BUG-ATM-0046: Close missing-evidence remediation can generate an invalid doubled runner command
  - Status: open
  - Severity: P1 closeback usability
  - Encountered: `TASK-TEAM-0009` close initially reported a missing command validator, but the remediation command duplicated the runner prefix as `node atm.mjs node atm.mjs team plan ...`.
  - Reproduce / detect: Attempt to close a task that requires exact command evidence where the validator string itself starts with `node atm.mjs`.
  - Impact: The missing-evidence guidance is close to useful, but agents following it literally will run an invalid command.
  - Possible optimization: Treat command-shaped validator names as exact validator ids and quote them without prepending a runner command.
  - Related tasks / commits: `TASK-TEAM-0009`; `BUG-ATM-0029`.

- [ ] BUG-ATM-0047: Broker registry can surface completed task intents as active Team plan conflicts
  - Status: open
  - Severity: P1 coordination noise
  - Encountered: `node atm.mjs team plan --task TASK-TEAM-0009 --json` surfaced an active write-broker intent for already completed `TASK-RFT-0003`.
  - Reproduce / detect: Complete and close an RFT task, then run Team Agents planning shortly afterward and inspect `virtualAtomInUseRegistry.activeIntents`.
  - Impact: False conflict noise can make Team Agents planning look riskier than it is and may slow Captain decisions.
  - Possible optimization: Release or terminally mark write-broker intents when task close succeeds, or filter terminal task intents from Team plan risk summaries.
  - Related tasks / commits: `TASK-RFT-0003`, `TASK-TEAM-0009`.

- [ ] BUG-ATM-0048: Close gate requires validator aliases that duplicate more specific evidence
  - Status: open
  - Severity: P1 evidence friction
  - Encountered: `TASK-TEAM-0009` already had specific evidence for `validate-team-agents:plan-resolver` and `team-plan:TASK-TEAM-0009`, but close also required `validate:team-agents` and the exact command string `node atm.mjs team plan --task TASK-TEAM-0009 --json`.
  - Reproduce / detect: Record task-specific Team Agents validator evidence, then close a task card whose required validators use package-script aliases or command-string validators.
  - Impact: Agents must add duplicate evidence after delivery, which can trigger the evidence/transition commit cycle and make closeback feel more complicated than the work itself.
  - Possible optimization: Add validator alias normalization or let task cards declare accepted validator aliases so specific evidence can satisfy broader close requirements.
  - Related tasks / commits: `TASK-TEAM-0009`; `BUG-ATM-0037`.

- [ ] BUG-ATM-0049: Stale broker intents can block current Team plan until manual `broker cleanup`
  - Status: open
  - Severity: P0 Team Agents operability
  - Encountered: During `TASK-TEAM-0010`, `node atm.mjs team plan --task TASK-TEAM-0010 --json` failed with `blocked-broker-cid-conflict` because an expired `TASK-RFT-0003` active intent remained in `.atm/runtime/write-broker.registry.json`.
  - Reproduce / detect: Complete and close a task that registered a broker write intent, wait until the lease expires, then run `team plan` for another task touching nearby files.
  - Impact: A completed task can make an unrelated current Team plan look blocked, forcing Captain to know and run `node atm.mjs broker cleanup --json`.
  - Possible optimization: Run broker orphan cleanup automatically on task close and before Team plan broker evaluation, or downgrade expired terminal-task intents to advisory cleanup notices with a safe auto-clean path.
  - Related tasks / commits: `TASK-RFT-0003`, `TASK-TEAM-0010`; `BUG-ATM-0047`.

- [ ] BUG-ATM-0050: Onefile cache can lose internal command modules after rebuild
  - Status: open
  - Severity: P0 frozen runner reliability
  - Encountered: During `TASK-TEAM-0010`, `node atm.mjs broker --help` failed from the onefile cache with missing `packages/cli/dist/commands/actor-registry.js`; another attempt failed with missing cached `atm.mjs`.
  - Reproduce / detect: After source edits and `npm run build`, run `node atm.mjs broker --help` or other frozen runner commands that import newer command modules.
  - Impact: Agents following the frozen-runner rule can hit module-not-found errors while trying to inspect official commands.
  - Possible optimization: Add a onefile cache integrity check that clears/recreates the cache when expected extracted files are absent, and include command-module import coverage in onefile release validation.
  - Related tasks / commits: `TASK-TEAM-0010`; `BUG-ATM-0006`.

## Current Captain Sequencing Ruling

As of 2026-06-14, the recommended order is:

1. Return to Team Agents with `TASK-TEAM-0002` as the first implementation card. It is the smallest useful product slice: dry-run crew briefing, no runtime writes, no subagent spawning.
2. Run `TASK-TEAM-0004` through `TASK-TEAM-0006` next if the goal is visible usability and the 90-minute first-card promise.
3. Insert `TASK-RFT-0008` before making `taskflow` or task-card lifecycle behavior heavier, because it is the smallest RFT card and directly supports safer task operations.
4. Insert `TASK-RFT-0003` before Team runtime cards (`TASK-TEAM-0011+`) or framework temp-claim expansion, because that module owns high-risk lifecycle behavior.
5. Keep MAO route work at the light prerequisite layer already landed. Do not continue broad MAO implementation before the Team Agents thin slice unless a blocker appears.
6. Treat full Runner Broker as long-term north-star. Use the lightweight Runner Sync Steward lane first for generated `release/**` governance.

## Maintenance Rules

- Keep this file as a checklist; do not close items silently.
- When an item becomes a real task card, add the task id under related tasks.
- When fixed, mark the checkbox and add the closing commit or evidence command.
- Do not use this backlog as authority to bypass ATM routing, task claim, evidence, or closure rules.
