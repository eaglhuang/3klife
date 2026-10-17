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
  - Related tasks / commits: observed during `TASK-TEAM-0006` read-only sidecar; `TASK-AAO-0066`.

- [ ] BUG-ATM-0024: Discovered planning paths can point at stale or alternate 3KLife worktree aliases
  - Status: open
  - Severity: P1 path reliability
  - Encountered: `node atm.mjs next --prompt "TASK-TEAM-0006 Patrol report template" --json` returned task paths under `../3KLife-captain-dispatch-push/...`, while the active planning repo path is `C:/Users/User/3KLife/...`.
  - Reproduce / detect: Route a Markdown-discovered task after using multiple local 3KLife worktrees or aliases, then compare `taskPath`, `sourcePlanPath`, and the currently maintained planning repo.
  - Impact: Workers can read or import from an unintended stale planning worktree, causing status drift or wrong task-card content.
  - Possible optimization: Canonicalize planning repo roots, prefer the configured active planning repo, and include a warning when a discovered task path is outside the expected planning root.
  - Related tasks / commits: observed during `TASK-TEAM-0006` read-only sidecar; `TASK-AAO-0043`.

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
  - Related tasks / commits: `TASK-RFT-0008`; Team Agents dogfood run `team-71c0d5c2fd25`; `TASK-AAO-0110`.

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
  - Related tasks / commits: `TASK-RFT-0008`, `TASK-TEAM-0005`, `BUG-ATM-0026`; `TASK-AAO-0119`.

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